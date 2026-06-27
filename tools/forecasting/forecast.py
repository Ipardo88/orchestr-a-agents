#!/usr/bin/env python3
"""
Sproule ERCE Time Series Forecasting Engine v2.0
================================================
Supports: ARIMA · ETS · Prophet · Random Forest · XGBoost · SVR
          LSTM · GRU · TCN · Transformer · Auto · Ensemble

Usage:
  python forecast.py --action profile --file data.csv --date-col date --target-col value
  python forecast.py --action forecast --file data.csv --date-col date --target-col value \
      --model lstm --horizon 12 --freq M --output-dir outputs/
"""

import argparse
import json
import os
import sys
import warnings
import subprocess
from pathlib import Path

warnings.filterwarnings("ignore")


# ── Sproule ERCE Brand Palette ───────────────────────────────────────────────
PALETTE = {
    "electric_blue":  "#1F4A66",
    "evolution_green": "#1F8E81",
    "moraine_blue":   "#0066A1",
    "sky_blue":       "#0095DA",
    "raspberry":      "#A5247B",
    "slate_grey":     "#6E7070",
}


# ── Dependency bootstrapper ──────────────────────────────────────────────────
def _ensure(*packages):
    """Install any missing packages silently."""
    for pkg in packages:
        import_name = pkg.split("[")[0].replace("-", "_")
        try:
            __import__(import_name)
        except ImportError:
            print(f"  Installing {pkg}…")
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", pkg,
                 "--break-system-packages", "-q"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )


# ── Data Loading ─────────────────────────────────────────────────────────────
def load_data(file_path: str, date_col: str, target_col: str, freq: str = None):
    """Load time series from CSV or Excel, return a cleaned DataFrame."""
    _ensure("pandas", "openpyxl")
    import pandas as pd

    p = Path(file_path)
    if p.suffix.lower() in (".xlsx", ".xls"):
        df = pd.read_excel(file_path)
    else:
        df = pd.read_csv(file_path)

    if date_col not in df.columns:
        raise ValueError(f"Date column '{date_col}' not found. Available: {list(df.columns)}")
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found. Available: {list(df.columns)}")

    df[date_col] = pd.to_datetime(df[date_col], infer_datetime_format=True)
    df = df.sort_values(date_col).reset_index(drop=True)
    df = df[[date_col, target_col]].dropna(subset=[target_col])
    df = df.set_index(date_col)

    # Infer or apply frequency
    if freq:
        df = df.asfreq(freq, method="ffill")
    else:
        inferred = pd.infer_freq(df.index)
        if inferred:
            df = df.asfreq(inferred)
        else:
            print("  Warning: Could not infer frequency. Proceeding without resampling.")

    return df


