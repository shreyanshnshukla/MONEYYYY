import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any

class BaseModel:
    def __init__(self, name: str):
        self.name = name
        self.is_trained = False
        self.metrics = {}

    def prepare_data(self, df: pd.DataFrame, target_col: str = 'Close', window_size: int = 30, horizon: int = 7) -> Tuple[np.ndarray, np.ndarray, List[str], Any]:
        """
        Prepares sequential features and targets for machine learning models.
        Returns:
            X: Input feature array
            y: Target values
            feature_names: Names of features used
            scaler: Scaler object (min-max or standard) if scaling was done, or None
        """
        raise NotImplementedError("Each model must implement prepare_data method.")

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """
        Fits the model on training data.
        """
        raise NotImplementedError("Each model must implement fit method.")

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predicts future values.
        """
        raise NotImplementedError("Each model must implement predict method.")

    def evaluate(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """
        Evaluates predictions against true values and stores standard regression metrics.
        """
        # Ensure flat arrays
        y_true_flat = y_true.flatten()
        y_pred_flat = y_pred.flatten()
        
        # Calculate Metrics
        mae = np.mean(np.abs(y_true_flat - y_pred_flat))
        rmse = np.sqrt(np.mean((y_true_flat - y_pred_flat) ** 2))
        mape = np.mean(np.abs((y_true_flat - y_pred_flat) / (y_true_flat + 1e-8))) * 100
        
        # R2 Score calculation
        y_mean = np.mean(y_true_flat)
        ss_res = np.sum((y_true_flat - y_pred_flat) ** 2)
        ss_tot = np.sum((y_true_flat - y_mean) ** 2)
        r2 = 1.0 - (ss_res / (ss_tot + 1e-8))
        
        self.metrics = {
            "mae": float(mae),
            "rmse": float(rmse),
            "mape": float(mape),
            "r2": float(r2)
        }
        return self.metrics
