# Signal Oracle — Energy & Business Forecasting Context

## Production Forecasting (Wells / Fields)

### Core approach
- Use **Arps decline curve** as the baseline: exponential, hyperbolic, or harmonic.
  Prophet handles initial decline rate well when decline is strong and monotonic.
- For unconventional wells (multi-phase decline, shale, tight gas), use **LSTM** with lag features.
- For portfolio-level production, use **ensemble** with field-level roll-up.

### Units and conventions
- Express production in bbl/d or boe/d. Report cumulative in MMboe or Mbbl.
- Natural gas: MMcf/d or MMBtu/d. LNG: mtpa.
- Normalise by well count when aggregating across portfolio.

### Standard forecast horizons
- 12 months: operational planning
- 3–5 years: reserves estimation (SPE-PRMS)
- 20+ years: decommissioning and abandonment planning

### Arps decline parameters to clarify
- Initial production rate (IP)
- Initial decline rate (Di)
- Decline exponent (b): b=0 exponential, 0<b<1 hyperbolic, b=1 harmonic
- Economic limit rate (ELR)

---

## Commodity Price Forecasting

### Core approach
- Price series are often non-stationary and mean-reverting.
- **ARIMA** with differencing handles short-term volatility well.
- **Prophet** with price shock events marked as changepoints handles structural breaks.
- **XGBoost** with lag features often outperforms statistical models for monthly horizons.
- **Transformer** with external regressors (rig count, inventory, FX) for structural modelling.

### Key exogenous regressors for energy prices
- WTI / Brent crude spread
- Henry Hub / TTF / JKM natural gas benchmarks
- US rig count (Baker Hughes)
- EIA crude inventory levels
- USD index (DXY)
- OPEC+ compliance rate

### Commodities commonly forecast
- Crude oil: WTI, Brent (USD/bbl)
- Natural gas: Henry Hub, AECO, NBP (USD/MMBtu)
- LNG: JKM, DES Japan (USD/MMBtu)
- NGLs: ethane, propane, butane (USD/gal or USD/bbl)
- Carbon credits: EUA, California CCA (USD/tCO2e)
- Power: on-peak/off-peak spot (USD/MWh)

---

## Carbon Intensity & Emissions Trends

### Core approach
- Typically slow-moving and trend-dominated.
- **ETS** or **Prophet** work well for monotonic declines or seasonal cycles.
- Normalise by production volume (tCO2e/boe) before forecasting — don't forecast absolute emissions and production separately unless they're causally independent.
- Use **ARIMA** for Scope 1 direct emissions with step-change reductions from capital projects.

### Key metrics
- Scope 1 GHG intensity: tCO2e / boe
- Methane intensity: tCH4 / boe (or %)
- Flaring intensity: m³ / boe
- Energy intensity: GJ / boe

---

## Revenue & Cost Forecasting

### Core approach
- Use **ensemble** mode: combines statistical + ML for robust business projections.
- Always include exogenous commodity price assumptions as regressors (`--exog`).
- Revenue = Volume × Price: forecast components separately, then multiply, rather than forecasting revenue directly.
- Separate recurring revenue (production) from non-recurring (asset sales, consulting fees).

### Cost structure considerations
- Lifting costs (opex per boe): semi-fixed; forecast as $/boe × production volume
- G&A: relatively fixed; model as flat or inflation-adjusted trend
- Capex: lumpy; model as discrete events or using capital budget input
- Royalties and taxes: formula-driven from production and price; calculate from forecasted drivers

---

## Reserve & Resource Estimation Support

Signal Oracle does NOT replace a certified reserves evaluator — it supports the process.

Appropriate uses:
- Generate production decline curves for input to reserves categories
- Stress-test price assumptions for NPV sensitivity analysis
- Model EUR (Estimated Ultimate Recovery) using decline curve integration
- Compare forecast scenarios (P10/P50/P90) for resource booking

Always include: "Outputs of this forecasting model require review and approval by a qualified reserves evaluator before use in reserve reporting or investor materials."

---

## Brand & Output Standards (Sproule ERCE)

All charts and reports must follow Sproule ERCE visual standards:

### Colour palette
- **Electric Blue** `#1F4A66` — primary data series (historical)
- **Evolution Green** `#1F8E81` — forecast series
- **Sky Blue** `#0095DA` — confidence interval shading
- **Moraine Blue** `#0066A1` — secondary data series
- **Raspberry Pink** `#A5247B` — annotations, callouts, alerts
- **Slate Grey** `#6E7070` — axes, gridlines, labels

### Typography & formatting
- **Font**: Arial for chart labels, axis titles, table headers
- **Units**: SI and energy industry conventions (bbl, boe, MMcf, MW, tCO2e). Spell out on first use.
- **Dates**: DD Month YYYY in reports; YYYY-MM-DD in data files
- **Tone**: Professional, confident, precise. State all assumptions explicitly.
- **Uncertainty**: Never present a single-point forecast without a range. Always show CI bands.

### Disclaimer (mandatory for reserve/investor use)
> "The forecasts contained herein are generated using statistical and machine learning models applied to historical data. All outputs require professional review and sign-off by a qualified Sproule ERCE evaluator before use in reserve reporting, investment decisions, or regulatory filings."
