"""
Signal handlers for sending notifications
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from findings.models import Finding, FindingComment
from notifications.models import Notification, EmailLog


@receiver(post_save, sender=Finding)
def notify_on_finding_published(sender, instance, created, **kwargs):
    """Send notifications when a finding is published"""
    if instance.status == 'PUBLISHED' and instance.published_at:
        # Notify organization members
        org = instance.engagement.organization
        for member in org.users.filter(role='CLIENT'):
            Notification.objects.create(
                user=member,
                notification_type='FINDING_PUBLISHED',
                title='New Finding Published',
                message=f'A new finding has been published: {instance.title}',
                related_type='finding',
                related_id=instance.id
            )

            # Send email
            try:
                send_mail(
                    subject=f'[OziReport] New Finding Published - {instance.engagement.name}',
                    message=f'A new finding has been published in {instance.engagement.name}.\n\n'
                           f'Finding: {instance.title}\n'
                           f'Severity: {instance.severity}\n\n'
                           f'Please log in to view the finding.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[member.email],
                    fail_silently=True
                )
                EmailLog.objects.create(
                    recipient=member.email,
                    subject=f'[OziReport] New Finding Published - {instance.engagement.name}',
                    status='SENT',
                    sent_at=timezone.now(),
                    related_type='finding',
                    related_id=instance.id
                )
            except Exception as e:
                EmailLog.objects.create(
                    recipient=member.email,
                    subject=f'[OziReport] New Finding Published - {instance.engagement.name}',
                    status='FAILED',
                    error_message=str(e),
                    related_type='finding',
                    related_id=instance.id
                )


@receiver(post_save, sender=FindingComment)
def notify_on_comment(sender, instance, created, **kwargs):
    """Send notifications when a comment is added"""
    if created and not instance.is_internal:
        finding = instance.finding
        engagement = finding.engagement

        # Notify engagement team
        for user in engagement.team_members.all():
            if user != instance.author:
                Notification.objects.create(
                    user=user,
                    notification_type='COMMENT',
                    title='New Comment',
                    message=f'{instance.author.email} commented on {finding.title}',
                    related_type='comment',
                    related_id=instance.id
                )
