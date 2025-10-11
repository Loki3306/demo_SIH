import math
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in meters
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000  # Radius of earth in meters
    return c * r


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the bearing between two points
    Returns bearing in degrees
    """
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    
    bearing = math.atan2(y, x)
    bearing = math.degrees(bearing)
    bearing = (bearing + 360) % 360  # Normalize to 0-360
    
    return bearing


def bearing_difference(bearing1: float, bearing2: float) -> float:
    """
    Calculate the absolute difference between two bearings
    Returns difference in degrees (0-180)
    """
    diff = abs(bearing2 - bearing1)
    if diff > 180:
        diff = 360 - diff
    return diff


class LocationFeatureEngineer:
    """
    Feature engineering for location tracking data
    """
    
    def __init__(self):
        pass
    
    def extract_features(self, location_window: List[Dict[str, Any]]) -> Optional[np.ndarray]:
        """
        Extract features from a sliding window of location data
        Returns feature vector or None if insufficient data
        """
        if len(location_window) < 2:
            return None
        
        # Sort by timestamp to ensure chronological order
        sorted_window = sorted(location_window, key=lambda x: x['timestamp'])
        
        features = []
        speeds = []
        bearings = []
        
        # Calculate point-to-point features
        for i in range(1, len(sorted_window)):
            prev_point = sorted_window[i-1]
            curr_point = sorted_window[i]
            
            # Parse timestamps
            try:
                prev_time = datetime.fromisoformat(prev_point['timestamp'].replace('Z', '+00:00'))
                curr_time = datetime.fromisoformat(curr_point['timestamp'].replace('Z', '+00:00'))
                time_diff = (curr_time - prev_time).total_seconds()
                
                if time_diff <= 0:
                    continue
                    
            except (ValueError, KeyError):
                continue
            
            # Calculate distance and speed
            distance = haversine_distance(
                float(prev_point['latitude']), float(prev_point['longitude']),
                float(curr_point['latitude']), float(curr_point['longitude'])
            )
            
            speed = distance / time_diff if time_diff > 0 else 0  # m/s
            speeds.append(speed)
            
            # Calculate bearing
            bearing = calculate_bearing(
                float(prev_point['latitude']), float(prev_point['longitude']),
                float(curr_point['latitude']), float(curr_point['longitude'])
            )
            bearings.append(bearing)
        
        if not speeds:
            return None
        
        # Calculate bearing changes
        bearing_changes = []
        for i in range(1, len(bearings)):
            bearing_change = bearing_difference(bearings[i-1], bearings[i])
            bearing_changes.append(bearing_change)
        
        # Calculate accelerations
        accelerations = []
        for i in range(1, len(speeds)):
            # Estimate time difference (assuming roughly equal intervals)
            time_diff = 10.0  # seconds (approximate)
            acceleration = (speeds[i] - speeds[i-1]) / time_diff
            accelerations.append(acceleration)
        
        # Aggregate features
        features.extend([
            # Speed statistics
            np.mean(speeds) if speeds else 0,
            np.std(speeds) if len(speeds) > 1 else 0,
            np.max(speeds) if speeds else 0,
            np.min(speeds) if speeds else 0,
            
            # Bearing change statistics
            np.mean(bearing_changes) if bearing_changes else 0,
            np.std(bearing_changes) if len(bearing_changes) > 1 else 0,
            np.max(bearing_changes) if bearing_changes else 0,
            
            # Acceleration statistics
            np.mean(accelerations) if accelerations else 0,
            np.std(accelerations) if len(accelerations) > 1 else 0,
            np.max(accelerations) if accelerations else 0,
            np.min(accelerations) if accelerations else 0,
            
            # Additional features
            len(sorted_window),  # Number of points in window
            speeds[-1] if speeds else 0,  # Current speed
            np.sum([abs(acc) for acc in accelerations]) if accelerations else 0,  # Total acceleration magnitude
        ])
        
        return np.array(features).reshape(1, -1)
    
    def is_anomalous_behavior(self, features: np.ndarray, threshold: float = -0.1) -> Tuple[bool, float]:
        """
        Determine if behavior is anomalous based on engineered features
        Returns (is_anomaly, confidence_score)
        """
        if features is None:
            return False, 0.0
        
        # Simple rule-based anomaly detection as fallback
        # This can be replaced with the trained Isolation Forest model
        
        speed_mean = features[0, 0]
        speed_max = features[0, 2]
        bearing_change_max = features[0, 6]
        acceleration_max = features[0, 9]
        
        anomaly_indicators = 0
        
        # High speed anomaly (> 50 m/s ≈ 180 km/h)
        if speed_max > 50:
            anomaly_indicators += 1
        
        # Sudden direction change (> 120 degrees)
        if bearing_change_max > 120:
            anomaly_indicators += 1
        
        # High acceleration/deceleration (> 10 m/s²)
        if abs(acceleration_max) > 10:
            anomaly_indicators += 1
        
        # Very low speed but high bearing changes (erratic movement)
        if speed_mean < 1 and bearing_change_max > 90:
            anomaly_indicators += 1
        
        is_anomaly = anomaly_indicators >= 2
        confidence = anomaly_indicators / 4.0
        
        return is_anomaly, confidence


# Global feature engineer instance
feature_engineer = LocationFeatureEngineer()