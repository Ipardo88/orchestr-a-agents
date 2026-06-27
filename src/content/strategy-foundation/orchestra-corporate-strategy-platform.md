# OrchestrA Strategy — Corporate Strategy Platform Guide

> **Agent reference document.** Update when new features ship and re-seed via `seed_platform.sh`.
> Last updated: 2026-06-26 | Version: 0.1 (development)

---

## What Is the Corporate Strategy Module

The Corporate Strategy module is for companies with multiple business units, strategic portfolios, or holding structures. It sits above the individual business unit strategy layer — this is enterprise-level decision-making: where to allocate capital, which businesses to grow or exit, how to create value as a parent company.

Navigation: **Corporate Strategy** (left sidebar)

Base URL: `/app/corporate-strategy/`

For single-BU companies, Corporate Strategy is still relevant for long-term ambition, growth planning, and risk management — but portfolio and parenting features are most valuable for multi-BU firms.

---

## Sub-Modules

### 1. Dashboard
**URL:** `/app/corporate-strategy/dashboard`

Overview of the corporate portfolio health — headline metrics across all business units, capital allocation summary, strategic goal status, and risk exposure.

---

### 2. Strategic Intent
**URL:** `/app/corporate-strategy/strategic-intent`

Where strategic goals and value creation targets live. This is the agent's primary write surface in Corporate Strategy.

**What's here:**
- **Strategic Goals** — the 3-7 goals that define what the company must achieve (e.g., "Reach $1M ARR by Q4 2026"). Created here or proposed by the Strategy Foundation agent.
- **Value Creation Targets** — specific measurable metrics with current and target values (e.g., "Annual Revenue: target $1M, current $280K")

**Agent CAN propose:** `propose_strategic_goal`, `propose_value_creation_target`

After applying proposals, guide the user to BOS → OKRs to cascade these goals into company-level objectives.

---

### 3. Corporate Ambition
**URL:** `/app/corporate-strategy/corporate-ambition`

Long-term ambition (3-5 year horizon), Clarity Compass, and strategic anchors. The "north star" framing.

**What's here:** Long-term ambition statement, 3-year target, strategic anchors (customer, product, market). Agent can update long-term ambition via `propose_organization_update` with `field: 'long_term_ambition'`.

---

### 4. Growth Strategy
**URL:** `/app/corporate-strategy/growth-strategy`

Defines the growth vectors — organic growth, M&A, partnerships, geographic expansion, new product lines. Where the company is betting for the next phase.

**How it works:** User documents growth initiatives and prioritizes them by impact and feasibility. Agent can discuss growth strategy but cannot create growth initiatives via proposals currently.

---

### 5. Portfolio Analysis
**URL:** `/app/corporate-strategy/portfolio-analysis`

For multi-BU companies: evaluates each business unit on attractiveness vs. competitive position (BCG/GE-McKinsey style matrix). Surfaces which BUs to invest, hold, or exit.

**Sub-pages:**
- Portfolio Dashboard — summary view across all BUs
- Portfolio Simulator — "what if" scenarios for capital reallocation
- Capital Allocation — explicit capital allocation decisions per BU

---

### 6. Parenting Strategy
**URL:** `/app/corporate-strategy/parenting-strategy`

Evaluates whether corporate headquarters adds value to each business unit (Parenting Advantage framework). Three sub-pages:

- **Parenting Diagnostic** — assesses where corporate creates or destroys value per BU
- **Parenting Overview** — summary of parenting value across the portfolio  
- **Parenting Strategy** — how corporate should configure itself to maximize parenting advantage

---

### 7. Corporate Development
**URL:** `/app/corporate-strategy/corporate-development`

M&A pipeline, partnership opportunities, and strategic transactions. Tracks potential acquisitions, divestitures, and strategic alliances.

---

### 8. Financial Strategy
**URL:** `/app/corporate-strategy/financial-strategy`

Financial objectives and strategic financial priorities. Links corporate strategy to financial outcomes — target ROIC, leverage policy, dividend policy, capital structure.

Also includes:
- **Financial Form** — inputs for financial targets and assumptions
- **Risk Framework / Risk Form** — strategic risk register, risk appetite, and mitigation plans

---

### 9. Business Units
**URL:** `/app/corporate-strategy/business-units`

Manage the portfolio of business units. Create, view, and configure individual BUs.

- **Business Unit List** — all BUs in the organization
- **Business Unit Detail** — drill into a specific BU: its strategy, BOS, KPIs
- **Business Unit Form** — create or edit a business unit

For single-BU companies, there is typically one BU that represents the whole company.

---

### 10. Company Setup
**URL:** `/app/corporate-strategy/company-setup`

Company profile configuration — name, industry, stage, revenue range, entity type, business model type. Used to configure the platform for the specific company context.

---

## What the Agent CAN Do (via proposals):
- `propose_strategic_goal` — creates a strategic goal in Strategic Intent
- `propose_value_creation_target` — creates a value target in Strategic Intent
- `propose_organization_update` — updates mission, vision, or long-term ambition

## What the Agent CANNOT Do (user manages manually):
- Create/configure business units
- Portfolio analysis inputs and scoring
- Parenting diagnostic assessments
- Growth strategy entries
- M&A pipeline entries
- Risk register entries
- Financial strategy inputs

---

## How Corporate Strategy Connects to Other Modules

```
Corporate Strategy (Strategic Intent)
  ↓ strategic_goal_id
BOS → OKRs (company-level objectives cascade from strategic goals)
  ↓ value_creation_targets
Financial Intelligence (revenue targets connect to financial models)
  
Corporate Strategy (Portfolio Analysis)
  → each BU gets its own Business Strategy (BMC + Playing to Win)
  → each BU has its own BOS (OKRs, KPIs)
```

---

## Guided User Journeys

### Journey A: "Set up our strategic foundation"
1. Guide user to Strategic Intent → propose 3-5 strategic goals
2. Propose 2-3 value creation targets with current and target values
3. Update long-term ambition if not set
4. Then guide to BOS to cascade goals into OKRs

### Journey B: "We have multiple business units"
1. Check if BUs are configured: if not, guide to Corporate Strategy → Business Units → + New Business Unit
2. For each BU, ask: What is its strategic role (Grow, Hold, Harvest, Exit)?
3. Guide to Portfolio Analysis to formally evaluate each BU
4. Ask about capital allocation: where is investment going this year?

### Journey C: "What should our 3-year ambition be?"
1. Assess current strategic goals and value creation targets
2. Connect to industry benchmarks and strategic choices
3. Propose a long-term ambition statement via `propose_organization_update`
4. Link to Corporate Ambition page: "Review this in Corporate Strategy → Corporate Ambition"
