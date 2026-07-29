import yfinance as yf
import pandas as pd
from typing import Dict, List, Any
import datetime

def fetch_historical_data(ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    """
    Fetches historical price data from Yahoo Finance.
    ticker: Symbol (e.g. 'AAPL', 'BTC-USD', 'ETH-USD')
    period: Data period (e.g. '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max')
    interval: Data frequency (e.g. '1d', '1wk', '1mo')
    """
    try:
        t = yf.Ticker(ticker)
        df = t.history(period=period, interval=interval)
        if df.empty:
            raise ValueError(f"No data returned for ticker {ticker}")
        
        # Reset index to make Date a column and convert to string
        df = df.reset_index()
        # Convert Date to string format (YYYY-MM-DD)
        if 'Date' in df.columns:
            df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
        elif 'Datetime' in df.columns:
            df['Date'] = df['Datetime'].dt.strftime('%Y-%m-%d %H:%M:%S')
            
        return df
    except Exception as e:
        raise RuntimeError(f"Error fetching data for {ticker}: {str(e)}")

def fetch_ticker_info(ticker: str) -> Dict[str, Any]:
    """
    Fetches key metrics and general metadata for a given symbol.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info
        
        # Select key info based on availability (stocks and crypto have different fields)
        return {
            "symbol": ticker,
            "shortName": info.get("shortName") or info.get("name") or ticker,
            "currentPrice": info.get("currentPrice") or info.get("regularMarketPrice") or info.get("priceHint"),
            "marketCap": info.get("marketCap"),
            "volume": info.get("volume") or info.get("regularMarketVolume"),
            "dayHigh": info.get("dayHigh") or info.get("regularMarketDayHigh"),
            "dayLow": info.get("dayLow") or info.get("regularMarketDayLow"),
            "previousClose": info.get("previousClose") or info.get("regularMarketPreviousClose"),
            "currency": info.get("currency", "USD"),
            "description": info.get("longBusinessSummary", "No description available.")
        }
    except Exception as e:
        # Fallback if standard info fails
        try:
            # Try history to get the last price
            df = yf.Ticker(ticker).history(period="1d")
            if not df.empty:
                last_row = df.iloc[-1]
                return {
                    "symbol": ticker,
                    "shortName": ticker,
                    "currentPrice": float(last_row["Close"]),
                    "marketCap": None,
                    "volume": float(last_row["Volume"]),
                    "dayHigh": float(last_row["High"]),
                    "dayLow": float(last_row["Low"]),
                    "previousClose": None,
                    "currency": "USD",
                    "description": "Historical data available, metadata retrieval failed."
                }
        except:
            pass
        return {
            "symbol": ticker,
            "shortName": ticker,
            "currentPrice": None,
            "marketCap": None,
            "volume": None,
            "dayHigh": None,
            "dayLow": None,
            "previousClose": None,
            "currency": "USD",
            "description": f"Failed to retrieve info: {str(e)}"
        }

def fetch_ticker_news(ticker: str) -> List[Dict[str, Any]]:
    """
    Fetches recent news items related to the ticker.
    """
    try:
        t = yf.Ticker(ticker)
        news = t.news
        if not news:
            return []
            
        formatted_news = []
        for item in news[:10]: # Limit to 10 news items
            pub_time = item.get("providerPublishTime")
            if pub_time:
                date_str = datetime.datetime.fromtimestamp(pub_time).strftime('%Y-%m-%d %H:%M')
            else:
                date_str = "Unknown date"
                
            formatted_news.append({
                "title": item.get("title", "No Title"),
                "publisher": item.get("publisher", "Unknown Publisher"),
                "link": item.get("link", "#"),
                "date": date_str,
                "summary": item.get("summary", "")
            })
        return formatted_news
    except Exception as e:
        print(f"Error fetching news for {ticker}: {str(e)}")
        return []
