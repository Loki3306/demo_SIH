from django.db import models
from django.contrib.auth.models import User


class AnomalyAlert(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    timestamp = models.DateTimeField(db_index=True)
    anomaly_score = models.FloatField()
    is_resolved = models.BooleanField(default=False)
    resolution_notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['is_resolved']),
        ]
    
    def __str__(self):
        return f"Alert for {self.user.username} at {self.timestamp}"
