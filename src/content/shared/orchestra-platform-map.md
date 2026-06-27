# OrchestrA Strategy — Platform Map

> **Shared reference for all agents.** Use this to guide users to the right module and give accurate navigation directions. Keep directives precise: always name the module + sub-page.

---

## Module Overview

### Workspace
**URL:** `/app/workspace/`
Dashboard, KPI preferences, onboarding flow, user settings.
Agent: coach (onboarding). No dedicated domain agent.

---

### Corporate Strategy
**URL:** `/app/corporate-strategy/`
Enterprise-level decisions: capital allocation, portfolio management, parenting advantage.
Agent: `corporate-strategy` (future). For now, `strategy-foundation` agent handles mission/vision/goals.

Key sub-pages:
- **Strategic Intent** `/corporate-strategy/strategic-intent` — strategic goals + value creation targets (agent write surface)
- **Corporate Ambition** `/corporate-strategy/corporate-ambition` — long-term ambition, 3-year targets, strategic anchors
- **Growth Strategy** `/corporate-strategy/growth-strategy` — growth vectors (organic, M&A, partnerships)
- **Portfolio Analysis** `/corporate-strategy/portfolio-analysis` — BCG/GE matrix for multi-BU companies
- **Parenting Strategy** `/corporate-strategy/parenting-strategy` — HQ value-add diagnostic per BU
- **Corporate Development** `/corporate-strategy/corporate-development` — M&A pipeline, alliances
- **Financial Strategy** `/corporate-strategy/financial-strategy` — ROIC targets, risk framework
- **Business Units** `/corporate-strategy/business-units` — create/manage BUs
- **Company Setup** `/corporate-strategy/company-setup` — company profile, industry, stage

---

### Business Strategy
**URL:** `/app/business-strategy/`
How each business unit competes: business model, strategic choices, external environment.
Agent: `business-strategy` (future). For now, `business-model` agent handles BMC/PESTEL/Playing to Win.

Key sub-pages:
- **Map Business Model** `/business-strategy/map-business-model` — Business Model Canvas (9 blocks, agent write surface)
- **Assess Business Model** `/business-strategy/assess-business-model` — SWOT + scoring per block
- **External Environment** `/business-strategy/external-environment` — PESTEL analysis + live macro data
- **Design Business Strategy** `/business-strategy/design-business-strategy` — Playing to Win (Where to Play / How to Win)
- **Partnership Strategy** `/business-strategy/partnership-strategy` — strategic partnership framework
- **Pricing Strategy** `/business-strategy/pricing-strategy` — pricing model, positioning, value-based pricing

---

### Financial Intelligence
**URL:** `/app/financial-intelligence/`
Revenue models, budgets, financial KPIs, forecasting, unit economics.
Agent: `financial-intelligence` (active).

Key sub-pages:
- Revenue budgets and actuals
- Financial KPI tracking
- Unit economics (CAC, LTV, gross margin)
- Forecast scenarios

---

### Strategy Execution (BOS)
**URL:** `/app/strategy-execution/`
How strategy becomes action: OKRs, KPIs, engines, playbooks, people, reporting.
Agent: `bos` (active).

Key sub-pages:
- **Overview** `/strategy-execution/overview` — BU health dashboard
- **Engines** `/strategy-execution/engines` — value engine canvas (visual strategy-to-ops map)
- **OKRs & KPIs** `/strategy-execution/kpis-okrs` — objectives, key results, KPI tracking (agent write surface)
- **Playbooks** `/strategy-execution/playbooks` — operational playbooks per function
- **Org Chart** `/strategy-execution/org-chart` — organizational structure
- **Skills Matrix** `/strategy-execution/skills-matrix` — team capability mapping
- **Reports** `/strategy-execution/reports` — strategy execution reports

---

## Cross-Module Connection Points

| From | Connects to | Via |
|---|---|---|
| Strategic Goals (Corporate Strategy) | OKRs (BOS) | `strategic_goal_id` on company-level objectives |
| Playing to Win: Must-Have Capabilities | Skills Matrix (BOS) | capability alignment |
| Value Creation Targets | Financial Intelligence | revenue/metric targets |
| Business Model Canvas | Playbooks (BOS) | key activities → operational plays |

---

## Agent Handoff Hints

- User asks about **mission/vision/purpose** → strategy-foundation agent → Corporate Strategy → Strategic Intent
- User asks about **business model or competitive strategy** → business-model agent → Business Strategy module
- User asks about **OKRs, KPIs, engines, org** → bos agent → Strategy Execution module
- User asks about **revenue, budgets, unit economics** → financial-intelligence agent → Financial Intelligence module
- User asks about **portfolio, capital allocation, M&A** → Corporate Strategy module (future corporate-strategy agent)
