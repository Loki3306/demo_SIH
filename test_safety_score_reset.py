#!/usr/bin/env python3
"""
Test script to verify safety score reset functionality when ending journey
"""

import requests
import json
from datetime import datetime

# Configuration
DJANGO_BASE_URL = "http://127.0.0.1:8000/api/v1"
EXPRESS_BASE_URL = "http://localhost:8080/api/bridge/aiml"
TEST_USER_ID = "safety_reset_test_user"

def get_timestamp():
    """Get formatted timestamp for logging"""
    return datetime.now().strftime("%H:%M:%S")

def log(message):
    """Print timestamped log message"""
    print(f"[{get_timestamp()}] {message}")

def get_safety_score():
    """Get current safety score via Express bridge"""
    try:
        url = f"{EXPRESS_BASE_URL}/safetyScore"
        params = {"user_id": TEST_USER_ID}
        
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            return data.get("score", 100), data.get("factors", [])
        else:
            log(f"❌ Failed to get safety score: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        log(f"❌ Error getting safety score: {e}")
        return None, None

def start_journey():
    """Start tracking journey"""
    try:
        url = f"{DJANGO_BASE_URL}/start_journey/"
        data = {"user_id": TEST_USER_ID}
        
        response = requests.post(url, json=data)
        if response.status_code == 200:
            log("✅ Journey started successfully")
            return True
        else:
            log(f"❌ Failed to start journey: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log(f"❌ Error starting journey: {e}")
        return False

def end_journey():
    """End tracking journey"""
    try:
        url = f"{DJANGO_BASE_URL}/end_journey/"
        data = {"user_id": TEST_USER_ID}
        
        response = requests.post(url, json=data)
        if response.status_code == 200:
            response_data = response.json()
            log("✅ Journey ended successfully")
            if response_data.get('safety_score_reset'):
                anomalies_cleared = response_data.get('anomalies_cleared', 0)
                log(f"✅ Safety score reset - {anomalies_cleared} anomalies cleared")
            return True
        else:
            log(f"❌ Failed to end journey: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log(f"❌ Error ending journey: {e}")
        return False

def send_anomalous_location():
    """Send an anomalous location to trigger low safety score"""
    try:
        url = f"{DJANGO_BASE_URL}/track_location/"
        # Send a location in Delhi (anomalous for Mumbai-based user)
        data = {
            "user_id": TEST_USER_ID,
            "latitude": 28.6139,  # Delhi coordinates
            "longitude": 77.2090,
            "timestamp": datetime.now().isoformat() + "Z",
            "accuracy": 10,
            "speed": 5,
            "heading": 90
        }
        
        response = requests.post(url, json=data)
        if response.status_code == 202:
            response_data = response.json()
            if response_data.get("anomaly_detected"):
                log(f"🚨 Anomalous location sent - Anomaly detected!")
            else:
                log(f"📍 Location sent (no anomaly detected)")
            return True
        else:
            log(f"❌ Failed to send location: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log(f"❌ Error sending location: {e}")
        return False

def test_safety_score_reset():
    """Test the complete safety score reset functionality"""
    print("🧪 Testing Safety Score Reset on Journey End")
    print("=" * 60)
    
    # Step 1: Start journey
    log("Step 1: Starting journey...")
    if not start_journey():
        return False
    
    # Step 2: Check initial safety score
    log("Step 2: Checking initial safety score...")
    score, factors = get_safety_score()
    if score is not None:
        log(f"📊 Initial Safety Score: {score}")
        log(f"📋 Factors: {factors}")
    
    # Step 3: Send anomalous location to reduce score
    log("Step 3: Sending anomalous location...")
    send_anomalous_location()
    
    # Step 4: Check safety score after anomaly
    log("Step 4: Checking safety score after anomaly...")
    import time
    time.sleep(2)  # Wait for processing
    score, factors = get_safety_score()
    if score is not None:
        log(f"📊 Safety Score After Anomaly: {score}")
        log(f"📋 Factors: {factors}")
    
    # Step 5: End journey (should reset score to 100)
    log("Step 5: Ending journey (should reset safety score)...")
    if not end_journey():
        return False
    
    # Step 6: Check safety score after journey end
    log("Step 6: Checking safety score after journey end...")
    time.sleep(1)  # Wait for processing
    score, factors = get_safety_score()
    if score is not None:
        log(f"📊 Final Safety Score: {score}")
        log(f"📋 Factors: {factors}")
        
        if score == 100:
            log("🎉 SUCCESS: Safety score successfully reset to 100!")
            return True
        else:
            log(f"❌ FAILED: Safety score is {score}, expected 100")
            return False
    
    return False

if __name__ == "__main__":
    success = test_safety_score_reset()
    if success:
        print("\n✅ Safety score reset test PASSED!")
    else:
        print("\n❌ Safety score reset test FAILED!")