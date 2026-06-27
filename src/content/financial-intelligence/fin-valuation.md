# Valuation Analysis

## Valuation Method Decision Tree

Use this framework to select the appropriate valuation methodology. In
practice, analysts use multiple methods and triangulate — no single method
gives the "right" answer.

```
Is the company expected to generate positive free cash flows?
├─ YES → Is there sufficient visibility to forecast 5+ years?
│   ├─ YES → PRIMARY: Discounted Cash Flow (DCF)
│   │         CROSS-CHECK: Comparable Companies, Precedent Transactions
│   └─ NO  → PRIMARY: Comparable Companies (Trading Multiples)
│             CROSS-CHECK: Precedent Transactions
├─ NO (but expected to become profitable)
│   └─ Is the company pre-revenue or early-stage?
│       ├─ YES → PRIMARY: Venture Capital Method / Revenue Multiples
│       │         CROSS-CHECK: Comparable Transactions at similar stage
│       └─ NO  → PRIMARY: Comparable Companies (EV/Revenue)
│                 CROSS-CHECK: DCF with explicit path to profitability
└─ NO (distressed / declining)
    └─ PRIMARY: Asset-Based Valuation (Liquidation or Book Value)
      CROSS-CHECK: Comparable Transactions (distressed M&A)

Special situations:
- Financial institutions → Use P/BV, P/E, Dividend Discount Model
- REITs → Use Price/FFO, Price/AFFO, NAV
- Natural resources → Use NAV based on reserve estimates, DCF of reserves
- Cyclical companies → Use mid-cycle normalised earnings for multiples
```

Always present valuation as a **range** (e.g., a football field chart), not a
single point estimate.

## Method 1 — Discounted Cash Flow (DCF)

### When to Use
The company has predictable cash flows, a reasonable basis for projecting
5–10 years of performance, and you can estimate a sensible discount rate.

### Structure

**Step 1 — Project Free Cash Flows**

Unlevered Free Cash Flow (UFCF):
```
EBIT
× (1 − Tax Rate)
= NOPAT
+ Depreciation & Amortisation
− Capital Expenditures
− Change in Net Working Capital
= Unlevered Free Cash Flow
```

Levered Free Cash Flow (LFCF) — used less often, typically for equity value:
```
Net Income
+ Depreciation & Amortisation
− Capital Expenditures
− Change in Net Working Capital
+ Net Borrowing
= Levered Free Cash Flow
```

Project UFCF for an explicit forecast period (typically 5–10 years), driven
by the 3-statement model's income statement and balance sheet.

**Step 2 — Determine the Discount Rate**

For UFCF, use Weighted Average Cost of Capital (WACC):
```
WACC = (E/V) × Re + (D/V) × Rd × (1 − Tax Rate)
```
Where:
- Re = Cost of Equity (from CAPM: Rf + β × ERP, or build-up method)
- Rd = Cost of Debt (yield on existing debt or market rate for comparable
  credit rating)
- E/V = Equity weight at market values
- D/V = Debt weight at market values

For LFCF, discount at Cost of Equity only.

**Step 3 — Calculate Terminal Value**

Two approaches (model both and compare):

*Gordon Growth (Perpetuity Growth)*:
```
TV = UFCF_final × (1 + g) / (WACC − g)
```
Where g = long-term sustainable growth rate (typically 2–3%, should not
exceed long-run GDP growth).

*Exit Multiple*:
```
TV = EBITDA_final × Exit_EV/EBITDA_Multiple
```
The exit multiple should come from comparable company trading multiples,
not an arbitrary number.

**Step 4 — Discount to Present**
```
Enterprise Value = Σ [UFCF_t / (1 + WACC)^t] + [TV / (1 + WACC)^n]
```

**Step 5 — Bridge to Equity Value**
```
Equity Value = Enterprise Value − Net Debt − Minority Interest
               − Preferred Stock + Associates / JVs
Implied Share Price = Equity Value / Diluted Shares Outstanding
```

Use the treasury stock method for diluted share count (options and warrants
exercise if in-the-money).

### DCF Sensitivity Table

Always include a two-way sensitivity table showing implied share price (or
enterprise value) across a range of WACC and terminal growth rate (or exit
multiple) assumptions. This is the most scrutinised output of any DCF.

## Method 2 — Comparable Company Analysis (Trading Multiples)

### When to Use
Public companies with similar business models, size, geography, and growth
profiles exist. Works well as a cross-check and when cash flow visibility is
limited.

### Structure

**Step 1 — Select the Peer Group**

