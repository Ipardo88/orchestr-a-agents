# Business Model Archetypes for Financial Modeling

## Why This Matters

Not all businesses have the same financial structure. A consulting firm
has no inventory. A SaaS company has no COGS in the traditional sense. A
manufacturer's cost structure looks nothing like a bank's. Before building
any model, you must understand how the specific business makes money,
what drives its costs, and how cash moves through the operation.

Skipping this step is the most common reason models produce nonsensical
results. A model that applies manufacturing cost schedules to a
professional services firm will have empty rows, meaningless ratios, and
broken working capital logic.

## Step 1 — Identify the Business Model

Ask these questions about the company before choosing a model structure:

**Revenue model**: How does this company actually make money? Products vs.
services? Recurring vs. transactional? Contract-based vs. spot? Is there
a backlog, deferred revenue, or remaining performance obligations (RPO)
that signal future revenue?

**Cost structure**: What drives costs? Is the cost base primarily fixed
(salaries, rent) or variable (materials, commissions)? Where is the
operating leverage?

**Capital requirements**: Asset-heavy or asset-light? What drives capex?
Is working capital a source or use of cash as the business grows?

**Revenue decomposition**: What is the right way to break down revenue
for this business? The decomposition determines how the entire model is
built. Common patterns include: units × average selling price, subscribers ×
ARPU, contracts × contract value × win rate, stores × revenue per store,
billable hours × billing rate × utilisation, segment A + segment B +
segment C.

## Step 2 — Match the Archetype

Below are common business archetypes and how each one changes the model
structure. Find the closest match and adapt.

### Manufacturing / Product Company

**Examples**: consumer goods, auto parts, industrial equipment, food &
beverage.

**Revenue drivers**: units sold × average selling price. May have
seasonal volume patterns. May decompose by product line or geography.

**Cost structure**:
- COGS is large and meaningful: raw materials, packaging, direct labour,
  manufacturing overhead (utilities, factory depreciation).
- Variable costs scale with volume: materials ($/unit), packaging
  ($/unit), inflated annually.
- Fixed costs are substantial: factory labour, utilities, facility
  maintenance. These create operating leverage.
- SG&A: sales force, marketing, corporate overhead.

**Working capital**: all three components matter heavily.
- Accounts Receivable (DSO typically 30–60 days).
- Inventory (DIO can be 30–90+ days depending on product).
- Accounts Payable (DPO typically 30–45 days).
- Inventory build-ups before peak seasons create large working capital
  swings.

**Capex**: asset-heavy. Maintenance capex to sustain existing capacity +
growth capex for new lines/plants. PP&E is a major balance sheet item.
Depreciation is significant.

**Model tabs needed**: Revenue Schedule, Cost Schedule (variable + fixed
split), Working Capital Schedule (DSO/DIO/DPO), Depreciation Schedule,
Asset Schedule.

### Professional Services / Consulting

**Examples**: management consulting, law firms, accounting firms,
engineering consultancies, staffing agencies.

**Revenue drivers**: billable headcount × utilisation rate × average
billing rate. Or: number of engagements × average engagement value.
Revenue is inherently tied to people, not products.

**Cost structure**:
- There is NO traditional COGS with materials or inventory. The primary
  cost of delivery is people.
- Direct costs: consultant/professional salaries and benefits, contractor
  fees (external consultants billed hourly), travel and project expenses.
  These are the "cost of services" or "cost of revenue" — they replace
  COGS in the income statement.
- SG&A: administrative staff salaries and benefits, office rent, IT,
  marketing, business development, training. The admin salary line is
  a major component.
- The cost structure is overwhelmingly fixed (salaries) with some
  variable component (contractors, travel, performance bonuses).

**Working capital**:
- Accounts Receivable is the dominant item (DSO can be 45–90 days,
  especially with large enterprise clients).
- NO inventory. DIO does not apply.
- Accounts Payable is typically small (limited physical purchases).
- Unbilled revenue / work in progress (WIP) may be a significant
  current asset if the firm bills in arrears or on milestones.
- Deferred revenue may appear if clients pay retainers upfront.

**Capex**: asset-light. Minimal PP&E (office furniture, IT equipment).
Capex is typically 1–3% of revenue. The "assets" that matter are
people — they don't appear on the balance sheet.

**Model structure changes**:
- Income statement: replace COGS with "Cost of Services" (consultant
  compensation, contractor fees, project expenses). Gross profit becomes
  "Gross margin on services."
