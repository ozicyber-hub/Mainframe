"""Shared helper for creating in-app notifications and sending email alerts."""
from django.core.mail import send_mail
from django.conf import settings
from .models import Notification, EmailLog


def notify_users(users, notification_type, title, message, related_type='', related_id=None):
    """Create in-app Notification records and send emails for each user in `users`."""
    for user in users:
        if not user or not getattr(user, 'id', None):
            continue
        Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            related_type=related_type,
            related_id=related_id,
        )
        if user.email:
            try:
                send_mail(
                    subject=f'OziReport — {title}',
                    message=message,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@ozireport.com'),
                    recipient_list=[user.email],
                    fail_silently=True,
                )
                EmailLog.objects.create(
                    recipient=user.email,
                    subject=f'OziReport — {title}',
                    body=message,
                    status='SENT',
                    related_type=related_type,
                    related_id=related_id,
                )
            except Exception as exc:
                EmailLog.objects.create(
                    recipient=user.email,
                    subject=f'OziReport — {title}',
                    body=message,
                    status='FAILED',
                    error_message=str(exc),
                    related_type=related_type,
                    related_id=related_id,
                )
