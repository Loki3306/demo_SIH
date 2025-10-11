import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import os
from django.conf import settings
from typing import Optional, Tuple


class AnomalyDetectionModel:
    """
    Isolation Forest model for anomaly detection in location tracking data
    """
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.model_path = os.path.join(settings.BASE_DIR, 'location_tracker', 'models', 'isolation_forest.joblib')
        self.scaler_path = os.path.join(settings.BASE_DIR, 'location_tracker', 'models', 'scaler.joblib')
        self._ensure_model_directory()
        
    def _ensure_model_directory(self):
        """Ensure the models directo Xry exists"""
        model_dir = os.path.dirname(self.model_path)
        os.makedirs(model_dir, exist_ok=True)
    
    def create_synthetic_data(self, n_samples: int = 1000) -> np.ndarray:
        """
        Create synthetic normal location tracking data for model training
        Features: [speed_mean, speed_std, speed_max, speed_min, bearing_change_mean, 
                  bearing_change_std, bearing_change_max, accel_mean, accel_std, 
                  accel_max, accel_min, n_points, current_speed, total_accel_magnitude]
        """
        np.random.seed(42)  # For reproducibility
        
        # Generate normal behavior patterns
        data = []
        
        for _ in range(n_samples):
            # Normal walking/driving speeds (1-15 m/s)
            speed_mean = np.random.normal(5, 3)
            speed_mean = max(0.5, min(speed_mean, 15))  # Clamp to reasonable range
            
            speed_std = np.random.exponential(1) + 0.1
            speed_max = speed_mean + np.random.exponential(2)
            speed_min = max(0, speed_mean - np.random.exponential(1))
            
            # Normal bearing changes (small direction changes)
            bearing_change_mean = np.random.exponential(10)  # Small changes are normal
            bearing_change_std = np.random.exponential(5) + 1
            bearing_change_max = bearing_change_mean + np.random.exponential(20)
            
            # Normal accelerations (small changes in speed)
            accel_mean = np.random.normal(0, 0.5)  # Around 0 for steady movement
            accel_std = np.random.exponential(0.5) + 0.1
            accel_max = np.random.normal(2, 1)  # Normal acceleration
            accel_min = np.random.normal(-2, 1)  # Normal deceleration
            
            # Number of points in window (usually full window)
            n_points = np.random.randint(15, 31)  # Between 15-30 points
            
            # Current speed similar to mean speed
            current_speed = np.random.normal(speed_mean, speed_std/2)
            current_speed = max(0, current_speed)
            
            # Total acceleration magnitude
            total_accel_magnitude = np.random.exponential(5)
            
            sample = [
                speed_mean, speed_std, speed_max, speed_min,
                bearing_change_mean, bearing_change_std, bearing_change_max,
                accel_mean, accel_std, accel_max, accel_min,
                n_points, current_speed, total_accel_magnitude
            ]
            
            data.append(sample)
        
        return np.array(data)
    
    def train_model(self, contamination: float = 0.1):
        """
        Train the Isolation Forest model on synthetic normal data
        """
        print("Training Isolation Forest model...")
        
        # Generate synthetic training data
        training_data = self.create_synthetic_data(1000)
        
        # Initialize and fit scaler
        self.scaler = StandardScaler()
        scaled_data = self.scaler.fit_transform(training_data)
        
        # Initialize and train Isolation Forest
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        
        self.model.fit(scaled_data)
        
        # Save model and scaler
        self.save_model()
        
        print(f"Model trained and saved to {self.model_path}")
        print(f"Scaler saved to {self.scaler_path}")
    
    def load_model(self) -> bool:
        """
        Load the trained model and scaler from disk
        Returns True if successful, False otherwise
        """
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                print("Model and scaler loaded successfully")
                return True
            else:
                print("Model files not found, training new model...")
                self.train_model()
                return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def save_model(self):
        """Save the trained model and scaler to disk"""
        if self.model is not None and self.scaler is not None:
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)
    
    def predict_anomaly(self, features: np.ndarray) -> Tuple[bool, float]:
        """
        Predict if the given features represent anomalous behavior
        Returns (is_anomaly, anomaly_score)
        """
        if self.model is None or self.scaler is None:
            if not self.load_model():
                # Fallback to rule-based detection
                return False, 0.0
        
        try:
            # Scale features
            scaled_features = self.scaler.transform(features)
            
            # Get prediction and anomaly score
            prediction = self.model.predict(scaled_features)[0]  # -1 for anomaly, 1 for normal
            anomaly_score = self.model.decision_function(scaled_features)[0]
            
            is_anomaly = prediction == -1
            
            return is_anomaly, anomaly_score
            
        except Exception as e:
            print(f"Error in anomaly prediction: {e}")
            return False, 0.0


# Global model instance
anomaly_model = AnomalyDetectionModel()