# ── Data Profiling ────────────────────────────────────────────────────────────
def profile(df, target_col: str) -> dict:
    """Compute and print a data profile."""
    _ensure("pandas", "statsmodels")
    import pandas as pd
    from statsmodels.tsa.stattools import adfuller

    series = df[target_col].dropna()
    n = len(series)
    missing = df[target_col].isna().sum()
    freq = df.index.freq

    # Stationarity
    adf_result = adfuller(series.dropna(), autolag="AIC")
    adf_pval = adf_result[1]
    stationary = adf_pval < 0.05

    # Simple trend / seasonality heuristic
    from statsmodels.tsa.seasonal import seasonal_decompose
    try:
        period = max(2, min(n // 4, 12))
        decomp = seasonal_decompose(series, model="additive", period=period, extrapolate_trend="freq")
        trend_strength = 1 - (decomp.resid.var() / (decomp.resid + decomp.trend).var())
        seasonal_strength = 1 - (decomp.resid.var() / (decomp.resid + decomp.seasonal).var())
    except Exception:
        trend_strength = seasonal_strength = float("nan")

    profile_data = {
        "n_observations": n,
        "date_range": f"{df.index.min().date()} → {df.index.max().date()}",
        "inferred_frequency": str(freq) if freq else "unknown",
        "missing_values": int(missing),
        "mean": round(float(series.mean()), 4),
        "std": round(float(series.std()), 4),
        "min": round(float(series.min()), 4),
        "max": round(float(series.max()), 4),
        "adf_pvalue": round(float(adf_pval), 4),
        "stationary": stationary,
        "trend_strength": round(float(trend_strength), 3) if trend_strength == trend_strength else "n/a",
        "seasonal_strength": round(float(seasonal_strength), 3) if seasonal_strength == seasonal_strength else "n/a",
    }

    print("\n━━ Data Profile ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    for k, v in profile_data.items():
        print(f"  {k:25s}: {v}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    return profile_data


# ── Feature Engineering for ML / DL ──────────────────────────────────────────
def make_lag_features(series, n_lags: int):
    """Create supervised learning dataset from a univariate series."""
    import pandas as pd
    import numpy as np

    X, y = [], []
    vals = series.values
    for i in range(n_lags, len(vals)):
        X.append(vals[i - n_lags:i])
        y.append(vals[i])
    return np.array(X), np.array(y)


def train_test_split_ts(df, target_col: str, test_size: float = 0.2):
    """Time-series aware train/test split (no shuffling)."""
    n = len(df)
    split = int(n * (1 - test_size))
    train = df.iloc[:split]
    test  = df.iloc[split:]
    return train, test


# ── Evaluation ────────────────────────────────────────────────────────────────
def evaluate(actual, predicted) -> dict:
    """Return MAE, RMSE, MAPE, MASE."""
    import numpy as np

    actual    = np.array(actual, dtype=float)
    predicted = np.array(predicted, dtype=float)
    mask = ~np.isnan(actual) & ~np.isnan(predicted)
    a, p = actual[mask], predicted[mask]

    mae  = float(np.mean(np.abs(a - p)))
    rmse = float(np.sqrt(np.mean((a - p) ** 2)))
    mape = float(np.mean(np.abs((a - p) / np.where(a == 0, 1e-8, a))) * 100)
    # MASE denominator: naive in-sample MAE
    naive_mae = float(np.mean(np.abs(np.diff(a)))) if len(a) > 1 else 1.0
    mase = mae / (naive_mae if naive_mae != 0 else 1.0)

    return {
        "MAE":  round(mae,  4),
        "RMSE": round(rmse, 4),
        "MAPE": round(mape, 2),
        "MASE": round(mase, 4),
    }


# ══════════════════════════════════════════════════════════════════════════════
# MODEL IMPLEMENTATIONS
# ══════════════════════════════════════════════════════════════════════════════

def run_arima(train, test, horizon, target_col, ci=0.95):
    """Auto-ARIMA using pmdarima."""
    _ensure("pmdarima", "statsmodels")
    import numpy as np
    import pmdarima as pm

    print("  Fitting Auto-ARIMA…")
    model = pm.auto_arima(
        train[target_col],
        seasonal=True, m=12,
        stepwise=True, suppress_warnings=True,
        error_action="ignore",
    )
    print(f"  Best order: {model.order}, seasonal: {model.seasonal_order}")

    # In-sample fitted values for evaluation
    fitted = model.predict_in_sample()
    metrics = evaluate(train[target_col].values[-len(fitted):], fitted)

    # Forecast
    alpha = 1 - ci
    fc, conf = model.predict(n_periods=horizon, return_conf_int=True, alpha=alpha)

    return {
        "forecast": fc.tolist(),
        "lower":    conf[:, 0].tolist(),
        "upper":    conf[:, 1].tolist(),
        "metrics":  metrics,
        "model_summary": str(model.summary()),
    }


def run_ets(train, test, horizon, target_col, freq, ci=0.95):
    """Exponential smoothing (ETS) via statsmodels."""
    _ensure("statsmodels")
    import numpy as np
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    print("  Fitting ETS…")
    period_map = {"D": 7, "W": 52, "M": 12, "Q": 4, "A": 1}
    seasonal_periods = period_map.get(str(freq)[:1].upper(), 12)

    model = ExponentialSmoothing(
        train[target_col],
        trend="add",
        seasonal="add" if len(train) >= 2 * seasonal_periods else None,
        seasonal_periods=seasonal_periods,
        initialization_method="estimated",
    ).fit(optimized=True, use_brute=False)

    fc = model.forecast(horizon)
    resid_std = np.std(model.resid)
    from scipy import stats
    z = stats.norm.ppf(1 - (1 - ci) / 2)

    metrics = evaluate(train[target_col].values[-len(model.fittedvalues):],
                       model.fittedvalues.values)

    return {
        "forecast": fc.tolist(),
        "lower":    (fc - z * resid_std).tolist(),
        "upper":    (fc + z * resid_std).tolist(),
        "metrics":  metrics,
        "model_summary": "ETS (Holt-Winters Exponential Smoothing)",
    }


def run_prophet(train, test, horizon, target_col, freq, ci=0.95):
    """Meta Prophet for trend + seasonality + changepoints."""
    _ensure("prophet")
    import pandas as pd
    from prophet import Prophet

    print("  Fitting Prophet…")
    df_prophet = train.reset_index().rename(
        columns={train.index.name: "ds", target_col: "y"}
    )

    freq_map = {"D": "D", "W": "W", "M": "MS", "Q": "QS", "A": "AS"}
    prophet_freq = freq_map.get(str(freq)[:1].upper(), "MS")

    m = Prophet(
        interval_width=ci,
        yearly_seasonality="auto",
        weekly_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    m.fit(df_prophet)

    future = m.make_future_dataframe(periods=horizon, freq=prophet_freq)
    forecast = m.predict(future)

    fc_rows = forecast.tail(horizon)
    train_fitted = forecast.head(len(train))
    metrics = evaluate(df_prophet["y"].values, train_fitted["yhat"].values)

    return {
        "forecast": fc_rows["yhat"].tolist(),
        "lower":    fc_rows["yhat_lower"].tolist(),
        "upper":    fc_rows["yhat_upper"].tolist(),
        "metrics":  metrics,
        "model_summary": "Meta Prophet (additive trend + seasonality)",
    }


def _ml_forecast(model_name, train, test, horizon, target_col, n_lags, ci=0.95):
    """Shared pipeline for Random Forest, XGBoost, SVR."""
    _ensure("scikit-learn", "xgboost", "numpy")
    import numpy as np
    from sklearn.preprocessing import StandardScaler

    series = train[target_col].values
    X_tr, y_tr = make_lag_features(series, n_lags)

    scaler_X = StandardScaler()
    scaler_y = StandardScaler()
    X_tr_s = scaler_X.fit_transform(X_tr)
    y_tr_s = scaler_y.fit_transform(y_tr.reshape(-1, 1)).ravel()

    if model_name == "rf":
        from sklearn.ensemble import RandomForestRegressor
        model = RandomForestRegressor(n_estimators=300, max_features="sqrt",
                                      random_state=42, n_jobs=-1)
    elif model_name == "xgboost":
        from xgboost import XGBRegressor
        model = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=5,
                             subsample=0.8, colsample_bytree=0.8,
                             random_state=42, verbosity=0)
    elif model_name == "svr":
        from sklearn.svm import SVR
        model = SVR(kernel="rbf", C=100, gamma=0.1, epsilon=0.1)
    else:
        raise ValueError(f"Unknown ML model: {model_name}")

    print(f"  Fitting {model_name.upper()}…")
    model.fit(X_tr_s, y_tr_s)
    fitted_s = model.predict(X_tr_s)
    fitted = scaler_y.inverse_transform(fitted_s.reshape(-1, 1)).ravel()
    metrics = evaluate(y_tr, fitted)

    # Recursive multi-step forecast
    history = list(series)
    forecasts = []
    for _ in range(horizon):
        x = np.array(history[-n_lags:]).reshape(1, -1)
        x_s = scaler_X.transform(x)
        pred_s = model.predict(x_s)
        pred = float(scaler_y.inverse_transform(pred_s.reshape(-1, 1))[0, 0])
        forecasts.append(pred)
        history.append(pred)

    # Approximate CI using residual std
    resid_std = np.std(y_tr - fitted)
    from scipy import stats
    z = stats.norm.ppf(1 - (1 - ci) / 2)
    lower = [f - z * resid_std for f in forecasts]
    upper = [f + z * resid_std for f in forecasts]

    return {
        "forecast": forecasts,
        "lower":    lower,
        "upper":    upper,
        "metrics":  metrics,
        "model_summary": f"{model_name.upper()} with {n_lags} lag features",
    }


def run_rf(train, test, horizon, target_col, n_lags, ci=0.95):
    return _ml_forecast("rf", train, test, horizon, target_col, n_lags, ci)

def run_xgboost(train, test, horizon, target_col, n_lags, ci=0.95):
    return _ml_forecast("xgboost", train, test, horizon, target_col, n_lags, ci)

def run_svr(train, test, horizon, target_col, n_lags, ci=0.95):
    return _ml_forecast("svr", train, test, horizon, target_col, n_lags, ci)


def _dl_forecast(model_name, train, test, horizon, target_col, n_lags,
                 epochs, batch_size, ci=0.95):
    """Shared pipeline for LSTM, GRU, TCN (TensorFlow/Keras)."""
    _ensure("tensorflow", "numpy", "scikit-learn")
    import numpy as np
    from sklearn.preprocessing import MinMaxScaler
    import tensorflow as tf
    from tensorflow import keras

    tf.get_logger().setLevel("ERROR")

    series = train[target_col].values.reshape(-1, 1)
    scaler = MinMaxScaler()
    series_s = scaler.fit_transform(series).ravel()

    X, y = make_lag_features(series_s, n_lags)
    X = X.reshape(X.shape[0], X.shape[1], 1)

    print(f"  Building {model_name.upper()} architecture…")

    def build_lstm():
        inp = keras.Input(shape=(n_lags, 1))
        x = keras.layers.LSTM(64, return_sequences=True)(inp)
        x = keras.layers.Dropout(0.2)(x)
        x = keras.layers.LSTM(32)(x)
        x = keras.layers.Dense(16, activation="relu")(x)
        out = keras.layers.Dense(1)(x)
        return keras.Model(inp, out)

    def build_gru():
        inp = keras.Input(shape=(n_lags, 1))
        x = keras.layers.GRU(64, return_sequences=True)(inp)
        x = keras.layers.Dropout(0.2)(x)
        x = keras.layers.GRU(32)(x)
        x = keras.layers.Dense(16, activation="relu")(x)
        out = keras.layers.Dense(1)(x)
        return keras.Model(inp, out)

    def build_tcn():
        """Temporal Convolutional Network with dilated causal convolutions."""
        inp = keras.Input(shape=(n_lags, 1))
        x = inp
        for dilation in [1, 2, 4, 8]:
            x = keras.layers.Conv1D(
                filters=32, kernel_size=3,
                padding="causal", dilation_rate=dilation,
                activation="relu"
            )(x)
            x = keras.layers.Dropout(0.1)(x)
        x = keras.layers.GlobalAveragePooling1D()(x)
        x = keras.layers.Dense(16, activation="relu")(x)
        out = keras.layers.Dense(1)(x)
        return keras.Model(inp, out)

    builders = {"lstm": build_lstm, "gru": build_gru, "tcn": build_tcn}
    model = builders[model_name]()
    model.compile(optimizer=keras.optimizers.Adam(1e-3), loss="mse")

    print(f"  Training {model_name.upper()} for {epochs} epochs…")
    model.fit(
        X, y,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.1,
        verbose=0,
        callbacks=[
            keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True),
            keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=7, verbose=0),
        ],
    )

    # In-sample fitted
    fitted_s = model.predict(X, verbose=0).ravel()
    fitted = scaler.inverse_transform(fitted_s.reshape(-1, 1)).ravel()
    actual = scaler.inverse_transform(y.reshape(-1, 1)).ravel()
    metrics = evaluate(actual, fitted)

    # Recursive forecast
    history = list(series_s)
    forecasts_s = []
    for _ in range(horizon):
        x = np.array(history[-n_lags:]).reshape(1, n_lags, 1)
        pred = float(model.predict(x, verbose=0)[0, 0])
        forecasts_s.append(pred)
        history.append(pred)

    forecasts = scaler.inverse_transform(
        np.array(forecasts_s).reshape(-1, 1)
    ).ravel().tolist()

    resid_std = float(np.std(actual - fitted))
    from scipy import stats
    z = stats.norm.ppf(1 - (1 - ci) / 2)
    lower = [f - z * resid_std for f in forecasts]
    upper = [f + z * resid_std for f in forecasts]

    return {
        "forecast": forecasts,
        "lower":    lower,
        "upper":    upper,
        "metrics":  metrics,
        "model_summary": model.summary(print_fn=lambda x: x),
    }


def run_lstm(train, test, horizon, target_col, n_lags, epochs, batch_size, ci=0.95):
    return _dl_forecast("lstm", train, test, horizon, target_col,
                        n_lags, epochs, batch_size, ci)

def run_gru(train, test, horizon, target_col, n_lags, epochs, batch_size, ci=0.95):
    return _dl_forecast("gru", train, test, horizon, target_col,
                        n_lags, epochs, batch_size, ci)

def run_tcn(train, test, horizon, target_col, n_lags, epochs, batch_size, ci=0.95):
    return _dl_forecast("tcn", train, test, horizon, target_col,
                        n_lags, epochs, batch_size, ci)


def run_transformer(train, test, horizon, target_col, n_lags, epochs, batch_size, ci=0.95):
    """Time-series Transformer with multi-head self-attention (PyTorch)."""
    _ensure("torch", "numpy", "scikit-learn")
    import numpy as np
    import torch
    import torch.nn as nn
    from sklearn.preprocessing import MinMaxScaler
    from torch.utils.data import TensorDataset, DataLoader
    from scipy import stats

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"  Building Transformer (device: {device})…")

    series = train[target_col].values.reshape(-1, 1)
    scaler = MinMaxScaler()
    series_s = scaler.fit_transform(series).ravel()
    X, y = make_lag_features(series_s, n_lags)

    class TSTransformer(nn.Module):
        def __init__(self, seq_len, d_model=32, nhead=4, num_layers=2, dropout=0.1):
            super().__init__()
            self.input_proj = nn.Linear(1, d_model)
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=d_model, nhead=nhead, dim_feedforward=64,
                dropout=dropout, batch_first=True
            )
            self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
            self.out = nn.Linear(d_model, 1)

        def forward(self, x):
            # x: (batch, seq_len)
            x = x.unsqueeze(-1)        # (batch, seq_len, 1)
            x = self.input_proj(x)     # (batch, seq_len, d_model)
            x = self.encoder(x)        # (batch, seq_len, d_model)
            x = x[:, -1, :]           # take last token
            return self.out(x).squeeze(-1)

    X_t = torch.tensor(X, dtype=torch.float32)
    y_t = torch.tensor(y, dtype=torch.float32)
    dataset = TensorDataset(X_t, y_t)
    loader  = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model_t = TSTransformer(seq_len=n_lags).to(device)
    optimizer = torch.optim.Adam(model_t.parameters(), lr=1e-3)
    criterion = nn.MSELoss()

    print(f"  Training Transformer for up to {epochs} epochs…")
    best_loss, patience_count, best_state = float("inf"), 0, None
    for epoch in range(epochs):
        model_t.train()
        epoch_loss = 0.0
        for xb, yb in loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            pred = model_t(xb)
            loss = criterion(pred, yb)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        epoch_loss /= len(loader)
        if epoch_loss < best_loss - 1e-6:
            best_loss = epoch_loss
            best_state = {k: v.clone() for k, v in model_t.state_dict().items()}
            patience_count = 0
        else:
            patience_count += 1
        if patience_count >= 20:
            print(f"  Early stop at epoch {epoch + 1}")
            break

    if best_state:
        model_t.load_state_dict(best_state)

    model_t.eval()
    with torch.no_grad():
        fitted_s = model_t(X_t.to(device)).cpu().numpy()
    fitted = scaler.inverse_transform(fitted_s.reshape(-1, 1)).ravel()
    actual = scaler.inverse_transform(y.reshape(-1, 1)).ravel()
    metrics = evaluate(actual, fitted)

    # Recursive forecast
    history = list(series_s)
    forecasts_s = []
    with torch.no_grad():
        for _ in range(horizon):
            x = torch.tensor(history[-n_lags:], dtype=torch.float32).unsqueeze(0).to(device)
            pred = float(model_t(x).cpu().item())
            forecasts_s.append(pred)
            history.append(pred)

    forecasts = scaler.inverse_transform(
        np.array(forecasts_s).reshape(-1, 1)
    ).ravel().tolist()

    resid_std = float(np.std(actual - fitted))
    z = stats.norm.ppf(1 - (1 - ci) / 2)
    lower = [f - z * resid_std for f in forecasts]
    upper = [f + z * resid_std for f in forecasts]

    return {
        "forecast": forecasts,
        "lower":    lower,
        "upper":    upper,
        "metrics":  metrics,
        "model_summary": f"Transformer (d_model=32, nhead=4, layers=2, seq_len={n_lags})",
    }