Criteria for inclusion: same industry, similar size (revenue or market cap
within 0.5×–3× of target), similar growth profile, similar margin profile,
same geography (or global if the industry is global). Aim for 5–15 peers.

**Step 2 — Gather Multiples**

Common multiples and when each is most useful:

| Multiple | Numerator | Denominator | Best for |
|---|---|---|---|
| EV/Revenue | Enterprise Value | Revenue | Pre-profit, high-growth, SaaS |
| EV/EBITDA | Enterprise Value | EBITDA | Most industries, capital-light |
| EV/EBIT | Enterprise Value | EBIT | Capital-intensive (captures D&A) |
| P/E | Share Price | EPS | Mature, stable-earnings companies |
| PEG | P/E | EPS Growth Rate | Comparing across growth rates |
| P/BV | Share Price | Book Value / Share | Banks, insurance, REITs |
| EV/FCF | Enterprise Value | Free Cash Flow | Asset-light, cash-generative |

Use forward (NTM or next fiscal year) multiples when available — they
reflect expected performance, not trailing.

**Step 3 — Calculate Implied Valuation**

For each multiple:
```
Implied EV = Target's Metric × Peer Median (or Mean) Multiple
```
Then bridge to equity value and per-share value as with DCF.

**Step 4 — Adjust for Differences**

If the target grows faster or has higher margins than the median peer, the
implied valuation should be at or above the peer median. Apply a premium or
discount with explicit justification.

## Method 3 — Precedent Transaction Analysis

### When to Use
Valuing a company for M&A. Shows what acquirers have historically paid for
similar businesses, including control premiums.

### Structure

**Step 1 — Identify Transactions**

Search for M&A deals in the same industry over the past 3–5 years. Criteria:
similar target size, same sub-sector, similar deal rationale (strategic vs.
financial). Sources: Capital IQ, Bloomberg, PitchBook, public filings.

**Step 2 — Gather Transaction Multiples**

Same multiples as comparable companies (EV/Revenue, EV/EBITDA, etc.), but
calculated using the acquisition price and the target's financials at the
time of the deal.

**Step 3 — Apply to Target**

Same bridging logic as comps. Note that precedent multiples typically include
a control premium (20–40% above trading levels), so they will imply a higher
value than trading comps.

### Adjusting for Time and Conditions

Precedent transactions occurred at a specific point in the market cycle. If
current conditions differ materially (e.g., interest rates, sector sentiment),
note this and consider adjusting.

## Presenting Valuation Results

### Football Field Chart

Summarise all methods in a horizontal bar chart showing the implied value
range from each:

```
                 Low    ████████████████    High
DCF (WACC/g)     |  $42 ─────────────── $58  |
DCF (Exit Mult)  |   $45 ──────────── $55    |
Trading Comps    |  $40 ──────── $50         |
Precedent Txns   | $48 ──────────────── $62  |
52-Week Range    |$38 ─────────────────── $60|
                 $35                         $65
```

### Key Disclosures

Always state: the valuation methodology used, the date of the analysis,
the source of financial data, key assumptions (growth rates, margins, WACC
components), and any limitations or caveats.

## Valuation Workbook Layout

| Tab | Contents |
|---|---|
| Assumptions | All valuation-specific inputs (WACC components, growth, multiples) |
| DCF | UFCF projections, discount factors, TV, EV bridge |
| Comps | Peer list, financial data, multiples, implied valuation |
| Precedents | Transaction list, multiples, implied valuation |
| Football Field | Summary chart and valuation range table |
| WACC | Detailed WACC build-up with sourced inputs |
| Sensitivity | 2-way tables for DCF and multiples |

## Standards of Value

The purpose of the valuation determines which standard of value to apply.
Different standards can produce materially different conclusions for the
same company.

**Fair Market Value (FMV)**: the highest price, expressed in terms of
cash equivalents, at which property would change hands between a
hypothetical willing buyer and a hypothetical willing seller, acting at
arm's length in an open and unrestricted market, when neither is under
compulsion to act, and when both have reasonable knowledge of the
relevant facts. This is the cornerstone standard used in tax matters,
estate planning, and shareholder disputes.

Key elements: "highest price" (not average), "cash equivalents" (adjust
for non-cash consideration), "arm's length" (no related-party bias),
"open and unrestricted market" (no artificial constraints), "reasonable
knowledge" (informed parties, not omniscient).

