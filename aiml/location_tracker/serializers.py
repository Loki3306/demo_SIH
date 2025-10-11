from rest_framework import serializers
from django.contrib.auth.models import User
from .models import AnomalyAlert


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name')
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class StartJourneySerializer(serializers.Serializer):
    user_id = serializers.CharField(max_length=50)


class EndJourneySerializer(serializers.Serializer):
    user_id = serializers.CharField(max_length=50)


class TrackLocationSerializer(serializers.Serializer):
    user_id = serializers.CharField(max_length=50)
    latitude = serializers.DecimalField(max_digits=12, decimal_places=8)
    longitude = serializers.DecimalField(max_digits=12, decimal_places=8)
    timestamp = serializers.DateTimeField()
    accuracy = serializers.FloatField(required=False, allow_null=True)
    speed = serializers.FloatField(required=False, allow_null=True)
    heading = serializers.FloatField(required=False, allow_null=True)


class AnomalyAlertSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    
    class Meta:
        model = AnomalyAlert
        fields = '__all__'


class UpdateAnomalySerializer(serializers.ModelSerializer):
    class Meta:
        model = AnomalyAlert
        fields = ('is_resolved', 'resolution_notes')