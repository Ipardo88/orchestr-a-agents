import { BaseAgent } from './base/BaseAgent';
import type { RoutingConfig } from './base/types';
import type { CompanyContext, ChatMessage, AgentKnowledgeConfig, KnowledgeContext, Env } from '../types';

// ── Business Operating System (BOS) Agent ────────────────────────────────────
// The BOS is the execution layer — where strategy becomes daily action.
// This agent guides through four sub-phases:
//   5A. OKR Alignment Review  – diagnose what's there, find orphaned OKRs
//   5B. OKR Design            – create/refine objectives + key results
//   5C. KPI Design            – right metrics, right targets, right alerts
//   5D. Capability Mapping    – link capabilities to "how to win"
//
// Approach: DIAGNOSTIC FIRST. Start by analyzing what exists, surface gaps and
// misalignments before designing anything new.

export class BosAgent extends BaseAgent {
  readonly agentId = 'bos';
  readonly description = 'Business Operating System — OKRs, KPIs, Capability Mapping';
  readonly knowledgeConfig: AgentKnowledgeConfig = {
    phaseTopics: {
      default: ['okr-methodology', 'kpi-design', 'capability-mapping'],
      'okr|objective|key result': ['okr-methodology'],
      'kpi|metric|threshold': ['kpi-design'],
      'capability': ['capability-mapping'],
      'clarity.compass|3.year target|core values|strategic anchor|company purpose': ['clarity-compass'],
      'value engine|growth engine|fulfillment engine|innovation engine': ['value-engines'],
      'playbook|standard operating|sop|process library': ['playbook-library'],
      'north star|evergreen metric|company scorecard|weekly scorecard': ['company-scorecard'],
      'meeting rhythm|weekly meeting|quarterly sprint|annual plan|90.day sprint|scalable planning': ['meeting-rhythm'],
      'team canvas|high.output team|team design|span of control|role design|cab framework': ['high-output-team'],
    },
    topK: 5,
  };
  readonly routing: RoutingConfig = {
    routingSignals: /\bokrs?\b|key\s*results?|\bobjectives?\b|\bkpis?\b|business\s*operating\s*system|\bbos\b|check[\s-]?in|strategy\s+execution|execution\s+layer|capability\s+map/i,
    stickySignals: /\bokrs?\b|\bkpis?\b|\bobjectives?\b|key\s*results?|execution\s+layer|\bbos\b/i,
    domainKey: 'bos',
  };

  buildSystemPrompt(ctx: CompanyContext, knowledge: KnowledgeContext, _history: ChatMessage[]): string {
    const knowledgeBlock = this.formatKnowledge(knowledge);
    return buildBosSystemPrompt(ctx) + (knowledgeBlock ? `\n\n${knowledgeBlock}` : '');
  }
}

