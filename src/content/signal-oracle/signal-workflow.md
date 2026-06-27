# Signal Oracle — Forecasting Workflow

## 5-Step Workflow

```
Step 0  → Clarify requirements (ask the user)
Step 1  → Load & profile the data
Step 2  → Select the right model(s)
Step 3  → Run tools/forecasting/forecast.py
Step 4  → Evaluate and interpret results
Step 5  → Deliver branded output
```

---

## Step 0 — Clarify Requirements

Before touching data, gather in one conversational message:

1. **Data source**: File (CSV/Excel), pasted inline, or generate a sample dataset?
2. **Target variable**: Which column to forecast (e.g., "daily production bbl/d", "monthly revenue USD")?
3. **Forecast horizon**: How far ahead? (12 months, 24 quarters, 5 years?)
4. **Frequency**: Daily (D), Weekly (W), Monthly (M), Quarterly (Q), Annual (A)?
5. **Model preference**: Statistical, ML, deep learning, or auto-select?
6. **Output format**: Chart only? Excel workbook? PowerPoint slide? All three?

Skip already-answered questions and state your assumptions explicitly.

---

## Step 1 — Load & Profile the Data

```bash
python tools/forecasting/forecast.py \
  --action profile \
  --file "path/to/data.csv" \
  --date-col "date" \
  --target-col "production_bbl"
```

Profile output includes:
- Number of observations and date range
- Detected frequency
- Missing value count and gaps
- Basic statistics (mean, std, min, max)
- Stationarity test result (ADF p-value)
- Detected trend and seasonality strength

Always share a brief summary with the user for confirmation before modelling.

---

## Step 3 — Run the Forecast

```bash
python tools/forecasting/forecast.py \
  --action forecast \
  --file "data.csv" \
  --date-col "date" \
  --target-col "production_bbl" \
  --model arima \
  --horizon 12 \
  --freq M \
  --output-dir "outputs/"
```

### Supported `--model` values
```
Statistical:   arima | ets | prophet
ML:            rf | xgboost | svr
Deep learning: lstm | gru | tcn | transformer
Automatic:     auto      (runs ARIMA + Prophet + XGBoost, picks best by RMSE)
Ensemble:      ensemble  (averages predictions from top-3 models)
```

### Frequency codes
```
D = Daily  W = Weekly  M = Monthly  Q = Quarterly  A = Annual
```

### Key flags
```
--test-size 0.2       # Holdout fraction for evaluation (default: 0.2)
--ci 0.95             # Confidence interval width (default: 0.95)
--scale               # Normalise before fitting (recommended for DL models)
--exog "col1,col2"    # Exogenous regressors (ARIMA, Prophet, ML)
--n-lags 12           # Lag window for ML/DL features (default: auto)
--epochs 100          # Training epochs for DL (default: 100)
--sproule-brand       # Apply Sproule ERCE colour palette (default: ON)
```

### Outputs (always created in --output-dir)
- `forecast.csv` — dates + predicted values + lower/upper CI bounds
- `forecast_chart.png` — branded line chart with shaded CI band
- `metrics.json` — MAE, RMSE, MAPE, MASE on holdout set
- `model_summary.txt` — model parameters / architecture

---

## Step 5 — Deliver Branded Output

**Chart**: `forecast_chart.png` is produced automatically in Sproule ERCE colours.

**Excel workbook** (3 sheets):
- Sheet 1 — Forecast: Date | Actual | Forecast | Lower CI | Upper CI
- Sheet 2 — Metrics: Model name, MAPE, RMSE, MAE, MASE, training period, horizon
- Sheet 3 — Chart: Embedded branded chart image

**PowerPoint**: Use Graphs Template slide 2 (multi-series line + callout) or slide 9 (stacked area + narrative). Apply Electric Blue → Sky Blue gradient header.

---

## Error Handling

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `Not enough data for DL model` | < 200 obs for LSTM/GRU/TCN | Use ARIMA or XGBoost instead |
| `Frequency detection failed` | Irregular timestamps | Set `--freq` explicitly |
| `Prophet failed to converge` | Too many missing values | Clean data; fill gaps |
| `ARIMA order selection failed` | Non-stationary with unit root | Add `--diff 1` flag |
| `CUDA out of memory` | GPU memory exceeded | Reduce `--batch-size` |

---

## Dependency Installation

```bash
pip install statsmodels prophet scikit-learn xgboost tensorflow torch \
    pandas numpy matplotlib openpyxl --break-system-packages -q
```

The script auto-installs missing packages. TensorFlow handles LSTM/GRU/TCN. PyTorch handles Transformer.
