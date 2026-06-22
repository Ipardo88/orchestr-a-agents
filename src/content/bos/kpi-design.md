# KPI Design — Metrics That Matter

## What Is a KPI?

A Key Performance Indicator (KPI) is a metric that measures how effectively a company is achieving its key business objectives on an ongoing basis. Unlike OKRs — which are time-bound aspirational goals set each quarter to drive change — KPIs are continuous measurements of business health. They tell you where you are, not where you are trying to go.

The distinction is critical:
- **KPI**: "Our NRR is currently 112%" — measures steady-state health
- **OKR**: "Increase NRR from 107% to 120% this quarter" — measures a change effort

Both are necessary. KPIs without OKRs give you a dashboard with no steering wheel. OKRs without KPIs give you goals with no scoreboard.

In the OrchestrA platform, KPIs are tracked with targets, thresholds (amber/red), and directionality (higher_better / lower_better), enabling automated health alerts and trend analysis across the business.

---

## Leading vs. Lagging Indicators

One of the most important design decisions for a KPI dashboard is balancing leading and lagging indicators. Both types are necessary; a dashboard of only one type is dangerous.

### Lagging Indicators (Outcome Metrics)
Lagging indicators measure results *after* they occur. They confirm whether past actions produced the intended outcomes. By the time a lagging indicator changes, the underlying cause happened weeks or months ago.

**Examples:**
- Net Revenue Retention (NRR) — reflects retention decisions made 3–12 months prior
- Annual Recurring Revenue (ARR) — reflects sales closed in prior periods
- Gross Margin — reflects pricing and COGS decisions made previously
- Customer Churn Rate — reflects value delivery (or lack of) over the customer lifecycle
- Employee Attrition Rate — reflects culture and compensation decisions made months ago

**Strength**: High confidence in what happened. Hard to game.
**Weakness**: Lagging. By the time you see a problem, it's already happened.

### Leading Indicators (Predictive Metrics)
Leading indicators measure activities and conditions that *predict* future outcomes. They give early warning — positive or negative — before the outcome materializes.

**Examples:**
- Sales Pipeline Coverage (2–3 months before revenue is recognized)
- Trial-to-Paid Conversion Rate (predicts future ARR growth)
- Product Daily Active Usage / DAU (predicts retention before it shows in churn)
- Onboarding Completion Rate (predicts 90-day churn)
- Support Ticket Volume and Time-to-Resolution (predicts NPS and churn)
- Employee engagement score (predicts attrition 3–6 months out)

**Strength**: Early warning. Allows course correction before outcomes are locked in.
**Weakness**: Correlation to outcomes requires validation. Can be gamed.

### Balancing the Mix
A healthy KPI dashboard has approximately:
- **40% leading indicators**: For forward-looking early warning
- **60% lagging indicators**: For confirmed outcome tracking

If your dashboard is 100% lagging indicators, you are flying without instruments — you only learn about problems after they become crises. If it's 100% leading indicators, you are tracking activity, not results, which can mask underperformance.

---

## Directionality: Higher Better vs. Lower Better

Every KPI in the OrchestrA platform must have explicit directionality assigned. This determines how the system automatically assesses health:

### `higher_better`
The KPI is healthy when it goes up. Threshold alerts fire when it falls *below* the threshold values.

Examples:
- NRR (target: 120%) — higher is better; alert if it drops below amber threshold
- NPS (target: 50) — higher is better
- Pipeline Coverage (target: 4x) — higher is better; below 3x is amber, below 2x is red
- Gross Margin (target: 75%) — higher is better
- Feature Adoption Rate (target: 65%) — higher is better

### `lower_better`
The KPI is healthy when it goes down. Threshold alerts fire when it rises *above* the threshold values.

Examples:
- Churn Rate (target: < 2%) — lower is better; alert if it rises above 3% (amber) or 5% (red)
- CAC (target: < $8,000) — lower is better
- Time to First Value (target: < 7 days) — lower is better
- Sales Cycle Length (target: < 60 days) — lower is better
- Support Resolution Time (target: < 4 hours) — lower is better

**Design rule**: Directionality must be set at KPI creation and never changed without a formal review. Changing directionality retroactively invalidates historical health assessments.

---

## Threshold Design: Amber and Red

Thresholds convert a raw metric into an actionable signal. Every KPI needs two threshold levels:

### Amber (Early Warning)
"We need to investigate, but not panic." The amber threshold is crossed when performance is slipping but recovery is still likely within the current period.

### Red (Action Required)
"Stop everything, this needs immediate attention." The red threshold is crossed when performance is severely off track and strategic goals are at risk. Red status should trigger an escalation protocol, not just a dashboard color change.

### Threshold-Setting Method

**Step 1: Anchor to target**
Start with the strategic target for the KPI (from annual planning or strategic goals).

**Step 2: Apply the 10/20 rule**
- Amber threshold: 10–15% below target
- Red threshold: 20–25% below target (or the point where strategic consequences become unavoidable)

**Step 3: Validate against business logic**
Ask: "If we hit amber, would a competent leader want to investigate?" If yes, amber is correctly placed. "If we hit red, would this jeopardize a strategic goal or covenant?" If yes, red is correctly placed.

**Step 4: Calibrate with historical data**
Check the last 12 months of actuals. If the metric has never reached red even during the worst periods, the red threshold is too low and won't be meaningful.

### Threshold Examples

| KPI | Target | Amber | Red | Directionality |
|-----|--------|-------|-----|----------------|
| NRR | 120% | < 108% | < 100% | higher_better |
| ARR Growth Rate | 40% YoY | < 30% | < 20% | higher_better |
| Gross Margin | 76% | < 68% | < 62% | higher_better |
| NPS | 50 | < 40 | < 25 | higher_better |
| Pipeline Coverage | 4x | < 3x | < 2x | higher_better |
| Churn Rate | 1.5% | > 2.5% | > 4% | lower_better |
| CAC | $7,500 | > $9,500 | > $12,000 | lower_better |
| Onboarding Completion | 92% | < 80% | < 65% | higher_better |
| Employee Attrition | 12% | > 16% | > 22% | lower_better |

---

## KPI Coverage: Four Strategic Dimensions

A comprehensive KPI framework covers four dimensions. If any dimension is missing, you have blind spots in your business health monitoring.

### 1. Revenue Dimension
Measures the core financial engine: how effectively the company is growing and protecting its revenue base.

Key KPIs:
- **ARR / MRR**: Total recurring revenue — the north star for SaaS businesses
- **Net Revenue Retention (NRR)**: Expansion + contraction + churn from existing customers. NRR > 100% means the existing base grows without new customers.
- **New ARR**: Revenue from new logos (new business ARR)
- **Win Rate**: Percentage of qualified opportunities that close as customers
- **Average Contract Value (ACV)**: Revenue per logo, segmented by tier

### 2. Efficiency Dimension
Measures how effectively the company converts inputs (capital, headcount, time) into outputs.

Key KPIs:
- **Customer Acquisition Cost (CAC)**: Total sales and marketing spend ÷ new customers acquired
- **LTV:CAC Ratio**: Lifetime Value divided by CAC — target ≥ 3x for sustainable unit economics
- **CAC Payback Period**: Months to recover CAC from gross profit — target < 18 months
- **Burn Multiple**: Net burn ÷ Net new ARR — measures capital efficiency (< 1.5x is healthy, > 2x is a warning)
- **Revenue per Employee**: Total ARR ÷ full-time headcount — measures organizational productivity

### 3. Customer Dimension
Measures the quality of customer relationships and the health of the retention engine.

Key KPIs:
- **Customer Churn Rate**: Percentage of customers lost in a period
- **Revenue Churn Rate**: Percentage of revenue lost from churned customers
- **Net Promoter Score (NPS)**: Willingness of customers to recommend — a leading indicator of churn and expansion
- **Time to First Value (TTFV)**: Days from contract signature to customer achieving their first meaningful outcome — a leading indicator of 90-day churn
- **Customer Health Score**: Composite score (usage + NPS + support tickets + engagement) predicting churn risk

### 4. People Dimension
Measures the health of the organization's human capital — the most important asset in a knowledge business.

Key KPIs:
- **Employee Attrition Rate**: Voluntary departures as a percentage of headcount
- **Headcount vs. Plan**: Actual headcount as a percentage of planned headcount (hiring pace)
- **eNPS (Employee NPS)**: Employee willingness to recommend the company as a workplace
- **Time to Hire**: Average days from job posting to accepted offer
- **Internal Promotion Rate**: Percentage of leadership roles filled internally — an indicator of talent development health