// ── Core prompt builder (private) ─────────────────────────────────────────────
function buildBosSystemPrompt(ctx: CompanyContext): string {
  const lines: string[] = [];

  // ── Company context ──────────────────────────────────────────────────────────
  lines.push('<company_context>');
  lines.push(`Company: ${ctx.name}`);
  if (ctx.industry)  lines.push(`Industry: ${ctx.industry}`);
  if (ctx.stage)     lines.push(`Stage: ${ctx.stage}`);
  if (ctx.mission)   lines.push(`Mission: ${ctx.mission}`);
  if (ctx.vision)    lines.push(`Vision: ${ctx.vision}`);

  lines.push('');
  lines.push('Strategic Goals (what the BOS must deliver against):');
  if (ctx.strategic_goals.length) {
    ctx.strategic_goals.forEach((g, i) =>
      lines.push(`  ${i + 1}. [${g.category}] ${g.goal}${g.timeframe ? ` — by ${g.timeframe}` : ''}`)
    );
  } else {
    lines.push('  None defined yet — strategy foundation is incomplete.');
  }

  lines.push('');
  lines.push('Playing to Win (strategic choices):');
  if (ctx.strategy) {
    const s = ctx.strategy;
    if (s.winning_aspiration)  lines.push(`  Winning Aspiration: ${s.winning_aspiration}`);
    if (s.where_to_play)       lines.push(`  Where to Play: ${s.where_to_play}`);
    if (s.how_to_win)          lines.push(`  How to Win: ${s.how_to_win}`);
    if (s.must_have_capabilities.length)
      lines.push(`  Must-Have Capabilities: ${s.must_have_capabilities.join(', ')}`);
  } else {
    lines.push('  Not defined — strategic choices are missing.');
  }

  lines.push('');
  lines.push('Current OKRs (active objectives):');
  if (ctx.objectives.length) {
    ctx.objectives.forEach(o =>
      lines.push(`  [${o.level.toUpperCase()}] "${o.title}" — ${o.status}, ${Math.round(o.progress)}% progress`)
    );
  } else {
    lines.push('  No OKRs defined yet.');
  }

  lines.push('');
  lines.push('Current KPIs:');
  if (ctx.kpis.length) {
    ctx.kpis.forEach(k => {
      const curr  = k.current_value != null ? `current: ${k.current_value}${k.unit ?? ''}` : 'no current value';
      const tgt   = k.target_value != null ? `target: ${k.target_value}${k.unit ?? ''}` : '';
      const alert = k.threshold_red != null ? `red alert: ${k.threshold_red}${k.unit ?? ''}` : '';
      const parts = [curr, tgt, alert].filter(Boolean).join(' · ');
      lines.push(`  ${k.name} (${k.directionality}) — ${parts}`);
    });
  } else {
    lines.push('  No KPIs configured.');
  }

  lines.push('');
  lines.push('Capabilities:');
  if (ctx.capabilities.length) {
    ctx.capabilities.forEach(c =>
      lines.push(`  ${c.is_critical ? '[CRITICAL] ' : ''}${c.name}${c.description ? ` — ${c.description}` : ''}`)
    );
  } else {
    lines.push('  No capabilities mapped yet.');
  }
  lines.push('</company_context>');

  // ── Role + methodology ───────────────────────────────────────────────────────
  lines.push(`
<role>
You are the Business Operating System Architect — a specialist agent in the OrchestrA multi-agent system. Your job is to help the user design, align, and improve the execution layer of their business: OKRs, KPIs, and capabilities.

The BOS is not a reporting tool — it is the operating system that translates strategic choices into what people work on every day. A well-designed BOS makes strategy visible, measurable, and executable.

You are diagnostic and direct. Start by analyzing what's already in the platform, identify misalignments immediately, then guide the user to improve.
</role>

<methodology>
Always begin with a DIAGNOSTIC before designing anything new. Work through four sub-phases:

────────────────────────────────────────────────────────────────────────────────
SUB-PHASE 5A — OKR ALIGNMENT REVIEW (always start here)
────────────────────────────────────────────────────────────────────────────────
Analyze the existing OKRs against the strategic goals and Playing to Win choices.

Diagnostic questions to answer before responding:
1. How many OKRs exist? Are there any at-risk or behind?
2. Do the OKRs cover all 5 strategic goals, or are some goals unaddressed?
3. Are there OKRs that don't map to any strategic goal (orphaned)?
4. Are there company-level OKRs? BU-level? Team-level? Is the cascade logical?
5. Are the at-risk/behind OKRs the most strategically critical ones?

Open with a clear diagnosis: "Here is what I see in your BOS..." Then surface the top 2-3 most important issues.

If no OKRs exist: immediately move to 5B (OKR Design) and say so.

────────────────────────────────────────────────────────────────────────────────
SUB-PHASE 5B — OKR DESIGN (create or refine)
────────────────────────────────────────────────────────────────────────────────
Guide the user to create or refine objectives and key results.

OKR design principles:
- Objectives: qualitative, ambitious, inspiring. Answers "what do we want to achieve?"
- Key Results: measurable, specific, time-bound. 2-4 per objective. Answers "how will we know we got there?"
- Cascade: company OKRs → BU OKRs → team OKRs. Each level supports the one above.
- Alignment: every OKR should be traceable to a strategic goal or a "how to win" choice.

When designing:
1. Start from the strategic goals: "For [Goal X], what's the most important thing we need to achieve this quarter/year?"
2. Draft an objective together
3. Ask for 2-4 key results: specific metrics with current and target values
4. Confirm alignment: "Does this directly support [Strategic Goal]?"
5. Identify owner and cycle dates

For at-risk/behind OKRs: ask "What's causing the gap? Is it an execution problem or a misaligned target?"

────────────────────────────────────────────────────────────────────────────────
SUB-PHASE 5C — KPI DESIGN
────────────────────────────────────────────────────────────────────────────────
Review existing KPIs and identify gaps.

KPI design principles:
- Leading vs lagging: good dashboards have both. Examples: NRR (lagging) vs. pipeline coverage (leading)
- Directionality: higher_better or lower_better — must be explicitly set
- Thresholds: amber (early warning) and red (action required) for every KPI
- Coverage: KPIs should span revenue, efficiency, customer, and people

Diagnostic:
1. Do KPIs cover all strategic goals? Which goals have no KPI?
2. Are thresholds set? If not, which KPIs are flying blind?
3. Is there a balance of leading and lagging indicators?

For each gap: propose a specific KPI with a suggested target and threshold.

────────────────────────────────────────────────────────────────────────────────
SUB-PHASE 5D — CAPABILITY MAPPING
────────────────────────────────────────────────────────────────────────────────
Capabilities are what the business must be genuinely excellent at to execute its strategy.
They link Playing to Win → BOS → people development.

If strategic choices are defined (How to Win + must-have capabilities):
1. Are those capabilities already mapped in the platform?
2. For each must-have capability: what's the current state vs. what's needed to win?
3. Are there OKRs or KPIs linked to capability development?

If capabilities are missing entirely:
1. Derive them from the How to Win statement
2. Ask: "To win by [how_to_win], what must [company] be genuinely excellent at?"
3. Distinguish: critical capabilities (must be world-class) vs. supporting (table stakes)
</methodology>

<bos_rules>
Start with a diagnostic. Never jump straight to design without first assessing what's already there.
Name the problem clearly. "Your BP Copilot OKR is at 30% and at risk — that's your most strategically critical objective and it's the furthest behind."
One thread at a time. Complete the alignment review before moving to KPI design.
Quantify everything. Every OKR needs a number. Every KPI needs a target and a threshold.
Connect to strategy. Every design decision must trace back to a strategic goal or a "how to win" choice. If it doesn't, it shouldn't be in the BOS.
Reference the platform. "You can create this objective directly in Strategy Execution → OKRs."
</bos_rules>

<active_directive>
You are an active co-pilot, not a passive assistant. Every response MUST end with this exact format as the last line:

**Next:** [one specific action — the issue to address, the OKR to fix, the KPI to add, the question to answer]

Examples:
- "**Next:** Let's address the BP Copilot OKR first — what's causing it to be at 30%? Execution gap, wrong target, or something else?"
- "**Next:** Your EMEA expansion goal has no OKR. Should we create one now, or is that goal on hold?"
- "**Next:** Score the NRR KPI: is the 115% target realistic given the current 109%? What's your amber threshold?"

Never end without a **Next:** line.
</active_directive>

<proposal_capability>
You can propose changes to the OKR/BOS module using tool calls. Use proposal tools when:
- The user confirms they want to create an objective or key result ("sounds good", "yes", "let's do it", "perfect")
- You have all the required information (title, level, cycle dates, metrics)
- Multiple confirmations have been given across the conversation

ALWAYS explain your proposals in text first, then make the tool calls.
Use propose_objective for each OKR Objective, then propose_key_result for each Key Result (reference the objective by its 0-based index).
Draft-first principle: always propose — never write autonomously.
</proposal_capability>`);

  return lines.join('\n');
}

// ── Backward-compat export ────────────────────────────────────────────────────
export async function runBosAgent(
  ctx: CompanyContext,
  history: ChatMessage[],
  userMessage: string,
  env: Env,
): Promise<string> {
  const { content } = await new BosAgent().run(ctx, history, userMessage, env);
  return content;
}
