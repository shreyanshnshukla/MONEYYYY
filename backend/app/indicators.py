import pandas as pd
import numpy as np

def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates technical indicators for the input historical DataFrame.
    Expects df to contain a 'Close' and 'Volume' column.
    """
    df = df.copy()
    
    if len(df) < 30:
        # Not enough data to calculate reliable indicators
        return df
        
    close = df['Close']
    
    # 1. Simple Moving Averages (SMA)
    df['SMA_20'] = close.rolling(window=20).mean()
    df['SMA_50'] = close.rolling(window=50).mean()
    
    # 2. Exponential Moving Averages (EMA)
    df['EMA_12'] = close.ewm(span=12, adjust=False).mean()
    df['EMA_26'] = close.ewm(span=26, adjust=False).mean()
    df['EMA_50'] = close.ewm(span=50, adjust=False).mean()
    
    # 3. Moving Average Convergence Divergence (MACD)
    df['MACD'] = df['EMA_12'] - df['EMA_26']
    df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_Hist'] = df['MACD'] - df['MACD_Signal']
    
    # 4. Relative Strength Index (RSI)
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).copy()
    loss = (-delta.where(delta < 0, 0)).copy()
    
    # Calculate wilder's rolling average for RSI
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    
    # First values
    for i in range(14, len(df)):
        avg_gain.iloc[i] = (avg_gain.iloc[i-1] * 13 + gain.iloc[i]) / 14
        avg_loss.iloc[i] = (avg_loss.iloc[i-1] * 13 + loss.iloc[i]) / 14
        
    rs = avg_gain / avg_loss
    df['RSI'] = 100 - (100 / (1 + rs))
    # Fill NaN for early stages
    df['RSI'] = df['RSI'].fillna(50)
    
    # 5. Bollinger Bands (20-day SMA, 2-std dev)
    df['BB_Middle'] = df['SMA_20']
    df['BB_Std'] = close.rolling(window=20).std()
    df['BB_Upper'] = df['BB_Middle'] + (df['BB_Std'] * 2)
    df['BB_Lower'] = df['BB_Middle'] - (df['BB_Std'] * 2)
    
    # Drop intermediate standard deviation column
    df = df.drop(columns=['BB_Std'])
    
    # 6. Daily Returns
    df['Daily_Return'] = close.pct_change() * 100
    df['Daily_Return'] = df['Daily_Return'].fillna(0)
    
    # Fill NaNs from rolling computations with original Close or default values
    df['SMA_20'] = df['SMA_20'].fillna(df['Close'])
    df['SMA_50'] = df['SMA_50'].fillna(df['Close'])
    df['BB_Upper'] = df['BB_Upper'].fillna(df['Close'])
    df['BB_Lower'] = df['BB_Lower'].fillna(df['Close'])
    df['BB_Middle'] = df['BB_Middle'].fillna(df['Close'])
    
    return df
