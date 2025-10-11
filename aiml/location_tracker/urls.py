from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('register/', views.RegisterView.as_view(), name='register'),
    path('get_auth_token/', views.GetAuthTokenView.as_view(), name='get_auth_token'),
    
    # Core tracking endpoints
    path('start_journey/', views.StartJourneyView.as_view(), name='start_journey'),
    path('end_journey/', views.EndJourneyView.as_view(), name='end_journey'),
    path('track_location/', views.TrackLocationView.as_view(), name='track_location'),
    
    # Safety score endpoint
    path('safety_score/', views.SafetyScoreView.as_view(), name='safety_score'),
    
    # Reset endpoint for testing
    path('reset_anomalies/', views.ResetAnomaliesView.as_view(), name='reset-anomalies'),
    
    # Admin endpoints
    path('admin/anomalies/', views.AdminAnomaliesView.as_view(), name='admin_anomalies'),
    path('admin/anomalies/<int:alert_id>/', views.UpdateAnomalyView.as_view(), name='update_anomaly'),
]