**Fair Value**: used in financial reporting (IFRS 13 / ASC 820) and
some legal contexts. Defined as the price that would be received to sell
an asset in an orderly transaction between market participants at the
measurement date. Differs from FMV in that it may exclude entity-
specific synergies and uses an "exit price" concept.

**Intrinsic Value (Stand-Alone Value)**: the value of a business based
on its own cash-generating ability, without considering any synergies
from a potential acquirer. Used for investment analysis and independent
valuation.

**Value to Owner**: includes benefits specific to the current owner
(synergies, strategic fit, tax advantages). Higher than FMV when the
owner has unique advantages.

**Liquidation Value**: the net amount realisable from selling assets
piecemeal under forced or orderly liquidation. The floor value for any
going concern — if liquidation value exceeds going concern value, the
business is worth more dead than alive.

## Discounts and Premiums

Valuation conclusions may need adjustment for control, marketability,
and other factors:

**Control Premium**: the additional amount a buyer pays for a
controlling interest over the per-share market price. Typically 20–40%
above the pre-announcement trading price. Reflects the ability to
control strategy, capital allocation, and management.

**Minority Discount**: the reduction in per-share value for a non-
controlling interest. The inverse of the control premium:
`Minority Discount = 1 − (1 / (1 + Control Premium))`.

**Discount for Lack of Marketability (DLOM)**: the reduction in value
for shares that cannot be easily sold on a public market. Typical range:
15–35% for private company shares. Derived from restricted stock
studies, pre-IPO studies, or option-pricing models (Chaffe, Finnerty).

**Application**: Start with a valuation at the enterprise level. Bridge
to equity value. Then apply control/minority and marketability
adjustments based on the specific interest being valued and the purpose
of the valuation.

## Intangible Asset Valuation

When a business acquisition requires purchase price allocation (PPA) or
when individual intangible assets must be valued separately:

**Multi-Period Excess Earnings Method (MEEM)**: isolates the earnings
attributable to a specific intangible asset by deducting contributory
asset charges (returns required on all other assets used to generate
those earnings) from total earnings. Best for the primary intangible
asset of the business (e.g., customer relationships).

**Relief from Royalty (RFR)**: values an intangible by estimating the
royalty payments the owner avoids by owning the asset rather than
licensing it. Apply a market royalty rate to projected revenue, tax-
effect the savings, and discount to present value. Best for brand names,
trademarks, technology, and patents.

**With-and-Without Method**: compares the value of the business with
the intangible asset to its value without it. The difference is the
asset's value. Best when the asset's absence would cause measurable
revenue loss or cost increase.

**Cost Approach (Depreciated Replacement Cost)**: estimates what it
would cost to recreate the intangible asset, adjusted for functional
and economic obsolescence. Used when income data is unavailable or for
assembled workforce.

## M&A Merger Model

A merger model analyses the financial impact of one company acquiring
another. Key components:

- **Transaction assumptions**: purchase price, form of consideration
  (cash vs. stock vs. mixed), financing structure.
- **Sources & Uses**: how the acquisition is funded (cash on hand, new
  debt, equity issuance) and what the funds pay for (equity purchase
  price, refinanced debt, transaction fees).
- **Pro forma adjustments**: purchase accounting (goodwill, intangible
  asset step-ups, deferred tax adjustments), synergies (revenue and cost),
  financing costs.
- **Accretion/Dilution analysis**: is the combined EPS higher (accretive)
  or lower (dilutive) than the acquirer's standalone EPS?
- **Pro forma financial statements**: combined IS, BS, CFS for 3–5
  projection years.

Template: `assets/templates/merger-model.xlsx` and
`assets/templates/M_A_Model_Complete.xlsx` (CFI version with scenario
switching, separate acquirer/target models, and pro forma with balance
sheet checks).

## LBO Model

A leveraged buyout model analyses the returns to a financial sponsor
acquiring a company primarily with debt. Key components:

- **Transaction structure**: entry price (EV/EBITDA multiple), equity
  contribution, debt tranches (senior, sub, mezzanine), fees.
- **Operating model**: standalone 3-statement projection for the target.
- **Debt schedule**: mandatory amortisation, cash sweep, interest
  calculations for each tranche, covenant compliance.
- **Exit analysis**: exit year, exit multiple, equity value at exit.
- **Returns**: IRR and MOIC (multiple of invested capital) to the
  sponsor at various exit years and exit multiples.

Template: `assets/templates/lbo-model-long-form.xlsx`

## IPO Model

An IPO model estimates the appropriate pricing for an initial public
offering. Key components:

