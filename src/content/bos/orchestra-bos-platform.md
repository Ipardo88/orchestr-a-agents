# OrchestrA Strategy — Business Operating System (BOS) Platform Guide

> **Agent reference document.** This describes the OrchestrA platform's BOS module as it exists today. Update this file when new features ship and re-seed via `seed_platform.sh`.
>
> Last updated: 2026-06-26 | Version: 0.2 (development)

---

## What Is the BOS Module

The Business Operating System (BOS) module is where strategy becomes daily execution. It sits in the middle of the OrchestrA platform stack — downstream from Strategy Foundation and Business Strategy, upstream from Financial Analytics.

Navigation path: **Business Operating System** (left sidebar) → sub-modules listed below.

Base URL: `/app/business-operating-system/`

The BOS module translates the user's strategic goals and business model choices into the operational systems, metrics, and structures that run the company day-to-day.

---

## Sub-Modules

### 1. Overview
**URL:** `/app/business-operating-system/overview`

The BOS dashboard. Shows a summary of BOS health across all sub-modules — active OKRs, KPI status, capabilities coverage, and engine count. Entry point for users returning to check execution status.

---

### 2. BOS Health
**URL:** `/app/business-operating-system/bos-health`

A React Flow canvas that provides a visual health map of the entire BOS. Nodes represent each sub-system (OKRs, KPIs, Capabilities, Engines, Playbooks), connected by edges that show health scores and alignment gaps. Pulls live data from objectives, KPIs, capabilities, and engine configurations to compute health per area.

The agent should reference BOS Health when the user asks "how is our BOS doing?" or "what's missing from our operating system?" Guide them to BOS → BOS Health for a visual overview, then drill into the specific sub-module with the lowest health score.

---

### 3. Engines (Value Engines)
**URL:** `/app/business-operating-system/engines`

**What it is:** A visual canvas (React Flow) where the user maps out a business engine — the end-to-end flow of a strategic initiative or business capability. An engine is a named system that produces value: Lead Generation Engine, Revenue Engine, Customer Success Engine, Fulfillment Engine, etc.

**How to create:** Click **+ New Engine** button (top right of Engines page). A dialog asks for the engine name and type (Acquisition, Fulfillment, Innovation, or Custom). After confirming, the canvas opens automatically.

**IMPORTANT — agent cannot create engines:** The agent has no tool to create a Value Engine. It cannot propose an engine via tool calls. When the user asks to "create the lead generation engine" or "design the revenue engine," the agent must:
1. Acknowledge they want a Value Engine in the platform
2. Tell them to navigate to **BOS → Engines → + New Engine** and create it manually
3. Then offer to create the supporting OKRs, KPIs, and playbooks that will power that engine

**How engines connect to OKRs:** After the user creates an engine and adds nodes to the canvas, individual OKRs (objectives) can be linked to engine nodes via the `engine_node_id` field. This is done in the platform UI, not by the agent.

**Example engines the agent should suggest for common business types:**
- Real estate agency: Lead Generation Engine, Property Acquisition Engine, Client Retention Engine
- SaaS company: Growth Engine (trial → paid), Onboarding Engine, Expansion Engine
- Consulting firm: Business Development Engine, Delivery Engine, Referral Engine

---

### 4. Playbooks
**URL:** `/app/business-operating-system/playbooks`

**What it is:** A full-featured playbook library with a structured rich editor. Playbooks have typed sections: Purpose, Scope, Tools Required, Responsibilities (role + tasks table), Step-by-Step Instructions, Compliance notes, Related Documents, and Revision History. They are categorized by type (Process, Runbook, Training, Onboarding, etc.) and support search, versioning, and archive.

**How to create:** Click **+ New Playbook** button. Fill in name, description, category. The editor then opens with structured sections. The user fills in each section. The agent cannot create playbooks via proposals.

**When to reference:** When the user asks "how do we operationalize X?" or "how do we make sure the team follows the same process?" guide them to create a playbook. The agent can help design the content (steps, responsibilities, tools) in the conversation, then the user copies it into the platform sections.

**Connection to Engines:** Playbooks document the execution of each stage in a Value Engine. For the Lead Generation Engine: Lead Qualification stage → Lead Qualification Playbook.

---

