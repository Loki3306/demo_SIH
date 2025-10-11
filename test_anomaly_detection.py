#!/usr/bin/env python3
"""
Anomaly Detection Test Script

This script tests the full anomaly detection pipeline by:
1. Starting a journey for a test user
2. Sending normal location data (should maintain high safety score)
3. Sending anomalous location data (should trigger anomalies and reduce safety score)
4. Checking safety score changes after each phase
5. Cleaning up by ending the journey

Usage: python test_anomaly_detection.py
"""

import requests
import time
import json
from datetime import datetime, timedelta
import random

# Configuration
DJANGO_BASE_URL = "http://127.0.0.1:8000/api/v1"
EXPRESS_BASE_URL = "http://localhost:8080/api/bridge/aiml"  # Updated to correct port
TEST_USER_ID = "test_anomaly_user"

# Test location data
MUMBAI_BASE = {"lat": 19.0760, "lng": 72.8777}  # Mumbai coordinates

def get_timestamp():
    """Get formatted timestamp for logging"""
    return datetime.now().strftime("%H:%M:%S")

def reset_user_anomalies():
    """Reset all anomalies for the test user to ensure clean test state"""
    print("\n🔄 Resetting user anomalies in the database...")
    url = f"{DJANGO_BASE_URL}/reset_anomalies/"
    try:
        response = requests.post(url, json={"user_id": TEST_USER_ID}, timeout=10)
        if response.status_code == 200:
            print(f"✅ {response.json().get('message')}")
        else:
            print(f"❌ Failed to reset anomalies: {response.status_code} - {response.text}")
    except requests.RequestException as e:
        print(f"❌ Error connecting to reset endpoint: {e}")

class AnomalyTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_id = TEST_USER_ID
        
    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def get_safety_score(self):
        """Get current safety score via Express bridge"""
        try:
            url = f"{EXPRESS_BASE_URL}/safetyScore"
            params = {"user_id": self.user_id}
            
            response = self.session.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                return data.get("score", 100), data.get("factors", [])
            else:
                self.log(f"❌ Failed to get safety score: {response.status_code} - {response.text}")
                return None, None
        except Exception as e:
            self.log(f"❌ Error getting safety score: {e}")
            return None, None
    
    def start_journey(self):
        """Start tracking journey"""
        try:
            url = f"{DJANGO_BASE_URL}/start_journey/"
            data = {"user_id": self.user_id}
            
            response = self.session.post(url, json=data)
            if response.status_code == 200:
                self.log("✅ Journey started successfully")
                return True
            else:
                self.log(f"❌ Failed to start journey: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log(f"❌ Error starting journey: {e}")
            return False
    
    def end_journey(self):
        """End tracking journey"""
        try:
            url = f"{DJANGO_BASE_URL}/end_journey/"
            data = {"user_id": self.user_id}
            
            response = self.session.post(url, json=data)
            if response.status_code == 200:
                self.log("✅ Journey ended successfully")
                return True
            else:
                self.log(f"❌ Failed to end journey: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log(f"❌ Error ending journey: {e}")
            return False
    
    def send_location(self, lat, lng, description=""):
        """Send location data to tracking endpoint"""
        try:
            url = f"{DJANGO_BASE_URL}/track_location/"
            data = {
                "user_id": self.user_id,
                "latitude": lat,
                "longitude": lng,
                "timestamp": datetime.now().isoformat() + "Z",
                "accuracy": random.uniform(5, 30),
                "speed": random.uniform(0, 50),
                "heading": random.uniform(0, 360)
            }
            
            response = self.session.post(url, json=data)
            status_icon = "✅" if response.status_code == 202 else "❌"
            
            anomaly_detected = "anomaly_detected" in response.text and "true" in response.text.lower()
            anomaly_icon = "🚨" if anomaly_detected else "🟢"
            
            self.log(f"{status_icon} {anomaly_icon} Location sent: ({lat:.6f}, {lng:.6f}) {description}")
            
            if response.status_code == 202:
                response_data = response.json()
                if response_data.get("anomaly_detected"):
                    self.log(f"   🔥 ANOMALY DETECTED! Score: {response_data.get('anomaly_score', 'N/A')}")
                return True, anomaly_detected
            else:
                self.log(f"   ❌ Failed: {response.status_code} - {response.text}")
                return False, False
                
        except Exception as e:
            self.log(f"❌ Error sending location: {e}")
            return False, False
    
    def generate_normal_path(self, num_points=5):
        """Generate normal walking path around Mumbai"""
        self.log("\n📍 Phase 1: Sending NORMAL location data...")
        
        lat, lng = MUMBAI_BASE["lat"], MUMBAI_BASE["lng"]
        
        for i in range(num_points):
            # Small, realistic movement (within ~100m)
            lat += random.uniform(-0.0005, 0.0005)  # ~50m variation
            lng += random.uniform(-0.0005, 0.0005)
            
            # Round to 6 decimal places to match Django serializer constraints
            lat = round(lat, 6)
            lng = round(lng, 6)
            
            success, anomaly = self.send_location(lat, lng, f"- Normal point {i+1}")
            time.sleep(1)  # Small delay between points
            
        self.log("✅ Normal path completed")
    
    def generate_anomalous_path(self, num_points=3):
        """Generate anomalous location data that should trigger detection"""
        self.log("\n🚨 Phase 2: Sending ANOMALOUS location data...")
        
        anomalous_locations = [
            # Sudden jump to different city (Delhi)
            {"lat": 28.6139, "lng": 77.2090, "desc": "- ANOMALY: Sudden jump to Delhi!"},
            # Another big jump (Bangalore)  
            {"lat": 12.9716, "lng": 77.5946, "desc": "- ANOMALY: Jump to Bangalore!"},
            # Back to Mumbai but different area
            {"lat": 19.2000, "lng": 72.9000, "desc": "- ANOMALY: Erratic movement pattern"},
        ]
        
        for i, location in enumerate(anomalous_locations[:num_points]):
            success, anomaly = self.send_location(
                location["lat"], 
                location["lng"], 
                location["desc"]
            )
            time.sleep(1)
            
        self.log("✅ Anomalous path completed")
    
    def check_score_with_details(self, phase_name):
        """Get and display safety score with details"""
        self.log(f"\n📊 {phase_name} Safety Score Check:")
        
        score, factors = self.get_safety_score()
        if score is not None:
            # Determine score status
            if score >= 90:
                status_icon = "🟢"
                status = "EXCELLENT"
            elif score >= 75:
                status_icon = "🟡"
                status = "GOOD"
            elif score >= 50:
                status_icon = "🟠"
                status = "MODERATE"
            else:
                status_icon = "🔴"
                status = "POOR"
                
            self.log(f"   {status_icon} Safety Score: {score}/100 ({status})")
            
            if factors:
                self.log("   📋 Affecting factors:")
                for factor in factors:
                    self.log(f"      • {factor}")
            else:
                self.log("   ✨ No negative factors detected")
        else:
            self.log("   ❌ Could not retrieve safety score")
    
    def run_test(self):
        """Run the complete anomaly detection test"""
        self.log("🚀 Starting Anomaly Detection Test")
        self.log("=" * 50)
        
        # Step 1: Check initial score
        self.check_score_with_details("INITIAL")
        
        # Step 2: Start journey
        if not self.start_journey():
            self.log("❌ Test aborted - could not start journey")
            return False
        
        time.sleep(2)
        
        # Step 3: Send normal data
        self.generate_normal_path(4)
        time.sleep(3)  # Wait for processing
        self.check_score_with_details("AFTER NORMAL DATA")
        
        # Step 4: Send anomalous data
        self.generate_anomalous_path(3)
        time.sleep(5)  # Wait for ML processing
        self.check_score_with_details("AFTER ANOMALOUS DATA")
        
        # Step 5: Send more normal data to see recovery
        self.log("\n🔄 Phase 3: Sending more normal data to test recovery...")
        self.generate_normal_path(3)
        time.sleep(3)
        self.check_score_with_details("AFTER RECOVERY ATTEMPT")
        
        # Step 6: End journey
        self.end_journey()
        
        self.log("\n" + "=" * 50)
        self.log("🎯 Test completed! Check the results above.")
        self.log("📈 Expected behavior:")
        self.log("   - Initial score should be 100 (or high)")
        self.log("   - Score should drop after anomalous data")
        self.log("   - Factors should mention detected anomalies")
        self.log("   - Score may start recovering with normal data")
        
        return True

def main():
    """Main test execution"""
    print("🧪 Anomaly Detection Test Script")
    print("=" * 50)
    print("This script will test the complete anomaly detection pipeline:")
    print("1. Django AI service anomaly detection")
    print("2. Safety score calculation")
    print("3. Express bridge endpoint")
    print("4. Real-time score updates")
    print()
    
    # Verify services are running
    print("🔍 Checking if services are running...")
    
    try:
        # Check Django
        response = requests.get(f"{DJANGO_BASE_URL}/", timeout=5)
        print("✅ Django AI service is running")
    except:
        print("❌ Django AI service not accessible. Make sure it's running on port 8000")
        return
    
    try:
        # Check Express
        response = requests.get("http://localhost:8080/", timeout=5)
        print("✅ Express server is running")
    except:
        print("❌ Express server not accessible. Make sure it's running on port 8080")
        return
    
    print()
    input("Press Enter to start the test...")
    
    # Call the new reset function here to ensure a clean state
    reset_user_anomalies()
    
    print(f"\n[{get_timestamp()}] 🚀 Starting Anomaly Detection Test")
    
    # Run the test
    tester = AnomalyTester()
    success = tester.run_test()
    
    if success:
        print("\n🎉 Test execution completed successfully!")
    else:
        print("\n💥 Test execution failed!")

if __name__ == "__main__":
    main()