def run_auto(train, test, horizon, target_col, freq, n_lags, epochs, batch_size, ci=0.95):
    """Run ARIMA + Prophet + XGBoost, return the best by RMSE."""
    results = {}
    for name, fn in [
        ("arima",   lambda: run_arima(train, test, horizon, target_col, ci)),
        ("prophet", lambda: run_prophet(train, test, horizon, target_col, freq, ci)),
        ("xgboost", lambda: run_xgboost(train, test, horizon, target_col, n_lags, ci)),
    ]:
        try:
            results[name] = fn()
        except Exception as e:
            print(f"  {name} failed: {e}")

    if not results:
        raise RuntimeError("All auto models failed.")

    best = min(results.items(), key=lambda kv: kv[1]["metrics"]["RMSE"])
    print(f"\n  ✔ Best model: {best[0].upper()} (RMSE={best[1]['metrics']['RMSE']})")
    result = best[1]
    result["model_selected"] = best[0]
    return result


def run_ensemble(train, test, horizon, target_col, freq, n_lags, epochs, batch_size, ci=0.95):
    """Average forecasts from ARIMA + Prophet + XGBoost."""
    import numpy as np

    results = {}
    for name, fn in [
        ("arima",   lambda: run_arima(train, test, horizon, target_col, ci)),
        ("prophet", lambda: run_prophet(train, test, horizon, target_col, freq, ci)),
        ("xgboost", lambda: run_xgboost(train, test, horizon, target_col, n_lags, ci)),
    ]:
        try:
            results[name] = fn()
        except Exception as e:
            print(f"  {name} failed: {e}")

    if not results:
        raise RuntimeError("All ensemble models failed.")

    fcs    = np.array([r["forecast"] for r in results.values()])
    lowers = np.array([r["lower"]    for r in results.values()])
    uppers = np.array([r["upper"]    for r in results.values()])

    ensemble_metrics = {
        k: round(float(np.mean([r["metrics"][k] for r in results.values()])), 4)
        for k in ["MAE", "RMSE", "MAPE", "MASE"]
    }

    return {
        "forecast": fcs.mean(axis=0).tolist(),
        "lower":    lowers.mean(axis=0).tolist(),
        "upper":    uppers.mean(axis=0).tolist(),
        "metrics":  ensemble_metrics,
        "model_summary": f"Ensemble average of: {', '.join(results.keys())}",
    }


