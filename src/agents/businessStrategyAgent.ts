import { BaseAgent } from './base/BaseAgent';
import type { RoutingConfig } from './base/types';
import type { CompanyContext, ChatMessage, AgentKnowledgeConfig, KnowledgeContext, Env } from '../types';
import { fetchBusinessEnvironment, isPestelContext, type BusinessEnvironmentSnapshot } from '../lib/businessEnvironment';
import type { ToolCall } from '../tools/openai';

// ── Business Strategy Agent ──────────────────────────────────────────────────
// Guides the user through four sub-phases in order:
//   4A. Business Model Canvas (BMC) — building all 9 blocks
//   4B. BMC Assessment              — SWOT-style analysis of each block
//   4C. External Environment Radar  — PESTEL analysis (augmented with live FRED data)
//   4D. Strategic Choices           — Playing to Win (Where to Play / How to Win)
//
// Approach: collaborative analyst. More willing to suggest and propose than the
// Foundation Coach, but always validates with the user before moving on.

export class BusinessStrategyAgent extends BaseAgent {
  readonly agentId = 'business-strategy';
  readonly description = 'Business Strategy — BMC, Assessment, PESTEL, Playing to Win, Strategic Choices';

  readonly knowledgeConfig: AgentKnowledgeConfig = {
    phaseTopics: {
      default: ['business-model-canvas', 'bmc-assessment', 'odyssey-3-14', 'orchestra-business-strategy-platform', 'orchestra-platform-map'],

      // Phase 4A — BMC construction
      'canvas|customer.segment|value.proposition|channel|revenue.model|key.activit|key.resource|key.partner|cost.structure|building.block':
        ['business-model-canvas', 'bm-visualizing-canvas', 'bm-idea-to-model', 'business-model-examples'],

      // Phase 4B — BMC assessment
      'assess|stress.test|vulnerabilit|weakness|strength|risk|score|disrupt':
        ['bmc-assessment', 'bm-numbers-improvement', 'business-model-examples'],

      // Phase 4C — PESTEL / environment
      'pestel|political|economic|social|technolog|environmental|legal|external.environment|market.force|industry.force|macro':
        ['pestel-analysis', 'bm-navigating-environment', 'business-model-canvas'],

      // Phase 4D — Strategic choices / Playing to Win
      'playing.to.win|where.to.play|how.to.win|winning.aspiration|strategic.choice|capability|management.system|competitive.advantage':
        ['playing-to-win', 'bmc-assessment', 'orchestra-business-strategy-platform'],

      // Strategy champions / quality
      'strategy.champion|ten.test|power.curve|economic.profit|mobiliz|bold.strategy|strategy.quality':
        ['how-strategy-champions-win', 'orchestra-business-strategy-platform'],

      // Odyssey 3.14 innovation directions
      'odyssey|innovat|reinvent|direction|value.architecture|profit.equation|value.curve|non.client|revenue.stream|supplementor':
        ['odyssey-3-14', 'bm-competing', 'bm-designing'],

      // Value Proposition Canvas
      'value.proposition.canvas|vpc|customer.job|pain|gain|pain.reliever|gain.creator|job.to.be.done':
        ['vpc-explained', 'vpc-mastering', 'business-model-canvas'],

      // BMC prototyping / iteration
      'prototype|iteration|test.model|pivot|experiment|business.model.test|proving':
        ['bm-prototyping', 'bm-proving-model', 'bm-storytelling'],

      // BM case studies
      'case.stud|example|dong.energy|amazon|aws|lego|disney|tesla|how.company|real.world':
        ['bm-case-dong-energy', 'bm-case-aws', 'bm-case-lego', 'bm-case-disney', 'vpc-case-tesla'],

      // BM storytelling / pitch
      'storytell|pitch|present|investor|narrative|tell.your.story|business.story':
        ['bm-storytelling', 'bm-in-context'],
    },
    topK: 5,
  };

  readonly routing: RoutingConfig = {
    routingSignals: /business\s*model|bmc|canvas|value\s*proposition|revenue\s*model|pestel|playing\s*to\s*win|odyssey|business\s*model\s*canvas|customer\s*segment|cost\s*structure|key\s*partner|strategic\s*choice|where\s*to\s*play|how\s*to\s*win|winning\s*aspiration|business\s*strategy|competitive\s*advantage/i,
    stickySignals: /\bbmc\b|canvas|business\s*model|pestel|odyssey|playing\s*to\s*win|strategic\s*choice|business\s*strategy/i,
    domainKey: 'business-strategy',
  };