---

## Common B2B SaaS KPIs: Detailed Reference

### Net Revenue Retention (NRR)
**Definition**: (Starting MRR + Expansion MRR − Contraction MRR − Churned MRR) ÷ Starting MRR × 100

**Why it matters**: NRR is the single most important indicator of product-market fit in SaaS. An NRR > 100% means the company can grow revenue without acquiring a single new customer. It measures how well the product delivers ongoing value.

**Benchmarks** (B2B SaaS):
- World-class: > 130% (Snowflake, Datadog territory)
- Excellent: 115–130%
- Good: 105–115%
- Neutral: 100–105%
- Warning: < 100% (net contraction)

**Target**: 120% | **Amber**: < 108% | **Red**: < 100%

---

### Customer Acquisition Cost (CAC)
**Definition**: Total S&M spend in period ÷ New customers acquired in period

**Why it matters**: CAC measures the efficiency of the go-to-market engine. Rising CAC without corresponding improvement in ACV indicates a deteriorating market or go-to-market execution problems.

**Related metric**: CAC Payback Period = CAC ÷ (ACV × Gross Margin ÷ 12)

**Target**: $7,500 | **Amber**: > $9,500 | **Red**: > $12,000 (lower_better)

---

### LTV:CAC Ratio
**Definition**: Customer Lifetime Value ÷ Customer Acquisition Cost

LTV = ACV × Gross Margin % × (1 ÷ Churn Rate)

**Why it matters**: The LTV:CAC ratio measures the fundamental unit economics of the business. Below 3:1, the business is structurally unprofitable at scale. Above 5:1, the business may be under-investing in growth.

**Benchmarks**:
- < 1:1: Crisis — not viable
- 1–2:1: Unsustainable
- 3:1: Breakeven on CAC investment (minimum viable)
- 4–5:1: Healthy growth model
- > 5:1: Consider investing more aggressively in growth

**Target**: 4.5x | **Amber**: < 3.5x | **Red**: < 2.5x (higher_better)

---

### Pipeline Coverage
**Definition**: Total pipeline value in a period ÷ Target revenue for that period

**Why it matters**: The most important leading indicator for sales performance. At a 25% win rate, 4x coverage is required to hit target. Below 3x, a miss is nearly certain. This is the earliest warning signal available to sales leadership.

**Target**: 4x | **Amber**: < 3x | **Red**: < 2x (higher_better)

---

### ARR Growth Rate
**Definition**: (Current ARR − ARR 12 months ago) ÷ ARR 12 months ago × 100

**Why it matters**: ARR growth rate is the primary measure of company momentum. The T2D3 benchmark (triple, triple, double, double, double revenue over 5 years) sets the bar for venture-scale SaaS growth.

**Benchmarks** (varies significantly by ARR scale):
- < $10M ARR: 100%+ growth expected
- $10–50M ARR: 60–100% growth
- $50–100M ARR: 40–60% growth
- > $100M ARR: 25–40% growth

---

### Time to First Value (TTFV)
**Definition**: Median days from contract signature to customer achieving their first defined success milestone

**Why it matters**: The single most powerful leading indicator of 90-day churn. Customers who achieve value within 14 days of signing have 3–5x higher retention rates than those who take 60+ days. This is both a product and CS execution metric.

**Target**: < 7 days | **Amber**: > 14 days | **Red**: > 30 days (lower_better)

---

## How KPIs Connect to OKRs

KPIs and OKRs serve different but complementary purposes. Understanding the relationship prevents common confusion about which tool to use for which purpose.

| Dimension | KPI | OKR |
|-----------|-----|-----|
| Time frame | Ongoing, continuous | Quarterly (time-bound) |
| Nature | Steady-state health | Change effort |
| Question | "How are we doing?" | "What are we changing?" |
| Value when healthy | Low attention required (monitor) | N/A |
| Value when unhealthy | Alerts trigger action | Behind/At-risk triggers OKR |

### The Connection Pattern

**Pattern 1: KPI Degradation → OKR Response**
When a KPI crosses its red threshold, an OKR should be created to address the root cause. The OKR key result is often the KPI improvement target.