# ── Charting ──────────────────────────────────────────────────────────────────
def make_chart(df, target_col, forecast_dates, result, output_path, title=""):
    """Generate a Sproule ERCE-branded forecast chart."""
    _ensure("matplotlib")
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.ticker as mticker
    import numpy as np

    fig, ax = plt.subplots(figsize=(12, 6))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    # Historical
    ax.plot(
        df.index, df[target_col],
        color=PALETTE["electric_blue"], linewidth=2,
        label="Historical", zorder=3,
    )

    # Forecast
    ax.plot(
        forecast_dates, result["forecast"],
        color=PALETTE["evolution_green"], linewidth=2.5,
        linestyle="--", label="Forecast", zorder=4,
    )

    # Confidence interval
    if result.get("lower") and result.get("upper"):
        ax.fill_between(
            forecast_dates,
            result["lower"], result["upper"],
            color=PALETTE["sky_blue"], alpha=0.25,
            label=f"Confidence Interval",
        )

    # Vertical divider
    ax.axvline(
        x=df.index[-1],
        color=PALETTE["slate_grey"], linewidth=1,
        linestyle=":", alpha=0.7,
    )

    # MAPE annotation
    mape = result["metrics"].get("MAPE", "N/A")
    ax.annotate(
        f"MAPE: {mape}%",
        xy=(0.02, 0.95), xycoords="axes fraction",
        fontsize=9, color=PALETTE["raspberry"],
        fontweight="bold",
    )

    # Formatting
    model_label = result.get("model_selected", result.get("model_summary", "")[:40])
    full_title  = title or f"Sproule ERCE — {target_col} Forecast"
    ax.set_title(full_title, fontsize=13, fontweight="bold",
                 color=PALETTE["electric_blue"], pad=12)
    ax.set_xlabel("Date", fontsize=10, color=PALETTE["slate_grey"])
    ax.set_ylabel(target_col, fontsize=10, color=PALETTE["slate_grey"])
    ax.legend(frameon=True, framealpha=0.85, fontsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(PALETTE["slate_grey"])
    ax.spines["bottom"].set_color(PALETTE["slate_grey"])
    ax.tick_params(colors=PALETTE["slate_grey"])
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(
        lambda x, _: f"{x:,.0f}"
    ))

    # Watermark
    fig.text(
        0.98, 0.01, "© Sproule ERCE",
        ha="right", va="bottom",
        fontsize=7, color=PALETTE["slate_grey"], alpha=0.6,
    )

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Chart saved: {output_path}")


