from django.conf import settings
from django.db import models


class Tenant(models.Model):
    """Paying Mainframe customer tenant, above in-app client organizations."""

    PLAN_INDIVIDUAL = 'INDIVIDUAL'
    PLAN_PRO = 'PRO'
    PLAN_ENTERPRISE = 'ENTERPRISE'
    PLAN_CHOICES = [
        (PLAN_INDIVIDUAL, 'Individual'),
        (PLAN_PRO, 'Pro'),
        (PLAN_ENTERPRISE, 'Enterprise'),
    ]

    STATUS_TRIAL = 'TRIAL'
    STATUS_ACTIVE = 'ACTIVE'
    STATUS_PAUSED = 'PAUSED'
    STATUS_CANCELLED = 'CANCELLED'
    STATUS_CHOICES = [
        (STATUS_TRIAL, 'Trial'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_PAUSED, 'Paused'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(
        max_length=80,
        unique=True,
        help_text='Subdomain slug, e.g. hacktive for hacktive.mainframe.ozicyber.com.au',
    )
    primary_domain = models.CharField(max_length=255, blank=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_PRO)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TRIAL)

    primary_contact_name = models.CharField(max_length=255, blank=True)
    primary_contact_email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)

    subscription_started_at = models.DateField(null=True, blank=True)
    subscription_renews_at = models.DateField(null=True, blank=True)
    max_users = models.PositiveIntegerField(default=10)
    max_organizations = models.PositiveIntegerField(default=25)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tenants',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def tenant_url(self):
        if self.primary_domain:
            return f'https://{self.primary_domain}'
        return f'https://{self.slug}.mainframe.ozicyber.com.au'

