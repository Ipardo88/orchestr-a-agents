import { SupabaseClient } from '../tools/supabase';
import { callOpenAIText } from '../tools/openai';
import type { Env, ChatRequest, ChatResponse, CompanyContext } from '../types';

// ── Block ID → human label ────────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  partners: 'Key Partners',
  activities: 'Key Activities',
  resources: 'Key Resources',
  capabilities: 'Capabilities',
  value: 'Value Proposition',
  relationships: 'Customer Relationships',
  channels: 'Channels',
  segments: 'Customer Segments',
  profit: 'Profit Formula',
  cost: 'Cost Structure',
  revenue: 'Revenue Streams',
};

// ── System prompt ─────────────────────────────────────────────────────────────
// Best practice: data first (top), then instructions (bottom).
// XML tags separate content types so the model parses them unambiguously.

function buildSystemPrompt(ctx: CompanyContext): string {
  const lines: string[] = [];

  // ── 1. Company data (top — per "put longform data before instructions") ──────

  lines.push('<company_context>');

  // Identity
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

  // Strategy Foundation
  lines.push('<strategy_foundation>');
  if (ctx.strategic_goals.length) {
    lines.push('Strategic Goals:');
    ctx.strategic_goals.forEach(g =>
      lines.push(`  [${g.category}] ${g.goal}${g.timeframe ? ` — ${g.timeframe}` : ''}`)
    );
  } else {
    lines.push('Strategic Goals: not yet defined.');
  }
  if (ctx.value_creation_targets.length) {
    lines.push('Value Creation Targets:');
    ctx.value_creation_targets.forEach(t => {
      const curr = t.current_value ? ` (current: ${t.current_value})` : '';
      lines.push(`  ${t.metric}: target ${t.target_value}${curr}`);
    });
  }
  lines.push('</strategy_foundation>');

  // Business Strategy — Playing to Win
  lines.push('<business_strategy>');
  if (ctx.strategy) {
    const s = ctx.strategy;
    if (s.winning_aspiration)          lines.push(`Winning Aspiration: ${s.winning_aspiration}`);
    if (s.where_to_play)               lines.push(`Where to Play: ${s.where_to_play}`);
    if (s.where_not_to_play)           lines.push(`Where NOT to Play: ${s.where_not_to_play}`);
    if (s.how_to_win)                  lines.push(`How to Win: ${s.how_to_win}`);
    if (s.competitive_advantage)       lines.push(`Competitive Advantage: ${s.competitive_advantage}`);
    if (s.must_have_capabilities.length) lines.push(`Must-Have Capabilities: ${s.must_have_capabilities.join(', ')}`);
    if (s.management_systems.length)   lines.push(`Management Systems: ${s.management_systems.join(', ')}`);
  } else {
    lines.push('Playing to Win strategy: not yet defined.');
  }
  lines.push('</business_strategy>');

  // Business Model Canvas
  lines.push('<business_model_canvas>');
  if (ctx.business_model_canvas && Object.keys(ctx.business_model_canvas).length > 0) {
    for (const [blockId, text] of Object.entries(ctx.business_model_canvas)) {
      if (text) lines.push(`${BLOCK_LABELS[blockId] ?? blockId}: ${text}`);
    }
  } else {
    lines.push('Business model canvas: not yet mapped.');
  }
  lines.push('</business_model_canvas>');

  // BM Assessment
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

  // Business Operating System
  lines.push('<business_operating_system>');

  if (ctx.objectives.length) {
    const atRisk  = ctx.objectives.filter(o => o.status === 'at_risk' || o.status === 'behind');
    const onTrack = ctx.objectives.filter(o => o.status === 'on_track');
    lines.push(`Active OKRs: ${ctx.objectives.length} total`);
    if (atRisk.length) {
      lines.push('Needing attention:');
      atRisk.forEach(o =>
        lines.push(`  [${o.level.toUpperCase()}] "${o.title}" — ${o.status} at ${Math.round(o.progress)}%`)
      );
    }
    if (onTrack.length) {
      lines.push(`On track: ${onTrack.map(o => `"${o.title}"`).join(', ')}`);
    }
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
      lines.push('KPI Alerts:');
      alerts.forEach(k =>
        lines.push(`  ${k.name}: ${k.current_value}${k.unit ?? ''} vs target ${k.target_value}${k.unit ?? ''}`)
      );
    } else {
      lines.push(`KPIs: ${ctx.kpis.length} configured, no active alerts.`);
    }
  } else {
    lines.push('KPIs: not yet configured.');
  }

  if (ctx.capabilities.length) {
    const critical = ctx.capabilities.filter(c => c.is_critical);
    const others   = ctx.capabilities.filter(c => !c.is_critical);
    if (critical.length) lines.push(`Critical Capabilities: ${critical.map(c => c.name).join(', ')}`);
    if (others.length)   lines.push(`Other Capabilities: ${others.map(c => c.name).join(', ')}`);
  } else {
    lines.push('Capabilities: not yet mapped.');
  }

  lines.push('</business_operating_system>');

  // Platform module map — helps coach direct users to the right page
  lines.push('<platform_modules>');
  lines.push('1. My Workspace — KPI cards, OKR snapshot, intelligence feed, team overview');
  lines.push('2. Strategy Foundation — Purpose, vision, long-term ambition, strategic goals, value creation targets');
  lines.push('3. Business Strategy — Business model canvas, assessment, external environment, functional strategies');
  lines.push('4. Business Operating System — Engines, OKRs, KPIs, capabilities, playbooks, org chart, skills matrix');
  lines.push('5. Corporate Strategy — Portfolio, capital allocation, parenting advantage, financial strategy, risk (multi-BU)');
  lines.push('6. Financial Intelligence — Revenue, margins, cash flow, budget, forecast, valuation, ROIC');
  lines.push('</platform_modules>');

  lines.push('</company_context>');

  // ── 2. Role + behavioral instructions (bottom — after data) ──────────────────
  // Best practice: explain WHY each constraint exists so the model generalizes it.

  lines.push(`
<instructions>
You are OrchestrA, an AI strategy co-pilot embedded in the OrchestrA Strategy platform.
Your role is to guide business owners and leadership teams from strategic thinking to measurable value creation.

<response_format>
Write responses as flowing prose paragraphs — 2 to 4 short paragraphs maximum unless the user explicitly asks for more detail.
Do not start with preambles like "Based on your context..." or "As OrchestrA...". Begin with your first substantive sentence.
Reserve lists only for genuinely enumerable items (e.g., 3+ steps in a process). Prose reads better in a chat interface.
</response_format>

<grounding_rules>
Always reference the company's actual data from <company_context> above. Generic advice wastes the user's time.
When data is missing (e.g., strategy not yet defined), acknowledge the gap clearly and guide the user to the specific platform module that fills it.
Quote pains, goals, or OKR titles verbatim when referencing them — paraphrasing introduces drift.
One clear recommended next step per response. Guide one step at a time.
</grounding_rules>
</instructions>`);

  return lines.join('\n');
}

