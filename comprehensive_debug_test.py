#!/usr/bin/env python3
"""
Comprehensive test to identify where the safety score issue is occurring
"""

import requests
import json
from datetime import datetime

# Configuration
DJANGO_BASE_URL = "http://127.0.0.1:8000/api/v1"
EXPRESS_BASE_URL = "http://localhost:8080/api/bridge/aiml"
TEST_USER_ID = "test_anomaly_user"

def log(message):
    """Print timestamped log"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def test_full_flow():
    """Test the complete flow to identify where the issue occurs"""
    print("🔍 Comprehensive Safety Score Debugging")
    print("=" * 60)
    
    # Step 1: Reset anomalies first
    log("Step 1: Resetting anomalies to ensure clean state...")
    try:
        reset_url = f"{DJANGO_BASE_URL}/reset_anomalies/"
        response = requests.post(reset_url, json={"user_id": TEST_USER_ID}, timeout=10)
        if response.status_code == 200:
            log(f"✅ Reset successful: {response.json().get('message')}")
        else:
            log(f"❌ Reset failed: {response.status_code} - {response.text}")
    except Exception as e:
        log(f"❌ Reset error: {e}")
    
    # Step 2: Check safety score after reset
    log("Step 2: Checking safety score after reset...")
    score, factors = get_safety_score_via_express()
    if score is not None:
        log(f"📊 Express Bridge Score: {score}")
        log(f"📋 Factors: {factors}")
        
        if score == 100:
            log("✅ GOOD: Score is 100 after reset")
        elif score == 0:
            log("🚨 ISSUE: Score is still 0 after reset")
        else:
            log(f"⚠️  PARTIAL: Score is {score} after reset")
    
    # Step 3: Check Django direct
    log("Step 3: Checking Django safety score endpoint directly...")
    django_score = get_safety_score_django_direct()
    if django_score is not None:
        log(f"📊 Django Direct Score: {django_score.get('score')}")
        log(f"📋 Django Direct Factors: {django_score.get('factors')}")
    
    # Step 4: Start journey
    log("Step 4: Starting journey...")
    if start_journey():
        log("✅ Journey started")
    else:
        log("❌ Journey start failed")
        return
    
    # Step 5: Check score after journey start
    log("Step 5: Checking score after journey start...")
    score, factors = get_safety_score_via_express()
    if score is not None:
        log(f"📊 Score after journey start: {score}")
        log(f"📋 Factors: {factors}")
    
    # Step 6: Send normal location
    log("Step 6: Sending normal Mumbai location...")
    send_location(19.0760, 72.8777, "Normal Mumbai location")
    
    # Step 7: Check score after normal location
    log("Step 7: Checking score after normal location...")
    score, factors = get_safety_score_via_express()
    if score is not None:
        log(f"📊 Score after normal location: {score}")
        log(f"📋 Factors: {factors}")
    
    # Step 8: Send anomalous location
    log("Step 8: Sending anomalous location (Delhi jump)...")
    send_location(28.6139, 77.2090, "Anomalous Delhi jump")
    
    # Step 9: Check score after anomaly
    log("Step 9: Checking score after anomaly...")
    import time
    time.sleep(2)  # Wait for processing
    score, factors = get_safety_score_via_express()
    if score is not None:
        log(f"📊 Score after anomaly: {score}")
        log(f"📋 Factors: {factors}")
        
        if score < 100:
            log("✅ GOOD: Score decreased after anomaly")
        else:
            log("🚨 ISSUE: Score didn't decrease after anomaly")
    
    # Step 10: End journey (should reset to 100)
    log("Step 10: Ending journey (should reset score)...")
    if end_journey():
        log("✅ Journey ended")
    else:
        log("❌ Journey end failed")
        return
    
    # Step 11: Final score check
    log("Step 11: Final score check after journey end...")
    time.sleep(1)  # Wait for processing
    score, factors = get_safety_score_via_express()
    if score is not None:
        log(f"📊 Final Score: {score}")
        log(f"📋 Final Factors: {factors}")
        
        if score == 100:
            log("🎉 SUCCESS: Score reset to 100 after journey end!")
        elif score == 0:
            log("🚨 ISSUE: Score is still 0 after journey end")
        else:
            log(f"⚠️  PARTIAL: Score is {score} instead of 100")

def get_safety_score_via_express():
    """Get safety score via Express bridge"""
    try:
        url = f"{EXPRESS_BASE_URL}/safetyScore"
        params = {"user_id": TEST_USER_ID}
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get("score"), data.get("factors", [])
        else:
            log(f"❌ Express bridge failed: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        log(f"❌ Express bridge error: {e}")
        return None, None

def get_safety_score_django_direct():
    """Get safety score directly from Django"""
    try:
        url = f"{DJANGO_BASE_URL}/safety_score/"
        params = {"user_id": TEST_USER_ID}
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            log(f"❌ Django direct failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        log(f"❌ Django direct error: {e}")
        return None

def start_journey():
    """Start journey"""
    try:
        url = f"{DJANGO_BASE_URL}/start_journey/"
        data = {"user_id": TEST_USER_ID}
        response = requests.post(url, json=data, timeout=10)
        return response.status_code == 200
    except:
        return False

def end_journey():
    """End journey"""
    try:
        url = f"{DJANGO_BASE_URL}/end_journey/"
        data = {"user_id": TEST_USER_ID}
        response = requests.post(url, json=data, timeout=10)
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get('safety_score_reset'):
                anomalies_cleared = response_data.get('anomalies_cleared', 0)
                log(f"   Safety score reset confirmed - {anomalies_cleared} anomalies cleared")
            return True
        return False
    except:
        return False

def send_location(lat, lng, description):
    """Send location"""
    try:
        url = f"{DJANGO_BASE_URL}/track_location/"
        data = {
            "user_id": TEST_USER_ID,
            "latitude": lat,
            "longitude": lng,
            "timestamp": datetime.now().isoformat() + "Z",
            "accuracy": 10,
            "speed": 5,
            "heading": 90
        }
        response = requests.post(url, json=data, timeout=10)
        if response.status_code == 202:
            response_data = response.json()
            if response_data.get("anomaly_detected"):
                log(f"   🚨 Anomaly detected: {description}")
            else:
                log(f"   🟢 Normal location: {description}")
        return response.status_code == 202
    except:
        return False

if __name__ == "__main__":
    test_full_flow()