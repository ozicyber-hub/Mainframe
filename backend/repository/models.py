"""
Finding Repository models for reusable finding templates
"""
from django.db import models
from django.conf import settings
from organizations.models import Organization


class RepositoryFolder(models.Model):
    """Custom folder for organising finding templates."""
    organization  = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='repo_folders', null=True, blank=True)
    parent        = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    name          = models.CharField(max_length=200)
    description   = models.TextField(blank=True)
    color         = models.CharField(max_length=7, default='#24483E')
    is_private    = models.BooleanField(default=False)
    allowed_users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='accessible_folders')
    created_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_repo_folders')
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class FindingTemplate(models.Model):
    """
    Reusable finding template for the repository
    """
    CATEGORY_CHOICES = [
        ('WEB', 'Web Application'),
        ('MOBILE', 'Mobile Application'),
        ('NETWORK', 'Network Infrastructure'),
        ('API', 'API'),
        ('CLOUD', 'Cloud Infrastructure'),
        ('SOCIAL', 'Social Engineering'),
        ('PHYSICAL', 'Physical Security'),
        ('WIRELESS', 'Wireless'),
        ('CONFIG', 'Misconfiguration'),
        ('AUTH', 'Authentication'),
        ('ENCRYPTION', 'Cryptography'),
        ('SESSION', 'Session Management'),
        ('INPUT', 'Input Validation'),
        ('ACCESS', 'Access Control'),
        ('LOGGING', 'Logging & Monitoring'),
        ('OTHER', 'Other'),
    ]

    # Basic info
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='finding_templates',
        null=True,
        blank=True
    )
    folder    = models.ForeignKey(RepositoryFolder, on_delete=models.SET_NULL, null=True, blank=True, related_name='templates')
    is_global = models.BooleanField(default=False, help_text="Global template available to all organizations")

    # Template details
    title = models.CharField(max_length=500)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField()
    details = models.TextField(blank=True)
    impact = models.TextField()
    likelihood = models.TextField()
    recommendations = models.TextField()
    supporting_evidence = models.TextField(blank=True)

    # Default severity
    default_severity = models.CharField(
        max_length=20,
        choices=[
            ('INFORMATIONAL', 'Informational'),
            ('LOW', 'Low'),
            ('MEDIUM', 'Medium'),
            ('HIGH', 'High'),
            ('CRITICAL', 'Critical'),
        ]
    )

    # CVSS defaults
    cvss_vector = models.CharField(max_length=255, blank=True)
    av = models.CharField(max_length=20, blank=True)
    ac = models.CharField(max_length=20, blank=True)
    pr = models.CharField(max_length=20, blank=True)
    ui = models.CharField(max_length=20, blank=True)
    s = models.CharField(max_length=20, blank=True)
    c = models.CharField(max_length=20, blank=True)
    i = models.CharField(max_length=20, blank=True)
    a = models.CharField(max_length=20, blank=True)

    # References
    references = models.TextField(blank=True)
    cwe_id = models.CharField(max_length=50, blank=True)

    # Tags for search
    tags = models.JSONField(default=list, help_text="List of tags for searching")

    # Usage tracking
    usage_count = models.PositiveIntegerField(default=0)

    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-usage_count', 'title']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['is_global']),
        ]

    def __str__(self):
        return f"[{self.category}] {self.title}"

    def increment_usage(self):
        self.usage_count += 1
        self.save(update_fields=['usage_count'])


class FindingTemplateTag(models.Model):
    """
    Tags for organizing finding templates
    """
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#24483E', help_text="Hex color code")

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
