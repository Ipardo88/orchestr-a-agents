# Monthly Cash Flow Modeling

## Why Monthly Instead of Annual

Annual models work for valuation and strategic planning, but they lack the
precision needed for short-term liquidity management. Monthly models matter
because they:

- Track the **exact timing** of cash inflows and outflows.
- Reveal **seasonality patterns** that annual figures hide.
- Anticipate **funding gaps** before they become emergencies.

## Key Timing Elements

Monthly modeling is fundamentally about the difference between when something
is *recognised* and when cash actually *moves*. Pay attention to these six
timing disconnects:

### 1. Capex and Depreciation
Capital expenditures hit cash in the month of purchase, but depreciation
spreads the P&L impact over the asset's useful life. Model both the cash
outflow (investing activities) and the monthly depreciation charge (operating
income) separately.

### 2. Interest Accrued vs. Interest Paid
Interest accrues monthly but may be paid semi-annually or quarterly. The
income statement records accrued interest each month; the cash flow statement
records the payment only in the month it occurs. Track an "Accrued Interest"
liability on the balance sheet for the gap.

### 3. Dividends Declared vs. Paid
A dividend may be declared in one month and paid one to two months later.
Record the declaration as a liability (Dividends Payable) and the payment
as a financing cash outflow when it actually leaves the bank.

### 4. Taxes Accrued vs. Paid
Tax expense is accrued monthly (1/12 of the annual estimate, or a more
precise monthly calculation), but estimated tax payments are typically made
quarterly. Model a "Taxes Payable" liability that builds monthly and drops
when the quarterly payment is made.

### 5. Scheduled Debt Repayments
Monthly debt schedules track exactly when principal repayments and drawdowns
occur. Do not spread annual repayments evenly unless that matches the actual
amortisation schedule.

### 6. Seasonality and Working Capital
Accounts receivable, inventory, and accounts payable fluctuate with seasonal
revenue patterns. Use monthly DSO, DIO, and DPO assumptions that can vary by
month (e.g., holiday inventory build-up in Q3 for a retailer).

## Building the Monthly Cash Flow Forecast

A monthly cash flow forecast is derived from a monthly income statement and
balance sheet using the same indirect method as an annual model, but with
month-to-month granularity.

### Step 1 — Forecast Monthly Operating Cash Flows

```
Net Income (from monthly IS)
(+) Depreciation & Amortisation (from PP&E schedule)
(+) Other Non-Cash Items (SBC, deferred taxes)
(+/−) Changes in Operating Assets & Liabilities:
    Δ Accounts Receivable (month-to-month BS change)
    Δ Inventory (month-to-month BS change)
    Δ Prepaid Expenses (month-to-month BS change)
    Δ Accounts Payable (month-to-month BS change)
    Δ Accrued Expenses (month-to-month BS change)
    Δ Tax Payable (month-to-month BS change)
    Δ Accrued Interest (month-to-month BS change)
────────────────────────
Net Cash from Operating Activities
```

The working capital changes are the core difference from annual models. Every
balance sheet current item creates a cash impact when it changes month to
month.

### Step 2 — Forecast Monthly Investing Cash Flows

```
(-) Purchases of Fixed Assets (PP&E)
(+) Proceeds from Asset Disposals
(-) Payments for Acquisitions / Investments
(+) Proceeds from Disposals of Businesses
────────────────────────
Net Cash from Investing Activities
```

Capital expenditures should be modelled at the individual project or asset
level, with the cash outflow hitting the specific month of purchase — not
spread evenly unless that's the actual payment schedule (e.g., construction
draws).

### Step 3 — Forecast Monthly Financing Cash Flows

```
(+/−) Change in Long-Term Debt (drawdowns vs. repayments)
(+/−) Change in Revolver Balance
(+) Equity Issuance Proceeds
(-) Share Buybacks
(-) Dividends Paid (in the month of actual payment)
────────────────────────
Net Cash from Financing Activities
```

Debt changes come from the monthly debt schedule. Dividend payments come
from the retained earnings breakdown (declared vs. paid tracking).

### Step 4 — Reconcile

```
Net Change in Cash = CFO + CFI + CFF
Beginning Cash (prior month ending) + Net Change = Ending Cash
```

Ending cash feeds into the balance sheet. If ending cash goes negative in
any month, that's your funding gap — the model should flag it automatically.

## Monthly Model Workbook Layout

| Tab | Contents |
|---|---|
| Assumptions | All drivers, including monthly seasonality indices |
| Revenue Build | Monthly revenue by segment/product/channel |
| Income Statement | Monthly P&L (with quarterly and annual roll-ups) |
| Balance Sheet | Monthly balance sheet (with quarterly and annual roll-ups) |
| Cash Flow Statement | Monthly CFS derived from IS and BS |
| Working Capital | DSO/DIO/DPO calculations by month |
| Debt Schedule | Monthly amortisation, interest accrual, and payment timing |
| Depreciation Schedule | Monthly capex, depreciation by asset class |
| Tax Schedule | Monthly accruals and quarterly estimated payments |
| Dashboard | Monthly cash waterfall chart, minimum cash tracker, KPIs |

## Roll-Up Formulas

Include quarterly and annual summary columns that aggregate monthly data.
Use `SUMIFS` or structured references so that adding months doesn't break
the roll-ups.

For the income statement, quarterly and annual columns simply sum the
monthly columns. For the balance sheet, quarterly and annual columns show
the end-of-quarter / end-of-year snapshot (the last month's values, not a
sum).

## Revolver / Line of Credit Modelling

Many monthly models include an automatic revolver draw to maintain a minimum
cash balance:

```
Required Draw = MAX(0, Minimum_Cash - Cash_Before_Revolver)
Revolver Balance = Prior Balance + Draw − Repayment
Repayment = MIN(Prior Balance, MAX(0, Cash_Before_Revolver − Minimum_Cash))
```

This introduces a circularity (revolver → interest → net income → cash →
revolver). Handle it the same way as the 3-statement model circular
reference: iterative calculations in Excel, or a convergence loop in Python.

## Stress Testing Monthly Cash Flows

Run scenarios that stress the timing elements:

- **Delayed collections**: DSO increases by 15–30 days for three months.
- **Revenue shock**: 20% revenue decline for two months, slow recovery.
- **Capex acceleration**: a major project pulls forward by two months.
- **Revolver unavailability**: remove the revolver and see which months go
  negative.

These scenarios reveal when the company is most vulnerable and how large a
cash reserve or credit facility it needs.
