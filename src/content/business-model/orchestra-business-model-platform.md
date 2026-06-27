# OrchestrA Strategy — Business Strategy Platform Guide

> **Agent reference document.** Update when new features ship and re-seed via `seed_platform.sh`.
> Last updated: 2026-06-26 | Version: 0.1 (development)

---

## What Is the Business Strategy Module

The Business Strategy module is where each business unit defines HOW it competes. It starts with the Business Model Canvas, moves through strategic assessment, and culminates in Playing to Win strategic choices. This is the agent's primary domain.

Navigation: **Business Strategy** (left sidebar)

Base URL: `/app/business-strategy/`

For multi-BU companies, each BU has its own business strategy. The module includes a BU picker to switch between units.

---

## Sub-Modules

### 1. Home
**URL:** `/app/business-strategy/home`

Overview of business strategy completeness — how much of the BMC is filled, whether Playing to Win choices are defined, and external environment status.

---

### 2. BU Picker
**URL:** `/app/business-strategy/bu-picker`

For multi-BU companies: select which business unit to work on before entering the strategy modules.

---

### 3. Map Business Model (Business Model Canvas)
**URL:** `/app/business-strategy/map-business-model`

The full Business Model Canvas — 9 building blocks displayed as an interactive canvas:

| Block | What it captures |
|---|---|
| Value Proposition | The core value delivered to customers |
| Customer Segments | Who the business serves |
| Channels | How the company reaches customers |
| Customer Relationships | How the company interacts with customers |
| Revenue Streams | How the business makes money |
| Key Resources | What assets are essential |
| Key Activities | What the company must do well |
| Key Partners | Who the company relies on |
| Cost Structure | What the business costs to run |

**Agent CAN propose:** `propose_bmc_update` — updates any single BMC block. Always explain what you're proposing for each block before calling the tool.

**Approach:** Fill blocks collaboratively. Start with Value Proposition and Customer Segments (the "what" and "who"), then Revenue/Channels (the "how we make money"), then Key Activities/Resources (the "how we deliver"). Cost and Partners last.

---

### 4. Assess Business Model
**URL:** `/app/business-strategy/assess-business-model`

A structured assessment of each BMC building block on two dimensions: current performance and strategic importance. Produces a heat map that surfaces which blocks are strong vs. at risk.

**Sub-assessments:**
- **SWOT per block**: strengths, weaknesses, opportunities, threats for each building block
- **Block scores**: 1-5 rating on current state
- **Strategic importance**: how critical each block is to the winning strategy

The agent can discuss assessment findings and recommend which blocks to prioritize for improvement.

---

### 5. External Environment (PESTEL)
**URL:** `/app/business-strategy/external-environment`

PESTEL analysis — Political, Economic, Social, Technological, Environmental, Legal factors that affect the business. Surfaces external opportunities and threats to incorporate into strategy.

**What's here:**
- 6 PESTEL dimension cards, each with user-entered factors
- AI-generated PESTEL insights (via agent discussion)
- Live macroeconomic data integration (FRED API) where available

The agent can discuss PESTEL factors and their strategic implications based on the company's industry and context.

---

### 6. Design Business Strategy (Playing to Win)
**URL:** `/app/business-strategy/design-business-strategy`

The strategic choices framework based on Roger Martin's "Playing to Win":

| Choice | Question |
|---|---|
| Winning Aspiration | What does winning look like? |
| Where to Play | Which markets, segments, channels? |
| Where NOT to Play | What are we explicitly declining? |
| How to Win | What is our competitive advantage? |
| Must-Have Capabilities | What must we be excellent at? |
| Management Systems | How do we govern and reinforce the strategy? |

**Agent CAN propose:** None directly. The agent guides the user through each choice via conversation, then the user enters them. This is a facilitated dialogue, not a proposal.

**How to run this session:**
1. Start with Winning Aspiration: "What does winning look like for [company] in 3 years?"
2. Where to Play: "Which customer segments and geographies are you targeting?"
3. How to Win: "What makes [company] genuinely different from alternatives?"
4. Capabilities: "To win that way, what must you be world-class at?"
5. Summarize and guide user to enter in the platform

---

### 7. Functional Strategies Overview
**URL:** `/app/business-strategy/functional-strategies`

Overview of functional-level strategies that support the business strategy:

- **Partnership Strategy** — strategic partner selection, partnership types, governance
- **Pricing Strategy** — pricing model, price positioning, value-based vs. cost-plus

These are supporting strategies that flow from the Playing to Win choices.

---

### 8. Partnership Strategy
**URL:** `/app/business-strategy/partnership-strategy`

Defines the company's approach to strategic partnerships — who to partner with, why, what kind of partnership (channel, technology, co-marketing, joint venture), and how to manage the relationship.

---

### 9. Pricing Strategy
**URL:** `/app/business-strategy/pricing-strategy`

Pricing model, positioning, and strategy. Covers:
- Pricing model (subscription, transaction, usage-based, freemium, etc.)
- Price positioning (premium, mid-market, budget)
- Value-based pricing methodology
- Competitor price benchmarking

---

## What the Agent CAN Do (via proposals):
- `propose_bmc_update` — fills or updates any of the 9 BMC blocks

## What the Agent CANNOT Do (user manages manually):
- BMC block assessments / SWOT entries
- PESTEL factor entries
- Playing to Win strategic choices (guided conversation only, user types)
- Partnership strategy entries
- Pricing strategy entries
- Functional strategies content

---

## Agent Approach to Business Strategy Sessions

### Session type: "Help me fill my Business Model Canvas"
1. NEVER fill all 9 blocks at once — that produces generic output
2. Start with the user: "Let's do Value Proposition first. Who is your primary customer, and what problem do you solve for them that no one else does as well?"
3. Discuss and refine each answer, then call `propose_bmc_update` for that block
4. Move block by block, adapting each based on what was established in previous blocks
5. After 3-4 blocks, pause: "How does this feel so far? Does the Value Proposition still hold given what we said about Customer Segments?"

### Session type: "Help me define our strategy"
1. Assess BMC completeness first — can't define strategic choices without a business model
2. If BMC is empty: start there first
3. If BMC is filled: move to "Design Business Strategy"
4. Run the Playing to Win dialogue (see above)
5. After choices are defined, guide to BOS to translate choices into OKRs and capabilities

### Session type: "Analyze our external environment"
1. Ask which industry/market they're in (usually visible in company profile)
2. Surface 2-3 key PESTEL factors most relevant to their situation
3. Connect to strategic implications: "The rise of AI (Technological) directly impacts your Value Proposition — is your service AI-augmented yet?"
4. Guide user to External Environment page to document findings

---

## How Business Strategy Connects to Other Modules

```
Strategy Foundation (strategic goals)
  ↓ informs
Business Strategy (Playing to Win — how to achieve those goals)
  ↓ value proposition + customer segments
BOS → Playbooks (how to deliver the value proposition operationally)
  ↓ must-have capabilities
BOS → Capabilities & Skills (what the team must excel at)
  ↓ where to play (markets/segments)
Corporate Strategy → Portfolio (which markets get capital)
```