// ── Welcome prompt ────────────────────────────────────────────────────────────
// Uses XML RULES + CONTENT pattern: rules explain WHY (model generalizes from explanations),
// content provides the specific data to embed verbatim.

function buildWelcomePrompt(ctx: CompanyContext, userName: string | null): string {
  const firstName = userName ? userName.split(' ')[0] : 'there';

  const progressParts: string[] = [];
  if (ctx.strategy?.winning_aspiration || ctx.strategic_goals.length > 0)
    progressParts.push('strategic direction is defined');
  if (ctx.business_model_canvas)
    progressParts.push('business model is mapped');
  if (ctx.objectives.length > 0 || ctx.kpis.length > 0)
    progressParts.push('execution system is configured');

  const progressNote = progressParts.length
    ? `Progress already made: ${progressParts.join(', ')}.`
    : `The workspace is freshly set up — no data has been entered yet.`;

  const pains = ctx.pains.slice(0, 3).map(p => `"${p}"`).join(', ');
  const gains = ctx.gains.slice(0, 3).map(g => `"${g}"`).join(', ');

  return `Generate a welcome message for ${firstName} at ${ctx.name}.

<rules>
<rule id="opening">
The very first sentence must be exactly: "Welcome to OrchestrA Strategy, ${firstName}."
Reason: this is the platform's branded greeting and must be consistent for all users.
</rule>

<rule id="tone">
Be warm, direct, and specific. Avoid flattery phrases such as "I'm excited to work with you", "I commend you for", or "let's embark on a journey".
Reason: hollow openers erode trust and waste the user's reading time.
</rule>

<rule id="verbatim_data">
When referencing challenges or strategic priorities, quote them word-for-word from the data below.
Reason: paraphrasing introduces drift from what the user actually entered; verbatim quotes show the system has real context.
</rule>

<rule id="format">
Write in flowing prose — 3 to 4 short paragraphs. End with exactly one question.
Reason: the chat interface favors conversational prose over bullet lists.
</rule>

<rule id="no_preamble">
Begin the message directly with "Welcome to OrchestrA Strategy, ${firstName}." — no meta-commentary.
</rule>
</rules>

<content>
Paragraph 1 — Opening:
"Welcome to OrchestrA Strategy, ${firstName}." Then one sentence: OrchestrA is an AI-powered strategy-to-execution platform that connects your strategic intent to daily execution in one workspace, replacing fragmented tools and expensive consulting engagements.

Paragraph 2 — Company snapshot:
${ctx.name} is a${ctx.stage ? ` ${ctx.stage}` : ''} ${ctx.business_model_type ?? 'company'} in ${ctx.industry ?? 'their industry'}. ${progressNote}

Paragraph 3 — Context from what they've shared:
${pains ? `The challenges they've flagged are: ${pains}.` : ''}
${gains ? `Their stated strategic priorities are: ${gains}.` : ''}
${!pains && !gains ? 'They have not yet shared their challenges or priorities — acknowledge this and suggest visiting Strategy Foundation first to ground everything in their actual context.' : ''}

Paragraph 4 — Two starting paths (ask which they prefer):
Path A — Connect financial or operational data (accounting software, CRM, ERP) to activate the Financial Intelligence module and let the platform surface performance insights immediately.
Path B — Start with Strategy Foundation to define or refine purpose, vision, long-term ambition, and strategic goals — the foundation everything else builds on.
</content>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function runCoachAgent(req: ChatRequest, env: Env): Promise<ChatResponse> {
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Load full company context (all platform data in one shot)
  const ctx = await db.getCompanyContext(req.org_id);
  if (!ctx) throw new Error(`Org ${req.org_id} not found`);

  // 2. Resolve conversation (use existing or create new)
  const conversationId = req.conversation_id
    ?? await db.getOrCreateConversation(req.org_id, req.user_id);

  // 3. Load message history for continuity
  const history = await db.getConversationHistory(conversationId);

  // 4. Build grounded system prompt from full context
  const systemPrompt = buildSystemPrompt(ctx);

  // 5. Determine the user turn content
  const isWelcome = !req.message.trim() && history.length === 0;
  const userPrompt = isWelcome
    ? buildWelcomePrompt(ctx, req.user_name ?? null)
    : req.message.trim();

  if (!userPrompt) throw new Error('Empty message with existing conversation history');

  // 6. Compose the full message array
  // Best practice: system prompt carries grounded context; history provides conversation continuity
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history
      .filter(m => m.role !== 'tool' && m.content)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content as string })),
    { role: 'user', content: userPrompt },
  ];

  // 7. Call Azure OpenAI — plain prose, no JSON mode
  const { content: assistantContent } = await callOpenAIText(
    {
      endpoint: env.AZURE_OPENAI_ENDPOINT,
      apiKey: env.AZURE_OPENAI_API_KEY,
      deployment: env.AZURE_OPENAI_DEPLOYMENT,
      apiVersion: env.AZURE_OPENAI_API_VERSION,
    },
    messages,
    900,
  );

  if (!assistantContent) throw new Error('Empty response from AI');

  // 8. Persist conversation (skip storing the meta welcome-prompt; store user's real messages only)
  if (!isWelcome) {
    await db.addMessage(conversationId, 'user', req.message.trim());
  }
  await db.addMessage(conversationId, 'assistant', assistantContent);

  return { conversation_id: conversationId, content: assistantContent, role: 'assistant' };
}
