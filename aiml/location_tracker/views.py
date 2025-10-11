from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .utils import calculate_safety_score_by_user_id

from .serializers import (
    RegisterSerializer, LoginSerializer, StartJourneySerializer,
    EndJourneySerializer, TrackLocationSerializer, AnomalyAlertSerializer,
    UpdateAnomalySerializer
)
from .models import AnomalyAlert
from .permissions import IsStaffOrSuperUser
from .redis_utils import redis_client


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user_id': user.id,
            'username': user.username,
            'token': token.key
        }, status=status.HTTP_201_CREATED)


class GetAuthTokenView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            
            user = authenticate(username=username, password=password)
            if user:
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'user_id': user.id,
                    'username': user.username,
                    'token': token.key
                })
            else:
                return Response(
                    {'error': 'Invalid credentials'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StartJourneyView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        print(f"Received start_journey request: {request.data}")
        serializer = StartJourneySerializer(data=request.data)
        if serializer.is_valid():
            user_id = serializer.validated_data['user_id']
            
            # Check if user exists - temporarily disabled for testing
            # try:
            #     User.objects.get(id=user_id)
            # except User.DoesNotExist:
            #     return Response(
            #         {'error': 'User not found'}, 
            #         status=status.HTTP_404_NOT_FOUND
            #     )
            
            try:
                # Initialize journey in Redis
                success = redis_client.start_journey(user_id)
                
                if success:
                    return Response({'message': 'Journey started successfully'})
                else:
                    return Response(
                        {'error': 'Failed to start journey'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            except Exception as e:
                return Response({
                    'message': 'Journey acknowledged (Redis not available - fallback mode)',
                    'warning': 'Session management disabled. Please start Redis server.',
                    'error': str(e)
                })
        
        print(f"StartJourney serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EndJourneyView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = EndJourneySerializer(data=request.data)
        if serializer.is_valid():
            user_id = serializer.validated_data['user_id']
            
            # Check if user exists - temporarily disabled for testing
            # try:
            #     User.objects.get(id=user_id)
            # except User.DoesNotExist:
            #     return Response(
            #         {'error': 'User not found'}, 
            #         status=status.HTTP_404_NOT_FOUND
            #     )
            
            try:
                # End journey in Redis
                success = redis_client.end_journey(user_id)
                
                # Reset safety score by clearing anomaly alerts for this user
                try:
                    # Get the User object using the same pattern as TrackLocationView
                    from django.contrib.auth.models import User
                    user = User.objects.get(username=f'user_{user_id}')
                    deleted_count, _ = AnomalyAlert.objects.filter(user=user).delete()
                    print(f"Journey ended for user {user_id}: Cleared {deleted_count} anomaly alerts (safety score reset to 100)")
                except User.DoesNotExist:
                    print(f"No user found for user_id {user_id}, no anomalies to clear")
                    deleted_count = 0
                
                if success:
                    return Response({
                        'message': 'Journey ended successfully',
                        'safety_score_reset': True,
                        'anomalies_cleared': deleted_count
                    })
                else:
                    return Response(
                        {'error': 'Failed to end journey'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            except Exception as e:
                # Even if Redis fails, still clear anomalies to reset safety score
                try:
                    # Get the User object using the same pattern as TrackLocationView
                    from django.contrib.auth.models import User
                    user = User.objects.get(username=f'user_{user_id}')
                    deleted_count, _ = AnomalyAlert.objects.filter(user=user).delete()
                    print(f"Journey ended for user {user_id}: Cleared {deleted_count} anomaly alerts (safety score reset to 100)")
                except User.DoesNotExist:
                    print(f"No user found for user_id {user_id}, no anomalies to clear")
                    deleted_count = 0
                except Exception as db_error:
                    print(f"Failed to clear anomalies for user {user_id}: {db_error}")
                    deleted_count = 0
                
                return Response({
                    'message': 'Journey end acknowledged (Redis not available - fallback mode)',
                    'warning': 'Session management disabled. Please start Redis server.',
                    'safety_score_reset': True,
                    'anomalies_cleared': deleted_count,
                    'error': str(e)
                })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TrackLocationView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        print(f"Received track_location request: {request.data}")
        serializer = TrackLocationSerializer(data=request.data)
        if serializer.is_valid():
            user_id = serializer.validated_data['user_id']
            
            try:
                # Check if user has active journey
                if not redis_client.is_journey_active(user_id):
                    return Response(
                        {'error': 'No active journey found. Please start a journey first.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Process location data directly (without channels for now)
                from .ml_models import anomaly_model
                from .feature_engineering import feature_engineer
                
                # Add location to Redis sliding window
                location_data = {
                    'latitude': str(serializer.validated_data['latitude']),
                    'longitude': str(serializer.validated_data['longitude']),
                    'timestamp': serializer.validated_data['timestamp'].isoformat() if hasattr(serializer.validated_data['timestamp'], 'isoformat') else str(serializer.validated_data['timestamp'])
                }
                
                window = redis_client.add_location_point(user_id, location_data)
                
                # Process for anomalies if we have enough data
                if len(window) >= 2:
                    features = feature_engineer.extract_features(window)
                    if features is not None:
                        is_anomaly, anomaly_score = anomaly_model.predict_anomaly(features)
                        
                        if is_anomaly:
                            # Create anomaly alert
                            from .models import AnomalyAlert
                            # Get or create user for testing purposes
                            user, created = User.objects.get_or_create(
                                username=f'user_{user_id}',
                                defaults={'email': f'user_{user_id}@test.com'}
                            )
                            
                            alert = AnomalyAlert.objects.create(
                                user=user,
                                latitude=serializer.validated_data['latitude'],
                                longitude=serializer.validated_data['longitude'],
                                timestamp=serializer.validated_data['timestamp'],
                                anomaly_score=float(anomaly_score)
                            )
                            
                            # Send webhook to Express server
                            import requests
                            import os
                            
                            try:
                                express_webhook_url = os.getenv('EXPRESS_WEBHOOK_URL', 'http://localhost:8080/api/v1/alerts/anomaly')
                                webhook_data = {
                                    'user_id': user_id,
                                    'anomaly_score': float(anomaly_score),
                                    'location': {
                                        'lat': float(serializer.validated_data['latitude']),
                                        'lng': float(serializer.validated_data['longitude'])
                                    },
                                    'timestamp': serializer.validated_data['timestamp'].isoformat(),
                                    'alert_type': 'location_anomaly',
                                }
                                
                                response = requests.post(
                                    express_webhook_url,
                                    json=webhook_data,
                                    timeout=5
                                )
                                
                                if response.status_code == 200:
                                    print(f"Anomaly webhook sent successfully for user {user_id}")
                                else:
                                    print(f"Webhook failed with status {response.status_code}: {response.text}")
                                    
                            except Exception as e:
                                print(f"Error sending anomaly webhook: {e}")
                            
                            return Response(
                                {
                                    'message': 'Location data processed',
                                    'anomaly_detected': True,
                                    'anomaly_score': float(anomaly_score),
                                    'alert_id': alert.id
                                }, 
                                status=status.HTTP_202_ACCEPTED
                            )
                
                return Response(
                    {'message': 'Location data processed - no anomaly detected'}, 
                    status=status.HTTP_202_ACCEPTED
                )
                
            except Exception as e:
                # Fallback response when Redis/Channels isn't available
                return Response(
                    {
                        'message': 'Location data received (Redis not available - fallback mode)',
                        'warning': 'Real-time processing disabled. Please start Redis server.',
                        'error': str(e)
                    }, 
                    status=status.HTTP_202_ACCEPTED
                )
        
        print(f"TrackLocation serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminAnomaliesView(generics.ListAPIView):
    serializer_class = AnomalyAlertSerializer
    permission_classes = [IsStaffOrSuperUser]
    
    def get_queryset(self):
        return AnomalyAlert.objects.filter(is_resolved=False)


class UpdateAnomalyView(generics.UpdateAPIView):
    queryset = AnomalyAlert.objects.all()
    serializer_class = UpdateAnomalySerializer
    permission_classes = [IsStaffOrSuperUser]
    lookup_field = 'id'
    lookup_url_kwarg = 'alert_id'


class SafetyScoreView(APIView):
    permission_classes = [AllowAny]  # Using AllowAny for development, same as other views
    
    def get(self, request, *args, **kwargs):
        # Get user_id from query parameters
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            score_data = calculate_safety_score_by_user_id(user_id)
            print(f"Safety score calculated for user {user_id}: {score_data}")
            return Response(score_data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error calculating safety score for user {user_id}: {e}")
            return Response(
                {'error': 'Failed to calculate safety score', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResetAnomaliesView(APIView):
    """
    API endpoint to reset (delete) all anomaly alerts for a specified user.
    This is primarily used for testing to ensure a clean state before each test run.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # For testing purposes, we'll use user_id as a string identifier
        # rather than requiring actual User objects
        count, _ = AnomalyAlert.objects.filter(user_id=user_id).delete()
        return Response({"message": f"Successfully deleted {count} anomalies for user {user_id}."})
