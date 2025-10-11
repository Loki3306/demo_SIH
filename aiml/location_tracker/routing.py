from django.urls import path
from channels.routing import ChannelNameRouter
from . import consumers

# WebSocket URL patterns
websocket_urlpatterns = [
    path('ws/admin/alerts/', consumers.AdminAlertConsumer.as_asgi()),
]

# Channel name routing for consumers
channel_routing = ChannelNameRouter({
    'location-tracking': consumers.TrackLocationConsumer.as_asgi(),
})