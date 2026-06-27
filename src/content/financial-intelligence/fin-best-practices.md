# Financial Modeling Best Practices

## The Modeling Lifecycle

Every model should progress through five stages before delivery. Skipping
stages is the most common source of rework and errors.

### Stage 1 — Clarify the Business Problem

Before opening a spreadsheet, answer: What decision does this model inform?
Who will use the output? What level of precision is needed?

A model for a board-level acquisition decision needs different granularity
than a model for an internal headcount forecast. Getting this wrong means
rebuilding later.

### Stage 2 — Map Inputs, Processes, and Outputs

Sketch the data flow on paper or in a diagram before building anything.

- **Inputs**: What raw data and assumptions will drive the model? Where do
  they come from (company filings, management guidance, market data)?
- **Processes**: What calculations transform inputs into outputs? Which
  accounting relationships must hold?
- **Outputs**: What numbers does the decision-maker need to see? In what
  format?

### Stage 3 — Plan the Structure

Decide on tab layout, row/column conventions, time periods, and naming
before writing a single formula. A well-planned structure is far easier to
build and audit than one that evolves organically.

### Stage 4 — Build Logically

Write formulas that reference explicit drivers. Break complex calculations
into auditable intermediate steps. Build in the order that minimises forward
references (typically: assumptions → IS → supporting schedules → BS → CFS →
dashboard).

### Stage 5 — Audit and Test

- Does the balance sheet balance in every period?
- Does ending cash on the CFS match the BS?
- Do sensitivities produce directionally correct results?
- Are there any #REF!, #DIV/0!, or circular-reference warnings?
- Does the model produce reasonable results under extreme assumptions?

## The Simple ↔ Complex Spectrum

Every model sits on a spectrum between simplicity and complexity. Neither
extreme is ideal.

**Simple models** are robust, transparent, easy to follow, and easy to audit.
But they may lack the detail needed for high-stakes decisions.

**Complex models** offer high precision and model items from first principles.
But they are harder to follow, harder to audit, and more prone to errors.

The right level of complexity depends on the decision being supported and the
audience using the model. When in doubt, start simple and add complexity only
where it materially changes the output.

## Input Discipline

1. Model every key driver explicitly — don't let assumptions hide inside
   formulas.
2. Each input is entered exactly once. Every other reference to that value
   should be a cell link or named variable.
3. Group inputs logically so they are easy to scan and update.
4. Use a consistent visual convention for inputs. The industry standard is
   **blue font** for all hard-coded values.
5. Document the source of each input. In Excel, use cell comments or a
   "Sources" column. In Python, use inline comments.

## Processing Discipline

1. Calculations should be transparent — a reviewer should be able to trace
   any output back to its inputs without guessing.
2. Avoid hard-coded numbers inside formulas. If you need a constant (e.g., 12
   months in a year), define it as a named constant.
3. Break complex formulas into intermediate steps. A chain of simple formulas
   is far easier to audit than a single nested monster.
4. Move heavy calculations to a dedicated "Calculations" or "Engine" tab so
   that the output tabs show only clean, final figures.
5. Document non-obvious logic with comments explaining *why*, not just *what*.

## Output Discipline

1. Outputs must be easy to find — a dedicated Summary or Dashboard tab.
2. Group outputs logically: operating metrics, profitability, cash flow,
   leverage, returns.
3. Every output cell must be formula-driven. No manual overrides.
4. Provide the key results needed for the specific decision at hand.
5. Summarise all critical outputs in one location so the decision-maker
   doesn't have to hunt.

## Formatting Standards

### Excel
- **Blue font** (RGB 0, 0, 205) for inputs.
- **Black font** for formulas.
- **Green font** for cross-tab links (optional but helpful in large models).
- Negative numbers in parentheses: `(1,000)` not `-1,000`.
- Thousands or millions with a label in the header: `($ in thousands)`.
- Consistent decimal places within each section.
- Freeze panes so row labels and column headers are always visible.
- Use named ranges for frequently referenced cells.

### Python
- Clear section headers: `# --- INPUTS ---`, `# --- CALCULATIONS ---`,
  `# --- OUTPUTS ---`.
- Named variables (never magic numbers).
- Type hints for function signatures.
- Docstrings for every function.
- Output formatted DataFrames with `pandas` styling or export to `.xlsx`
  with `openpyxl` formatting.

## Conditional Formatting for Error Detection

Use conditional formatting to instantly surface problems:

- **Balance sheet check row**: highlight non-zero in red/orange.
- **Negative cash balances**: highlight in red.
- **Growth rates outside a reasonable band**: highlight for review.
- **Formula**: `=F131<>0` applied to balance check cells, formatted with
  orange background and white font, makes errors impossible to miss.

## Data Validation for Input Protection

For models shared with other users, apply Excel data validation to input
cells:

