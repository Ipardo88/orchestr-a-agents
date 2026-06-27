# 3-Statement Financial Model

## Overview

A 3-statement model links the Income Statement, Balance Sheet, and Cash Flow
Statement so that a change in any assumption automatically ripples through all
three. This is the foundational architecture for almost every other financial
model (DCF, LBO, M&A, budgeting).

## The Three Bridge Accounts

Understanding how the statements connect is the single most important concept
in financial modeling. Three accounts serve as bridges:

### Bridge 1 — Net Income (IS → CFS and IS → BS)

Net Income is the bottom line of the Income Statement. It flows into two
places simultaneously:

- **Into the Cash Flow Statement** as the starting point for operating cash
  flows. From there it is adjusted for non-cash items (depreciation, deferred
  taxes) and changes in working capital to reveal how much actual cash the
  business generated.
- **Into the Balance Sheet** through Retained Earnings. The Retained Earnings
  roll-forward is: Beginning RE + Net Income − Dividends = Ending RE. This
  is how profitability accumulates on the balance sheet over time.

### Bridge 2 — Retained Earnings (IS → BS via Equity Schedule)

Retained Earnings sits in the Equity section of the Balance Sheet. It
increases by Net Income each period and decreases by dividends paid. The
Equity Schedule calculates this roll-forward and feeds the result into the
Balance Sheet. Dividends also appear as a financing cash outflow on the CFS.

### Bridge 3 — Cash Balance (CFS → BS)

The Cash Flow Statement produces an ending cash balance:
```
Beginning Cash + Cash from Operations + Cash from Investing
  + Cash from Financing = Ending Cash
```
This ending cash figure feeds directly into Current Assets on the Balance
Sheet. When all three bridges are wired correctly, any change to a revenue
assumption will flow through Net Income, adjust Retained Earnings, generate
the correct cash flows, and land the right cash balance on the Balance Sheet
— all automatically.

### How the Linkages Flow

```
INCOME STATEMENT                 CASH FLOW STATEMENT
─────────────────                ─────────────────────
Revenue                          Net Income ◄───────── [Bridge 1]
 − COGS                          + Depreciation
 = Gross Profit                   + Deferred Taxes
 − SG&A / Other                   +/− Working Capital Δ
 = EBITDA                        ────────────────────
 − Depreciation                  Cash from Operations
 = EBIT                           − Capex
 − Interest Expense              ────────────────────
 = EBT                           Cash from Investing
 − Taxes                          +/− Debt Changes
 = Net Income ──────────┐         +/− Equity Changes
                        │         − Dividends
                        │        ────────────────────
                        │        Cash from Financing
                        │
                        │        Net Change in Cash
                        │        + Beginning Cash
                        │        = Ending Cash ──────────┐
                        │                                │
BALANCE SHEET           │                                │
──────────────          │                                │
ASSETS                  │                                │
  Cash ◄────────────────┼────────────────────────────────┘
  Accounts Receivable   │                         [Bridge 3]
  Inventory             │
  PP&E                  │
                        │
LIABILITIES             │
  Accounts Payable      │
  Revolving Credit      │
  Long-Term Debt        │
  Deferred Taxes        │
                        │
EQUITY                  │
  Common Equity         │
  Retained Earnings ◄───┘  (Beginning RE + NI − Dividends)
                               [Bridge 2]

  Check: Total Assets = Total Liabilities + Equity (every period)
```

## Workbook Structure

The model uses a four-tab architecture that separates navigation, outputs,
inputs, and calculations. Each tab has a clear role.

### Tab 1 — Cover Page

A navigation and control hub. Include:

- **Table of Contents** with hyperlinks to each tab.
- **Model Checks** — a dashboard showing pass/fail for key integrity tests:
  whether the balance sheet balances, whether unused tax losses remain,
  whether operational capacity has been exceeded, etc. Use conditional
  formatting (0 = green/pass, non-zero = red/fail).
- **Circularity Switch** — a single cell (1 = on, 0 = off) that enables or
  disables circular references. When off, interest income/expense from the
  revolver uses the prior period's values, breaking the loop for debugging.
  Include instructions for enabling iterative calculations in both PC and Mac
  versions of Excel.

### Tab 2 — Outputs (Dashboard)

