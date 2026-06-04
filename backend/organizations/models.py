"""
Organization and Client models for multi-tenant architecture
"""
from django.db import models
from django.conf import settings


class Organization(models.Model):
    """
    Organization/Tenant model for multi-tenant isolation
    Each organization has its own users, engagements, and findings
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, help_text="URL-friendly identifier")
    description = models.TextField(blank=True)

    # Branding
    logo = models.ImageField(upload_to='org_logos/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#24483E', help_text="Primary brand color (hex)")
    secondary_color = models.CharField(max_length=7, default='#FFF1AA', help_text="Secondary brand color (hex)")

    # Contact info
    website = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)

    # Settings
    is_active = models.BooleanField(default=True)
    allow_client_portal = models.BooleanField(default=True, help_text="Allow client access to findings")
    email_notifications_enabled = models.BooleanField(default=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_organizations'
    )

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Organizations'

    def __str__(self):
        return self.name

    def user_count(self):
        return self.users.count()

    def engagement_count(self):
        return self.engagements.count()


class ClientContact(models.Model):
    """
    Client contacts associated with an organization
    These are the people who receive reports and updates
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='client_contacts'
    )

    # Contact details
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    job_title = models.CharField(max_length=150, blank=True)

    # Notification preferences
    notify_on_new_finding = models.BooleanField(default=True)
    notify_on_finding_update = models.BooleanField(default=True)
    notify_on_report_published = models.BooleanField(default=True)

    # Metadata
    is_primary = models.BooleanField(default=False, help_text="Primary contact for organization")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_primary', 'last_name']
        unique_together = ['organization', 'email']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.organization.name})"


class OrganizationMember(models.Model):
    """
    Explicit membership linking users to organizations with roles
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='memberships'
    )

    # Member-specific role override (optional)
    role_override = models.CharField(
        max_length=20,
        choices=[
            ('ADMIN', 'Admin'),
            ('PENTESTER', 'Penetration Tester'),
            ('PROJECT_MANAGER', 'Project Manager'),
            ('CLIENT', 'Client'),
        ],
        null=True,
        blank=True
    )

    # Join details
    invited_at = models.DateTimeField(auto_now_add=True)
    joined_at = models.DateTimeField(null=True, blank=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_invitations'
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['organization', 'user']
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.email} - {self.organization.name}"

    @property
    def effective_role(self):
        """Get the effective role (member-specific override or user default)"""
        return self.role_override or self.user.role
