# Master Budget Process

## Overview

The master budget is a comprehensive financial plan that integrates all
departmental budgets into a unified set of **budgeted financial statements**
— a budgeted income statement, budgeted balance sheet, and cash budget
(which together form the budgeted 3-statement model).

The critical insight is that the structure of the operating budget depends
entirely on the business model. A manufacturer's operating budget revolves
around production, materials, and factory overhead. A consulting firm's
operating budget revolves around headcount, utilisation, and contractor
spend. If the operating budget structure does not match the business, the
budgeted financial statements will be meaningless.

Before building a master budget, always load `references/business-archetypes.md`
to identify the correct cost structure. The archetype determines which
operating budget components exist and how they feed the budgeted income
statement.

## Four Approaches to Developing Budgets

Before building the budget structure, choose the methodology. Each approach
has different strengths and is suited to different situations. The choice
affects how every line item in the budget is developed.

### 1. Incremental Budgeting

Start with last year's actual figures, then add or subtract a percentage
to arrive at this year's budget.

```
This Year's Budget = Last Year's Actuals × (1 + Adjustment %)
```

**When to use**: stable businesses where cost drivers don't change
materially year to year, and where the existing cost base is already
efficient.

**Strengths**: simple, fast to prepare, easy for department managers to
understand and own. Requires minimal data beyond last year's results.

