"""
Notification views
"""
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import Notification, EmailTemplate
from .serializers import NotificationSerializer, NotificationMarkReadSerializer, EmailTemplateSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """User notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        """Mark notifications as read"""
        serializer = NotificationMarkReadSerializer(data=request.data)
        if serializer.is_valid():
            Notification.objects.filter(
                id__in=serializer.validated_data['ids'],
                user=request.user
            ).update(is_read=True, read_at=timezone.now())
            return Response({'message': 'Notifications marked as read'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({'message': 'All notifications marked as read'})


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """Email template management"""
    serializer_class = EmailTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return EmailTemplate.objects.all()
        return EmailTemplate.objects.filter(
            organization=user.organization
        ) | EmailTemplate.objects.filter(organization__isnull=True)