Summary charts and key metrics for decision-makers. This tab contains no
inputs and no calculations — it only links to results computed on the Model
tab.

Include:
- Revenue, EBITDA, and Net Income trends with margins.
- Cash flow breakdown (Operating, Investing, Financing, Change in Cash).
- Miniature Income Statement, Cash Flow Statement, and Balance Sheet
  summaries with year-over-year comparisons.
- All charts driven by the same scenario selector as the Inputs tab.

### Tab 3 — Inputs (Assumptions & Drivers)

All user-editable assumptions in one place. Nothing on this tab is a
formula — every cell is a hard-coded input in blue font.

Organise into two sections:

**Key Drivers** (with scenario toggle):
- Driver Switch — a single cell controlling which scenario set feeds the
  model. Use `CHOOSE(Driver_Switch, Best, Base, Worst)` on the Model tab.
- Sales Volume Growth (Best / Base / Worst cases by year).
- Pricing Increases (Best / Base / Worst cases by year).
- Capital Expenditure (Best / Base / Worst cases by year).

**Other Inputs** (single-scenario):
- Working Capital: AR Days, Inventory Days, AP Days.
- Inflation Rate by year.
- Term Debt changes (annual increase/decrease).
- Common Equity changes (annual increase/decrease).
- Dates: first forecast year, days in period.
- Tax: statutory rate, first-year tax depreciation percentage, blended tax
  depreciation rate, tax basis for assets, tax losses carried forward.
- Operational: plant capacity (units/day), dividend payout ratio.

### Tab 4 — Model (Calculation Engine)

All calculations live here. This is the "engine room." Organise into clearly
labelled sections separated by visual dividers.

**Section order and what each computes:**

#### 1. Income Statement

The income statement structure adapts to the business model. See
`references/business-archetypes.md` for how each archetype changes the
line items. The layout below shows the manufacturing archetype (which
matches the CFI model). For other archetypes, replace COGS and the Cost
Schedule as follows:

- **Services**: replace COGS with "Cost of Services" (consultant
  compensation + contractors + project expenses). Remove inventory from
  working capital. Cost Schedule becomes a headcount/staffing model.
- **SaaS**: replace COGS with "Cost of Revenue" (hosting + support +
  payment processing). Remove inventory. Add prominent R&D line.
- **Retail**: COGS is merchandise purchases + freight. Inventory is the
  dominant working capital item.
- **Financial services**: no COGS — use provision for credit losses and
  net interest margin structure instead.

**Manufacturing / Product archetype** (default):
```
Revenue                          ← from Revenue Schedule
 − COGS                          ← from Cost Schedule
 = Gross Profit
 − SG&A                          ← fixed costs inflated by inflation rate
 − Other Expenses
 = EBITDA
 − Depreciation                  ← from Depreciation Schedule
 = EBIT
 − Interest Expense              ← from Debt Schedule
 + Interest Income               ← from Debt Schedule
 = EBT
 − Current Tax                   ← from Tax Schedule
 − Deferred Tax                  ← from Tax Schedule
 = Net Income
```

#### 2. Cash Flow Statement
```
CASH FROM OPERATING
  Net Income                     ← [Bridge 1: from IS]
  + Deferred Taxes               ← from Tax Schedule
  + Depreciation                 ← from Depreciation Schedule
  + Cash from AR                 ← from Working Capital Schedule
  + Cash from Inventory          ← from Working Capital Schedule
  + Cash from AP                 ← from Working Capital Schedule
  = Subtotal (Operating CF)

CASH FROM INVESTING
  − Capital Expenditure          ← from Inputs tab
  = Subtotal (Investing CF)

CASH FROM FINANCING
  + Change in Long-Term Debt     ← from Inputs tab
  + Change in Revolving Credit   ← from Debt Schedule (circular)
  + Change in Common Equity      ← from Inputs tab
  − Dividends                    ← from Equity Schedule
  = Subtotal (Financing CF)

CASH BALANCE
  Beginning Cash                 ← prior period ending
  + Change in Cash               ← sum of three subtotals
  = Ending Cash                  ← [Bridge 3: feeds BS Cash line]
```