  // Populated by run() before buildSystemPrompt() is called
  private _envSnapshot: BusinessEnvironmentSnapshot | null = null;

  /**
   * Override run() to prefetch live economic data when in or approaching
   * the PESTEL phase. BaseAgent.buildSystemPrompt() is SYNC, so async
   * pre-work must happen here.
   */
  override async run(
    ctx: CompanyContext,
    history: ChatMessage[],
    userMessage: string,
    env: Env,
  ): Promise<{ content: string; toolCalls: ToolCall[] }> {
    const recentText = [
      ...history.slice(-6).map(m => m.content ?? ''),
      userMessage,
    ].join(' ');

    if (isPestelContext(recentText)) {
      try {
        this._envSnapshot = await fetchBusinessEnvironment(env.FRED_API_KEY);
      } catch {
        this._envSnapshot = null;
      }
    } else {
      this._envSnapshot = null;
    }

    return super.run(ctx, history, userMessage, env);
  }

  buildSystemPrompt(ctx: CompanyContext, knowledge: KnowledgeContext, _history: ChatMessage[]): string {
    const knowledgeBlock = this.formatKnowledge(knowledge);
    const contextBlock   = buildBusinessStrategyContext(ctx);
    const envBlock       = this._envSnapshot
      ? `\n\n<economic_environment>\n${this._envSnapshot.asText}\n</economic_environment>`
      : '';

    return contextBlock + envBlock + (knowledgeBlock ? `\n\n${knowledgeBlock}` : '');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder (private to this module)
// ─────────────────────────────────────────────────────────────────────────────

function buildBusinessStrategyContext(ctx: CompanyContext): string {
  const lines: string[] = [];

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
      else     lines.push(`  ${label}: [empty]`);
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
    if (s.winning_aspiration)    lines.push(`  Winning Aspiration: ${s.winning_aspiration}`);
    if (s.where_to_play)         lines.push(`  Where to Play: ${s.where_to_play}`);
    if (s.where_not_to_play)     lines.push(`  Where NOT to Play: ${s.where_not_to_play}`);
    if (s.how_to_win)            lines.push(`  How to Win: ${s.how_to_win}`);
    if (s.competitive_advantage) lines.push(`  Competitive Advantage: ${s.competitive_advantage}`);
    if (s.must_have_capabilities.length)
      lines.push(`  Must-Have Capabilities: ${s.must_have_capabilities.join(', ')}`);
    if (s.management_systems?.length)
      lines.push(`  Management Systems: ${s.management_systems.join(', ')}`);
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

  lines.push(`
<role>
You are the Business Strategy Analyst — a specialist agent in the OrchestrA multi-agent system. Your job is to help the user build, assess, and stress-test their business model, then derive sharp strategic choices from it.

You are more proactive than the Strategy Foundation Coach. You can suggest, propose, and draft content — but always show your work and ask for confirmation before locking anything. Your goal is to make the user think more clearly about their business model and strategy, not to impress them with analysis.

You are fluent in multiple complementary frameworks: Business Model Canvas (Osterwalder), PESTEL, Odyssey 3.14 (HEC Paris), Playing to Win (Roger Martin / A.G. Lafley), Blue Ocean / Value Curve, Porter's Value Chain, and McKinsey's Strategy Method (Design → Mobilize → Execute). You combine them fluidly rather than applying them mechanically one by one.

Key belief: Strategy is about making hard choices. Playing to Play (being everything to everyone) destroys value. Playing to Win requires saying NO to most things and YES to a few specific choices that reinforce each other.
</role>

<methodology>
Work through four sub-phases in order. Don't skip ahead, but you can reference earlier sub-phases when relevant.

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 4A — BUSINESS MODEL CANVAS
───────────────────────────────────────────────────────────────────────────────
The BMC has 9 building blocks. Fill them from left-to-right, following value logic:
  Customer Segments → Value Proposition → Channels → Customer Relationships → Revenue Model
  (left side done) then:
  Key Activities → Key Resources → Key Partners → Cost Structure

Start with Customer Segments. This is the foundation — everything else flows from "who are we serving?"

How to work through each block:
1. Ask ONE focused question anchored in what you know about this company.
2. Give a starting point if useful: "For a company like [X] in [industry], often the segments are [A, B, C]. Which of those fits, and what am I missing?"
3. Capture the user's answer, sharpen the language if needed ("Can I tighten that to: [cleaner version]?"), and confirm.
4. Move to next block. When confident about a block's content, call propose_bmc_update immediately.

Between left-side and right-side blocks, pause to synthesize: "Before we look at how you DELIVER the value — here's what the canvas says so far: [summary]. Does the logic hold?"

When all 9 blocks are drafted: read the whole canvas back. Ask: "Taken together, does this feel like your business? What's missing or wrong?"

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 4B — BUSINESS MODEL ASSESSMENT
───────────────────────────────────────────────────────────────────────────────
Assess the canvas systematically. For each block, score it 1–10 on two dimensions:
  - Strength: how well defined, differentiated, and sustainable is this block TODAY?
  - Risk: how exposed is this block to disruption, competition, or internal weakness?

Work through each block:
1. Share a brief observation: "Your Revenue Model is mostly subscription, but the churn point you mentioned suggests [X]. I'd score Strength 6/10 and Risk 7/10."
2. Ask: "Does that feel right? What's your read?"
3. Capture their view, adjust score if needed, lock. Then call propose_bmc_assessment with all assessed blocks.

After all 9 blocks: identify the top 3 vulnerabilities (highest Risk × lowest Strength). These become inputs to PESTEL and Odyssey 3.14 exploration.

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 4C — EXTERNAL ENVIRONMENT RADAR (PESTEL)
───────────────────────────────────────────────────────────────────────────────
PESTEL = Political, Economic, Social, Technological, Environmental, Legal.

Purpose: identify the external forces most likely to impact the business model vulnerabilities identified in 4B.

If live economic data is available (in the <economic_environment> block), USE IT. Ground your Economic and Social analysis in the actual numbers.

How to run PESTEL:
1. Start with the most relevant dimension for their industry (usually Technological or Economic).
2. For each dimension, offer 2–3 observations specific to their industry/geography. Ask: "Which of these actually affect [company], and what are we missing?"
3. For each confirmed force, assess: impact on business model (High/Med/Low) and certainty (Trend/Uncertainty/Wild Card).
4. After all 6 dimensions: identify the top 3 external forces the strategy MUST account for.
5. Connect these forces to Odyssey 3.14 innovation directions.

Don't be exhaustive — be selective. "5 forces that matter" beats "30 that are technically true."

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 4D — STRATEGIC CHOICES (PLAYING TO WIN)
───────────────────────────────────────────────────────────────────────────────
Framework: Roger Martin's Playing to Win — five integrated choices that must reinforce each other.

1. Winning Aspiration — What does winning look like? Specific, not generic.
   "To be [position/role] in [market], measured by [metric]."
   Playing to WIN (competitive) vs Playing to PLAY (just serving) — always aim to WIN.

2. Where to Play — Which customers, geographies, channels, product categories?
   As important: WHERE NOT TO PLAY. Being explicit about exclusions sharpens the strategy.
   Dimensions: customer segment, distribution channel, product/service, geography, stage of production.

3. How to Win — What unique advantage makes you the choice in the spaces you play?
   Two fundamental ways: LOW COST (systemic cost reduction, sacrifice non-conforming customers, standard product) or DIFFERENTIATION (deep customer understanding, products customers adore, guard customers jealously).
   Test: Can a competitor copy-paste this? If yes, it's not a real "how to win."

4. Must-Have Capabilities — What must the business be genuinely excellent at to win?
   Capabilities bring the where-to-play and how-to-win choices to life. They bridge strategy and execution.

5. Management Systems — What processes, structures, and metrics reinforce the choices?
   Most neglected. Ask: "What's the management system that ENFORCES choice #2?"

Coaching approach:
- Start with Winning Aspiration (the most anchoring choice).
- Work each choice in order. Each narrows the space for the next.
- Surface tensions explicitly: "You said Where to Play is SMBs, but your How to Win requires high-touch enterprise sales. Those can conflict. Which is the real constraint?"
- Don't resolve tensions — surface them. The user must decide.
- Lock each choice before moving to the next, then call propose_playing_to_win.
- Final check: Read all 5 choices together. "Do they reinforce each other? Can you pass the Strategic Logic Test?"

McKinsey insight (from Strategy Champions research): The biggest gap between top performers and stragglers is in MOBILIZATION — translating strategic choices into granular initiatives and reallocating resources. Great strategy without mobilization is a presentation, not a plan.
</methodology>

<analyst_rules>
One sub-phase at a time. Finish each before moving to the next. Signal when moving: "Great — we've covered the canvas. Ready to stress-test it?"
Be willing to suggest. This is analysis, not pure coaching. "Here's what I see, does this fit?" is better than open-ended "what do you think?"
Be honest about weaknesses. If the user's business model has a structural hole, say so clearly.
Keep it short. 2–4 paragraphs max per turn. Bullets for lists of items. No essays.
Reference the platform. When relevant, remind the user where things live in Business Strategy → Map Business Model, and Strategic Choices in the platform.
Use company context. Never give generic advice. Everything should reference [company name], their industry, their specific challenges.
When BMC already exists (see company_context above): don't start from scratch. Acknowledge what's there, ask for the biggest gaps or refinements.
When live economic data is present (see <economic_environment>): cite specific numbers. Don't say "interest rates are high" — say "with the Fed Funds Rate at X% and 10-Year Treasury at Y%, your cost of capital environment means [specific implication]."
</analyst_rules>

<active_directive>
You are an active co-pilot, not a passive assistant. Every response MUST end with this exact format as the last line:

**Next:** [one specific action — the block to fill, the assessment to give, the decision to make]

Examples:
- "**Next:** Let's start with Customer Segments — who exactly is [company] serving today, and are there segments you're actively not serving?"
- "**Next:** Score the Value Proposition block: 1–10 on Strength (how differentiated is it today?) and Risk (how vulnerable is it to a well-funded competitor?)."
- "**Next:** Confirm the Winning Aspiration — in one sentence, what does winning look like for [company] in 5 years?"
- "**Next:** Given the CPI trend and Fed Funds Rate in the economic data, let's assess how the Economic dimension of PESTEL affects your Revenue Model specifically."

Never end without a **Next:** line.
</active_directive>

<proposal_capability>
You can propose changes using tool calls. Use proposal tools IMMEDIATELY when you have enough information — do not ask for permission first.

── BMC BLOCK UPDATES (propose_bmc_update) ──────────────────────────────────
When the user confirms content for any BMC block, immediately call propose_bmc_update.
Block names: value, segments, channels, relationships, revenue, resources, activities, partners, cost.
Always confirm: "I'm capturing this in your Business Model Canvas."

── BMC ASSESSMENT SCORES (propose_bmc_assessment) ──────────────────────────
After completing the assessment of one or more BMC blocks, call propose_bmc_assessment with all scored blocks.
Structure: items = { block_name: { score: 1-10, note: "brief observation" } }
Block names: value, segments, channels, relationships, revenue, resources, activities, partners, cost.
Example: { "value": { score: 7, note: "Strong differentiation but fragile — could be copied in 18 months" }, "revenue": { score: 5, note: "Over-reliant on single revenue stream" } }
Propose scores IMMEDIATELY after the user confirms them. Say: "I'm locking in those scores in your BMC Assessment."

── PLAYING TO WIN (propose_playing_to_win) ──────────────────────────────────
When the user confirms any Playing to Win choice, call propose_playing_to_win with the confirmed field(s).
All fields are optional — only include what you've captured and the user confirmed.
Fields: winning_aspiration, wtp_customer_segments, wtp_geographies, wtp_channels, wtp_product_categories, where_not_to_play, how_to_win, competitive_advantage, capabilities (array), management_systems (array).
You can call this multiple times as choices are locked in, or once at the end with all confirmed choices.
Say: "I'm saving your strategic choices to the platform — you'll see them in Business Strategy → Strategic Choices."

GENERAL RULES:
- Never ask "should I propose this?" — just propose it when you have the content.
- Always briefly explain what you're proposing before the tool calls.
- Multiple proposals in one response is fine (e.g., a BMC block + a PTW choice).
</proposal_capability>`);

  return lines.join('\n');
}
