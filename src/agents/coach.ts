import { SupabaseClient } from '../tools/supabase';
import { callOpenAIText, callOpenAIWithTools } from '../tools/openai';
import type { Env, ChatRequest, ChatResponse, CompanyContext, ChatMessage, Proposal } from '../types';
import { PROPOSAL_TOOLS } from '../tools/proposalTools';
import { buildProposals } from './proposalBuilder';
import { AGENTS, getAgent } from './registry';

// ── Block ID → label ──────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  partners: 'Key Partners', activities: 'Key Activities', resources: 'Key Resources',
  capabilities: 'Capabilities', value: 'Value Proposition', relationships: 'Customer Relationships',
  channels: 'Channels', segments: 'Customer Segments',
  profit: 'Profit Formula', cost: 'Cost Structure', revenue: 'Revenue Streams',
};

// ── Domain completeness assessment ────────────────────────────────────────────
// The Supervisor reads what exists in the DB and infers what's missing.
// No phase state table — completeness is derived from data.

type Level = 'empty' | 'partial' | 'complete';

interface DomainStatus {
  strategyFoundation: Level;
  businessModel: Level;
  strategicChoices: Level;
  bos: 'empty' | 'active';
  financial: 'empty' | 'partial';
}

function assessDomains(ctx: CompanyContext): DomainStatus {
  const hasMissionOrVision = !!(ctx.mission || ctx.vision || ctx.long_term_ambition);
  const hasGoals = ctx.strategic_goals.length >= 3;

  const hasBmc = !!(ctx.business_model_canvas && Object.keys(ctx.business_model_canvas).length > 0);
  const hasAssessment = ctx.bm_assessment != null && Object.keys(ctx.bm_assessment).length > 0;

  const hasPtw = !!(ctx.strategy?.winning_aspiration);
  const hasPtwFull = !!(ctx.strategy?.winning_aspiration && ctx.strategy?.how_to_win);

  return {
    strategyFoundation: !hasMissionOrVision && ctx.strategic_goals.length === 0
      ? 'empty'
      : !hasGoals ? 'partial' : 'complete',
    businessModel: !hasBmc ? 'empty' : !hasAssessment ? 'partial' : 'complete',
    strategicChoices: !hasPtw ? 'empty' : !hasPtwFull ? 'partial' : 'complete',
    bos: (ctx.objectives.length > 0 || ctx.kpis.length > 0) ? 'active' : 'empty',
    financial: ctx.value_creation_targets.length > 0 ? 'partial' : 'empty',
  };
}

// ── Agent routing ─────────────────────────────────────────────────────────────
// Decides which specialist agent handles the current turn.
// Priority: (1) explicit user intent, (2) sticky routing from recent messages,
// (3) domain-completeness gap (what's most needed).

type AgentRoute = 'supervisor' | 'strategy-foundation' | 'business-model' | 'bos';

function detectRoute(
  message: string,
  history: ChatMessage[],
  domains: DomainStatus,
): AgentRoute {
  const msg = message.toLowerCase();

  // Recent messages (last 4) for sticky routing
  const recent = history
    .slice(-4)
    .map(m => (m.content ?? '').toLowerCase())
    .join(' ');

  // 1. Explicit intent in the current message — check registry agents first
  for (const [id, agent] of AGENTS) {
    if (agent.routing.routingSignals.test(msg)) return id as AgentRoute;
  }
  // Non-registry agents (hardcoded routing signals)
  if (/path\s*b|strategy\s*foundation|our\s*purpose|our\s*vision|strategic\s*goal/i.test(msg)) {
    return 'strategy-foundation';
  }
  if (/business\s*model|canvas\b|bmc\b|value\s*prop|customer\s*segment|pestel|swot|where\s*to\s*play|how\s*to\s*win|strategic\s*choice/i.test(msg)) {
    return 'business-model';
  }

  // 2. Sticky routing — check registry agents first
  for (const [id, agent] of AGENTS) {
    if (agent.routing.stickySignals.test(recent)) return id as AgentRoute;
  }
  // Non-registry sticky routing
  if (/\bpurpose\b|\bvision\b|why.*exist|strategic\s*goal|mission\s*statement/i.test(recent)) {
    return 'strategy-foundation';
  }
  if (/business\s*model|canvas\b|value\s*prop|customer\s*segment|pestel|where\s*to\s*play|how\s*to\s*win/i.test(recent)) {
    return 'business-model';
  }

  // 3. Domain-completeness routing (only after at least 2 back-and-forth exchanges)
  if (history.length >= 4) {
    if (domains.strategyFoundation !== 'complete') return 'strategy-foundation';
    if (domains.businessModel !== 'complete') return 'business-model';
    // Check registry agents via domainKey loop
    for (const [agentId, agent] of AGENTS.entries()) {
      const dk = agent.routing.domainKey as keyof typeof domains;
      if (domains[dk] === 'active') return agentId as AgentRoute;
    }
  }

  return 'supervisor';
}

