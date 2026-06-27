# Signal Oracle — Model Selection Guide

## Decision Tree

```
Is the series < 50 observations?
  YES → ARIMA or ETS (statistical). Deep learning needs more data.
  NO  → Continue ↓

Does the series have strong, known seasonality (e.g., monthly gas demand)?
  YES + simple trend  → Prophet (handles seasonality + holidays + missing data)
  YES + complex patterns → LSTM or GRU

Is the horizon short (≤ 10% of training length) with tabular features available?
  YES → XGBoost or Random Forest (fast, interpretable, good with lag features)

Does the user need confidence intervals + interpretability?
  YES → ARIMA, ETS, or Prophet (produce native CIs)
  NO  → Any model

Is the series long (> 500 obs) with complex non-linear dynamics?
  YES → LSTM (multivariate) or GRU (faster, similar accuracy)
  YES + long-range dependencies → Transformer
  YES + local pattern focus → TCN (Temporal Convolutional Network)

Production / decline curve data?
  → Try Prophet (initial decline phase) + LSTM ensemble
```

---

## Quick Model Reference

| Model | Best For | Data Required | Interpretable | CIs |
|-------|----------|---------------|---------------|-----|
| ARIMA | Stationary, short series | ≥ 30 obs | Yes | Yes |
| ETS | Exponential smoothing, seasonal | ≥ 24 obs | Yes | Yes |
| Prophet | Seasonal + trend + events | ≥ 100 obs | Moderate | Yes |
| Random Forest | Tabular, non-linear, many features | ≥ 50 obs | Moderate | No |
| XGBoost | Tabular, non-linear, high accuracy | ≥ 50 obs | Moderate | No |
| SVR | Non-linear, smooth curves | ≥ 30 obs | Low | No |
| LSTM | Multivariate, long sequences | ≥ 200 obs | Low | No |
| GRU | Like LSTM, faster training | ≥ 200 obs | Low | No |
| TCN | Local temporal patterns | ≥ 200 obs | Low | No |
| Transformer | Long-range dependencies | ≥ 500 obs | Low | No |
| auto | Runs ARIMA + Prophet + XGBoost, picks best RMSE | ≥ 30 obs | — | — |
| ensemble | Averages top-3 model predictions | ≥ 50 obs | — | — |

---

## When to Use Each Family

### Statistical (ARIMA, ETS, Prophet)
- Short series (< 200 obs)
- Need interpretable parameters
- Need native confidence intervals
- Compliance and audit contexts where "black box" is not acceptable

### Machine Learning (XGBoost, Random Forest, SVR)
- Tabular lag features available (e.g., price lags, economic indicators)
- Short to medium horizons
- Fast iteration speed needed
- High accuracy without tuning complexity

### Deep Learning (LSTM, GRU, TCN, Transformer)
- Long series (> 200 obs for LSTM/GRU/TCN, > 500 for Transformer)
- Complex multivariate relationships
- Non-linear dynamics that statistical models miss
- When accuracy > interpretability

### Auto / Ensemble
- Exploratory analysis — don't know which model will win
- Maximum accuracy required and time permits running all models
- Ensemble is almost always more accurate than any single model

---

## Ensemble Strategy

When using `--model ensemble`:
1. ARIMA + Prophet + XGBoost run independently
2. Each generates predictions for the full horizon
3. Simple average of all three predictions (equal weights)
4. Confidence intervals: use the widest of the three

When using `--model auto`:
1. All three models run on a holdout set
2. Best MAPE on holdout selects the winner
3. Winner is then re-trained on full data and used for the final forecast

---

## Exogenous Regressors (`--exog`)

Use exogenous regressors when external variables drive the target series:

Examples:
- Revenue forecast → include commodity price as regressor
- Production forecast → include injection rate, pressure data
- Carbon intensity → include production volume (denominator)
- Price forecast → include rig count, inventory levels, exchange rates

```bash
python tools/forecasting/forecast.py \
  --action forecast \
  --file data.csv \
  --date-col date \
  --target-col revenue_usd \
  --model arima \
  --exog "wti_price,fx_rate" \
  --horizon 12 --freq M --output-dir outputs/
```

ARIMA, Prophet, and all ML models support `--exog`. LSTM/GRU accept it as additional input channels.