- **Fully diluted share count**: common shares, options (treasury stock
  method), warrants, convertible securities, all using the IPO price as
  the assumed exercise price.
- **Valuation**: comparable public company multiples applied to the
  issuer's financials to derive an implied equity value range.
- **Price range**: per-share value range, typically with a 10–15% spread
  (e.g., $18–$21).
- **Proceeds and use of proceeds**: gross proceeds, underwriting
  discount (typically 7%), net proceeds, intended use.

Template: `assets/templates/ipo-model.xlsx`

## Purchase Price Allocation (PPA)

When a business combination occurs under IFRS 3 or ASC 805, the acquirer
must allocate the purchase price to identifiable assets and liabilities
at fair value. The excess of purchase price over net identifiable assets
is recorded as goodwill.

**PPA Process**:
1. Determine the total consideration transferred (cash + stock + earn-outs
   + assumed liabilities).
2. Identify and value all tangible assets at fair value (PP&E, inventory,
   receivables — often close to book value).
3. Identify and value all intangible assets at fair value using MEEM,
   Relief from Royalty, With-and-Without, or Cost approaches (see
   Intangible Asset Valuation above).
4. Value all assumed liabilities at fair value (including contingent
   liabilities and unfavourable contracts).
5. Calculate goodwill as the residual:
   `Goodwill = Total Consideration − Fair Value of Net Identifiable Assets`
6. Record deferred tax liabilities on intangible asset step-ups (book
   value increases that have no tax basis).

**Common intangible assets identified in PPA**: customer relationships,
trade names/brands, developed technology, in-process R&D, non-compete
agreements, favourable leases/contracts, backlog/order book, assembled
workforce (not separately recognised under IFRS 3 — absorbed into
goodwill).

**PPA Model Layout**: a dedicated tab showing each identified asset, its
valuation method, fair value, useful life, and resulting annual
amortisation expense. This feeds into the pro forma income statement
(higher D&A from intangible amortisation) and the pro forma balance
sheet (intangible asset balances declining over useful lives).

## Goodwill Impairment Testing

Goodwill acquired in a business combination must be tested for impairment
at least annually (or more frequently if triggering events occur).

**Under IFRS (IAS 36)**:
1. Allocate goodwill to cash-generating units (CGUs).
2. Compare the recoverable amount (higher of fair value less costs of
   disposal and value in use) to the carrying amount of the CGU.
3. If carrying amount exceeds recoverable amount, recognise an impairment
   loss — first against goodwill, then pro-rata against other CGU assets.
4. Goodwill impairment is never reversed.

**Under US GAAP (ASC 350)**:
1. Assign goodwill to reporting units.
2. Compare the fair value of the reporting unit to its carrying amount
   (including goodwill).
3. If carrying amount exceeds fair value, recognise an impairment loss
   equal to the excess — but not exceeding the total goodwill allocated
   to that unit.
4. Optional qualitative assessment (Step 0) can be performed first to
   determine whether quantitative testing is necessary.

**Modeling goodwill impairment**: build a DCF or market-based valuation
of the CGU/reporting unit. Compare the resulting fair value to the
carrying amount of net assets (including goodwill) on the balance sheet.
The model should include a sensitivity analysis showing at what discount
rate or growth rate impairment would be triggered — this is the key
output for audit and financial reporting purposes.

## Cost of Equity — Python Scripts

The skill includes Python scripts in `assets/scripts/` for calculating
the cost of equity, which is a critical input to WACC in every DCF
valuation.

**`capm.py`** — Capital Asset Pricing Model:
```
Re = Rf + β × (Rm − Rf)
```
Downloads stock price data from Yahoo Finance, calculates beta via
regression against the S&P 500, retrieves the 10-year Treasury yield
from FRED as the risk-free rate, and computes the market risk premium
from historical geometric returns. Supports multi-asset portfolios.

**`fama_french_five_factor_model.py`** — Fama-French Five Factor:
```
Re = Rf + β₁(Mkt-RF) + β₂(SMB) + β₃(HML) + β₄(RMW) + β₅(CMA)
```
Downloads factor data from Ken French's data library, regresses stock
returns against five factors (market, size, value, profitability,
investment), and calculates expected return. More nuanced than CAPM for
stocks with significant size, value, or profitability tilts.

**When to use each**: CAPM is the standard for most DCF valuations and
is sufficient when the subject company closely tracks the market. Use
Fama-French when the company has characteristics that CAPM underprices
(small-cap, deep value, high profitability, conservative investment) or
when you need to justify a cost of equity that differs from a simple
CAPM estimate.