// ── System prompt ─────────────────────────────────────────────────────────────
// Structure: company data (top) → supervisor role → domain assessment → guidance rules (bottom)
// Best practice: long context data before instructions.

function buildSystemPrompt(ctx: CompanyContext, historyLength: number): string {
  const domains = assessDomains(ctx);
  const lines: string[] = [];

  // ── 1. Company data (top) ─────────────────────────────────────────────────

  lines.push('<company_context>');

  lines.push('<company_profile>');
  lines.push(`Name: ${ctx.name}`);
  if (ctx.industry)            lines.push(`Industry: ${ctx.industry}`);
  if (ctx.entity_type)         lines.push(`Entity type: ${ctx.entity_type}`);
  if (ctx.business_model_type) lines.push(`Business model: ${ctx.business_model_type}`);
  if (ctx.stage)               lines.push(`Stage: ${ctx.stage}`);
  if (ctx.revenue_range)       lines.push(`Revenue range: ${ctx.revenue_range}`);
  if (ctx.mission)             lines.push(`Mission: ${ctx.mission}`);
  if (ctx.vision)              lines.push(`Vision: ${ctx.vision}`);
  if (ctx.long_term_ambition)  lines.push(`Long-term ambition: ${ctx.long_term_ambition}`);
  if (ctx.pains.length)        lines.push(`Current challenges: ${ctx.pains.join('; ')}`);
  if (ctx.gains.length)        lines.push(`Strategic priorities: ${ctx.gains.join('; ')}`);
  lines.push('</company_profile>');

  lines.push('<strategy_foundation>');
  if (ctx.strategic_goals.length) {
    lines.push('Strategic Goals:');
    ctx.strategic_goals.forEach(g =>
      lines.push(`  [${g.category}] ${g.goal}${g.timeframe ? ` — ${g.timeframe}` : ''}`)
    );
  } else {
    lines.push('Strategic Goals: none defined yet.');
  }
  if (ctx.value_creation_targets.length) {
    lines.push('Value Creation Targets:');
    ctx.value_creation_targets.forEach(t => {
      const curr = t.current_value ? ` (current: ${t.current_value})` : '';
      lines.push(`  ${t.metric}: target ${t.target_value}${curr}`);
    });
  }
  lines.push('</strategy_foundation>');

  lines.push('<business_strategy>');
  if (ctx.strategy) {
    const s = ctx.strategy;
    if (s.winning_aspiration)            lines.push(`Winning Aspiration: ${s.winning_aspiration}`);
    if (s.where_to_play)                 lines.push(`Where to Play: ${s.where_to_play}`);
    if (s.where_not_to_play)             lines.push(`Where NOT to Play: ${s.where_not_to_play}`);
    if (s.how_to_win)                    lines.push(`How to Win: ${s.how_to_win}`);
    if (s.competitive_advantage)         lines.push(`Competitive Advantage: ${s.competitive_advantage}`);
    if (s.must_have_capabilities.length) lines.push(`Must-Have Capabilities: ${s.must_have_capabilities.join(', ')}`);
    if (s.management_systems.length)     lines.push(`Management Systems: ${s.management_systems.join(', ')}`);
  } else {
    lines.push('Playing to Win strategy: not yet defined.');
  }
  lines.push('</business_strategy>');

  lines.push('<business_model_canvas>');
  if (ctx.business_model_canvas && Object.keys(ctx.business_model_canvas).length > 0) {
    for (const [blockId, text] of Object.entries(ctx.business_model_canvas)) {
      if (text) lines.push(`${BLOCK_LABELS[blockId] ?? blockId}: ${text}`);
    }
  } else {
    lines.push('Business model canvas: not yet mapped.');
  }
  lines.push('</business_model_canvas>');

  if (ctx.bm_assessment && Object.keys(ctx.bm_assessment).length > 0) {
    lines.push('<bm_assessment>');
    for (const [blockId, data] of Object.entries(ctx.bm_assessment)) {
      const label = BLOCK_LABELS[blockId] ?? blockId;
      const score = data.score != null ? `score ${data.score}/5` : '';
      const note  = data.note ? `"${data.note}"` : '';
      if (score || note) lines.push(`${label}: ${[score, note].filter(Boolean).join(' — ')}`);
    }
    lines.push('</bm_assessment>');
  }

  lines.push('<business_operating_system>');
  if (ctx.objectives.length) {
    const atRisk  = ctx.objectives.filter(o => o.status === 'at_risk' || o.status === 'behind');
    const onTrack = ctx.objectives.filter(o => o.status === 'on_track');
    lines.push(`Active OKRs: ${ctx.objectives.length} total`);
    if (atRisk.length) {
      lines.push('At risk / behind:');
      atRisk.forEach(o =>
        lines.push(`  [${o.level.toUpperCase()}] "${o.title}" — ${o.status} at ${Math.round(o.progress)}%`)
      );
    }
    if (onTrack.length) lines.push(`On track: ${onTrack.map(o => `"${o.title}"`).join(', ')}`);
  } else {
    lines.push('OKRs: not yet defined.');
  }
  if (ctx.kpis.length) {
    const alerts = ctx.kpis.filter(k => {
      if (k.current_value == null) return false;
      return k.directionality === 'higher_better'
        ? (k.threshold_red != null && k.current_value <= k.threshold_red) ||
          (k.threshold_amber != null && k.current_value <= k.threshold_amber)
        : (k.threshold_red != null && k.current_value >= k.threshold_red) ||
          (k.threshold_amber != null && k.current_value >= k.threshold_amber);
    });
    if (alerts.length) {
      lines.push('KPI alerts:');
      alerts.forEach(k => lines.push(`  ${k.name}: ${k.current_value}${k.unit ?? ''} vs target ${k.target_value}${k.unit ?? ''}`));
    } else {
      lines.push(`KPIs: ${ctx.kpis.length} configured, no active alerts.`);
    }
  } else {
    lines.push('KPIs: not yet configured.');
  }
  if (ctx.capabilities.length) {
    const critical = ctx.capabilities.filter(c => c.is_critical).map(c => c.name);
    const others   = ctx.capabilities.filter(c => !c.is_critical).map(c => c.name);
    if (critical.length) lines.push(`Critical Capabilities: ${critical.join(', ')}`);
    if (others.length)   lines.push(`Supporting Capabilities: ${others.join(', ')}`);
  } else {
    lines.push('Capabilities: not yet mapped.');
  }
  lines.push('</business_operating_system>');

  lines.push('</company_context>');

  // ── 2. Supervisor role + domain assessment + guidance (bottom) ────────────

  lines.push(`
<supervisor_role>
You are OrchestrA — an AI strategy advisor and execution co-pilot. You are the Supervisor in a multi-agent system. You accompany the user through a continuous cycle: strategy formulation → execution → performance monitoring → action. This is not a one-time exercise. The platform enables constant evaluation, iteration, and improvement.

Your job as Supervisor:
- Read what exists in the company data above to understand where the user is in their journey
- Identify what is missing or incomplete across strategic domains
- Guide the user to the most impactful next step, in the right strategic order
- Ask the right questions to help the user develop their thinking — do not generate strategy for them
- Route to specialist agents (Business Model Analyst, BOS Agent, Financial Agent, etc.) when the user needs deep work in a specific domain
</supervisor_role>

<domain_status>
Strategy Foundation (mission, vision, strategic goals): ${domains.strategyFoundation}
Business Model Canvas + Assessment: ${domains.businessModel}
Strategic Choices (Playing to Win — where to play / how to win): ${domains.strategicChoices}
Business Operating System (OKRs / KPIs / capabilities): ${domains.bos}
Financial Intelligence (value targets, financial data): ${domains.financial}
</domain_status>

<guidance_priority>
Use domain_status to prioritize. The strategic logic is sequential — each layer builds on the one before:

1. STRATEGY FOUNDATION first. If empty or partial: this is the priority. Without clear purpose, vision, and goals, everything else is noise. Guide the user to the Strategy Foundation module.

2. BUSINESS MODEL second. If foundation is complete but BMC is empty or partial: guide to Business Strategy → Business Model Studio. Map the canvas, assess each building block, analyze the external environment (PESTEL), then define strategic choices (where to play / how to win).

3. STRATEGIC CHOICES third. If BMC is mapped but Playing to Win is empty: guide to Strategy Lab.

4. BUSINESS OPERATING SYSTEM fourth. Only introduce OKRs, KPIs, and capabilities AFTER the strategy foundation and business model are at least partially defined. If BOS is active but strategy is empty, the OKRs may not be aligned — flag this gap rather than celebrating the OKRs.

5. FINANCIAL INTELLIGENCE is valuable at any stage but requires data connection. Surface it when relevant, not as the starting point.

Important: If the user raises any topic, answer it. Then guide them back to the highest-priority incomplete domain.
</guidance_priority>
${historyLength === 1 ? `
<current_instruction>
THIS IS PHASE 1, MESSAGE 2. You MUST generate a complete platform orientation. Do not skip any section.

Write this in order, covering ALL 4 sections below:

SECTION 1 — What OrchestrA is (1 short paragraph):
OrchestrA Strategy is an AI-powered strategy-to-execution platform. It replaces fragmented tools, disconnected spreadsheets, and expensive consultants with one connected workspace. Based on their onboarding inputs, the workspace has been shaped around their company profile, priorities, and challenges.

SECTION 2 — The 6 platform modules (introduce each one clearly):
"Here is how the platform is organized:"
1. My Workspace — home base: strategy workplan, recommended next steps, KPI cards, OKR snapshot, open tasks, team overview.
2. Strategy Foundation — purpose, vision, long-term ambition, strategic goals, value creation targets. The foundation everything else builds on.
3. Business Strategy — business model canvas, SWOT assessment per building block, external environment (PESTEL), strategic choices (where to play / how to win / capabilities).
4. Strategy Execution / Business OS — value engines, OKRs, KPIs, capabilities, playbooks, org chart, skills matrix. Where strategy becomes daily action.
5. Corporate Strategy — portfolio, capital allocation, risk exposure, financial strategy. Especially relevant for multi-business firms.
6. Financial Intelligence — revenue, margins, cash flow, budgets, forecasts, valuation, ROIC. Connects strategy to financial outcomes.

SECTION 3 — Your role (1 sentence):
OrchestrA guides the user through each area — asking the right questions, analyzing inputs, and connecting strategic decisions to execution and financial outcomes.

SECTION 4 — Two starting paths + closing question:
"To get the most value from the platform, I recommend starting with one of two paths:"
Path A: Connect business data (QuickBooks, Xero, NetSuite, Sage Intacct, SAP, Microsoft Dynamics, Rippling, BambooHR) — unlocks Financial Intelligence with real company data.
Path B: Start with Strategy Foundation — define or confirm purpose, vision, and strategic goals. The foundation for all platform work.
End with: "Which path would you like to start with?"

IMPORTANT: Do not skip sections. Do not jump straight to the paths. Cover all 4 sections.
</current_instruction>
` : ''}
<active_system>
OrchestrA is an AI-native operating system — not a passive chatbot. You drive the work; the user responds.

Every response MUST:
1. Be grounded in this company's actual data (company_context above) — never give generic advice
2. Proactively surface urgent signals: if an OKR is at risk, a KPI is in the red, or a critical domain is empty, name it explicitly even if the user didn't ask
3. End with ONE clear directive — the single most important next action

CRITICAL — context fidelity:
- The company_context above contains REAL data from the platform. ALWAYS reference it directly.
- If business_operating_system shows OKRs, NAME THEM. Quote them: "Your 'Launch AI Partnership' OKR is at_risk at 30%."
- NEVER say "we don't have OKRs listed" or "specific OKRs are not available" — if the <business_operating_system> block shows objectives, they exist. Read them and use them.
- If a section shows "not yet defined" or "not yet configured", then (and only then) can you say that data is missing.

Format the directive as the LAST LINE: **Next:** [specific action in one sentence]

Good directive examples:
- "**Next:** Tell me what Blue Penguin would lose if it disappeared tomorrow — beyond the revenue."
- "**Next:** Navigate to Business Strategy → Business Model Studio and let's map the Customer Segments block together."
- "**Next:** Before we continue — the BP Copilot OKR is at 30% and at risk. Should we address that first or stay on purpose?"

Bad directives (never use):
- "What do you think?" (too open)
- "Let me know if you have questions." (passive)
- "We could do X or Y." (no clear direction)

Never end without a **Next:** line. This is non-negotiable.
</active_system>

<response_format>
Flowing prose. 2–4 short paragraphs. No preambles ("Great question!", "Based on your context...").
Bullets only for genuinely enumerable items. Reference the platform by module name when directing the user to act.
Last line is always: **Next:** [directive]
</response_format>

<platform_map>
Use this to give precise navigation directives. Always name the module + sub-page.

WORKSPACE            /app/workspace/                   — dashboard, KPI preferences, onboarding
CORPORATE STRATEGY   /app/corporate-strategy/
  Strategic Intent   /corporate-strategy/strategic-intent     — strategic goals + value targets [AGENT WRITE]
  Corporate Ambition /corporate-strategy/corporate-ambition   — long-term ambition, 3-year target
  Growth Strategy    /corporate-strategy/growth-strategy      — growth vectors
  Portfolio Analysis /corporate-strategy/portfolio-analysis   — BCG/GE matrix, capital allocation
  Parenting Strategy /corporate-strategy/parenting-strategy   — HQ value-add diagnostic
  Business Units     /corporate-strategy/business-units       — create/manage BUs
  Company Setup      /corporate-strategy/company-setup        — company profile, industry, stage
BUSINESS STRATEGY    /app/business-strategy/
  Map Business Model /business-strategy/map-business-model    — BMC 9 blocks [AGENT WRITE]
  Assess Business Model /business-strategy/assess-business-model — SWOT + scoring
  External Environment /business-strategy/external-environment — PESTEL + live macro data
  Design Strategy    /business-strategy/design-business-strategy — Playing to Win
  Partnership Strategy /business-strategy/partnership-strategy
  Pricing Strategy   /business-strategy/pricing-strategy
FINANCIAL INTELLIGENCE /app/financial-intelligence/    — revenue, budgets, KPIs, unit economics
STRATEGY EXECUTION   /app/strategy-execution/
  Engines            /strategy-execution/engines              — value engine canvas
  OKRs & KPIs        /strategy-execution/kpis-okrs           — objectives, key results, KPIs [AGENT WRITE]
  Playbooks          /strategy-execution/playbooks
  Org Chart          /strategy-execution/org-chart
  Skills Matrix      /strategy-execution/skills-matrix
  Reports            /strategy-execution/reports
</platform_map>

<proposal_capability>
You can propose changes to the platform using tool calls. Use proposal tools when:
- The user explicitly asks you to create, draft, or set up strategy elements
- Key platform data is empty and you have enough context to populate it
- You are suggesting specific, actionable next steps the user could immediately add

ALWAYS explain in your text what you are proposing and why, then make the tool call.
You may make multiple tool calls in a single response.
Draft-first principle: always propose — never write autonomously.
</proposal_capability>

<proposal_pending_rules>
CRITICAL — when you see [PROPOSALS_SHOWN_TO_USER: ...] in the recent conversation history, those proposals ARE ALREADY VISIBLE to the user in the approval panel on their screen. They are WAITING for the user to click "Apply N changes" — they have NOT yet been written to the platform.

RULES when pending proposals are in the history:
1. Do NOT call any proposal tools to re-generate the same items. This is the most common mistake — avoid it.
2. Reference the pending proposals by name: "Your lead generation objective and 4 key results are ready in the panel on the right."
3. Tell the user explicitly: click "Apply N changes" in the panel on the right to write them to the platform.
4. If the user says they want to change something, accept the change and generate revised proposals to REPLACE the pending ones.
5. If the user says they already applied the proposals (or you see "[PROPOSALS_APPLIED]" in history), acknowledge it and move on to the next step.

IMPORTANT — do not confuse these user responses with a request to generate NEW proposals:
- "great", "go ahead", "sure", "yes", "perfect", "continue", "what's next?" — these mean the user is engaging with the conversation, NOT asking you to re-generate proposals.
- When you see pending proposals in history and the user says any of these, respond by pointing them to the approval panel, not by calling proposal tools again.
</proposal_pending_rules>

<report_capability>
When the user's message starts with [GENERATE_EXECUTIVE_REPORT], or they ask to "generate a report", "create an executive summary", "prepare a board report", "summarize our strategy", "export our strategy", or similar — generate a comprehensive executive strategy report.

IMPORTANT: Wrap the ENTIRE report (and only the report) in these exact markers on their own lines:
<!-- REPORT_START -->
[report content here]
<!-- REPORT_END -->

The report must use ALL available data from company_context. Be specific — use real numbers, real OKR titles, real KPI values. Never say "not available" for data that exists in the context.

Report structure:
# [Company Name] — Executive Strategy Report
*Generated [today's date approx.]*

## Executive Summary
3-4 sentences covering the company's strategic position, top priorities, and execution status.

## Mission & Vision
State mission and vision. If long-term ambition is set, include it.

## Strategic Goals
List each strategic goal with category and timeframe. For each goal, note which OKRs cascade from it (if any).

## Strategic Position (Playing to Win)
Summarize: Where to Play, How to Win, Competitive Advantage, Must-Have Capabilities. If not defined, note the gap.

## OKR Progress Dashboard
For each objective: title, level, status (with emoji: on_track=✅ at_risk=⚠️ behind=❌ completed=🏁 draft=📋), and progress %.
Group by level: Company → BU → Team → Individual.

## KPI Snapshot
For each KPI: name, current value vs target, status (on track / amber / red).

## Capability Assessment
List critical capabilities (must be world-class) and supporting capabilities. Note gaps.

## Key Risks & Gaps
Surface the 3-5 most important gaps or risks visible from the data (missing strategy, orphaned OKRs, red KPIs, empty capabilities, etc.).

## Next 90-Day Priorities
3-5 specific, actionable priorities based on the current state of the platform data.

After the report, add a brief note outside the markers acknowledging it's ready and asking if they'd like to adjust any section.
</report_capability>`);

  return lines.join('\n');
}