- Restrict inputs to whole numbers or decimals within a plausible range.
- Add input messages explaining what the cell expects.
- Add error alerts with clear messages (e.g., "Growth rate must be between
  -50% and 100%").

This prevents accidental model corruption from typos or misunderstanding.

## Model Auditing Checklist

Before delivering any model, verify:

- [ ] Balance sheet balances in every period (A = L + E).
- [ ] Cash flow statement ending cash matches balance sheet cash.
- [ ] Revenue build-up ties to the top of the income statement.
- [ ] Depreciation in CFS matches the depreciation schedule.
- [ ] Debt balances in BS match the debt schedule.
- [ ] Working capital changes in CFS match BS period-over-period deltas.
- [ ] Tax expense ties to the tax schedule.
- [ ] Interest expense ties to the debt schedule.
- [ ] Retained earnings roll-forward: Beginning RE + NI − Dividends = Ending RE.
- [ ] All inputs use blue font; no blue cells contain formulas.
- [ ] No hard-coded numbers inside formula cells.
- [ ] Sensitivity analysis produces directionally correct changes.
- [ ] Model works under extreme assumptions without breaking.

## Excel Modeling Structures (CFI Conventions)

### Corkscrews (Roll-Forwards)

Corkscrews track how a balance changes over time. The ending balance of
one period flows directly into the beginning balance of the next,
creating a left-to-right, top-to-bottom flow pattern.

Use corkscrews for every balance that changes period to period:
```
PP&E Corkscrew:
  Beginning Balance    65,231   65,286   65,191
  + Capital Expenditure 4,223    4,286    4,338
  − Depreciation       (4,168)  (4,381)  (4,596)
  = Ending Balance     65,286   65,191   64,933
```

The ending balance is always a SUM of the items above it. Common uses:
PP&E, each piece of debt (long-term, mezzanine, revolver), retained
earnings, tax loss carry-forwards, deferred revenue, and mineral
reserves for natural resource companies.

One corkscrew per balance. A company with three types of debt gets three
separate corkscrews.

### Waterfalls (Depreciation Matrices)

Waterfalls are triangular matrices where time periods appear on both the
horizontal and vertical axis. Each row represents a capex vintage; each
column represents a year. The depreciation from each vintage fans out
across future periods, forming a triangle.

```
New Asset Depreciation          2023F    2024F    2025F    2026F
  2023 Capex ($4,223, 20yr)       106      211      211      211
  2024 Capex ($4,286, 20yr)                107      214      214
  2025 Capex ($4,338, 20yr)                         108      217
  2026 Capex ($4,385, 20yr)                                  110
Total New Asset Depreciation      106      318      533      752
```

Waterfalls use more space but make the model much easier to follow and
audit. Use them whenever a balance depends on the timing of multiple
cohorts (depreciation, amortisation, revenue recognition).

### Stacking Schedules

Prefer stacking all schedules vertically within a single Model tab
rather than spreading them across many tabs. Stacking minimises cross-
tab linking errors, makes formula tracing easier (Ctrl+[ stays within
one sheet), and simplifies printing.

Separate each schedule with a blank row and a bold header row. Use row
grouping to collapse/expand schedules — when collapsed, the headers act
as a table of contents.

### Navigational Columns

Place a navigational column in Column A with a space character at the
top of each schedule. Users can press Home to jump to Column A, then
Ctrl+Down/Up to move between schedule headers. This is the fastest way
to navigate a tall stack of schedules.

Combined with row grouping, collapsing all groups creates a visual
table of contents showing every schedule name. Expanding jumps into the
detail.

### Model Protection

Three levels of protection (apply in order of need):

**Workbook password**: prevents opening the file without the password.
Use sparingly — lost passwords are unrecoverable. Cloud folder
permissions are generally better for access control.

**Structure protection**: prevents deleting, renaming, or moving tabs.
Protects the cover page (with legal disclaimers) and the overall model
architecture.

**Cell-level protection**: locks formula cells while leaving input cells
(blue font) editable. This is the most useful level — it prevents users
from accidentally overwriting formulas while still allowing them to
change assumptions. Setup: unlock input cells (Format Cells → Protection
→ uncheck Locked), then Protect Sheet with a password.

## Template Reference Files

The skill includes Excel template files in `assets/templates/` that
demonstrate proven model structures. Examine these when building a model
to match the layout, formatting, and formula patterns:

| Template | Purpose |
|---|---|
| `3-Statement_Model__Complete_.xlsx` | Full 3-statement model with linked IS/BS/CFS, supporting schedules, scenario toggle, circularity switch |
| `Financial_Model_-_Sensitivity_Analysis.xlsx` | DCF with two-way sensitivity tables and scenario dashboard |
| `12_Month_Rolling_Cash_Flow_Forecast_-_Complete.xlsx` | Monthly cash flow forecast with rolling 12-month structure |
| `Valuation_Model_-_Comps__Precedents__DCF__Football_Field_-_Complete.xlsx` | Integrated valuation with comps, precedents, DCF, and football field summary |
| `merger-model.xlsx` | Full M&A merger model with sources & uses, pro forma statements, and accretion/dilution analysis |
| `M_A_Model_Complete.xlsx` | CFI M&A model with scenario switching, separate acquirer/target 3-statement models, and pro forma with BS checks |
| `lbo-model-long-form.xlsx` | Comprehensive LBO model with multi-tranche debt, cash sweep, and sponsor return analysis |
| `ipo-model.xlsx` | IPO pricing model with fully diluted share count, valuation, and proceeds analysis |
| `dcf-analysis.xlsx` | Clean standalone DCF template with UFCF build, WACC, terminal value, and equity bridge |

When building a new model, load the relevant template to study the tab
structure, cell layout, formula patterns, and formatting conventions
before writing any formulas.

### Python Scripts

The skill also includes Python scripts in `assets/scripts/` for
quantitative calculations:

| Script | Purpose |
|---|---|
| `capm.py` | CAPM cost of equity: downloads stock data, regresses beta, retrieves risk-free rate from FRED, computes expected return |
| `fama_french_five_factor_model.py` | Fama-French 5-factor cost of equity: regresses against market, size, value, profitability, and investment factors |

These scripts can be adapted for any ticker and date range. Use the
output as the cost of equity input to WACC calculations in DCF models.
