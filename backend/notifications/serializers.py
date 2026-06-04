from rest_framework import serializers
from .models import Notification, EmailLog, EmailTemplate


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'notification_type', 'type_display', 'title', 'message',
            'related_type', 'related_id', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class NotificationMarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField())


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'organization', 'name', 'subject', 'body',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