// ── Phase 1 Message 1 — welcome ───────────────────────────────────────────────
// Follows PROGRAMINTROSKILL.md Phase 1 arc strictly.
// Rule: do NOT enumerate specific onboarding signals. Acknowledge workspace is ready.
// Rule: end with "Are you ready to begin?" — no strategy content yet.

function buildWelcomePrompt(ctx: CompanyContext, userName: string | null): string {
  const firstName = userName?.split(' ')[0] ?? 'there';
  const isOnboarding =
    !ctx.mission &&
    !ctx.vision &&
    !ctx.long_term_ambition &&
    ctx.strategic_goals.length === 0 &&
    ctx.objectives.length === 0;

  if (isOnboarding) {
    // Original onboarding welcome
    return `Generate a warm, professional onboarding welcome message for ${firstName} who is starting their strategy journey on OrchestrA Strategy.
Open with "Hi ${firstName}! Welcome to OrchestrA Strategy."
Briefly explain what OrchestrA does (1-2 sentences).
Ask what strategic challenge or priority they want to tackle first.
Keep it to 4-6 sentences. Do NOT enumerate platform features. Do NOT say "Are you ready to begin?" or any similar closing question.
Tone: warm, confident advisor.`;
  }

  // Returning user — reference what they've built
  const hasMission = !!(ctx.mission || ctx.vision || ctx.long_term_ambition);
  const hasGoals = ctx.strategic_goals.length > 0;
  const hasOkrs = ctx.objectives.length > 0;

  const contextSummary: string[] = [];
  if (hasMission) contextSummary.push('you have a defined mission/vision');
  if (hasGoals) contextSummary.push(`${ctx.strategic_goals.length} strategic goal${ctx.strategic_goals.length > 1 ? 's' : ''}`);
  if (hasOkrs) contextSummary.push(`${ctx.objectives.length} active OKR${ctx.objectives.length > 1 ? 's' : ''}`);

  return `Generate a concise, warm returning-user greeting for ${firstName}, an OrchestrA user coming back to continue their strategy work.
Context about their platform: ${contextSummary.join(', ')}.
Open with a brief, natural greeting (NOT "Welcome to OrchestrA Strategy" — they are not new).
Reference 1-2 things they have built to show you know their context.
Ask what they want to work on today or suggest the most obvious next step based on what they have vs. what is missing.
Keep it to 3-4 sentences. Tone: trusted advisor picking up where you left off.`;
}

