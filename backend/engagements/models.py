"""
Engagement/Project models for penetration testing engagements
"""
from django.db import models
from django.conf import settings
from organizations.models import Organization


class Engagement(models.Model):
    """
    A penetration testing engagement/project
    """
    ENGAGEMENT_TYPE_CHOICES = [
        ('WEB_APP', 'Web Application Penetration Test'),
        ('MOBILE_APP', 'Mobile Application Penetration Test'),
        ('NETWORK', 'Network Infrastructure Penetration Test'),
        ('API', 'API Penetration Test'),
        ('CLOUD', 'Cloud Infrastructure Penetration Test'),
        ('SOCIAL', 'Social Engineering Assessment'),
        ('PHYSICAL', 'Physical Security Assessment'),
        ('RED_TEAM', 'Red Team Exercise'),
        ('WIRELESS', 'Wireless Security Assessment'),
        ('THICK_CLIENT', 'Thick Client Application Test'),
        ('OTHER', 'Other'),
    ]

    STATUS_CHOICES = [
        ('PLANNING', 'Placeholder'),
        ('ACTIVE', 'Active'),
        ('REPORTING', 'Reporting'),
        ('REVIEW', 'Client Review'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'Delayed'),
        ('CANCELLED', 'Cancelled'),
    ]

    # Basic info
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='engagements'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    engagement_type = models.CharField(max_length=20, choices=ENGAGEMENT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNING')

    # Dates
    start_date = models.DateField()
    end_date = models.DateField()
    report_due_date = models.DateField(null=True, blank=True)

    # Team assignment
    lead_pentester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='lead_engagements',
        help_text='Primary penetration tester'
    )
    project_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='managed_engagements',
        help_text='Project manager overseeing engagement'
    )
    team_members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='engagements',
        help_text='Additional team members'
    )

    # Scope
    scope = models.TextField(blank=True, help_text='Description of in-scope targets')
    out_of_scope = models.TextField(blank=True, help_text='Description of out-of-scope items')
    objectives = models.TextField(blank=True, help_text='Engagement objectives')

    # Client info (if different from organization contacts)
    client_name = models.CharField(max_length=255, blank=True)
    client_email = models.EmailField(blank=True)
    client_phone = models.CharField(max_length=20, blank=True)

    # Settings
    allow_client_access = models.BooleanField(default=True)
    is_confidential = models.BooleanField(default=False)
    skip_weekends = models.BooleanField(default=False, help_text='Exclude weekends when calculating engagement duration')

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Engagements'

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    @property
    def days_remaining(self):
        from datetime import date
        if self.status in ['COMPLETED', 'CANCELLED']:
            return 0
        delta = self.end_date - date.today()
        return max(0, delta.days)

    @property
    def findings_count(self):
        return self.findings.count()

    @property
    def critical_findings_count(self):
        return self.findings.filter(severity='CRITICAL').count()

    @property
    def high_findings_count(self):
        return self.findings.filter(severity='HIGH').count()


class EngagementNote(models.Model):
    """
    Internal notes for an engagement
    """
    engagement = models.ForeignKey(Engagement, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"Note for {self.engagement.name} by {self.author.email}"


class EngagementAttachment(models.Model):
    """
    Files attached to an engagement (NDAs, scopes, etc.)
    """
    engagement = models.ForeignKey(Engagement, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='engagement_attachments/')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.name} - {self.engagement.name}"
