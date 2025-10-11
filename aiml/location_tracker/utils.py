from datetime import datetime, timedelta
from django.utils import timezone
from .models import AnomalyAlert
import pytz

def calculate_safety_score(user):
    """
    Calculate a user's safety score based on various factors.
    
    Args:
        user: Django User object
        
    Returns:
        dict: {"score": int, "factors": list}
    """
    base_score = 100
    factors = []

    # 1. Anomaly Penalty: -15 points per anomaly in the last 24 hours
    one_day_ago = timezone.now() - timedelta(days=1)
    recent_anomalies = AnomalyAlert.objects.filter(user=user, timestamp__gte=one_day_ago).count()
    anomaly_penalty = recent_anomalies * 15
    if anomaly_penalty > 0:
        factors.append(f"Detected {recent_anomalies} recent movement anomalies.")

    # 2. Time of Day Penalty: -10 points between 10 PM and 5 AM IST
    ist = pytz.timezone('Asia/Kolkata')
    now_ist = datetime.now(ist)
    if now_ist.hour >= 22 or now_ist.hour < 5:
        time_penalty = 10
        factors.append("Traveling during late night hours.")
    else:
        time_penalty = 0
        
    # Calculate final score
    final_score = base_score - anomaly_penalty - time_penalty
    final_score = max(0, min(100, final_score))  # Clamp score between 0 and 100

    return {"score": final_score, "factors": factors}


def calculate_safety_score_by_user_id(user_id):
    """
    Calculate safety score by user_id (for users created dynamically in tracking system).
    
    Args:
        user_id: String user ID used in location tracking
        
    Returns:
        dict: {"score": int, "factors": list}
    """
    from django.contrib.auth.models import User
    
    base_score = 100
    factors = []
    
    try:
        # Try to find user by username pattern used in TrackLocationView
        user = User.objects.get(username=f'user_{user_id}')
        
        # 1. Anomaly Penalty: -15 points per anomaly in the last 24 hours
        one_day_ago = timezone.now() - timedelta(days=1)
        recent_anomalies = AnomalyAlert.objects.filter(user=user, timestamp__gte=one_day_ago).count()
        anomaly_penalty = recent_anomalies * 15
        if anomaly_penalty > 0:
            factors.append(f"Detected {recent_anomalies} recent movement anomalies")

        # 2. Time of Day Penalty: -10 points between 10 PM and 5 AM IST
        ist = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist)
        if now_ist.hour >= 22 or now_ist.hour < 5:
            time_penalty = 10
            factors.append("Traveling during late night hours")
        else:
            time_penalty = 0
            
        # 3. Journey Status Bonus: +5 points if currently tracking
        # This could be enhanced to check Redis for active journey
        
        # Calculate final score
        final_score = base_score - anomaly_penalty - time_penalty
        final_score = max(0, min(100, final_score))  # Clamp score between 0 and 100
        
    except User.DoesNotExist:
        # User hasn't started tracking yet, return base score
        final_score = base_score
        factors.append("No tracking history available")

    return {"score": final_score, "factors": factors}