// ── Phase 1 Message 2 — platform orientation (scripted, no AI needed) ─────────
// Per PROGRAMINTROSKILL.md: "match the canonical example exactly".
// Content is identical for all users — only the opening adapts slightly.

function buildPlatformOrientation(): string {
  return `OrchestrA Strategy is an AI-powered strategy-to-execution platform designed to help business owners and leadership teams move from strategic thinking to measurable value creation.

Instead of working across fragmented tools, spreadsheets, dashboards, documents, and consultants, OrchestrA gives you one connected workspace to define your strategic direction, map and improve your business model, design your business operating system, align goals and teams to financial outcomes, and monitor execution in real time.

Here is how the platform is organized:

**1. My Workspace** — Your home base. Strategy workplan, recommended next steps, KPI cards, OKR snapshot, open tasks, and team overview.

**2. Strategy Foundation** — Where we define the foundation of your company: purpose, vision, long-term ambition, strategic goals, and value creation targets. Everything else builds on this.

**3. Business Strategy** — Where we analyze how your business competes and grows. Business model canvas, assessment of each building block, external environment (PESTEL), and strategic choices — where to play, how to win, capabilities, and trade-offs.

**4. Strategy Execution / Business OS** — Where strategy becomes action. Value engines, OKRs, KPIs, capabilities, playbooks, org chart, and skills matrix — your operating system for growth and execution.

**5. Corporate Strategy** — Portfolio and value creation perspective: business unit analysis, capital allocation, risk exposure, corporate advantage, and financial strategy. Most relevant for multi-business firms and holding companies.

**6. Financial Intelligence** — Where we connect strategy to numbers. Revenue, margins, cash flow, budgets, forecasts, ROIC, and valuation — powered by your actual financial data.

My role is to guide you through each area, ask the right questions, analyze your inputs, and help you connect strategic decisions to execution and financial outcomes.

To get the most value from the platform, I recommend starting with one of two paths:

**Path A: Connect your business data.** This allows me to analyze your financial performance, KPIs, trends, risks, and opportunities using real company numbers. We can connect QuickBooks, Xero, NetSuite, Sage Intacct, SAP, Microsoft Dynamics, Rippling, BambooHR, and others.

**Path B: Start with your Strategy Foundation.** This allows us to confirm why your company exists, where it is headed, what success looks like, and which strategic goals should guide everything else. Once the foundation is clear, business strategy, execution, and financial analytics follow with much more focus.

Which path would you like to start with?`;
}

