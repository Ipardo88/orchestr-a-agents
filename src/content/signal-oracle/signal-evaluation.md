# Signal Oracle — Forecast Evaluation & Interpretation

## Core Accuracy Metrics

After `forecast.py` runs, read `metrics.json` and interpret for the user.

| Metric | Full Name | What It Measures | Energy Interpretation |
|--------|-----------|------------------|-----------------------|
| MAPE | Mean Absolute Percentage Error | % error relative to actual | Primary accuracy metric; scale-independent |
| RMSE | Root Mean Squared Error | Absolute error in original units | Penalises large errors more; good for high-impact forecasts |
| MAE | Mean Absolute Error | Average absolute error in original units | Intuitive; less sensitive to outliers than RMSE |
| MASE | Mean Absolute Scaled Error | Error relative to naïve seasonal baseline | < 1.0 means better than seasonal naïve |

---

## MAPE Interpretation by Use Case

| MAPE Range | Quality | Appropriate For |
|------------|---------|----------------|
| < 5% | Excellent | Reserve reporting, investor disclosures, investment decisions |
| 5–15% | Good | Operational planning, annual budgeting, project economics |
| 15–30% | Moderate | Directional planning only; flag assumptions clearly |
| > 30% | Poor | Do not use; diagnose data quality or model fit first |

---

## What to Check in the Chart

After generating `forecast_chart.png`, review:

1. **Trend direction**: Did the model capture the direction correctly (up/flat/decline)?
2. **Seasonality**: Are seasonal peaks and troughs in the right months?
3. **CI width**: Are confidence intervals proportionally reasonable?
   - Too narrow: overfit or overly optimistic uncertainty quantification
   - Too wide: model is uncertain; may need more data or better features
4. **Structural breaks**: Are there sudden jumps in historical data the model missed?
5. **Holdout fit**: Do the in-sample predictions (dotted line on training period) track the actual data well?

---

## Residual Analysis (ARIMA)

After fitting ARIMA, check residuals for autocorrelation:

```bash
python tools/forecasting/forecast.py \
  --action profile \
  --file outputs/residuals.csv \  # if generated
  --date-col date --target-col residual
```

Good residuals should be:
- Approximately normally distributed (no fat tails)
- No significant autocorrelation at any lag (ACF within ±1.96/√n bounds)
- Stationary (constant variance over time)

If residuals show autocorrelation: increase the AR or MA order in ARIMA.
If residuals have changing variance: consider GARCH for volatility modelling.

---

## Selecting the Best Model (Auto Mode)

When `--model auto` is used, the output will report:
```
Model comparison on holdout set:
  ARIMA:   MAPE = 8.2%,  RMSE = 124.3
  Prophet: MAPE = 6.7%,  RMSE = 108.9  ← WINNER
  XGBoost: MAPE = 9.4%,  RMSE = 137.2
Selected: Prophet
```

Always report to the user:
- Which model won and by what margin
- Whether the winning margin is meaningful (< 1% MAPE difference = essentially tied)
- Whether the winning model makes intuitive sense for this type of series

---

## Communicating Uncertainty

Never present a single-point forecast. Always:
1. Show the forecast with CI band in the chart
2. State the CI level (e.g., "95% confidence interval")
3. Explain what drives uncertainty: model error, input data quality, exogenous variable assumptions
4. For investment/reserve contexts, present P10/P50/P90 scenarios explicitly

### P10 / P50 / P90 interpretation (SPE-PRMS convention)
- **P90 (1P)**: 90% probability production will be AT LEAST this value (proved reserves floor)
- **P50 (2P)**: 50% probability — the "most likely" case
- **P10 (3P)**: 10% probability production will EXCEED this value (optimistic ceiling)

To generate P10/P50/P90 from forecast.py, use:
```bash
# Run with --ci 0.80 for P10/P90 (80% CI = P10 upper / P90 lower)
python tools/forecasting/forecast.py --ci 0.80 ...
```

---

## Common Forecast Failure Modes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Forecast flat-lines immediately | Trend not detected; model saw only noise | Check stationarity; try Prophet or ARIMA with trend=True |
| CI explodes after a few periods | High uncertainty; likely short series | Use ARIMA with tight priors; reduce horizon |
| Forecast misses seasonal pattern | Model didn't detect seasonality | Use `--freq M` or `--freq Q` explicitly; try Prophet |
| Holdout MAPE fine but live data diverges | Structural break after training | Retrain with more recent data; add changepoint |
| DL model worse than ARIMA | Insufficient data for DL to generalise | Use ARIMA or XGBoost; DL needs > 200 obs |
| Negative forecast values for production | Model extrapolated below zero | Add floor constraint; use log-transform (`--scale`) |