#### 3. Balance Sheet
```
ASSETS
  Cash                           ← [Bridge 3: from CFS ending balance]
  Accounts Receivable            ← from Working Capital Schedule
  Inventory                      ← from Working Capital Schedule
  PP&E                           ← from Asset Schedule
  Total Assets

LIABILITIES
  Accounts Payable               ← from Working Capital Schedule
  Revolving Credit Line          ← from Debt Schedule
  Deferred Taxes                 ← from Tax Schedule (cumulative)
  Long-Term Debt                 ← from Debt Schedule
  Total Liabilities

EQUITY
  Common Equity                  ← from Equity Schedule
  Retained Earnings              ← [Bridge 2: Beginning RE + NI − Dividends]
  Total Shareholders' Equity

  Total Liabilities & Equity
  Check = Total Assets − Total L&E   (must equal zero every period)
```

#### 4. Revenue Schedule
Build revenue from first principles:
```
Sales Volume = Prior Units × (1 + Volume Growth)
Unit Price = Prior Price × (1 + Pricing Increase)
Revenue = Volume (units) × Days in Period × Unit Price
```
Include a Plant Capacity check:
`Capacity Exceeded? = IF(Volume > Capacity, 1, 0)`

#### 5. Cost Schedule

The cost schedule structure depends on the business archetype. The layout
below is for manufacturing. For other archetypes, see
`references/business-archetypes.md` and `references/master-budget.md`.

**Manufacturing**: split costs into variable and fixed:
```
Variable: Materials ($/unit) + Packaging ($/unit), inflated annually.
Fixed: Labour + Utilities, inflated annually.
COGS = (Variable × Units) + Fixed Costs
```

**Services**: headcount-driven:
```
Consultant Compensation = Headcount × Avg Salary × (1 + Benefits Rate)
Contractor Cost = External Hours × Contractor Rate
Project Expenses = Engagements × Avg T&E per Engagement
Cost of Services = Compensation + Contractors + Project Expenses
```

**SaaS**: infrastructure + support:
```
Hosting = Active Users × Cost per User + Base Platform Cost
Support = Support Headcount × Avg Salary × (1 + Benefits Rate)
Cost of Revenue = Hosting + Support + Payment Processing
```

#### 6. Working Capital Schedule

Which components to include depends on the business archetype. Only model
items that are material for this business:

**Manufacturing / Retail** (full working capital):
```
Accounts Receivable = Revenue / Days in Period × AR Days
Inventory = COGS / Days in Period × Inventory Days
Accounts Payable = COGS / Days in Period × AP Days
```

**Professional Services** (AR-dominated, no inventory):
```
Accounts Receivable = Revenue / Days in Period × DSO
Unbilled Revenue (WIP) = Work completed but not yet invoiced
Accounts Payable = minor (model as % of opex or hold flat)
```

**SaaS** (deferred revenue is the key item):
```
Accounts Receivable = Revenue / Days in Period × DSO (often low)
Deferred Revenue = Prepaid subscriptions not yet recognised
Prepaid Expenses = Prepaid hosting/vendor contracts
```

Cash impact = prior period balance − current period balance for each item.
These feed into the operating section of the CFS.

#### 7. Depreciation Schedule
Track existing assets and new capex separately:
```
Existing Assets: PP&E at start ÷ Useful Life = annual depreciation.
New Assets: each year's capex ÷ its useful life, with a half-year
  convention in the first year (50% of full-year depreciation).
Total Depreciation = Existing + New.
```
Build a matrix where rows are capex vintages and columns are years, showing
the depreciation contribution from each vintage in each year.

#### 8. Asset Schedule (PP&E and Tax Basis)
Roll-forward for both accounting and tax books:
```
Accounting PP&E: Beginning + Capex − Accounting Depreciation = Ending
Tax Basis: Beginning + Capex − Tax Depreciation = Ending
```
The difference between accounting and tax depreciation drives the deferred
tax liability.

#### 9. Income Tax Schedule
```
EBT
+ Accounting Depreciation
− Tax Depreciation
= EBT After Depreciation Adjustment
− Use of Tax Losses (carried forward)
= Taxable Income
× Tax Rate
= Current Tax

Deferred Tax = (Tax Depreciation − Accounting Depreciation) × Tax Rate
Total Tax = Current + Deferred
```
Track tax loss carry-forwards: Beginning + New Losses − Losses Used = Ending.

