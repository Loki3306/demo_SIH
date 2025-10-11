#!/usr/bin/env python3
"""
Simple test to verify the reset endpoint works correctly
"""

import requests
import json

# Configuration
DJANGO_BASE_URL = "http://127.0.0.1:8000/api/v1"
TEST_USER_ID = "test_anomaly_user"

def test_reset_endpoint():
    """Test the reset anomalies endpoint"""
    print("🧪 Testing Reset Anomalies Endpoint")
    print("=" * 40)
    
    url = f"{DJANGO_BASE_URL}/reset_anomalies/"
    payload = {"user_id": TEST_USER_ID}
    
    try:
        print(f"📡 Sending POST request to: {url}")
        print(f"📦 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=10)
        
        print(f"\n📋 Response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print(f"   ✅ Success!")
            response_data = response.json()
            print(f"   📄 Response Body: {json.dumps(response_data, indent=2)}")
        else:
            print(f"   ❌ Failed!")
            print(f"   📄 Response Text: {response.text}")
            
    except requests.RequestException as e:
        print(f"❌ Error connecting to endpoint: {e}")
        print("   Make sure Django server is running on port 8000")

if __name__ == "__main__":
    test_reset_endpoint()