# ── Forecast date index ───────────────────────────────────────────────────────
def make_forecast_dates(last_date, horizon, freq):
    _ensure("pandas")
    import pandas as pd

    freq_map = {"D": "D", "W": "W", "M": "MS", "Q": "QS", "A": "AS"}
    offset = freq_map.get(str(freq)[:1].upper(), "MS")
    return pd.date_range(start=last_date, periods=horizon + 1, freq=offset)[1:]


# ── Main Entry Point ──────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Sproule ERCE Time Series Forecasting Engine v2.0"
    )
    parser.add_argument("--action",      choices=["profile", "forecast"], required=True)
    parser.add_argument("--file",        required=True, help="Path to CSV or Excel file")
    parser.add_argument("--date-col",    default="date")
    parser.add_argument("--target-col",  required=True)
    parser.add_argument("--model",       default="auto",
                        choices=["arima", "ets", "prophet", "rf", "xgboost", "svr",
                                 "lstm", "gru", "tcn", "transformer", "auto", "ensemble"])
    parser.add_argument("--horizon",     type=int, default=12)
    parser.add_argument("--freq",        default=None,
                        help="D/W/M/Q/A — auto-detected if omitted")
    parser.add_argument("--test-size",   type=float, default=0.2)
    parser.add_argument("--ci",          type=float, default=0.95)
    parser.add_argument("--n-lags",      type=int, default=None,
                        help="Lag window (default: auto = min(24, n//5))")
    parser.add_argument("--epochs",      type=int, default=100)
    parser.add_argument("--batch-size",  type=int, default=32)
    parser.add_argument("--output-dir",  default="outputs/")
    parser.add_argument("--title",       default="")
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load data
    print(f"\n  Loading data from: {args.file}")
    df = load_data(args.file, args.date_col, args.target_col, args.freq)

    if args.action == "profile":
        profile(df, args.target_col)
        return

    # Infer n_lags if not provided
    n = len(df)
    n_lags = args.n_lags or min(24, max(4, n // 5))
    print(f"  n_lags: {n_lags} | horizon: {args.horizon} | model: {args.model}")

    # Train / test split
    train, test = train_test_split_ts(df, args.target_col, args.test_size)
    print(f"  Train: {len(train)} obs | Test: {len(test)} obs")

    freq = args.freq or (str(df.index.freq)[:1].upper() if df.index.freq else "M")

    # Dispatch to model
    dispatch = {
        "arima":       lambda: run_arima(train, test, args.horizon, args.target_col, args.ci),
        "ets":         lambda: run_ets(train, test, args.horizon, args.target_col, freq, args.ci),
        "prophet":     lambda: run_prophet(train, test, args.horizon, args.target_col, freq, args.ci),
        "rf":          lambda: run_rf(train, test, args.horizon, args.target_col, n_lags, args.ci),
        "xgboost":     lambda: run_xgboost(train, test, args.horizon, args.target_col, n_lags, args.ci),
        "svr":         lambda: run_svr(train, test, args.horizon, args.target_col, n_lags, args.ci),
        "lstm":        lambda: run_lstm(train, test, args.horizon, args.target_col,
                                        n_lags, args.epochs, args.batch_size, args.ci),
        "gru":         lambda: run_gru(train, test, args.horizon, args.target_col,
                                       n_lags, args.epochs, args.batch_size, args.ci),
        "tcn":         lambda: run_tcn(train, test, args.horizon, args.target_col,
                                       n_lags, args.epochs, args.batch_size, args.ci),
        "transformer": lambda: run_transformer(train, test, args.horizon, args.target_col,
                                               n_lags, args.epochs, args.batch_size, args.ci),
        "auto":        lambda: run_auto(train, test, args.horizon, args.target_col,
                                        freq, n_lags, args.epochs, args.batch_size, args.ci),
        "ensemble":    lambda: run_ensemble(train, test, args.horizon, args.target_col,
                                            freq, n_lags, args.epochs, args.batch_size, args.ci),
    }

    result = dispatch[args.model]()

    # Build forecast date index
    forecast_dates = make_forecast_dates(df.index[-1], args.horizon, freq)

    # Save forecast CSV
    import pandas as pd
    fc_df = pd.DataFrame({
        "date":     forecast_dates,
        "forecast": result["forecast"],
        "lower_ci": result.get("lower", [None] * args.horizon),
        "upper_ci": result.get("upper", [None] * args.horizon),
    })
    csv_path = out_dir / "forecast.csv"
    fc_df.to_csv(csv_path, index=False)
    print(f"  Forecast CSV: {csv_path}")

    # Save metrics
    metrics_path = out_dir / "metrics.json"
    metrics_path.write_text(json.dumps({
        "model":   args.model,
        "horizon": args.horizon,
        "freq":    freq,
        "metrics": result["metrics"],
        "model_summary": str(result.get("model_summary", "")),
    }, indent=2))
    print(f"  Metrics JSON: {metrics_path}")

    # Save model summary
    summary_path = out_dir / "model_summary.txt"
    summary_path.write_text(str(result.get("model_summary", "")))

    # Generate chart
    chart_path = out_dir / "forecast_chart.png"
    make_chart(df, args.target_col, forecast_dates, result, chart_path, args.title)

    # Print evaluation summary
    print("\n━━ Evaluation Metrics (in-sample) ━━━━━━━━━━━━━━━")
    for k, v in result["metrics"].items():
        print(f"  {k:6s}: {v}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    print(f"\n  ✔ Done. Outputs in: {out_dir.resolve()}\n")


if __name__ == "__main__":
    main()
