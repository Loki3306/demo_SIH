# 🚀 Tourist Safety App Backend

> **AI-powered location tracking and anomaly detection system for tourist safety**

[![Django](https://img.shields.io/badge/Django-5.2.6-green.svg)](https://djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://python.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io/)
[![ML](https://img.shields.io/badge/ML-Scikit--learn-orange.svg)](https://scikit-learn.org/)

## 📋 Overview

A comprehensive Django backend system that provides real-time location tracking, intelligent anomaly detection using machine learning, and administrative alerts for tourist safety monitoring.

### 🔗 Express Server Integration

This Django AI service integrates seamlessly with the main Express application:

- **Authentication**: Token-based API security for all endpoints
- **Real-time Alerts**: Webhook integration sends anomaly alerts to Express server
- **CORS Support**: Configured for React frontend on localhost:5173
- **Location Tracking**: Direct communication with Tourist Dashboard via React client

**Integration Flow:**
```
React Frontend → Django AI API → ML Processing → Express Webhook → Socket.IO → Admin Dashboard
```

### 🎯 Key Features

- ✅ **Real-time Location Tracking** - GPS-based journey monitoring
- ✅ **AI Anomaly Detection** - Isolation Forest ML model for movement analysis
- ✅ **Admin Dashboard** - Staff interface for alert management
- ✅ **Token Authentication** - Security-first API design
- ✅ **Redis Integration** - High-performance sliding window data storage
- ✅ **WebSocket Support** - Real-time admin notifications

### 🚨 Anomaly Detection Capabilities

The system can detect various movement anomalies:
- **Speed Anomalies**: Excessive speed (>180 km/h), sudden acceleration/deceleration
- **Direction Changes**: Sharp turns (>120°), erratic movement patterns  
- **Emergency Patterns**: Sudden stops, circular movement, unusual behavior
- **Context Analysis**: 14 engineered features from GPS data

## 🛠️ Technology Stack

- **Backend**: Django 5.2.6 + Django REST Framework
- **ML/AI**: Scikit-learn (Isolation Forest), NumPy, SciPy
- **Database**: SQLite (development), Redis (caching)
- **Real-time**: Django Channels, WebSockets
- **Authentication**: Token-based authentication

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Redis server
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/tourist-safety-backend.git
cd tourist-safety-backend
```

2. **Set up virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up database**
```bash
python manage.py migrate
python manage.py createsuperuser
```

5. **Train ML model**
```bash
python train_model.py
```

6. **Start Redis** (in separate terminal)
```bash
# On Ubuntu/WSL
sudo service redis-server start

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

7. **Start development server**
```bash
python manage.py runserver
```

🎉 **Server running at**: `http://127.0.0.1:8000`

## 📡 API Endpoints

### Authentication (Token Required)
- `POST /api/v1/register/` - User registration  
- `POST /api/v1/get_auth_token/` - Get authentication token

### Location Tracking (� Open for Testing)
- `POST /api/v1/start_journey/` - Initialize journey session
  ```json
  {
    "user_id": "t123"
  }
  ```
- `POST /api/v1/track_location/` - Submit location data (called every 10s by React)
  ```json
  {
    "user_id": "t123",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timestamp": "2025-09-21T10:30:00Z",
    "accuracy": 5.0,
    "speed": 12.5,
    "heading": 45.0
  }
  ```
- `POST /api/v1/end_journey/` - End journey session

### Admin (Staff Only)
- `GET /api/v1/admin/anomalies/` - View anomaly alerts
- `PUT /api/v1/admin/anomalies/{id}/` - Update alert status

### Integration Features
- **Express Webhook**: Automatically sends POST requests to `EXPRESS_WEBHOOK_URL` when anomalies are detected
- **CORS**: Configured for React frontend (localhost:5173)
- **Authentication**: Currently disabled for development/testing (permission_classes = [AllowAny])
- **Auto User Creation**: Users are created automatically when needed for anomaly alerts

### WebSocket
- `ws://localhost:8000/ws/admin/alerts/?token=TOKEN` - Real-time admin alerts

## 🧠 Machine Learning

### Isolation Forest Model
- **Training Data**: 1000 synthetic normal movement patterns
- **Features**: 14 engineered features from GPS data
- **Detection**: Unsupervised anomaly detection
- **Output**: Anomaly score (-1 to 1 scale)

### Feature Engineering
```python
# Movement analysis includes:
- Speed statistics (mean, std, max, min)
- Bearing changes (direction analysis)  
- Acceleration patterns
- Movement consistency metrics
```

## 📊 Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   Mobile App    │───▶│  Django API  │───▶│   Redis     │
│  (GPS Tracker)  │    │   (REST)     │    │ (Sliding    │
└─────────────────┘    └──────────────┘    │  Window)    │
                               │            └─────────────┘
                               ▼
                       ┌──────────────┐    ┌─────────────┐
                       │  ML Engine   │───▶│  SQLite     │
                       │ (Isolation   │    │ (Alerts)    │
                       │  Forest)     │    └─────────────┘
                       └──────────────┘
                               │
                               ▼
                       ┌──────────────┐
                       │ Admin Panel  │
                       │ (WebSocket)  │
                       └──────────────┘
```

## 🔒 Security

- **Token Authentication**: All endpoints secured
- **Permission-based Access**: Admin endpoints restricted to staff
- **Input Validation**: Comprehensive data validation
- **WebSocket Security**: Token-based WebSocket authentication

## 🧪 Testing

Run the complete test suite:
```bash
python complete_test.py
```

Test specific components:
```bash
# Test Redis connection
python -c "from location_tracker.redis_utils import redis_client; print(redis_client.client.ping())"

# Test ML model
python -c "from location_tracker.ml_models import anomaly_model; print('Model loaded:', anomaly_model.model is not None)"
```

## 📈 Usage Examples

### Register User
```bash
curl -X POST http://localhost:8000/api/v1/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"tourist","password":"safe123","email":"tourist@example.com"}'
```

### Track Location
```bash
curl -X POST http://localhost:8000/api/v1/track_location/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token YOUR_TOKEN" \
  -d '{"user_id":1,"latitude":34.0522,"longitude":-118.2437,"timestamp":"2025-09-19T10:00:00Z"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Features Comparison

| Feature | Status | Description |
|---------|--------|-------------|
| ✅ Movement Anomaly Detection | **Complete** | ML-powered GPS anomaly detection |
| ✅ Real-time Processing | **Complete** | Immediate location analysis |
| ✅ Admin Dashboard | **Complete** | Alert management interface |
| ⚠️ Fall Detection | **Not Implemented** | Requires accelerometer data |
| ⚠️ Vital Signs Monitoring | **Not Implemented** | Requires health sensors |
| ⚠️ Predictive Risk Scoring | **Not Implemented** | Advanced feature |

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tourist-safety-backend/issues)
- **Documentation**: See `/docs` folder
- **API Reference**: Available at `/api/v1/` when server is running

---

**Built with ❤️ for tourist safety and powered by AI** 🤖