- KPI alert: "Churn rate crossed red threshold (4.2%, above 4% red)"
- OKR created: "Diagnose and eliminate the structural driver of enterprise churn this quarter"
  - KR1: Reduce 90-day churn from 4.2% to 2.5%
  - KR2: Complete churn analysis of all 12 churned accounts; identify top 3 root causes
  - KR3: Implement top-2 fixes and show leading indicator improvement (TTFV < 14 days)

**Pattern 2: KPI as OKR Key Result**
A KPI metric is often the best choice for a Key Result because it is already well-defined, has a baseline, and is tracked continuously.

- OKR: "Become the most efficient sales team in our category"
  - KR1: Reduce CAC from $11,000 to $7,500 (KPI: CAC, directionality: lower_better)
  - KR2: Increase Win Rate from 18% to 27%
  - KR3: Reduce average sales cycle from 90 days to 55 days

**Pattern 3: OKR Achievement → KPI Stabilization**
When an OKR achieves its target improvement in a KPI, that KPI should stabilize in the "on track" zone and no longer require an active OKR. The KPI then returns to monitoring-only mode.

---

## Alert Fatigue: How to Set Thresholds That Are Meaningful, Not Noisy

The most common failure mode of KPI dashboards is alert fatigue — thresholds set too tight, generating constant amber/red alerts that teams learn to ignore. When everything is flagged, nothing is flagged.

### Signs of Alert Fatigue
- Teams stop looking at the dashboard except when asked
- Red thresholds are crossed regularly without triggering action
- "We're always in amber on that one" becomes a cultural norm
- KPIs are red at the end of every quarter except Q4 (gaming the threshold)

### Anti-Alert-Fatigue Principles

**1. Red must mean escalation is required, every time**
If hitting red does not automatically trigger an escalation process (leadership review, war room, root cause analysis), the red threshold is meaningless. Either fix the threshold or fix the process.

**2. Amber should be crossed at most 2–3 times per year**
If a KPI crosses amber every month, the target is wrong, the threshold is wrong, or the business has a structural problem that an OKR must address.

**3. Thresholds should reflect business consequences, not statistical variation**
Don't use standard deviations from historical average as your threshold. Use business logic: "Below X, we cannot make payroll in 6 months" or "Below Y, our enterprise customers will start shopping for alternatives."

**4. Review and calibrate thresholds quarterly**
As the business changes, so should thresholds. A threshold set at $5M ARR may be totally wrong at $20M ARR. Build threshold review into the quarterly OKR cadence.

**5. Fewer KPIs, more meaningful alerts**
The fewer KPIs you track at each level (maximum 10, ideal 5–7), the more meaningful each alert becomes. If you have 25 KPIs and 8 are in amber, you don't know what to fix first. If you have 6 KPIs and 1 is in red, you know exactly where to focus.

---

## KPI Governance: Common Mistakes

### 1. KPIs Without Targets
A metric without a target is just data, not a KPI. "We track NRR monthly" is not a KPI. "NRR target: 120%, amber: 108%, red: 100%" is a KPI.

### 2. KPIs Without Thresholds
Without amber and red thresholds, the KPI cannot generate automated alerts. You're waiting for a human to notice a problem rather than having the system tell you.

### 3. Vanity KPIs
Metrics that look impressive but don't connect to strategic outcomes. "Total registered users" without engagement data is a vanity KPI. "Monthly Active Users who completed a core workflow" is a real KPI.

Common vanity KPIs to avoid:
- Total users (without activation/engagement)
- Page views (without conversion)
- "Leads generated" (without pipeline quality filter)
- Social media followers
- Features shipped (an output, not an outcome)

### 4. Too Many KPIs
More than 10 KPIs at any level creates analysis paralysis. When leadership has to review 25 metrics in a weekly business review, they spend time on metrics rather than on decisions. Ruthlessly limit to 5–8 company-level KPIs and 4–6 per function.

### 5. Inconsistent Measurement Definitions
If NRR is calculated differently in Q1 than in Q4 (e.g., a change in whether contraction is included), the trend line is meaningless. KPI definitions must be locked and documented. Changes require a formal version with a clear effective date.

### 6. KPIs Owned by "Everyone" (Which Means No One)
Every KPI must have a single named owner who is accountable for monitoring it, investigating anomalies, and driving corrective action. A KPI owned by "the leadership team" will be watched by no one.
