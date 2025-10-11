import redis
import json
from django.conf import settings
from typing import List, Dict, Any


class RedisClient:
    def __init__(self):
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True
        )
    
    def start_journey(self, user_id: int) -> bool:
        """Initialize a user's journey session in Redis"""
        key = f"journey:{user_id}"
        location_key = f"location:{user_id}"
        
        # Set journey session
        self.client.set(key, json.dumps({
            'status': 'active',
            'start_time': str(json.dumps(None)),  # Will be set on first location
        }))
        
        # Clear any existing location history
        self.client.delete(location_key)
        
        return True
    
    def end_journey(self, user_id: int) -> bool:
        """Remove user's journey session from Redis"""
        journey_key = f"journey:{user_id}"
        location_key = f"location:{user_id}"
        
        # Remove session data
        self.client.delete(journey_key)
        self.client.delete(location_key)
        
        return True
    
    def add_location_point(self, user_id: int, location_data: Dict[str, Any]) -> List[Dict]:
        """Add a location point to the sliding window and return current window"""
        location_key = f"location:{user_id}"
        
        # Add new point to the right of the list
        self.client.rpush(location_key, json.dumps(location_data))
        
        # Trim to maintain sliding window of 30 points
        self.client.ltrim(location_key, -30, -1)
        
        # Get current window
        window_data = self.client.lrange(location_key, 0, -1)
        return [json.loads(point) for point in window_data]
    
    def get_location_window(self, user_id: int) -> List[Dict]:
        """Get current location window for user"""
        location_key = f"location:{user_id}"
        window_data = self.client.lrange(location_key, 0, -1)
        return [json.loads(point) for point in window_data]
    
    def is_journey_active(self, user_id: int) -> bool:
        """Check if user has an active journey"""
        journey_key = f"journey:{user_id}"
        return self.client.exists(journey_key)
    
    def push_admin_alert(self, alert_data: Dict[str, Any]) -> bool:
        """Push alert to admin channel in Redis"""
        admin_channel = "admin_alerts"
        self.client.publish(admin_channel, json.dumps(alert_data))
        return True


# Global Redis client instance
redis_client = RedisClient()