**Weaknesses**: perpetuates inefficiencies (if last year's spend was
wasteful, this year's budget locks in the waste). Encourages "use it or
lose it" behaviour and budgetary slack. Ignores external drivers and
strategic shifts.

**Implementation in Excel**: for each line item, the budget formula is
`=Prior_Year_Actual * (1 + Growth_Assumption)`. The growth assumption
should be an explicit input on the Assumptions tab, not buried in the
formula.

### 2. Value Proposition Budgeting

For each budget item, ask three questions: Has a need been demonstrated?
Does this item create value for customers, staff, or other stakeholders?
Does the value exceed the cost?

**When to use**: when the organisation wants to ensure every dollar of
spend is justified by the value it produces. Particularly useful for
overhead and discretionary costs that tend to grow unchecked.

**Strengths**: forces critical evaluation of every expenditure. Links
spending to value creation rather than historical precedent. Identifies
costs that produce no measurable benefit.

**Weaknesses**: requires management judgment to define and measure
"value" for each item. More time-consuming than incremental. Some costs
(compliance, insurance) are necessary regardless of direct value.

**Implementation in Excel**: add a "Value Justification" column next to
each budget line. For each item, document: what value it creates, who
benefits, and whether the cost is justified. Items without clear
justification should be flagged for review or elimination.

### 3. Activity-Based Budgeting

Inputs are determined by outputs, not the other way around. Start with
the planned level of business activity, then calculate the resources
needed to support that activity.

```
Step 1: Define the output (e.g., 500 client engagements)
Step 2: Identify activities needed (e.g., 12,000 billable hours)
Step 3: Calculate required resources (e.g., 80 consultants at 75% util)
Step 4: Cost the resources (80 × $120K avg salary × 1.25 benefits)
```

**When to use**: when there is a clear link between business activity
and resource consumption. Works well for services firms, manufacturing,
and any business where costs are driven by identifiable activities
rather than historical patterns.

**Strengths**: builds the budget from first principles — the cost base
reflects actual planned activity, not last year's inertia. Reveals
cause-and-effect relationships between activity and cost. Makes it
easier to adjust the budget when activity levels change.

**Weaknesses**: requires detailed understanding of cost drivers and
activity-resource relationships. More complex to build initially.

**Implementation in Excel**: build a driver-based model where cost lines
are formulas referencing activity levels (headcount, units, hours,
engagements) rather than prior-year amounts. This is the default
approach used in the operating budget sections of this skill.

### 4. Zero-Based Budgeting (ZBB)

Every department starts from zero. Managers must justify every dollar
from scratch, building the budget from the ground up with no reference
to prior-year spending.

**When to use**: when there is an urgent need for cost containment, when
the organisation suspects significant embedded waste, or when undergoing
a major strategic shift. Best used occasionally (every 3–5 years) rather
than annually, given the effort involved.

**Strengths**: eliminates the entitlement of prior-year budgets.
Surfaces costs that have been carried forward for years without scrutiny.
Can produce dramatic cost reductions when first applied.

**Weaknesses**: extremely time-consuming — every line must be justified.
Best suited for discretionary costs (travel, training, marketing) rather
than essential operating costs (rent, salaries, utilities). Can be
demoralising for managers if used too frequently. Risk of cutting costs
that appear discretionary but actually produce long-term value.

**Implementation in Excel**: start with an empty budget template. Each
department submits "decision packages" — ranked lists of activities with
their costs and expected benefits. The budget committee approves packages
from the top down until the total budget is exhausted.

### Choosing the Right Approach

Most organisations use a hybrid: incremental for stable operational costs,
activity-based for costs with clear drivers, value proposition for
discretionary overhead, and zero-based periodically for a full reset. The
choice should be documented on the Assumptions tab.

| Situation | Recommended approach |
|---|---|
| Stable business, minor year-to-year changes | Incremental |
| Need to link spend to business outcomes | Value proposition |
| Costs driven by identifiable activities | Activity-based |
| Urgent cost containment or strategic reset | Zero-based |
| First time building a budget for a new entity | Activity-based |

## Two Halves of the Master Budget

The master budget has two halves that combine to produce the budgeted
financial statements:

```
                    MASTER BUDGET
                         │
          ┌──────────────┴──────────────┐
          │                             │
    OPERATING BUDGET              CAPITAL BUDGET
    (drives the P&L)             (drives BS + capex)
          │                             │
    ┌─────┴─────┐                 ┌─────┴─────┐
    │           │                 │           │
  Sales     Direct Cost         Capex      Financing
  Budget    Budgets             Budget      Plan
    │           │                 │           │
  Opex      ───┘                 │           │
  Budgets                        │           │
    │                            │           │
    └──────────┬─────────────────┘           │
               │                             │
    Budgeted Income Statement                │
               │                             │
               └──────────┬──────────────────┘
                          │
               Budgeted Balance Sheet
                          │
                     Cash Budget
                          │
                  Budgeted Cash Flow
                     Statement
```

The **operating budget** determines revenue and all expenses — it drives
the budgeted income statement. Its structure adapts to the business model.

The **capital budget** determines asset purchases, financing activities,
and balance sheet changes that are outside normal operations.

Together they produce the full budgeted 3-statement model.

## The Operating Budget — Adapted by Business Model

The operating budget always starts with the sales budget. What changes by
archetype is the **direct cost budgets** — the cost of delivering what was
sold. This is the part that must match the business model.

### Sales Budget (All Archetypes)

The foundation. Everything else derives from expected sales.

```
Monthly Sales Revenue = Volume Driver × Price Driver × Seasonality Index
```

The volume and price drivers differ by archetype:

| Archetype | Volume driver | Price driver |
|---|---|---|
| Manufacturing | Units produced/sold | Average selling price |
| Professional services | Billable headcount × utilisation | Average billing rate |
| SaaS | Subscribers / seats | ARPU (monthly or annual) |
| Retail | Stores × traffic × conversion | Average transaction value |
| Healthcare | Patients / procedures | Reimbursement rate |

Build monthly, with seasonality indices reflecting the business's actual
demand pattern. For service businesses, seasonality may reflect holiday
periods (lower utilisation in December) or industry cycles.

### Direct Cost Budgets — Manufacturing Archetype

When the business makes and sells physical products, the operating budget
cascades through production:

```
Sales Budget
    │
    └──→ Production Budget
              │
              ├──→ Direct Materials Budget
              ├──→ Direct Labour Budget
              └──→ Manufacturing Overhead Budget
                        │
                        └──→ COGS / Cost of Goods Manufactured
```

**Production Budget**:
```
Required Production = Budgeted Sales Units
                    + Desired Ending Inventory
                    − Beginning Inventory
```
Ending inventory policy is typically a percentage of next month's expected
sales (e.g., 20% as safety stock).

**Direct Materials Budget**:
```
Materials Needed = Required Production × Materials per Unit
Materials to Purchase = Materials Needed
                      + Desired Ending Materials Inventory
                      − Beginning Materials Inventory
Purchase Cost = Materials to Purchase × Cost per Unit of Material
```
Cash outflow timing depends on supplier payment terms (e.g., Net 30 means
the cash impact lags by one month).

**Direct Labour Budget**:
```
Labour Hours = Required Production × Hours per Unit
Labour Cost = Labour Hours × Hourly Rate (+ overtime if applicable)
```

**Manufacturing Overhead Budget**:
```
Variable Overhead = Production Units × Variable OH Rate per Unit
Fixed Overhead = Monthly Fixed Amount (rent, depreciation, supervision)
Total Overhead = Variable + Fixed
Cash Overhead = Total Overhead − Non-Cash Items (depreciation)
```

**COGS for the Budgeted Income Statement**:
```
Budgeted COGS = Direct Materials Used + Direct Labour + Overhead Applied
Ending Inventory = Ending Units × (Materials + Labour + OH) per Unit
```

### Direct Cost Budgets — Professional Services Archetype

When the business sells expertise and time, there is no production
budget, no materials budget, and no inventory. The direct cost cascade
is people-driven:

```
Sales Budget (billable hours / engagements)
    │
    └──→ Staffing & Delivery Budget
              │
              ├──→ Consultant Compensation Budget
              ├──→ Contractor / Subcontractor Budget
              └──→ Project Expense Budget
                        │
                        └──→ Cost of Services (replaces COGS)
```

**Staffing & Delivery Budget**:
```
Required Billable Hours = Budgeted Revenue ÷ Average Billing Rate
Required Headcount = Required Billable Hours ÷ (Working Days × Hours/Day
                     × Target Utilisation Rate)
```
This is the most important calculation in a services budget. If target
utilisation is 75% and each consultant works 8 hours/day for 22 days/month,
each consultant delivers 132 billable hours per month. Dividing required
billable hours by 132 gives the headcount needed.

**Consultant Compensation Budget**:
```
Salary Cost = Headcount × Average Annual Salary ÷ 12
Benefits Loading = Salary Cost × Benefits Rate (typically 20–30%)
Total Compensation = Salary + Benefits
```
This is the largest line in the budget — typically 50–70% of revenue for a
professional services firm.

**Contractor / Subcontractor Budget**:
```
Contractor Hours = Total Required Hours − Internal Capacity
Contractor Cost = Contractor Hours × External Billing Rate
```
Contractors fill gaps when demand exceeds internal capacity. They are a
variable cost (can be scaled up/down month to month), unlike salaried staff
which is quasi-fixed.

**Project Expense Budget**:
```
Travel & Expenses = Number of Engagements × Average T&E per Engagement
Technology / Tools = Headcount × Per-Person Tech Cost
Training & Development = Headcount × Annual Training Budget ÷ 12
```

**Cost of Services for the Budgeted Income Statement**:
```
Cost of Services = Consultant Compensation + Contractors + Project Expenses
```
This replaces COGS. There is no inventory component.

### Direct Cost Budgets — SaaS Archetype

When the business sells software subscriptions, the direct cost cascade
focuses on infrastructure and customer support:

```
Sales Budget (subscribers × ARPU)
    │
    └──→ Cost of Revenue Budget
              │
              ├──→ Hosting / Infrastructure Budget
              ├──→ Customer Support Budget
              └──→ Payment Processing Budget
                        │
                        └──→ Cost of Revenue (replaces COGS)
```

**Hosting / Infrastructure Budget**:
```
Hosting Cost = Active Users × Cost per User per Month
             + Base Platform Cost (fixed component)
```
Many SaaS companies have a stepped cost structure — infrastructure scales
in chunks (e.g., adding servers) rather than smoothly per user.

**Customer Support Budget**:
```
Support Headcount = Active Users ÷ Users per Support Agent
Support Cost = Headcount × Average Salary × (1 + Benefits Rate)
```

**Cost of Revenue for the Budgeted Income Statement**:
```
Cost of Revenue = Hosting + Support + Payment Processing + Capitalised
                  Software Amortisation
```
No inventory. No materials. Gross margin for SaaS is typically 70–85%.

### Direct Cost Budgets — Retail Archetype

When the business buys and resells merchandise, the cascade focuses on
purchasing and store operations:

```
Sales Budget (stores × revenue per store)
    │
    └──→ Merchandise Purchasing Budget
              │
              ├──→ Product Purchasing Budget
              ├──→ Freight & Warehousing Budget
              └──→ Store Operations Budget
                        │
                        └──→ COGS
```

**Merchandise Purchasing Budget**:
```
Units to Purchase = Budgeted Sales Units
                  + Desired Ending Inventory
                  − Beginning Inventory
Purchase Cost = Units × Product Cost + Freight-In
```
Inventory management is the core challenge. Seasonal businesses may build
3–4 months of inventory ahead of peak (e.g., holiday retail).

### Operating Expense Budgets (All Archetypes)

After the direct cost budgets, build operating expenses. These sit below
gross profit on the budgeted income statement.

**Selling & Marketing Budget**: sales salaries and commissions (% of
revenue or headcount-driven), advertising and demand generation (campaign-
based or % of revenue), events and trade shows, channel partner costs.

**General & Administrative Budget**: executive compensation, finance/HR/
legal headcount × salaries, office rent and occupancy, insurance,
professional fees (audit, legal), IT infrastructure. For services firms,
admin salaries and benefits are a major G&A line — model them by headcount
separately from consultant compensation above.

**R&D Budget** (if applicable): engineering headcount × salaries, lab or
development tools, contracted research. For SaaS companies this is often
the largest opex line.

Each line should be driven by an explicit assumption — never model opex as
a single lump sum. Break it into its components so the budget can be
updated when conditions change.

## The Capital Budget

The capital budget covers expenditures that create long-term assets and
the financing to fund them. It runs parallel to the operating budget and
feeds the balance sheet directly.

### Capital Expenditure Budget

List each planned capital project with its total cost, the month(s) in
which cash will be spent, and the useful life for depreciation:

| Project | Total cost | Month(s) | Useful life |
|---|---|---|---|
| Warehouse expansion | $2,400K | Mar–Jun | 20 years |
| New CRM system | $180K | Feb | 5 years |
| Office furniture | $60K | Jan | 7 years |

For asset-heavy businesses (manufacturing, retail), the capex budget is
large and may include maintenance capex (sustaining existing assets) and
growth capex (new capacity). For asset-light businesses (services, SaaS),
capex is minimal — often just IT equipment and office improvements.

Capex feeds the investing section of the cash budget and the depreciation
schedule for future periods.

### Financing Plan

How will the budget be funded? Covers:
- Planned debt draws / repayments (term loans, revolvers).
- Equity raises or buybacks.
- Dividend payments.
- Lease obligations (if material).

## From Operating + Capital Budgets → Budgeted 3-Statement Model

The operating and capital budgets are not the final product — they are
inputs that feed the budgeted financial statements. The budgeted
3-statement model uses the same architecture as a forecast 3-statement
model (see `references/three-statement.md`), with the same three bridges:

- **Bridge 1**: Budgeted Net Income → Cash Flow Statement + Retained
  Earnings.
- **Bridge 2**: Budgeted Retained Earnings → Balance Sheet Equity.
- **Bridge 3**: Cash Budget Ending Cash → Balance Sheet Cash.

### Budgeted Income Statement

Assemble the P&L from the component budgets. The structure adapts to the
archetype:

**Manufacturing / Retail**:
```
Revenue (from Sales Budget)
− COGS (from Production/Purchasing Budgets)
= Gross Profit
− Selling & Marketing (from S&M Budget)
− G&A (from G&A Budget)
− R&D (from R&D Budget, if applicable)
= Operating Income (EBIT)
− Interest Expense (from Financing Plan / Debt Schedule)
+ Interest Income
= Earnings Before Tax
− Tax Expense
= Net Income
```

**Professional Services**:
```
Revenue (from Sales Budget — billable hours × rates)
− Cost of Services (from Staffing & Delivery Budget)
    Consultant compensation
    Contractor / subcontractor fees
    Project expenses (travel, tools)
= Gross Margin on Services
− Selling & Marketing
− General & Administrative
    Admin salaries & benefits
    Office & occupancy
    Professional fees
    Technology
= Operating Income (EBIT)
− Interest Expense
= Earnings Before Tax
− Tax Expense
= Net Income
```

**SaaS**:
```
Revenue (from Sales Budget — subscribers × ARPU)
  Subscription revenue
  Professional services revenue
− Cost of Revenue (from Cost of Revenue Budget)
    Hosting & infrastructure
    Customer support
    Payment processing
= Gross Profit
− Research & Development
− Sales & Marketing
− General & Administrative
= Operating Income (EBIT)
(+ Stock-Based Compensation addback for EBITDA)
− Interest Expense
= Earnings Before Tax
− Tax Expense
= Net Income
```

The line items on the budgeted income statement must match the company's
actual reporting structure. If the company calls it "Cost of Revenue,"
the budget calls it "Cost of Revenue." If the company separates R&D from
S&M, the budget separates them. Consistency between the budget and
actuals is essential for meaningful variance analysis.

### Cash Budget (Monthly Cash Flow Forecast)

The cash budget pulls together the timing of all receipts and
disbursements from the operating and capital budgets:

**Cash Receipts**:
```
Collections from Customers = Revenue × Collection Pattern
```
The collection pattern depends on the business: SaaS may collect upfront
(prepaid annual subscriptions), services firms collect 30–60 days after
invoicing, manufacturers may offer Net 30–60 terms.

Example collection pattern for a services firm:
- 10% collected in month of service
- 60% collected in month +1
- 25% collected in month +2
- 5% collected in month +3

**Cash Disbursements from Operating Budget**:
```
Manufacturing:  Materials purchases (per supplier terms) + labour + OH
Services:       Salaries (monthly) + contractor invoices (Net 30) + T&E
SaaS:           Salaries (monthly) + hosting (monthly) + vendor payments
All:            Opex payments (mostly monthly for salaries, rent)
                Quarterly estimated tax payments
                Monthly or quarterly interest payments
```

**Cash Disbursements from Capital Budget**:
```
Capex payments (per project schedule)
Debt repayments (per amortisation schedule)
Dividends (per declared schedule)
```

**Cash Budget Roll-Forward**:
```
Beginning Cash
+ Cash Receipts
− Operating Disbursements
− Capital Disbursements
= Ending Cash Before Financing
+/− Borrowing / Repayment (to maintain minimum cash)
= Ending Cash
```

If ending cash goes negative before financing adjustments, the budget has
identified a funding gap — the business needs additional financing (draw
on revolver, raise equity, defer capex) to survive that month.

### Budgeted Balance Sheet

Project each balance sheet line item using the budget outputs:

**Assets**:
- Cash: from the cash budget ending balance [Bridge 3].
- Accounts Receivable: from the collection schedule (revenue billed but
  not yet collected).
- Unbilled Revenue / WIP (services firms): work completed but not yet
  invoiced.
- Inventory (manufacturing/retail only): from the production /
  purchasing budget ending inventory.
- Prepaid Expenses: from prepayment schedules.
- PP&E: from the capex budget + depreciation schedule
  (Beginning + Capex − Depreciation = Ending).
- Capitalised Software (SaaS): from capitalisation schedule.

**Liabilities**:
- Accounts Payable: from the purchasing budget (purchases made but not
  yet paid, based on payment terms).
- Accrued Expenses: salaries earned but not yet paid (if payroll timing
  crosses month-end), accrued bonuses, accrued taxes.
- Deferred Revenue (SaaS/services): customer payments received for
  services not yet delivered.
- Current Portion of Debt: from the financing plan.
- Long-Term Debt: from the financing plan.

**Equity**:
- Common Stock / APIC: from the financing plan (holds flat unless
  equity raise planned).
- Retained Earnings: Beginning RE + Budgeted Net Income − Budgeted
  Dividends = Ending RE [Bridge 2].

Verify: Total Assets = Total Liabilities + Equity every month.

### Budgeted Cash Flow Statement (Indirect Method)

Derived from the budgeted income statement and balance sheet, exactly as
in the 3-statement model:

```
Budgeted Net Income [Bridge 1]
+ Depreciation & Amortisation
+ Other Non-Cash Items (SBC, deferred taxes)
+/− Changes in Working Capital (month-to-month BS deltas)
= Cash from Operations

− Capital Expenditures (from capex budget)
= Cash from Investing

+/− Debt Issuance / Repayment
+/− Equity Issuance / Buyback
− Dividends
= Cash from Financing

Net Change in Cash = CFO + CFI + CFF
Beginning Cash + Net Change = Ending Cash [Bridge 3]
```

The ending cash must tie to both the cash budget and the balance sheet.
If all three match, the budgeted 3-statement model is internally
consistent.

## Tracking Budget Performance with Variance Analysis

Variance analysis is the process of comparing actual results against the
budget to identify what went differently and why. It is the primary tool
for monitoring and controlling a business against its plan.

### The Flexed Budget Approach

A common mistake is comparing actuals against the original budget when
actual volume differs from planned volume. This conflates volume effects
with price/efficiency effects. The flexed (revised) budget solves this
by recalculating the budget at the actual volume before comparing.

```
                    Original    Flexed      Actual    Variances
                    Budget      Budget
Sales Volume        100         90          90
Sales Value         $1,000      $900        $990      $90 F
Variable Costs      (500)       (450)       (495)     (45) U
Fixed Costs         (200)       (200)       (210)     (10) U
Profit              $300        $250        $285      $35 F
                            ↑                     ↑
                     Volume variance = ($50)  Operating variances = $35
                     (Original − Flexed)      (Flexed − Actual)
```

**Step 1 — Calculate the Volume Variance**: the difference between the
original budget and the flexed budget. This isolates how much of the
profit variance is due to selling more or fewer units than planned.
Volume variance = Original Budget Profit − Flexed Budget Profit.

**Step 2 — Calculate Operating Variances**: the difference between the
flexed budget and actuals. This isolates price, cost, and efficiency
effects at the actual volume level. Operating variance = Flexed Budget
Profit − Actual Profit.

**Step 3 — Decompose Operating Variances**: break each operating
variance into its root causes.

### Revenue Variances

```
Sales Volume Variance = (Actual Volume − Budget Volume) × Budget Price
Sales Price Variance  = (Actual Price − Budget Price) × Actual Volume
Mix Variance          = Impact of actual product/segment mix differing
                        from budgeted mix (if multiple products)
```

A favourable (F) revenue variance means actual exceeded budget. An
unfavourable (U) variance means actual fell short.

### Direct Cost Variances — Manufacturing

For variable costs, decompose into price and efficiency:

```
Materials Price Variance = (Actual Price/m − Std Price/m) × Actual Qty
Materials Usage Variance = (Actual Qty/unit − Std Qty/unit) × Std Price
                           × Actual Units

Example:
  Budget: 100 units × 2.5m × $2.00/m = $500
  Actual: 90 units × 2.0m × $2.75/m = $495
  Flexed: 90 units × 2.5m × $2.00/m = $450

  Total variance = $495 − $450 = ($45) U

  Price variance = ($2.75 − $2.00) × (90 × 2.0m) = ($135) U
  Usage variance = (2.0m − 2.5m) × $2.00 × 90 = $90 F
  Check: ($135) + $90 = ($45) U ✓
```

The same logic applies to labour:
```
Labour Rate Variance       = (Actual Rate − Std Rate) × Actual Hours
Labour Efficiency Variance = (Actual Hours − Std Hours) × Std Rate
```

For fixed costs:
```
Fixed Cost Spending Variance = Actual Fixed Costs − Budgeted Fixed Costs
```
Fixed costs do not flex with volume — the flexed budget holds them at
the original amount. Any variance is a pure spending difference.

### Direct Cost Variances — Professional Services

Services firms decompose cost of services into utilisation, rate, and
headcount effects:

```
Utilisation Variance = (Actual Util − Budget Util) × Budget HC
                       × Budget Hours/Person × Budget Cost/Hour
Rate Variance        = (Actual Billing Rate − Budget Rate) × Actual
                       Billable Hours
Headcount Variance   = (Actual HC − Budget HC) × Budget Cost per Head
Contractor Variance  = Actual Contractor Spend − Budget Contractor Spend
```

For a services firm, the utilisation variance is often the most
important — it measures whether the firm kept its people billable at the
planned rate.

### Direct Cost Variances — SaaS

SaaS companies decompose cost of revenue differently:

```
Hosting Variance  = Actual Hosting Cost − (Actual Users × Budget
                    Cost/User + Budget Platform Cost)
Support Variance  = (Actual Support HC − Budget HC) × Budget Cost/Head
                    + (Actual Cost/Head − Budget Cost/Head) × Actual HC
```

### Opex Variances (All Archetypes)

For each operating expense line:
```
Spending Variance = Actual Spend − Budgeted Spend
```

For headcount-driven lines, further decompose:
```
Headcount Variance   = (Actual HC − Budget HC) × Budget Cost per Head
Cost-per-Head Var    = (Actual Cost/Head − Budget Cost/Head) × Actual HC
```

For revenue-linked lines (e.g., commissions at % of revenue):
```
Volume Effect = (Actual Revenue − Budget Revenue) × Budget % of Revenue
Rate Effect   = (Actual % − Budget %) × Actual Revenue
```

### Variance Dashboard

Build a variance dashboard tab that provides management with an at-a-
glance view of budget performance. Include:

**Summary section**:
- Total revenue variance (volume + price + mix breakdown).
- Total gross profit variance.
- Total opex variance by category.
- Net income variance.
- Cash variance (budget vs. actual ending cash).

**Detail section** (expandable by department/cost centre):
- Each line item showing: budget, actual, variance ($), variance (%),
  and favourable/unfavourable classification.
- Conditional formatting: green for favourable, red for unfavourable,
  orange for variances exceeding a materiality threshold (e.g., >5% or
  >$50K).

**Trend section**:
- Monthly variance trend showing whether performance is improving or
  deteriorating relative to budget. A business that misses budget by 2%
  in January and 8% in March has a worsening trend that demands action
  even if the individual months aren't catastrophic.

**Waterfall chart**:
- A bridge from budgeted profit to actual profit, with each major
  variance shown as a step (volume, price, variable costs, fixed costs,
  opex). This is the most effective way to communicate budget performance
  to senior leadership.

### Materiality and Investigation Thresholds

Not every variance warrants investigation. Define thresholds:

- Investigate if variance exceeds both a percentage threshold (e.g., 5%)
  AND an absolute threshold (e.g., $25K). This avoids investigating
  large percentage swings on tiny amounts or small percentages on large
  base numbers.
- Always investigate variances that are trending unfavourably across
  consecutive months, regardless of size.
- Focus investigation effort on controllable variances — variances caused
  by market conditions (e.g., commodity price spikes) may be noted but
  not actionable at the department level.

## Rolling Forecasts

A rolling forecast extends the budget continuously — as each month
closes, a new month is added to maintain a constant planning horizon
(e.g., always 12 or 18 months forward). This is more dynamic than a
fixed annual budget.

Implementation: copy the budget structure, update assumptions monthly
based on the latest actual results and revised outlook. The operating
budget components (staffing plan, purchasing plan, capex schedule) are
updated to reflect current conditions rather than the assumptions made
at the start of the year.

## Forecasting Techniques

Budget assumptions must be grounded in evidence. Use a combination of
quantitative and qualitative techniques to develop defensible forecasts.

### Quantitative Techniques

**Moving Averages**: a smoothing technique that reveals the underlying
trend by averaging recent data points. Use a 3-month moving average for
volatile series or a 12-month moving average to eliminate seasonality.
In Excel: `=AVERAGE(B2:B4)` sliding across months.

When to use: repeated forecasts where the recent trend is the best
predictor of the near future. Requires only historical data.

**Simple Linear Regression**: models the relationship between one
independent variable (X) and one dependent variable (Y). Use Excel's
`LINEST` function or the Data Analysis ToolPak to find the equation
`Y = a + bX`, then plug in the forecast value of X to predict Y.

Example: if radio ads (X) predict revenue (Y) with R² = 0.93, and you
plan 150 ads next month, predicted revenue = intercept + slope × 150.

When to use: when a single driver explains most of the variation in the
budget item. Check R² — below 0.7 means the relationship is too weak.

**Multiple Linear Regression**: extends simple regression to two or more
independent variables. `Y = a + b₁X₁ + b₂X₂ + ...`. Use the Analysis
ToolPak in Excel or `sklearn` / `statsmodels` in Python.

When to use: when the budget item is influenced by multiple factors
simultaneously (e.g., revenue depends on both promotion spend and
advertising spend). Requires statistical knowledge to interpret
coefficients, p-values, and adjusted R².

### Cost Behaviour Analysis

Before forecasting costs, classify each cost line by its behaviour
pattern. This determines how the cost should be modelled:

**Fixed costs**: do not change with volume within a relevant range.
Examples: rent, executive salaries, insurance. Budget as a flat monthly
amount, adjusted only for known contractual changes.

**Variable costs**: scale proportionally with volume. Examples: raw
materials, sales commissions, shipping. Budget as a per-unit or
percentage-of-revenue rate.

**Semi-variable (mixed) costs**: have a fixed component plus a variable
component. Examples: utilities (base charge + usage), phone plans,
vehicle costs. Budget using the high-low method or regression to
separate the fixed and variable portions:
```
Variable Rate = (Highest Cost − Lowest Cost) ÷ (Highest Volume − Lowest Volume)
Fixed Component = Total Cost − (Variable Rate × Volume)
```

**Stepped fixed costs**: remain fixed within a range but jump to a new
level when a threshold is crossed. Examples: supervisor salaries (one
per shift), warehouse rent (add a warehouse when capacity is exceeded).
Budget using IF logic: `=IF(Volume > Threshold, Higher_Cost, Lower_Cost)`.

### Qualitative Techniques

Use these to challenge and contextualise quantitative forecasts:

**PEST Analysis**: assess Political, Economic, Social, and Technological
factors that could impact the budget. For each factor, ask: should we
anticipate change, identify opportunities or threats, or prepare to
react? Document the PEST assessment on the Assumptions tab as context
for key assumptions.

**Porter's Five Forces**: assess industry dynamics — rivalry, supplier
power, buyer power, threat of substitutes, and threat of new entrants.
This helps set realistic assumptions for pricing power, margin
sustainability, and competitive intensity.

Both qualitative frameworks should be documented as narrative context
alongside the quantitative assumptions, so anyone reviewing the budget
understands the strategic reasoning behind the numbers.

## Master Budget Workbook Layout

| Tab | Contents |
|---|---|
| Assumptions | All budget drivers, seasonality, payment terms, methodology notes |
| Sales Budget | Monthly revenue by product/segment/service line |
| Direct Cost Budget | Adapted to archetype (see above) |
| Opex Budgets | S&M, G&A, R&D by cost category |
| Capex Budget | Project list with timing and useful lives |
| Financing Plan | Debt schedule, equity changes, dividends |
| Budgeted IS | Monthly P&L assembled from operating budgets |
| Cash Budget | Monthly receipts, disbursements, financing |
| Budgeted BS | Monthly balance sheet |
| Budgeted CFS | Monthly cash flow statement (indirect) |
| Actuals Entry | Monthly actual figures entered as they become available |
| Variance Report | Flexed budget + variance decomposition by line item |
| Variance Dashboard | Summary, waterfall chart, trends, materiality flags |
| Dashboard | Key budget KPIs, cash runway, funding gaps |