### 5. KPIs & OKRs
**URL:** `/app/business-operating-system/kpis-okrs`

This is the most AI-interactive sub-module. The agent CAN create objectives and key results here via proposal tools.

#### Views available in the KPIs & OKRs page:

**Tree View** (default): Hierarchical display. Company objectives at the top, BU objectives nested below, team objectives below that, individual objectives at the bottom. Shows parent-child relationships between objectives.

**List View**: Flat list with filters by level, status, owner, business unit, and cycle dates. Best for bulk review.

**Dashboard**: Summary cards showing overall OKR health — on-track count, at-risk count, behind count, completion rate, average progress.

**Cascade View**: The most important view for strategy alignment. Shows the strategic goals from the Strategy Foundation (left side) connected to company OKRs (right side). Visually demonstrates which OKRs are cascading from which strategic goals. OKRs with `strategic_goal_id` set appear connected to their parent goal. OKRs without a `strategic_goal_id` appear as orphaned — not connected to any strategic goal.

**Initiatives**: Linked projects or initiatives attached to OKRs. Not yet fully implemented.

**Analytics**: Progress trends over time for objectives and key results.

**KPIs tab**: KPI dashboard showing all configured KPIs with current values, targets, and alert thresholds (amber/red).

#### OKR Levels
- `company` — top-level objectives set by the CEO/leadership team. Should link to strategic goals.
- `bu` — business unit objectives. Should cascade from company objectives.
- `team` — team-level objectives. Should cascade from BU objectives.
- `individual` — personal objectives. Should cascade from team objectives.

#### What the agent can propose:
- **Objectives** (`propose_objective`): title, level, cycle dates, description, strategic_goal_id
- **Key Results** (`propose_key_result`): title, metric type (number/percentage/currency/boolean), unit, start value, target value

#### Cascading rules the agent must follow:
1. Every company-level objective SHOULD link to a strategic goal via `strategic_goal_id` (use the UUID shown in the company context)
2. If the user has 3 strategic goals, the BOS should have at least 3 company-level objectives — one per goal
3. BU and team objectives should cascade from company objectives (set `parent_id` or align thematically)
4. The Cascade view will show disconnected OKRs if `strategic_goal_id` is not set — always set it

#### OKR statuses
- `draft` — just created, not yet active
- `on_track` — progress is on pace with the target
- `at_risk` — progress is lagging but recoverable
- `behind` — significantly behind target
- `completed` — cycle ended, target achieved
- `paused` — temporarily paused

---

### 6. Organizational Design
**URL:** `/app/business-operating-system/org-chart`

**What it is:** An org chart showing the company's structure, reporting lines, and team hierarchy. Visualizes who reports to whom and how the organization is structured to execute strategy.

**How to build:** The user adds team members and sets reporting relationships in the platform. The agent cannot modify the org chart via proposals.

**When to reference:** When the user asks about team structure, accountability, or "who should own this OKR." The agent can advise on org design principles (e.g., span of control, cross-functional teams) but the user builds the actual chart.

---

### 7. Capabilities & Skills
**URL:** `/app/business-operating-system/capabilities`

**What it is:** A full capabilities management system with 4 views:
- **Matrix view**: Heatmap grid of capabilities (rows) × employees (columns), showing proficiency levels per person per capability
- **Gap Analysis**: Shows required proficiency vs. average actual per capability — surfaces critical gaps
- **Scenarios**: Simulate "what if" — adjust target proficiency levels and see projected gap changes
- **Action Plans**: Specific development actions for closing each capability gap (training, hiring, mentoring, outsource)

Plus a **Taxonomy Manager** drawer to define and organize capabilities into categories.

**How it works:** User defines capability taxonomy (e.g., "Digital Marketing," "Lead Qualification," "Financial Modeling"), marks each as critical or supporting, then assesses employee proficiency levels (1-5 scale). The matrix and gap analysis update live.

**What the agent can do:** Discuss which capabilities are critical given the strategy, review gap analysis, suggest action plans for closing gaps. The agent cannot create capabilities via proposals currently.

---

### 8. Reports
**URL:** `/app/business-operating-system/reports`

**What it is:** BOS reporting dashboard. Aggregates data from OKRs, KPIs, capabilities, and engines into structured reports. Used for leadership reviews, board reporting, and quarterly business reviews (QBRs).