- Cost schedule: headcount-driven. Model the number of consultants,
  average salary, benefits loading (typically 20–30% of salary),
  contractor spend, and utilisation rate.
- Working capital: AR + unbilled revenue only. Remove inventory lines
  entirely. AP is minor.
- Capex: simple — % of revenue or a small fixed amount. No depreciation
  schedule complexity.

### Software / SaaS

**Examples**: enterprise SaaS, consumer subscription apps, cloud
platforms, software licensing.

**Revenue drivers**: customers (or seats/users) × ARPU (average revenue
per user). Decompose by: new customers, expansions, churn/contraction,
reactivations. Net revenue retention rate is a key metric. May also have
professional services revenue (implementation, training).

**Cost structure**:
- "Cost of Revenue" rather than COGS: hosting/infrastructure costs (AWS,
  Azure), customer support, professional services delivery, payment
  processing fees.
- No physical materials or inventory.
- R&D is the largest operating expense (engineering salaries, stock-based
  compensation). Model as % of revenue or headcount-driven.
- Sales & Marketing is typically the second largest (SDRs, AEs, demand
  gen, events). Often modelled as a customer acquisition cost (CAC).
- G&A: finance, legal, HR, office. Usually the smallest opex line.

**Working capital**:
- Deferred revenue is often the largest current liability (annual
  subscriptions paid upfront, recognised monthly). Changes in deferred
  revenue are a major cash flow item.
- Accounts Receivable exists but is often moderate (many SaaS companies
  bill by credit card for SMB, or net-30 for enterprise).
- NO inventory.
- Prepaid expenses can be meaningful (prepaid hosting contracts).

**Capex**: asset-light for pure SaaS. Capitalised software development
costs may be the primary capex item. Internal-use software
capitalisation follows ASC 350-40 rules.

**Model structure changes**:
- Revenue build: cohort-based (beginning customers + new − churned =
  ending × ARPU). Or simpler: prior ARR × (1 + net expansion rate) +
  new ARR.
- Income statement: "Cost of Revenue" replaces COGS. Add prominent R&D
  and S&M lines. Include stock-based compensation as a separate line or
  addback.
- Working capital: deferred revenue roll-forward is critical. No
  inventory. AR is moderate.
- Metrics: ARR, net revenue retention, LTV/CAC, rule of 40, gross
  margin on subscription vs. services.

### Retail / E-Commerce

**Examples**: brick-and-mortar retail, DTC e-commerce, omnichannel
retailers, grocery chains.

**Revenue drivers**: number of stores × revenue per store (brick-and-
mortar), or website traffic × conversion rate × average order value
(e-commerce). Same-store sales growth is a key metric.

**Cost structure**:
- COGS is meaningful: product purchases or manufacturing, freight-in,
  warehousing. Gross margins vary widely (20–30% grocery, 50–70%
  apparel, 60–80% luxury).
- SG&A: store labour, rent/occupancy, marketing, corporate overhead.
  Store-level costs are semi-fixed (they don't scale linearly with
  revenue but step up with new stores).
- Fulfillment costs (for e-commerce): shipping, packaging, warehouse
  labour. May be in COGS or a separate line.

**Working capital**: inventory is king.
- Inventory turns are a critical metric (DIO can be 30–90+ days).
- Seasonal inventory swings are enormous (holiday build-up).
- AP is meaningful (payment terms with suppliers).
- AR is minimal for B2C (cash/card at point of sale). AR exists for
  wholesale/B2B channels.

**Capex**: moderate to heavy. New store openings (leasehold
improvements), distribution centre investments, technology. Maintenance
capex for existing stores.

### Financial Services / Banking

**Examples**: commercial banks, insurance companies, asset managers,
fintech lenders.

**Revenue drivers**: net interest income (interest earned − interest
paid), fee income, trading revenue, investment gains. Revenue
decomposition is fundamentally different from operating companies.

**Cost structure**:
- No COGS in the traditional sense.
- "Provision for credit losses" is a major cost for lenders — not an
  operating expense but a critical P&L item.
- Operating expenses: compensation, technology, occupancy, regulatory
  compliance.
- Efficiency ratio (opex ÷ revenue) is the key profitability metric.

**Working capital**: does not apply in the traditional sense. The
"working capital" of a bank is its loan book and deposit base. Balance
sheet analysis focuses on assets (loans, securities), liabilities
(deposits, borrowings), and regulatory capital ratios.