// ── Proposal memory block — appended to saved assistant messages ──────────────

function buildProposalMemoryBlock(proposals: Proposal[]): string {
  const lines = proposals.map(p => `  - ${p.entity} (${p.action}): "${p.label}"`);
  return `\n\n[PROPOSALS_SHOWN_TO_USER: ${proposals.length} proposal${proposals.length !== 1 ? 's' : ''} are currently displayed in the approval panel and AWAITING user click on "Apply":
${lines.join('\n')}
Do NOT re-generate these. Tell the user to click "Apply ${proposals.length} change${proposals.length !== 1 ? 's' : ''}" in the panel to write them to the platform.]`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function runCoachAgent(req: ChatRequest, env: Env): Promise<ChatResponse> {
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Load full company context
  const ctx = await db.getCompanyContext(req.org_id);
  if (!ctx) throw new Error(`Org ${req.org_id} not found`);

  // 2. Resolve or create conversation
  const conversationId = req.conversation_id
    ?? await db.getOrCreateConversation(req.org_id, req.user_id);

  // 3. Load history — length drives phase detection
  const history = await db.getConversationHistory(conversationId);

  // ── Phase routing ──────────────────────────────────────────────────────────

  // Phase 1 Message 1: empty message + no history → scripted welcome
  const isWelcome = !req.message.trim() && history.length === 0;

  // Phase 1 Message 2: user replied to welcome (history has exactly 1 assistant message).
  // Send the scripted orientation UNLESS the user already jumped to a specific domain —
  // in that case route to the specialist immediately (they don't need the tour).
  const isEarlyMessage = history.length === 1 && !!req.message.trim();
  const domains = assessDomains(ctx);
  const earlyRoute = isEarlyMessage ? detectRoute(req.message.trim(), history, domains) : null;

  if (isEarlyMessage && earlyRoute === 'supervisor') {
    // User gave a generic reply (e.g. "Path B", "let's go", "yes") — show orientation
    const content = buildPlatformOrientation();
    await db.addMessage(conversationId, 'user', req.message.trim());
    await db.addMessage(conversationId, 'assistant', content);
    return { conversation_id: conversationId, content, role: 'assistant' };
  }

  // Resume mode: empty message sent by the chat panel when it opens with an existing conversation.
  // Return the last assistant message without adding to history or calling the AI.
  if (!req.message.trim() && history.length > 0) {
    const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
    return {
      conversation_id: conversationId,
      content: lastAssistant?.content ?? 'Welcome back. How can I help you continue?',
      role: 'assistant',
    };
  }

  // All other turns — route to specialist agent or supervisor
  // (domains already computed above for earlyRoute detection)
  let assistantContent: string;
  let proposals: Proposal[] | undefined;

  if (isWelcome) {
    // Phase 1 Message 1: AI-generated personalised welcome
    const systemPrompt = buildSystemPrompt(ctx, history.length);
    const userPrompt   = buildWelcomePrompt(ctx, req.user_name ?? null);
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ];
    const result = await callOpenAIText(env.OPENAI_API_KEY, messages, 600);
    assistantContent = result.content;
    if (!assistantContent) throw new Error('Empty response from AI');
    await db.addMessage(conversationId, 'assistant', assistantContent);
  } else {
    // Normal turns — detect which agent should handle this
    const userMessage = req.message.trim();
    if (!userMessage) throw new Error('Empty message with existing conversation history');

    const route = detectRoute(userMessage, history, domains);

    const registryAgent = getAgent(route);
    if (registryAgent) {
      const { content: agentContent, toolCalls: agentToolCalls } = await registryAgent.run(ctx, history, userMessage, env);
      assistantContent = agentContent || (agentToolCalls.length > 0
        ? "I've prepared some proposals for your review below."
        : agentContent);
      proposals = buildProposals(agentToolCalls, req.org_id);
    } else {
    switch (route) {
      default: {
        // Supervisor handles general guidance, cross-domain questions, navigation
        const systemPrompt = buildSystemPrompt(ctx, history.length);
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...history
            .filter(m => m.role !== 'tool' && m.content)
            .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content as string })),
          { role: 'user', content: userMessage },
        ];
        const { content: rawContent, toolCalls } = await callOpenAIWithTools(
          env.OPENAI_API_KEY,
          messages,
          PROPOSAL_TOOLS,
        );
        assistantContent = rawContent || (toolCalls.length > 0
          ? "I've prepared some proposals for your review below."
          : "I'm not sure how to help with that. Could you clarify?");
        proposals = buildProposals(toolCalls, req.org_id);
      }
    }
    } // end else (registry agent)

    if (!assistantContent) throw new Error('Empty response from AI');

    // Auto-title: set the conversation title from the second meaningful user message
    const priorUserCount = history.filter(m => m.role === 'user').length;
    await db.addMessage(conversationId, 'user', userMessage);
    // Store proposals in message history so the agent remembers what it proposed
    const savedContent = (proposals && proposals.length > 0)
      ? assistantContent + buildProposalMemoryBlock(proposals)
      : assistantContent;
    await db.addMessage(conversationId, 'assistant', savedContent);
    if (priorUserCount === 1 && userMessage.length > 10) {
      const title = userMessage.slice(0, 60).trim();
      db.setConversationTitle(conversationId, title).catch(() => {});
    }
  }

  return {
    conversation_id: conversationId,
    content: assistantContent,
    role: 'assistant',
    proposals: proposals && proposals.length > 0 ? proposals : undefined,
  };
}

