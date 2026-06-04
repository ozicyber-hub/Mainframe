"""
Comments app - centralized comment management
"""
from django.db import models
from django.conf import settings


class Comment(models.Model):
    """
    Generic comment model (can be extended for other uses)
    """
    # This is a placeholder - actual comments are in findings.FindingComment
    # This model could be used for general comments across the system
    content_type = models.CharField(max_length=100)
    object_id = models.PositiveIntegerField()

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    is_internal = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]

    def __str__(self):
        return f"Comment by {self.author.email} on {self.content_type}"