**Model structure changes**: a bank model is fundamentally different.
The income statement starts with interest income/expense. The balance
sheet is dominated by financial assets and liabilities. Standard
3-statement model templates do not apply — use a bank-specific structure
(net interest margin analysis, loan growth, deposit growth, provision
modelling, capital adequacy).

### Healthcare / Biotech

**Revenue drivers**: for commercial-stage: units × pricing (often
with gross-to-net adjustments for rebates, chargebacks, returns). For
pre-revenue biotech: zero revenue, milestone payments, collaboration
income. Pipeline probability-weighted scenarios are common.

**Cost structure**:
- Cost of goods sold exists for commercial products (manufacturing,
  royalties).
- R&D is typically the largest expense (clinical trial costs, CMO
  payments, lab operations). Highly lumpy — Phase III trials are
  enormously expensive.
- SG&A: commercial launch costs, medical affairs, sales force.

**Working capital**: varies. Commercial companies have AR (from
distributors/PBMs), inventory (finished goods, API). Pre-revenue
companies burn cash with minimal working capital.

## Step 3 — Adapt the Model Structure

Once you identify the archetype, adapt:

1. **Income statement line items**: use the company's actual reported
   line item names. If they call it "Cost of Revenue," keep it — don't
   rename to "COGS." If they separate R&D from S&M, preserve that split.

2. **Cost schedule drivers**: match the cost structure to the business.
   A consulting firm needs a headcount model. A manufacturer needs a
   materials/labour/overhead model. A SaaS company needs a hosting +
   headcount model.

3. **Working capital components**: only include items that are material
   for this business. Don't model inventory for a software company. Don't
   model deferred revenue for a manufacturer (unless they actually have
   it).

4. **Revenue decomposition**: use the decomposition that most closely
   mirrors how management thinks about and reports the business. Check
   the MD&A section of the 10-K for clues — companies usually tell you
   what drives their revenue.

5. **Key metrics**: every archetype has metrics that matter more than
   others. Include them in the dashboard. A SaaS model without net
   revenue retention is incomplete. A retail model without same-store
   sales growth is incomplete.

## The 10-K Extraction Workflow

When building a model from a public company filing, follow this
sequence. Each step must be completed before moving to the next.

### Phase 1 — Extract Historicals

Pull from the 10-K exactly as reported. Do not estimate, interpolate, or
rename line items. Preserve the company's terminology.

- Income Statement: last 3 fiscal years, all reported subtotals.
- Balance Sheet: last 2 fiscal years, confirm A = L + E.
- Cash Flow Statement: last 3 fiscal years, capture D&A, capex, and
  working capital changes.
- Supplemental data: shares outstanding, total debt, cash, segment
  revenue, geographic mix.
- Source every number (e.g., "10-K FY2024, p. 47").
- State units and currency clearly.

### Phase 2 — Analyse Business Model and Calculate Drivers

Before building projections, understand how the business works:

- Identify the revenue model and correct decomposition.
- Classify the cost structure (fixed vs. variable, people vs. materials).
- Calculate historical drivers: gross margin, opex as % of revenue,
  effective tax rate, DSO, DIO, DPO, capex as % of revenue, D&A as %
  of revenue, capex ÷ D&A ratio.
- Identify the 3–5 drivers that will most impact projections.
- Separate what is stable (can trend slowly) from what is inflecting
  (needs explicit assumptions).
- Flag non-recurring items to normalise.

### Phase 3 — Build the Integrated Model

With the business understood and drivers calculated:

- Create an Assumptions tab with all editable inputs. Each assumption
  gets a rationale note (historical average, management guidance, analyst
  judgment).
- Build 3 historical years + 5 projection years on a Model tab.
- Use the company's actual line item structure.
- Cash is the plug on the balance sheet (solved from the CFS).
- Include check rows (BS balance, cash tie-out).
- Handle circularity (prior-period average debt for interest, or
  iteration toggle).
- Build a summary dashboard with key metrics.

### Phase 4 — Professional Formatting

Apply investment-bank-standard formatting:

- Blue font for hardcoded inputs, black for formulas, green for
  cross-tab links.
- Parentheses for negatives, dashes for zeros.
- Consistent number formatting (no decimals for large $, 1 decimal for
  %, 1 decimal for multiples).
- Section headers with dark blue fill, sub-headers with light gray.
- Historical columns with light blue fill, projections in blue font.
- Freeze panes, print setup, error check section.
- Cover tab with table of contents and version info.