/**
 * Re-run the agent from the current state of a conversation.
 * Used by the edit+regenerate flow: the message has already been updated
 * in the DB and subsequent messages deleted — this loads the updated history,
 * calls the right agent, and saves only the new assistant response.
 */
export async function runAgentContinue(
  conversationId: string,
  orgId: string,
  env: Env,
): Promise<ChatResponse> {
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const ctx = await db.getCompanyContext(orgId);
  if (!ctx) throw new Error(`Org ${orgId} not found`);

  const history = await db.getConversationHistory(conversationId);
  if (history.length === 0) throw new Error('No messages in conversation');

  // The last message in history should be the (now-edited) user message
  const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
  if (!lastUserMsg?.content) throw new Error('No user message to continue from');

  const userMessage = lastUserMsg.content;
  // History passed to agents excludes the last user message (it's the current turn)
  const historyForAgent = history.slice(0, -1);

  const domains = assessDomains(ctx);
  const route = detectRoute(userMessage, historyForAgent, domains);

  let assistantContent: string;
  let proposals2: Proposal[] | undefined;
  const registryAgent2 = getAgent(route);
  if (registryAgent2) {
    const { content: agentContent2, toolCalls: agentToolCalls2 } = await registryAgent2.run(ctx, historyForAgent, userMessage, env);
    assistantContent = agentContent2 || (agentToolCalls2.length > 0
      ? "I've prepared some proposals for your review below."
      : agentContent2);
    proposals2 = buildProposals(agentToolCalls2, orgId);
  } else {
  switch (route) {
    default: {
      const systemPrompt = buildSystemPrompt(ctx, history.length);
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...historyForAgent
          .filter(m => m.role !== 'tool' && m.content)
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content as string })),
        { role: 'user', content: userMessage },
      ];
      const result = await callOpenAIText(env.OPENAI_API_KEY, messages, 900);
      assistantContent = result.content;
    }
  }
  } // end else (registry agent)

  if (!assistantContent) throw new Error('Empty response from AI');
  const savedContent2 = (proposals2 && proposals2.length > 0)
    ? assistantContent + buildProposalMemoryBlock(proposals2)
    : assistantContent;
  await db.addMessage(conversationId, 'assistant', savedContent2);

  return {
    conversation_id: conversationId,
    content: assistantContent,
    role: 'assistant',
    proposals: proposals2 && proposals2.length > 0 ? proposals2 : undefined,
  };
}
