import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any
from .base_model import BaseModel
from sklearn.preprocessing import StandardScaler

# PyTorch import, with fallback if not installed/available
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

if HAS_TORCH:
    class LSTMNetwork(nn.Module):
        def __init__(self, input_dim: int, hidden_dim: int, num_layers: int, output_dim: int):
            super().__init__()
            self.hidden_dim = hidden_dim
            self.num_layers = num_layers
            
            self.lstm = nn.LSTM(
                input_size=input_dim,
                hidden_size=hidden_dim,
                num_layers=num_layers,
                batch_first=True,
                dropout=0.2 if num_layers > 1 else 0.0
            )
            
            # Dense output layer to map hidden state to forecast horizon
            self.fc = nn.Sequential(
                nn.Linear(hidden_dim, 32),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(32, output_dim)
            )

        def forward(self, x):
            # Initialize hidden and cell states
            h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
            c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
            
            # Forward pass through LSTM
            out, _ = self.lstm(x, (h0, c0))
            
            # Decode the hidden state of the last time step
            out = self.fc(out[:, -1, :])
            return out
else:
    class LSTMNetwork:
        pass

class LSTMPredictor(BaseModel):
    def __init__(self, hidden_dim: int = 64, num_layers: int = 2, epochs: int = 30, batch_size: int = 32, lr: float = 0.001):
        super().__init__(name="LSTM_DeepLearning")
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.epochs = epochs
        self.batch_size = batch_size
        self.lr = lr
        
        self.scaler_x = StandardScaler()
        self.scaler_y = StandardScaler()
        self.feature_names = []
        self.model = None
        self.device = "cuda" if HAS_TORCH and torch.cuda.is_available() else "cpu"

    def prepare_data(self, df: pd.DataFrame, target_col: str = 'Close', window_size: int = 30, horizon: int = 7) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """
        Prepares 3D sequential features [samples, window_size, features] for the LSTM model.
        """
        required_cols = ['Close', 'Volume', 'SMA_20', 'SMA_50', 'EMA_12', 'EMA_26', 'RSI', 'MACD', 'MACD_Signal', 'BB_Upper', 'BB_Lower']
        features_to_use = [col for col in required_cols if col in df.columns]
        self.feature_names = features_to_use.copy()
        
        X_list = []
        y_list = []
        
        total_len = len(df)
        for i in range(window_size, total_len - horizon + 1):
            # Extract historical window
            feature_window = df.iloc[i - window_size:i][features_to_use].values
            X_list.append(feature_window)
            
            # Extract target window
            target_window = df.iloc[i:i + horizon][target_col].values
            y_list.append(target_window)
            
        X = np.array(X_list) # Shape: (samples, window_size, features)
        y = np.array(y_list) # Shape: (samples, horizon)
        
        return X, y, self.feature_names

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """
        Trains the PyTorch LSTM model.
        """
        if not HAS_TORCH:
            # Fallback if PyTorch isn't installed
            print("PyTorch is not available. Falling back to Scikit-Learn MLP Regressor internally.")
            from sklearn.neural_network import MLPRegressor
            self.model = MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=100, random_state=42)
            
            # Reshape X to 2D for MLP [samples, window_size * features]
            self.samples, self.w_size, self.f_dim = X.shape
            X_2d = X.reshape(self.samples, -1)
            
            X_scaled = self.scaler_x.fit_transform(X_2d)
            y_scaled = self.scaler_y.fit_transform(y)
            self.model.fit(X_scaled, y_scaled)
            self.is_trained = True
            return
            
        # Get shape info
        samples, window_size, num_features = X.shape
        horizon = y.shape[1]
        
        # Scale inputs (2D fit_transform then reshape back to 3D)
        X_2d = X.reshape(-1, num_features)
        X_scaled_2d = self.scaler_x.fit_transform(X_2d)
        X_scaled = X_scaled_2d.reshape(samples, window_size, num_features)
        
        # Scale targets
        y_scaled = self.scaler_y.fit_transform(y)
        
        # Convert to PyTorch tensors
        X_tensor = torch.tensor(X_scaled, dtype=torch.float32)
        y_tensor = torch.tensor(y_scaled, dtype=torch.float32)
        
        # Create PyTorch datasets
        dataset = TensorDataset(X_tensor, y_tensor)
        dataloader = DataLoader(dataset, batch_size=self.batch_size, shuffle=True)
        
        # Initialize network
        self.model = LSTMNetwork(
            input_dim=num_features,
            hidden_dim=self.hidden_dim,
            num_layers=self.num_layers,
            output_dim=horizon
        ).to(self.device)
        
        criterion = nn.MSELoss()
        optimizer = optim.Adam(self.model.parameters(), lr=self.lr)
        
        self.model.train()
        for epoch in range(self.epochs):
            epoch_loss = 0.0
            for batch_x, batch_y in dataloader:
                batch_x = batch_x.to(self.device)
                batch_y = batch_y.to(self.device)
                
                optimizer.zero_grad()
                outputs = self.model(batch_x)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                
                epoch_loss += loss.item() * batch_x.size(0)
            
            # Print epoch loss occasionally
            # avg_loss = epoch_loss / len(dataset)
            # print(f"Epoch {epoch+1}/{self.epochs} - Loss: {avg_loss:.4f}")
            
        self.is_trained = True

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Runs predictions on input X (shape: [samples, window_size, features])
        """
        if not self.is_trained:
            raise RuntimeError("Model is not trained yet.")
            
        samples, window_size, num_features = X.shape
        
        if not HAS_TORCH:
            # Fallback evaluation
            X_2d = X.reshape(samples, -1)
            X_scaled = self.scaler_x.transform(X_2d)
            y_pred_scaled = self.model.predict(X_scaled)
            return self.scaler_y.inverse_transform(y_pred_scaled)
            
        # Scale X
        X_2d = X.reshape(-1, num_features)
        X_scaled_2d = self.scaler_x.transform(X_2d)
        X_scaled = X_scaled_2d.reshape(samples, window_size, num_features)
        
        # Predict
        self.model.eval()
        with torch.no_grad():
            X_tensor = torch.tensor(X_scaled, dtype=torch.float32).to(self.device)
            outputs_scaled = self.model(X_tensor).cpu().numpy()
            
        y_pred = self.scaler_y.inverse_transform(outputs_scaled)
        return y_pred
