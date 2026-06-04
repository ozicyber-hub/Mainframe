from django.conf import settings
from django.db import models


class IntegrationSetting(models.Model):
    PROVIDER_WEBHOOK = 'webhook'
    PROVIDER_JIRA = 'jira'
    PROVIDER_SERVICENOW = 'servicenow'

    PROVIDER_CHOICES = [
        (PROVIDER_WEBHOOK, 'Webhook'),
        (PROVIDER_JIRA, 'Jira'),
        (PROVIDER_SERVICENOW, 'ServiceNow'),
    ]

    provider = models.CharField(max_length=40, choices=PROVIDER_CHOICES)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='integration_settings',
    )
    enabled = models.BooleanField(default=False)
    config = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_integration_settings',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_integration_settings',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['organization__name', 'provider']
        constraints = [
            models.UniqueConstraint(fields=['provider', 'organization'], name='unique_integration_provider_per_org'),
        ]

    def __str__(self):
        scope = self.organization.name if self.organization_id else 'Global'
        return f'{self.get_provider_display()} integration ({scope})'


class IntegrationDeliveryLog(models.Model):
    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('SKIPPED', 'Skipped'),
    ]

    provider = models.CharField(max_length=40)
    event = models.CharField(max_length=80)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    finding = models.ForeignKey(
        'findings.Finding',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='integration_logs',
    )
    request_payload = models.JSONField(default=dict, blank=True)
    response_status = models.PositiveIntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.provider} {self.event} {self.status}'


class JiraIssueLink(models.Model):
    finding = models.OneToOneField(
        'findings.Finding',
        on_delete=models.CASCADE,
        related_name='jira_issue',
    )
    issue_key = models.CharField(max_length=40)
    issue_id = models.CharField(max_length=80, blank=True)
    issue_url = models.URLField(max_length=500, blank=True)
    status_name = models.CharField(max_length=80, blank=True)
    status_category = models.CharField(max_length=40, blank=True)
    priority_name = models.CharField(max_length=80, blank=True)
    assignee_name = models.CharField(max_length=255, blank=True)
    raw_status = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.issue_key} for finding {self.finding_id}'
