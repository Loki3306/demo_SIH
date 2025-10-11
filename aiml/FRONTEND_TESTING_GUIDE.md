# 🚀 Frontend Testing Guide for Tourist Safety Backend

## 📋 Quick Start Options

### Option 1: HTML Test Page (Immediate Testing) ⚡
**Best for: Quick testing without setup**

1. **Start your Django backend:**
   ```bash
   cd "C:\Users\Yug  deshmukh\Desktop\sih\ai_ml\backend_yr\yr"
   python manage.py runserver
   ```

2. **Open the HTML test page:**
   - Open `test_frontend.html` in your browser
   - Or double-click the file

3. **Test the complete workflow:**
   - Register a new user
   - Get authentication token
   - Start journey
   - Track locations (normal and anomalous)
   - View anomaly alerts
   - Test WebSocket connections

### Option 2: React Frontend (Advanced Testing) ⚛️
**Best for: Modern, interactive testing**

1. **Setup React frontend:**
   ```bash
   cd "C:\Users\Yug  deshmukh\Desktop\sih\ai_ml\backend_yr\yr\react_frontend_example"
   npm install
   npm start
   ```

2. **Backend setup:**
   ```bash
   # In separate terminal
   cd "C:\Users\Yug  deshmukh\Desktop\sih\ai_ml\backend_yr\yr"
   python manage.py runserver
   ```

3. **Access both:**
   - React app: http://localhost:3000
   - Django API: http://127.0.0.1:8000

## 🧪 Testing Scenarios

### 1. Authentication Flow
```javascript
// Test sequence:
1. Register new user → Get token
2. Login existing user → Get token
3. Use token for protected endpoints
```

### 2. Journey Management
```javascript
// Test sequence:
1. Start journey → Redis session created
2. Track multiple locations → ML analysis
3. End journey → Session cleanup
```

### 3. Anomaly Detection Testing
```javascript
// Normal movement (should NOT trigger anomaly):
Locations: (34.0522, -118.2437) → (34.0523, -118.2438) → (34.0524, -118.2439)

// Anomalous movement (SHOULD trigger anomaly):
Locations: (34.0522, -118.2437) → (34.0600, -118.2500) → (34.0520, -118.2430)
```

### 4. WebSocket Real-time Testing
```javascript
// Test sequence:
1. Connect WebSocket with token
2. Trigger anomaly in another tab/session
3. Observe real-time alert in WebSocket
```

## 📱 Mobile Testing with Browser Dev Tools

### Simulate Mobile Device:
1. Open browser dev tools (F12)
2. Click device emulation icon
3. Select mobile device (iPhone, Android)
4. Test GPS geolocation features

### Location Testing:
1. Use "Sensors" tab in Chrome DevTools
2. Override geolocation coordinates
3. Test with different locations

## 🔧 API Endpoints to Test

### Authentication:
- `POST /api/v1/register/` - User registration
- `POST /api/v1/get_auth_token/` - Get auth token

### Journey Management:
- `POST /api/v1/start_journey/` - Start tracking session
- `POST /api/v1/end_journey/` - End tracking session

### Location Tracking:
- `POST /api/v1/track_location/` - Send location data

### Admin Functions:
- `GET /api/v1/admin/anomalies/` - Get anomaly alerts

### WebSocket:
- `ws://127.0.0.1:8000/ws/admin/alerts/?token=TOKEN` - Real-time alerts

## 🚨 Expected Test Results

### Normal Location Tracking:
```json
{
  "status": "success",
  "message": "Location tracked successfully",
  "anomaly_detected": false,
  "anomaly_score": 0.15,
  "location_stored": true
}
```

### Anomaly Detection:
```json
{
  "status": "success", 
  "message": "Location tracked successfully",
  "anomaly_detected": true,
  "anomaly_score": 0.85,
  "alert_created": true,
  "alert_id": 123
}
```

### WebSocket Alert:
```json
{
  "type": "anomaly_alert",
  "data": {
    "user_id": 1,
    "latitude": 34.0600,
    "longitude": -118.2500,
    "anomaly_score": 0.85,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 🛠️ Troubleshooting

### CORS Issues:
```bash
# Make sure django-cors-headers is installed
pip install django-cors-headers

# Verify CORS settings in settings.py
CORS_ALLOW_ALL_ORIGINS = True  # Development only!
```

### Redis Connection Issues:
```bash
# Start Redis in WSL
wsl
sudo service redis-server start
redis-cli ping  # Should return PONG
```

### Token Authentication Issues:
```bash
# Create admin user for testing
python manage.py createsuperuser

# Or use the test credentials from HTML page:
Username: testuser
Password: testpass123
```

## 📊 Performance Testing

### Load Testing with Multiple Locations:
```javascript
// Simulate rapid location updates
setInterval(() => {
  trackLocation();
}, 1000); // Every second
```

### Memory Usage Monitoring:
- Check Redis memory usage: `redis-cli info memory`
- Monitor Django process: Task Manager or `ps` command

## 🎯 Test Cases Checklist

- [ ] User registration works
- [ ] User login returns valid token
- [ ] Token authentication on protected endpoints
- [ ] Journey start/end creates/destroys Redis sessions
- [ ] Normal movement doesn't trigger anomalies
- [ ] Anomalous movement triggers alerts
- [ ] WebSocket connection established
- [ ] Real-time anomaly alerts received
- [ ] Admin panel shows anomaly list
- [ ] GPS geolocation works in browser
- [ ] Mobile responsiveness
- [ ] Error handling for invalid data
- [ ] Rate limiting (if implemented)
- [ ] Database anomaly records created

## 🚀 Next Steps After Testing

1. **Add Map Integration:**
   - Google Maps API
   - OpenStreetMap/Leaflet
   - Real-time location visualization

2. **Enhanced Mobile App:**
   - React Native
   - Flutter
   - Native iOS/Android

3. **Advanced Features:**
   - Push notifications
   - Offline support
   - Batch location sync
   - Fall detection
   - Heart rate monitoring

4. **Production Deployment:**
   - Docker containers
   - Cloud hosting (AWS/GCP/Azure)
   - Database migration to PostgreSQL
   - Redis Cluster for scale

## 📞 Support

If you encounter issues:
1. Check console for JavaScript errors
2. Verify Django server is running
3. Confirm Redis is active
4. Check network tab for API responses
5. Validate token format and permissions

Happy testing! 🎉