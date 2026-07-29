import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from typing import Tuple, List, Dict, Any
from .base_model import BaseModel

class MLPredictor(BaseModel):
    def __init__(self, model_type: str = "random_forest", n_estimators: int = 100, max_depth: int = 10):
        super().__init__(name=f"ML_{model_type}")
        self.model_type = model_type
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.scaler_x = StandardScaler()
        self.scaler_y = StandardScaler()
        self.feature_names = []
        
        # Initialize model
        if model_type == "random_forest":
            self.model = RandomForestRegressor(n_estimators=self.n_estimators, max_depth=self.max_depth, random_state=42)
        elif model_type == "gradient_boosting":
            # GradientBoostingRegressor doesn't support multi-output directly, so we'll wrap it or use it for single-step.
            # To support multi-output cleanly, we can use a MultiOutputRegressor wrapper.
            from sklearn.multioutput import MultiOutputRegressor
            self.model = MultiOutputRegressor(GradientBoostingRegressor(n_estimators=self.n_estimators, max_depth=min(5, self.max_depth), random_state=42))
        elif model_type == "ridge":
            self.model = Ridge(alpha=1.0)
        else:
            raise ValueError(f"Unknown model type: {model_type}")

    def prepare_data(self, df: pd.DataFrame, target_col: str = 'Close', window_size: int = 30, horizon: int = 7) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """
        Creates features and multi-step targets.
        Features include lagged Close prices and technical indicators of the current day.
        """
        # Ensure indicators are present in DataFrame
        required_cols = ['Close', 'Volume', 'SMA_20', 'SMA_50', 'EMA_12', 'EMA_26', 'RSI', 'MACD', 'MACD_Signal', 'BB_Upper', 'BB_Lower']
        features_to_use = [col for col in required_cols if col in df.columns]
        self.feature_names = features_to_use.copy()
        
        # Add lagged versions of the features for the past 'window_size' steps
        X_list = []
        y_list = []
        
        # We need enough data to look back window_size days and look forward horizon days
        total_len = len(df)
        for i in range(window_size, total_len - horizon + 1):
            # Extract features for the past 'window_size' days
            # Flat feature vector
            feature_window = df.iloc[i - window_size:i][features_to_use].values
            X_list.append(feature_window.flatten())
            
            # Extract targets for the next 'horizon' days
            target_window = df.iloc[i:i + horizon][target_col].values
            y_list.append(target_window)
            
        X = np.array(X_list)
        y = np.array(y_list)
        
        # Create descriptive feature names for visualization/interpretability
        expanded_feature_names = []
        for lag in range(window_size - 1, -1, -1):
            for col in features_to_use:
                expanded_feature_names.append(f"{col}_lag_{lag}")
        self.expanded_feature_names = expanded_feature_names
        
        return X, y, self.expanded_feature_names

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """
        Fits the model. Scales features and target internally.
        """
        if len(X) == 0 or len(y) == 0:
            raise ValueError("Training data is empty.")
            
        X_scaled = self.scaler_x.fit_transform(X)
        y_scaled = self.scaler_y.fit_transform(y)
        
        self.model.fit(X_scaled, y_scaled)
        self.is_trained = True

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predicts future values. X must match the shape of training features.
        """
        if not self.is_trained:
            raise RuntimeError("Model is not trained yet.")
            
        X_scaled = self.scaler_x.transform(X)
        y_pred_scaled = self.model.predict(X_scaled)
        
        # Handle 1D outputs if single prediction sample is passed or model returns flat
        if len(y_pred_scaled.shape) == 1:
            y_pred_scaled = y_pred_scaled.reshape(1, -1)
            
        y_pred = self.scaler_y.inverse_transform(y_pred_scaled)
        return y_pred

    def get_feature_importances(self) -> Dict[str, float]:
        """
        Returns feature importances for tree-based models, aggregated by base indicator.
        """
        if not self.is_trained:
            return {}
            
        importances = None
        if self.model_type == "random_forest":
            importances = self.model.feature_importances_
        elif self.model_type == "gradient_boosting":
            # For MultiOutputRegressor, average importance across estimators
            importances = np.mean([est.feature_importances_ for est in self.model.estimators_], axis=0)
        
        if importances is None:
            return {}
            
        # Aggregate feature importances across all lags to see which indicators matter most
        indicator_importance = {}
        num_base_features = len(self.feature_names)
        
        for idx, imp in enumerate(importances):
            base_col_idx = idx % num_base_features
            base_col_name = self.feature_names[base_col_idx]
            indicator_importance[base_col_name] = indicator_importance.get(base_col_name, 0.0) + imp
            
        # Normalize
        total_imp = sum(indicator_importance.values())
        if total_imp > 0:
            for k in indicator_importance:
                indicator_importance[k] = float(indicator_importance[k] / total_imp)
                
        return dict(sorted(indicator_importance.items(), key=lambda x: x[1], reverse=True))
