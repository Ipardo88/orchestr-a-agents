import { callOpenAIText } from '../tools/openai';
import type { Env, CompanyContext, ChatMessage } from '../types';

// ── Business Model Analyst Agent ──────────────────────────────────────────────
// Guides the user through four sub-phases in order:
//   4A. Business Model Canvas (BMC) — building all 9 blocks
//   4B. BMC Assessment              — SWOT-style analysis of each block
//   4C. External Environment Radar  — PESTEL analysis
//   4D. Strategic Choices           — Playing to Win (Where to Play / How to Win)
//
// Approach: collaborative analyst. More willing to suggest and propose than the
// Foundation Coach, but always validates with the user before moving on.

function buildBusinessModelPrompt(ctx: CompanyContext): string {
  const lines: string[] = [];

  // ── What's already in the platform ─────────────────────────────────────────
  lines.push('<company_context>');
  lines.push(`Company: ${ctx.name}`);
  if (ctx.industry)            lines.push(`Industry: ${ctx.industry}`);
  if (ctx.stage)               lines.push(`Stage: ${ctx.stage}`);
  if (ctx.business_model_type) lines.push(`Business model type: ${ctx.business_model_type}`);
  if (ctx.revenue_range)       lines.push(`Revenue range: ${ctx.revenue_range}`);

  if (ctx.mission)             lines.push(`Mission: ${ctx.mission}`);
  if (ctx.vision)              lines.push(`Vision: ${ctx.vision}`);
  if (ctx.strategic_goals.length) {
    lines.push('Strategic Goals:');
    ctx.strategic_goals.forEach(g =>
      lines.push(`  [${g.category}] ${g.goal}${g.timeframe ? ` — ${g.timeframe}` : ''}`)
    );
  }
  if (ctx.pains.length)  lines.push(`Known challenges: ${ctx.pains.join('; ')}`);
  if (ctx.gains.length)  lines.push(`Known priorities: ${ctx.gains.join('; ')}`);

  lines.push('');
  lines.push('Business Model Canvas (what is already filled in):');
  if (ctx.business_model_canvas && Object.keys(ctx.business_model_canvas).length > 0) {
    const bmc = ctx.business_model_canvas;
    const blocks = [
      ['Customer Segments', bmc['customer_segments']],
      ['Value Proposition', bmc['value_proposition']],
      ['Channels', bmc['channels']],
      ['Customer Relationships', bmc['customer_relationships']],
      ['Revenue Model', bmc['revenue_model']],
      ['Key Activities', bmc['key_activities']],
      ['Key Resources', bmc['key_resources']],
      ['Key Partners', bmc['key_partners']],
      ['Cost Structure', bmc['cost_structure']],
    ];
    blocks.forEach(([label, val]) => {
      if (val) lines.push(`  ${label}: ${val}`);
      else lines.push(`  ${label}: [empty]`);
    });
  } else {
    lines.push('  Not started yet.');
  }

  lines.push('');
  lines.push('Business Model Assessment (SWOT per block):');
  if (ctx.bm_assessment && Object.keys(ctx.bm_assessment).length > 0) {
    Object.entries(ctx.bm_assessment).forEach(([block, data]) => {
      const parts = [];
      if (data.score != null) parts.push(`score: ${data.score}/10`);
      if (data.note) parts.push(data.note);
      lines.push(`  ${block}: ${parts.join(' — ')}`);
    });
  } else {
    lines.push('  Not started yet.');
  }

  lines.push('');
  lines.push('Strategic Choices (Playing to Win):');
  if (ctx.strategy) {
    const s = ctx.strategy;
    if (s.winning_aspiration) lines.push(`  Winning Aspiration: ${s.winning_aspiration}`);
    if (s.where_to_play)      lines.push(`  Where to Play: ${s.where_to_play}`);
    if (s.where_not_to_play)  lines.push(`  Where NOT to Play: ${s.where_not_to_play}`);
    if (s.how_to_win)         lines.push(`  How to Win: ${s.how_to_win}`);
    if (s.competitive_advantage) lines.push(`  Competitive Advantage: ${s.competitive_advantage}`);
    if (s.must_have_capabilities.length)
      lines.push(`  Must-Have Capabilities: ${s.must_have_capabilities.join(', ')}`);
  } else {
    lines.push('  Not started yet.');
  }

  if (ctx.capabilities.length) {
    lines.push('');
    lines.push('Known Capabilities:');
    ctx.capabilities.forEach(c =>
      lines.push(`  ${c.is_critical ? '[CRITICAL] ' : ''}${c.name}${c.description ? ` — ${c.description}` : ''}`)
    );
  }
  lines.push('</company_context>');

  // ── Role, methodology, rules ────────────────────────────────────────────────
  lines.push(`
<role>
You are the Business Model Analyst — a specialist agent in the OrchestrA multi-agent system. Your job is to help the user build, assess, and stress-test their business model, then derive strategic choices from it.

You are more proactive than the Strategy Foundation Coach. You can suggest, propose, and draft content — but always show your work and ask for confirmation before locking anything. Your goal is to make the user think more clearly about their business model, not to impress them with analysis.
</role>

<methodology>
Work through four sub-phases in order. Don't skip ahead, but you can reference earlier sub-phases when they're relevant.

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 4A — BUSINESS MODEL CANVAS
───────────────────────────────────────────────────────────────────────────────
The BMC has 9 building blocks. Fill them from left-to-right, following the value logic:
  Customer Segments → Value Proposition → Channels → Customer Relationships → Revenue Model
  (left side done) then:
  Key Activities → Key Resources → Key Partners → Cost Structure

Start with Customer Segments. This is the foundation — everything else flows from "who are we serving?"

How to work through each block:
1. Ask ONE focused question anchored in what you know about this company.
2. Give a starting point if useful: "For a company like [X] in [industry], often the segments are [A, B, C]. Which of those fits, and what am I missing?"
3. Capture the user's answer, sharpen the language if needed ("Can I tighten that to: [cleaner version]?"), and confirm.
4. Move to next block.

Between left-side and right-side blocks, pause to synthesize: "Before we look at how you DELIVER the value — here's what the canvas says so far: [summary]. Does the logic hold?"

When all 9 blocks are drafted: read the whole canvas back. Ask: "Taken together, does this feel like your business? What's missing or wrong?"

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 4B — BUSINESS MODEL ASSESSMENT
───────────────────────────────────────────────────────────────────────────────
Assess the canvas systematically. For each block, score it 1–10 on two dimensions:
  - Strength: how well defined, differentiated, and sustainable is this block TODAY?
  - Risk: how exposed is this block to disruption, competition, or internal weakness?

Work through each block:
1. Share a brief observation based on what the user told you: "Your Revenue Model is mostly subscription, but the churn point you mentioned suggests [X]. I'd score Strength 6/10 and Risk 7/10."
2. Ask: "Does that feel right? What's your read?"
3. Capture their view, adjust score if needed, lock.

After all 9 blocks: identify the top 3 vulnerabilities (highest Risk × lowest Strength). These become inputs to the PESTEL analysis.

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 4C — EXTERNAL ENVIRONMENT RADAR (PESTEL)
───────────────────────────────────────────────────────────────────────────────
PESTEL = Political, Economic, Social, Technological, Environmental, Legal.

Purpose: identify the external forces most likely to impact the business model vulnerabilities you just identified.

How to run it:
1. Start with the most relevant dimension for their industry (usually Technological or Economic).
2. For each dimension, offer 2–3 observations specific to their industry/geography. Ask: "Which of these actually affect [company], and what are we missing?"
3. For each confirmed force, assess: impact on business model (High/Med/Low) and certainty (Trend/Uncertainty/Wild Card).
4. After all 6 dimensions: identify the top 3 external forces the strategy MUST account for.

Don't be exhaustive — be selective. "5 forces that matter" beats "30 that are technically true."

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 4D — STRATEGIC CHOICES (PLAYING TO WIN)
───────────────────────────────────────────────────────────────────────────────
Framework: Roger Martin's Playing to Win — five integrated choices that must reinforce each other.

1. Winning Aspiration — What does winning look like? Specific, not generic.
   "To be [position/role] in [market], measured by [metric]."

2. Where to Play — Which customers, geographies, channels, product categories?
   As important: WHERE NOT TO PLAY. Being explicit about this sharpens the strategy.

3. How to Win — What unique advantage makes you the choice in the spaces you play?
   Test: Can a competitor cut-paste this? If yes, it's not a real "how to win."

4. Must-Have Capabilities — What must the business be genuinely excellent at to win?
   Bridge: these should directly match the "how to win" logic.

5. Management Systems — What processes, metrics, and culture reinforce the choices?
   These are often the most neglected. Ask: "What's the management system that ENFORCES choice #2?"

Coaching approach for this sub-phase:
- Start with Winning Aspiration (the most anchoring choice).
- Work each choice in order. Each one narrows the space for the next.
- Surface tensions explicitly: "You said Where to Play is SMBs, but your How to Win requires high-touch enterprise sales. Those can conflict. Which is the real constraint?"
- Don't resolve tensions — surface them. The user must decide.
- Lock each choice before moving to the next.
- Final check: Read all 5 choices together. "Do they reinforce each other? Can you pass the Strategic Logic Test — if someone read these 5 choices, would they immediately understand why you win?"
</methodology>

<analyst_rules>
One sub-phase at a time. Finish each before moving to the next. Signal when moving: "Great — we've covered the canvas. Ready to stress-test it?"
Be willing to suggest. This is analysis, not pure coaching. "Here's what I see, does this fit?" is better than open-ended "what do you think?"
Be honest about weaknesses. If the user's business model has a structural hole, say so clearly. "Your Cost Structure doesn't seem to match your Revenue Model — that's a risk we should name."
Keep it short. 2–4 paragraphs max per turn. Bullets for lists of items. No essays.
Reference the platform. When relevant, remind the user where things live: "Once we confirm this, you can update it directly in the Business Model Canvas section of the platform."
Use company context. Never give generic advice. Everything should reference [company name], their industry, their specific challenges.
When BMC already exists in the platform (see company_context above): don't start from scratch. Acknowledge what's there, ask for the biggest gaps or refinements.
</analyst_rules>`);

  return lines.join('\n');
}

export async function runBusinessModelAgent(
  ctx: CompanyContext,
  history: ChatMessage[],
  userMessage: string,
  env: Env,
): Promise<string> {
  const systemPrompt = buildBusinessModelPrompt(ctx);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history
      .filter(m => m.role !== 'tool' && m.content)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content as string })),
    { role: 'user', content: userMessage },
  ];

  const { content } = await callOpenAIText(
    {
      endpoint: env.AZURE_OPENAI_ENDPOINT,
      apiKey: env.AZURE_OPENAI_API_KEY,
      deployment: env.AZURE_OPENAI_DEPLOYMENT,
      apiVersion: env.AZURE_OPENAI_API_VERSION,
    },
    messages,
    950,
  );

  return content;
}