---

## How the BOS Connects to the Rest of the Platform

```
Strategy Foundation
  ↓ strategic_goal_id
BOS → OKRs (Cascade View shows this connection)
  ↓ linked_kpi_id
BOS → KPIs (key results can link to KPIs)
  ↓ engine_node_id
BOS → Engines (OKRs can be attached to engine nodes)

Business Strategy (Business Model Canvas)
  ↓ value proposition + customer segments
BOS → Playbooks (how to deliver the value proposition)
  ↓ must-have capabilities
BOS → Capabilities & Skills (what the team must excel at)

Financial Analytics
  ← OKR progress feeds into financial performance narrative
  ← KPI thresholds trigger financial alerts
```

---

## What the AI Agent Can and Cannot Do

### Agent CAN (via proposal tools):
- Propose Objectives (`propose_objective`) — creates a row in the `objectives` table
- Propose Key Results (`propose_key_result`) — creates a row in the `key_results` table
- Link company objectives to strategic goals (via `strategic_goal_id`)
- Propose KPIs (`propose_kpi`) — creates a row in the `kpis` table with target, amber/red thresholds, and frequency

### Agent CANNOT (user creates manually in the platform):
- Create Value Engines — user must go to BOS → Engines → + New Engine
- Create Playbooks — user writes them in BOS → Playbooks
- Edit the Org Chart — user builds in BOS → Organizational Design
- Define Capabilities — user sets them in BOS → Capabilities & Skills
- Create KPIs — not yet supported in proposal tools (user creates in KPIs tab)

---

## Guided User Journeys

### Journey A: "Help me set up the BOS from scratch"
1. Confirm strategic goals exist in Strategy Foundation (prerequisite)
2. For each strategic goal, propose one company-level objective with 2-4 key results
3. Set `strategic_goal_id` on each objective to link the cascade
4. Once OKRs are approved, guide user to create Value Engines for the main initiatives
5. For each engine, suggest 2-3 playbooks to operationalize the stages
6. Identify the 3 critical capabilities from the "How to Win" strategy
7. Recommend 5-7 KPIs to monitor OKR progress

### Journey B: "Design the lead generation engine"
1. Clarify: are they asking for (a) an OKR for lead generation, or (b) an Engine canvas in BOS → Engines?
2. If Engine canvas: "Go to BOS → Engines → + New Engine, name it 'Lead Generation Engine'. I'll design the OKRs that power it while you set up the canvas."
3. Propose company OKR: "Establish a high-impact lead generation engine" linked to the growth strategic goal
4. Propose 3-5 key results: lead volume, conversion rate, cost per lead, pipeline coverage
5. Suggest playbooks: Lead Qualification Playbook, Outreach Playbook
6. Suggest KPIs to track weekly: leads generated, conversion rate, cost per lead

### Journey C: "Review and improve my existing OKRs"
1. Run Sub-Phase 5A diagnostic: review all OKRs in context
2. Identify: missing strategic goal links, at-risk OKRs, orphaned OKRs (no strategic goal)
3. For at-risk: ask "What's causing the gap? Execution, resources, or wrong target?"
4. For orphaned OKRs: "This objective isn't connected to any strategic goal. Should it be linked to [Goal X] or is it a standalone initiative?"
5. Propose fixes: new OKRs for uncovered goals, revised key results for stale ones

---

## Common Mistakes to Avoid

1. **Creating duplicate OKRs**: Check "Current OKRs" in context before proposing. If a similar objective already exists, don't create another one.

2. **Creating OKRs without strategic goal links**: Every company-level objective should have `strategic_goal_id` set. Without it, the Cascade view shows the OKR as disconnected.

3. **Confusing "engine" with OKRs**: A Value Engine is a visual canvas (BOS → Engines). OKRs are the measurable goals. Both are needed but they're different things.

4. **Proposing KPIs as key results**: KPIs are leading/lagging indicators tracked continuously. Key results are specific targets for a defined cycle. They're related but different.

5. **Re-proposing proposals that are pending**: If the conversation history shows [PROPOSALS_SHOWN_TO_USER:], those are already visible in the approval panel. Don't regenerate them — guide the user to click "Apply changes."
