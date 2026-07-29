import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import Dict, List, Tuple, Any

def calculate_portfolio_metrics(weights: np.ndarray, mean_returns: np.ndarray, cov_matrix: np.ndarray, risk_free_rate: float = 0.02) -> Tuple[float, float, float]:
    """
    Calculates expected return, volatility, and Sharpe ratio for a portfolio of assets.
    """
    # Annualized portfolio return
    portfolio_return = np.sum(mean_returns * weights) * 252
    
    # Annualized portfolio volatility
    portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights)))
    
    # Sharpe ratio
    sharpe_ratio = (portfolio_return - risk_free_rate) / (portfolio_volatility + 1e-8)
    
    return portfolio_return, portfolio_volatility, sharpe_ratio

def optimize_portfolio(tickers: List[str], df_dict: Dict[str, pd.DataFrame], risk_free_rate: float = 0.02) -> Dict[str, Any]:
    """
    Performs Mean-Variance Optimization and Monte Carlo simulations on the asset list.
    df_dict is a dictionary mapping ticker to history DataFrame containing a 'Daily_Return' column.
    """
    # 1. Align return data
    returns_dict = {}
    for ticker in tickers:
        if ticker in df_dict and not df_dict[ticker].empty:
            df = df_dict[ticker]
            # Ensure 'Date' is set as index for alignment
            if 'Date' in df.columns:
                df = df.set_index('Date')
            # Extract daily returns
            if 'Daily_Return' in df.columns:
                # convert percentage returns back to fraction for math calculations
                returns_dict[ticker] = df['Daily_Return'] / 100.0
            elif 'Close' in df.columns:
                returns_dict[ticker] = df['Close'].pct_change()
                
    returns_df = pd.DataFrame(returns_dict).dropna()
    if returns_df.empty:
        raise ValueError("Could not align historical data to calculate returns.")
        
    mean_returns = returns_df.mean().values
    cov_matrix = returns_df.cov().values
    num_assets = len(tickers)
    
    # Check for valid inputs
    if num_assets < 2:
        # Cannot optimize a single asset, just return it
        return {
            "tickers": tickers,
            "max_sharpe": {"weights": [1.0], "return": float(mean_returns[0]*252), "volatility": float(np.sqrt(cov_matrix[0][0]*252)), "sharpe": float((mean_returns[0]*252 - risk_free_rate)/np.sqrt(cov_matrix[0][0]*252))},
            "min_vol": {"weights": [1.0], "return": float(mean_returns[0]*252), "volatility": float(np.sqrt(cov_matrix[0][0]*252)), "sharpe": float((mean_returns[0]*252 - risk_free_rate)/np.sqrt(cov_matrix[0][0]*252))},
            "monte_carlo": []
        }
        
    # 2. Optimization helper: Negative Sharpe Ratio (to minimize)
    def neg_sharpe_ratio(weights):
        return -calculate_portfolio_metrics(weights, mean_returns, cov_matrix, risk_free_rate)[2]
        
    # 3. Optimization helper: Volatility (to minimize)
    def portfolio_vol(weights):
        return calculate_portfolio_metrics(weights, mean_returns, cov_matrix, risk_free_rate)[1]
        
    # Constraints & Bounds
    # Constraint: sum of weights = 1.0
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    # Bounds: each asset weight between 0.0 and 1.0 (no short selling)
    bounds = tuple((0, 1) for _ in range(num_assets))
    
    # Initial guess (equal allocation)
    init_weights = np.array(num_assets * [1. / num_assets])
    
    # Run Max Sharpe optimization
    opt_sharpe = minimize(neg_sharpe_ratio, init_weights, method='SLSQP', bounds=bounds, constraints=constraints)
    max_sharpe_weights = opt_sharpe.x
    max_sharpe_ret, max_sharpe_vol, max_sharpe_val = calculate_portfolio_metrics(max_sharpe_weights, mean_returns, cov_matrix, risk_free_rate)
    
    # Run Min Volatility optimization
    opt_vol = minimize(portfolio_vol, init_weights, method='SLSQP', bounds=bounds, constraints=constraints)
    min_vol_weights = opt_vol.x
    min_vol_ret, min_vol_vol, min_vol_val = calculate_portfolio_metrics(min_vol_weights, mean_returns, cov_matrix, risk_free_rate)
    
    # 4. Monte Carlo Simulation for Efficient Frontier
    num_portfolios = 1000 # Lower to keep it fast, but enough for visual density
    mc_results = []
    
    # Add exact optimal portfolios to the results first
    mc_results.append({
        "return": float(max_sharpe_ret),
        "volatility": float(max_sharpe_vol),
        "sharpe": float(max_sharpe_val),
        "weights": max_sharpe_weights.tolist(),
        "is_optimal_sharpe": True,
        "is_optimal_vol": False
    })
    mc_results.append({
        "return": float(min_vol_ret),
        "volatility": float(min_vol_vol),
        "sharpe": float(min_vol_val),
        "weights": min_vol_weights.tolist(),
        "is_optimal_sharpe": False,
        "is_optimal_vol": True
    })
    
    # Generate random portfolios
    for _ in range(num_portfolios):
        w = np.random.random(num_assets)
        w /= np.sum(w) # Normalize
        
        p_ret, p_vol, p_sharpe = calculate_portfolio_metrics(w, mean_returns, cov_matrix, risk_free_rate)
        
        mc_results.append({
            "return": float(p_ret),
            "volatility": float(p_vol),
            "sharpe": float(p_sharpe),
            "weights": w.tolist(),
            "is_optimal_sharpe": False,
            "is_optimal_vol": False
        })
        
    return {
        "tickers": tickers,
        "max_sharpe": {
            "weights": max_sharpe_weights.tolist(),
            "return": float(max_sharpe_ret),
            "volatility": float(max_sharpe_vol),
            "sharpe": float(max_sharpe_val)
        },
        "min_vol": {
            "weights": min_vol_weights.tolist(),
            "return": float(min_vol_ret),
            "volatility": float(min_vol_vol),
            "sharpe": float(min_vol_val)
        },
        "monte_carlo": mc_results
    }
