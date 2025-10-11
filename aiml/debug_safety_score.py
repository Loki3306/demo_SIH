#!/usr/bin/env python3
"""
Debug script to investigate safety score calculation issues
"""

import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yr.settings')
django.setup()

from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from location_tracker.models import AnomalyAlert
import pytz

def debug_safety_score_calculation(user_id):
    """
    Debug version of safety score calculation with detailed logging
    """
    print(f"🔍 Debug Safety Score Calculation for user_id: {user_id}")
    print("=" * 60)
    
    base_score = 100
    factors = []
    
    try:
        # Try to find user by username pattern used in TrackLocationView
        username = f'user_{user_id}'
        print(f"Looking for user with username: {username}")
        
        user = User.objects.get(username=username)
        print(f"✅ Found user: {user} (ID: {user.id})")
        
        # 1. Check all anomalies for this user (regardless of time)
        all_anomalies = AnomalyAlert.objects.filter(user=user)
        print(f"📊 Total anomalies for this user: {all_anomalies.count()}")
        
        if all_anomalies.exists():
            print("📋 All anomalies:")
            for anomaly in all_anomalies:
                print(f"   - {anomaly.timestamp}: Score {anomaly.anomaly_score} at ({anomaly.latitude}, {anomaly.longitude})")
        
        # 2. Check recent anomalies (last 24 hours)
        one_day_ago = timezone.now() - timedelta(days=1)
        print(f"⏰ Checking anomalies since: {one_day_ago}")
        
        recent_anomalies = AnomalyAlert.objects.filter(user=user, timestamp__gte=one_day_ago)
        recent_count = recent_anomalies.count()
        print(f"🚨 Recent anomalies (last 24h): {recent_count}")
        
        if recent_anomalies.exists():
            print("📋 Recent anomalies:")
            for anomaly in recent_anomalies:
                print(f"   - {anomaly.timestamp}: Score {anomaly.anomaly_score}")
        
        anomaly_penalty = recent_count * 15
        print(f"📉 Anomaly penalty: {recent_count} × 15 = {anomaly_penalty} points")
        
        if anomaly_penalty > 0:
            factors.append(f"Detected {recent_count} recent movement anomalies")

        # 3. Time of Day Penalty
        ist = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist)
        current_hour = now_ist.hour
        print(f"🕐 Current time in IST: {now_ist.strftime('%H:%M:%S')} (Hour: {current_hour})")
        
        if current_hour >= 22 or current_hour < 5:
            time_penalty = 10
            factors.append("Traveling during late night hours")
            print(f"🌙 Late night penalty: {time_penalty} points")
        else:
            time_penalty = 0
            print(f"☀️ Daytime travel: no penalty")
            
        # 4. Calculate final score
        print(f"\n🧮 Score Calculation:")
        print(f"   Base score: {base_score}")
        print(f"   Anomaly penalty: -{anomaly_penalty}")
        print(f"   Time penalty: -{time_penalty}")
        
        final_score = base_score - anomaly_penalty - time_penalty
        print(f"   Calculated: {base_score} - {anomaly_penalty} - {time_penalty} = {final_score}")
        
        final_score = max(0, min(100, final_score))  # Clamp score between 0 and 100
        print(f"   Final (clamped): {final_score}")
        
    except User.DoesNotExist:
        print(f"❌ User with username 'user_{user_id}' not found")
        final_score = base_score
        factors.append("No tracking history available")

    print(f"\n🎯 Final Result:")
    print(f"   Score: {final_score}")
    print(f"   Factors: {factors}")
    
    return {"score": final_score, "factors": factors}

if __name__ == "__main__":
    # Test with the anomaly detection test user
    test_user_id = "test_anomaly_user"
    result = debug_safety_score_calculation(test_user_id)
    
    print(f"\n📊 Summary:")
    print(f"Safety Score: {result['score']}")
    print(f"Factors: {result['factors']}")