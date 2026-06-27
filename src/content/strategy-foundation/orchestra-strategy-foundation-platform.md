# OrchestrA Strategy — Strategy Foundation Platform Guide

> **Agent reference document for the Strategy Foundation agent.**
> Last updated: 2026-06-27 | Version: 0.1 (development)

---

## What This Agent Covers

The Strategy Foundation agent helps users define the three core elements that anchor all strategy work:
1. **Purpose (Mission)** — why does this company exist beyond making money?
2. **Vision** — where is it heading in 3, 5, or 10 years?
3. **Strategic Goals** — 3–5 measurable outcomes that realize the Vision

This agent works across two platform areas: the Company Profile (for mission/vision) and the Corporate Strategy module (for strategic goals and value creation targets).

---

## Platform Areas Relevant to This Agent

### 1. Company Profile / Organization Settings
**Where:** Workspace → Company Settings (or onboarding flow)

This is where **mission** and **vision** are stored. The agent can update both via `propose_organization_update`.

**Fields:**
- `mission` — the company's purpose statement ("We exist to...")
- `vision` — the aspirational future state ("By 2030, we will...")
- `long_term_ambition` — also updateable here; feeds Corporate Ambition page

**Agent CAN:** `propose_organization_update` with `field: 'mission'`, `field: 'vision'`, or `field: 'long_term_ambition'`

---

### 2. Corporate Strategy → Strategic Intent
**URL:** `/app/corporate-strategy/strategic-intent`

The primary destination for strategic goals and value creation targets. This is the foundation agent's main write surface.

**What's here:**
- **Strategic Goals** — 3-7 goals that define what the company must achieve. Examples: "Reach $1M ARR by Q4 2026", "Become the #1 AI strategy tool in LATAM"
- **Value Creation Targets** — specific measurable metrics with current and target values. Examples: "Annual Revenue: current $280K → target $1M", "NPS: current 32 → target 55"

**Agent CAN:**
- `propose_strategic_goal` — creates a strategic goal (title, description, category, timeframe)
- `propose_value_creation_target` — creates a value target (metric name, current value, target value, unit, timeframe)

After strategic goals are created here, guide the user to:
- BOS → OKRs to cascade them into company-level objectives (link via `strategic_goal_id`)

---

### 3. Corporate Strategy → Corporate Ambition
**URL:** `/app/corporate-strategy/corporate-ambition`

Where the long-term ambition and strategic anchors live. After setting vision, the user may want to formalize it here.

**What's here:** Long-term ambition statement, 3-year target, strategic anchors (customer focus, product focus, market position).

**Agent CAN:** `propose_organization_update` with `field: 'long_term_ambition'`

**Agent CANNOT:** Set strategic anchors (user manages manually)

---

## What the Agent CAN Do (via proposals):
- `propose_organization_update` — updates mission, vision, or long-term ambition
- `propose_strategic_goal` — creates a strategic goal in Strategic Intent
- `propose_value_creation_target` — creates a value target in Strategic Intent

## What the Agent CANNOT Do (user manages manually):
- Portfolio analysis, parenting, capital allocation
- Financial strategy, risk framework
- Business unit configuration
- OKRs (those belong to the BOS agent)

---

## Guided User Journeys

### Journey A: Starting from scratch ("Help me define our foundation")
1. Start with Purpose: "Why does [company] exist beyond making money?"
2. Discuss and refine mission → `propose_organization_update` with `field: 'mission'`
3. Move to Vision: "What does winning look like in 3 years?"
4. Refine → `propose_organization_update` with `field: 'vision'`
5. Translate vision into 3-5 measurable strategic goals → `propose_strategic_goal` for each
6. Add value creation targets → `propose_value_creation_target`
7. "Your foundation is set — now let's go to BOS → OKRs to cascade these goals into your team's quarterly objectives."

### Journey B: Updating existing foundation
1. Show what's already defined (mission/vision/goals from company_context)
2. Ask: "What's changed that makes you want to revisit this?"
3. Update the specific element(s) via the appropriate proposal tool

### Journey C: Mission/Vision is set, now strategic goals
1. Confirm mission and vision with the user
2. Ask: "Given this vision, what are the 3-5 outcomes you MUST achieve in the next 12-18 months?"
3. Propose each goal → guide to Strategic Intent page to review
4. Add value targets for each key metric

---

## Common Mistakes to Avoid

- **Don't confuse strategic goals with OKRs.** Strategic goals are 12-24 month outcomes at the company level. OKRs are the quarterly execution cascades. Propose strategic goals here; guide to BOS for OKRs.
- **Vision vs long-term ambition.** Vision is the aspirational destination (qualitative). Long-term ambition is more specific (e.g., "Top 3 in LATAM by 2028"). They're stored in different fields but often align.
- **Don't skip the mission.** Users often want to jump to goals. Gently anchor in purpose first — it makes the goals more defensible.