#### 10. Debt Schedule (Part 1: Cash and Long-Term Debt)
```
CASH
  Beginning Balance → Ending Balance (links to CFS / BS)
  Interest Rate → Interest Income (circular via circularity switch)

LONG-TERM DEBT
  Beginning Balance + Increase/Decrease = Ending Balance
  Interest Rate × Average Balance = Interest Expense
```

#### 11. Debt Schedule (Part 2: Revolving Credit Line)
Calculate available cash before revolver:
```
Beginning Cash
+ Cash from Operations
+ Cash from Investing
+ Change in Long-Term Debt
+ Change in Common Equity
− Dividends
= Cash Available for Revolver
```
If cash available is negative, draw on the revolver. If positive, repay.
```
Revolver Ending = MAX(0, Prior Balance − Cash Available)
```
Revolver interest creates a circularity (revolver balance → interest expense
→ net income → cash → revolver balance). Use the circularity switch on the
Cover tab: when switch = 1, use the circular formula; when switch = 0, use
the prior period's interest to break the loop.

#### 12. Equity Schedule
```
COMMON EQUITY
  Beginning + Increase/Decrease = Ending

RETAINED EARNINGS
  Beginning + Net Income − Dividends = Ending
  Dividends = Net Income × Payout Ratio
```
Net Income flows in from the IS [Bridge 2]. Dividends flow out to the
financing section of the CFS.

## Circular Reference Resolution

The model contains two sources of circularity:

1. **Revolver → Interest Expense → Net Income → Cash → Revolver**
2. **Cash Balance → Interest Income → Net Income → Cash Balance**

**Excel**: Enable iterative calculations (`File → Options → Formulas →
Enable Iterative Calculation`, max iterations = 100, max change = 0.001).
Use a circularity switch cell: `=IF(Circ_Switch=1, circular_formula,
prior_period_value)`.

**Python**: Seed interest at zero. Run the full model. Recompute interest
from resulting balances. Repeat until convergence (change < $1). Typically
converges in 3–5 iterations.

## Historical vs. Forecast Separation

Use a flag row: `H` for historical, `F` for forecast. Historical columns
contain hard-coded actuals (blue font). Forecast columns are 100% formula-
driven. Conditional formatting can shade historical columns grey.

For the CFI model pattern, historical years (e.g., 2020–2022) show actual
figures, while forecast years (e.g., 2023F–2027F) are driven entirely by
the Inputs tab assumptions.

## Build Sequence

1. Set up the Cover page with checks and circularity switch (switch OFF).
2. Enter all assumptions on the Inputs tab.
3. Build the Revenue Schedule and Cost Schedule.
4. Build the Income Statement through EBITDA.
5. Build the Depreciation Schedule and Asset Schedule.
6. Complete the Income Statement through Net Income (use placeholder interest).
7. Build the Working Capital Schedule.
8. Build the Cash Flow Statement — operating and investing sections.
9. Build the Equity Schedule (Retained Earnings roll-forward, dividends).
10. Build the Debt Schedule Part 1 (cash, long-term debt).
11. Build the Debt Schedule Part 2 (revolver, available cash logic).
12. Complete the CFS financing section and cash balance.
13. Build the Balance Sheet — wire all three bridges:
    - Cash ← CFS ending balance [Bridge 3]
    - Retained Earnings ← Equity Schedule [Bridge 2]
    - Net Income started the CFS [Bridge 1]
14. Add the Check row: `Total Assets − Total L&E` = must be zero.
15. Turn circularity switch ON. Verify model iterates to convergence.
16. Build the Income Tax Schedule (current + deferred).
17. Build the Outputs/Dashboard tab.
18. Run the audit checklist (see `best-practices.md`).

## Scenario Toggle Pattern

The Inputs tab provides Best / Base / Worst case values for key drivers.
A single Driver Switch cell (1 = Best, 2 = Base, 3 = Worst) controls which
set feeds the model. On the Model tab, use:

```
=CHOOSE(Driver_Switch, Best_Case_Cell, Base_Case_Cell, Worst_Case_Cell)
```

This lets the user flip between scenarios with a single cell change,
instantly updating the entire model and dashboard.
