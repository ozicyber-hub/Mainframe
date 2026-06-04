"""
Notifications and email alerts
"""
from django.db import models
from django.conf import settings
from organizations.models import Organization


class Notification(models.Model):
    """
    In-app notification
    """
    TYPE_CHOICES = [
        ('NEW_FINDING',        'New Finding'),
        ('FINDING_UPDATE',     'Finding Updated'),
        ('FINDING_PUBLISHED',  'Finding Published'),
        ('COMMENT',            'New Comment'),
        ('REPORT_READY',       'Report Ready'),
        ('ENGAGEMENT_UPDATE',  'Engagement Updated'),
        ('ASSIGNMENT',         'New Assignment'),
        ('SYSTEM',             'System'),
        # GRC / Assessment lifecycle
        ('ASSESSMENT_ASSIGNED',  'Assessment Assigned'),
        ('EVIDENCE_SUBMITTED',   'Evidence Submitted'),
        ('EVIDENCE_ACCEPTED',    'Evidence Accepted'),
        ('EVIDENCE_REJECTED',    'Evidence Rejected'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()

    # Related object references
    related_type = models.CharField(max_length=100, blank=True)
    related_id = models.PositiveIntegerField(blank=True, null=True)

    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title}"


class EmailLog(models.Model):
    """
    Log of sent emails for auditing
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
    ]

    recipient = models.EmailField()
    subject = models.CharField(max_length=500)
    body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True)

    # Related
    related_type = models.CharField(max_length=100, blank=True)
    related_id = models.PositiveIntegerField(blank=True, null=True)

    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Email to {self.recipient}: {self.subject}"


class EmailTemplate(models.Model):
    """
    Configurable email templates
    """
    NAME_CHOICES = [
        ('NEW_FINDING', 'New Finding Notification'),
        ('FINDING_UPDATE', 'Finding Update'),
        ('FINDING_PUBLISHED', 'Finding Published'),
        ('COMMENT_REPLY', 'Comment Reply'),
        ('REPORT_READY', 'Report Ready'),
        ('WELCOME', 'Welcome Email'),
        ('PASSWORD_RESET', 'Password Reset'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='email_templates',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=50, choices=NAME_CHOICES)
    subject = models.CharField(max_length=500)
    body = models.TextField(help_text="Use {{variable}} for template variables")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['organization', 'name']
        ordering = ['name']

    def __str__(self):
        return f"{self.get_name_display()} - {self.organization or 'Global'}"
