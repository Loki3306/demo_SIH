import json
import asyncio
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.consumer import AsyncConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from asgiref.sync import sync_to_async

from .models import AnomalyAlert
from .redis_utils import redis_client
from .feature_engineering import feature_engineer
from .ml_models import anomaly_model


class TrackLocationConsumer(AsyncConsumer):
    """
    Consumer for processing location tracking data and detecting anomalies
    """
    
    async def track_location(self, event):
        """
        Handle incoming location data and perform anomaly detection
        """
        data = event['data']
        user_id = data['user_id']
        
        try:
            # Add location point to Redis sliding window
            location_data = {
                'latitude': str(data['latitude']),
                'longitude': str(data['longitude']),
                'timestamp': data['timestamp'].isoformat() if hasattr(data['timestamp'], 'isoformat') else str(data['timestamp'])
            }
            
            # Get current window after adding new point
            window = await sync_to_async(redis_client.add_location_point)(user_id, location_data)
            
            # Only process if we have enough data points
            if len(window) >= 2:
                # Extract features from the sliding window
                features = await sync_to_async(feature_engineer.extract_features)(window)
                
                if features is not None:
                    # Predict anomaly using the ML model
                    is_anomaly, anomaly_score = await sync_to_async(anomaly_model.predict_anomaly)(features)
                    
                    if is_anomaly:
                        # Create anomaly alert in database
                        await self.create_anomaly_alert(
                            user_id=user_id,
                            latitude=data['latitude'],
                            longitude=data['longitude'],
                            timestamp=data['timestamp'],
                            anomaly_score=float(anomaly_score)
                        )
                        
                        # Send alert to admin channel
                        await self.send_admin_alert({
                            'type': 'anomaly_alert',
                            'data': {
                                'user_id': user_id,
                                'latitude': float(data['latitude']),
                                'longitude': float(data['longitude']),
                                'timestamp': data['timestamp'].isoformat() if hasattr(data['timestamp'], 'isoformat') else str(data['timestamp']),
                                'anomaly_score': float(anomaly_score),
                                'description': 'Anomalous movement pattern detected'
                            }
                        })
        
        except Exception as e:
            print(f"Error processing location data: {e}")
    
    @database_sync_to_async
    def create_anomaly_alert(self, user_id, latitude, longitude, timestamp, anomaly_score):
        """
        Create an anomaly alert in the database
        """
        try:
            user = User.objects.get(id=user_id)
            
            # Convert timestamp if it's a string
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                
            alert = AnomalyAlert.objects.create(
                user=user,
                latitude=latitude,
                longitude=longitude,
                timestamp=timestamp,
                anomaly_score=anomaly_score
            )
            return alert
        except Exception as e:
            print(f"Error creating anomaly alert: {e}")
            return None
    
    async def send_admin_alert(self, alert_data):
        """
        Send alert to admin WebSocket group
        """
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            'admin_alerts',
            {
                'type': 'admin_alert',
                'message': alert_data
            }
        )


class AdminAlertConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for admin real-time alerts
    Requires authentication via token in query parameters
    """
    
    async def connect(self):
        """
        Handle WebSocket connection
        """
        # Get token from query parameters
        query_params = dict(self.scope['query_string'].decode().split('&'))
        token = None
        
        for param in query_params:
            if '=' in param:
                key, value = param.split('=', 1)
                if key == 'token':
                    token = value
                    break
        
        if not token:
            await self.close(code=4001)
            return
            
        # Authenticate user
        user = await self.get_user_from_token(token)
        if not user or not (user.is_staff or user.is_superuser):
            await self.close(code=4003)
            return
        
        self.user = user
        self.group_name = 'admin_alerts'
        
        # Join admin alerts group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection success message
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Connected as {user.username}'
        }))
    
    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection
        """
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def admin_alert(self, event):
        """
        Send alert message to WebSocket
        """
        message = event['message']
        
        await self.send(text_data=json.dumps(message))
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """
        Get user from authentication token
        """
        try:
            from rest_framework.authtoken.models import Token
            token_obj = Token.objects.get(key=token)
            return token_obj.user
        except Token.DoesNotExist:
            return None