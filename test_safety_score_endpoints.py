#!/usr/bin/env python3
"""
Quick test to check what the Express bridge endpoint is returning
"""

import requests
import json

EXPRESS_BASE_URL = "http://localhost:8080/api/bridge/aiml"
TEST_USER_ID = "test_anomaly_user"

def test_express_safety_score():
    """Test the Express bridge safety score endpoint"""
    print("🧪 Testing Express Bridge Safety Score Endpoint")
    print("=" * 50)
    
    url = f"{EXPRESS_BASE_URL}/safetyScore"
    params = {"user_id": TEST_USER_ID}
    
    print(f"📡 Request URL: {url}")
    print(f"📦 Parameters: {params}")
    
    try:
        response = requests.get(url, params=params, timeout=10)
        
        print(f"\n📋 Response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success!")
            print(f"   📄 Response Body:")
            print(json.dumps(data, indent=4))
            
            score = data.get("score")
            factors = data.get("factors", [])
            
            if score == 0:
                print(f"\n🚨 ISSUE FOUND: Score is 0")
                print(f"   Factors causing zero score: {factors}")
            elif score == 100:
                print(f"\n✅ GOOD: Score is 100 (expected after reset)")
            else:
                print(f"\n⚠️  PARTIAL: Score is {score}")
                
        else:
            print(f"   ❌ Failed!")
            print(f"   📄 Response Text: {response.text}")
            
    except requests.RequestException as e:
        print(f"❌ Error connecting to endpoint: {e}")
        return None
    
    return response.json() if response.status_code == 200 else None

def test_django_safety_score_direct():
    """Test the Django safety score endpoint directly"""
    print("\n🧪 Testing Django Safety Score Endpoint Directly")
    print("=" * 50)
    
    django_url = "http://127.0.0.1:8000/api/v1/safety_score"
    params = {"user_id": TEST_USER_ID}
    
    print(f"📡 Request URL: {django_url}")
    print(f"📦 Parameters: {params}")
    
    try:
        response = requests.get(django_url, params=params, timeout=10)
        
        print(f"\n📋 Response:")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success!")
            print(f"   📄 Response Body:")
            print(json.dumps(data, indent=4))
        else:
            print(f"   ❌ Failed!")
            print(f"   📄 Response Text: {response.text}")
            
    except requests.RequestException as e:
        print(f"❌ Error connecting to Django: {e}")
        print("   Make sure Django server is running on port 8000")

if __name__ == "__main__":
    # Test Express bridge first
    express_result = test_express_safety_score()
    
    # Test Django directly
    test_django_safety_score_direct()