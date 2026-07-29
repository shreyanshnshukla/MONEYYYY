from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel as PydanticBaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

from .data_fetcher import fetch_historical_data, fetch_ticker_info, fetch_ticker_news
from .indicators import calculate_indicators
from .models.ml_model import MLPredictor
from .models.lstm_model import LSTMPredictor
from .models.sentiment import SentimentAnalyzer
from .portfolio import optimize_portfolio

app = FastAPI(title="Stock & Crypto Predictive Modeling API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global sentiment analyzer instance
sentiment_analyzer = SentimentAnalyzer()

# Predefined asset lists
DEFAULT_STOCKS = [
    {"symbol": "AAPL", "name": "Apple Inc."},
    {"symbol": "MSFT", "name": "Microsoft Corporation"},
    {"symbol": "GOOG", "name": "Alphabet Inc."},
    {"symbol": "TSLA", "name": "Tesla, Inc."},
    {"symbol": "NVDA", "name": "NVIDIA Corporation"}
]

DEFAULT_CRYPTOS = [
    {"symbol": "BTC-USD", "name": "Bitcoin"},
    {"symbol": "ETH-USD", "name": "Ethereum"},
    {"symbol": "SOL-USD", "name": "Solana"},
    {"symbol": "ADA-USD", "name": "Cardano"},
    {"symbol": "DOGE-USD", "name": "Dogecoin"}
]

class PredictionRequest(PydanticBaseModel):
    ticker: str
    model_type: str  # 'random_forest', 'gradient_boosting', 'ridge', 'lstm'
    window_size: int = 30
    horizon: int = 7
    period: str = "1y"
    hyperparameters: Optional[Dict[str, Any]] = None

class OptimizationRequest(PydanticBaseModel):
    tickers: List[str]
    period: str = "1y"
    risk_free_rate: float = 0.02

@app.get("/")
def read_root():
    return {"message": "Welcome to the Stock and Crypto Prediction API"}

@app.get("/api/assets")
def get_assets():
    """
    Returns lists of supported stocks and cryptocurrencies.
    """
    return {
        "stocks": DEFAULT_STOCKS,
        "cryptos": DEFAULT_CRYPTOS
    }

@app.get("/api/ticker/{ticker}")
def get_ticker_details(ticker: str):
    """
    Fetches real-time summary details for a specific ticker.
    """
    info = fetch_ticker_info(ticker)
    return info

@app.get("/api/historical/{ticker}")
def get_historical(ticker: str, period: str = "1y", interval: str = "1d"):
    """
    Fetches historical OHLCV data and calculates technical indicators.
    """
    try:
        df = fetch_historical_data(ticker, period=period, interval=interval)
        df_indicators = calculate_indicators(df)
        
        # Replace NaN/Inf to prevent JSON serializing errors
        df_indicators = df_indicators.replace([np.inf, -np.inf], None)
        df_indicators = df_indicators.where(pd.notnull(df_indicators), None)
        
        return df_indicators.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sentiment/{ticker}")
def get_sentiment(ticker: str):
    """
    Fetches recent news items and calculates sentiment scores.
    """
    news_items = fetch_ticker_news(ticker)
    analysis = sentiment_analyzer.analyze_news_list(news_items)
    return {
        "ticker": ticker,
        "overall": analysis,
        "articles": news_items
    }

@app.post("/api/predict")
def predict_prices(request: PredictionRequest):
    """
    Trains selected ML model on historical data and forecasts future prices.
    """
    try:
        # Fetch long period data to train properly (at least 1y or 2y)
        df = fetch_historical_data(request.ticker, period=request.period, interval="1d")
        df = calculate_indicators(df)
        
        if len(df) < (request.window_size + request.horizon + 10):
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough historical data points ({len(df)}) for requested window size ({request.window_size}) and horizon ({request.horizon})."
            )
            
        hp = request.hyperparameters or {}
        
        # Instantiate correct model
        if request.model_type in ["random_forest", "gradient_boosting", "ridge"]:
            n_est = int(hp.get("n_estimators", 100))
            depth = int(hp.get("max_depth", 10))
            model = MLPredictor(model_type=request.model_type, n_estimators=n_est, max_depth=depth)
        elif request.model_type == "lstm":
            epochs = int(hp.get("epochs", 30))
            lr = float(hp.get("lr", 0.001))
            batch_size = int(hp.get("batch_size", 32))
            model = LSTMPredictor(epochs=epochs, lr=lr, batch_size=batch_size)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported model type: {request.model_type}")
            
        # Prepare datasets
        X, y, feature_names = model.prepare_data(
            df, 
            target_col='Close', 
            window_size=request.window_size, 
            horizon=request.horizon
        )
        
        # Split train/test (80% train, 20% test)
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Train model
        model.fit(X_train, y_train)
        
        # Evaluate on test set
        y_pred_test = model.predict(X_test)
        metrics = model.evaluate(y_test, y_pred_test)
        
        # Get feature importances if applicable
        importance = {}
        if hasattr(model, "get_feature_importances"):
            importance = model.get_feature_importances()
            
        # Perform forecasting for the future horizon
        # For prediction, we need the most recent window of data
        # LSTM expects shape (1, window_size, num_features)
        # ML Models expect shape (1, window_size * num_features)
        if request.model_type == "lstm":
            # Extract last window_size rows from dataframe
            last_window_df = df.tail(request.window_size)
            required_cols = ['Close', 'Volume', 'SMA_20', 'SMA_50', 'EMA_12', 'EMA_26', 'RSI', 'MACD', 'MACD_Signal', 'BB_Upper', 'BB_Lower']
            features_to_use = [col for col in required_cols if col in df.columns]
            last_window_feats = last_window_df[features_to_use].values
            X_future = np.expand_dims(last_window_feats, axis=0) # shape (1, window_size, features)
        else:
            last_window_df = df.tail(request.window_size)
            required_cols = ['Close', 'Volume', 'SMA_20', 'SMA_50', 'EMA_12', 'EMA_26', 'RSI', 'MACD', 'MACD_Signal', 'BB_Upper', 'BB_Lower']
            features_to_use = [col for col in required_cols if col in df.columns]
            last_window_feats = last_window_df[features_to_use].values
            X_future = last_window_feats.flatten().reshape(1, -1)
            
        future_forecast = model.predict(X_future)[0] # first batch element
        
        # Generate future forecast dates
        last_date_str = df.iloc[-1]['Date']
        try:
            last_date = pd.to_datetime(last_date_str)
        except:
            last_date = pd.Timestamp.now()
            
        forecast_dates = []
        curr_date = last_date
        # Increment days (skipping weekends for stocks is ideal, but for simplicity/regularity, we just add calendar days)
        for i in range(1, request.horizon + 1):
            curr_date += pd.Timedelta(days=1)
            forecast_dates.append(curr_date.strftime('%Y-%m-%d'))
            
        # Format results
        forecast_data = []
        for d, val in zip(forecast_dates, future_forecast):
            forecast_data.append({"date": d, "predicted_price": float(val)})
            
        # Prepare historical records for visual baseline
        historical_subset = df.tail(request.window_size)[["Date", "Close"]].to_dict(orient="records")
        
        return {
            "ticker": request.ticker,
            "model_name": model.name,
            "metrics": metrics,
            "feature_importance": importance,
            "forecast": forecast_data,
            "historical_baseline": historical_subset
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize")
def optimize(request: OptimizationRequest):
    """
    Computes optimal portfolio asset weights based on Modern Portfolio Theory.
    """
    try:
        # Fetch historical data for all selected tickers
        df_dict = {}
        for ticker in request.tickers:
            df = fetch_historical_data(ticker, period=request.period, interval="1d")
            df_dict[ticker] = calculate_indicators(df)
            
        results = optimize_portfolio(
            tickers=request.tickers, 
            df_dict=df_dict, 
            risk_free_rate=request.risk_free_rate
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
