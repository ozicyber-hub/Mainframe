"""
Report models for generating and exporting reports
"""
from django.db import models
from django.conf import settings
from engagements.models import Engagement
from organizations.models import Organization


class ReportTemplate(models.Model):
    """
    Report template with branding and boilerplate content
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Organization linkage
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='report_templates',
        null=True,
        blank=True
    )
    is_global = models.BooleanField(default=False)

    # Branding
    logo = models.ImageField(upload_to='template_logos/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#24483E')
    secondary_color = models.CharField(max_length=7, default='#FFF1AA')

    # Template sections (stored as JSON for flexibility)
    executive_summary_template = models.TextField(blank=True, help_text="Executive summary boilerplate")
    methodology_template = models.TextField(blank=True, help_text="Methodology section boilerplate")
    introduction_template = models.TextField(blank=True, help_text="Introduction boilerplate")
    conclusion_template = models.TextField(blank=True, help_text="Conclusion boilerplate")

    # Custom sections
    custom_sections = models.JSONField(default=list, blank=True, help_text="Additional custom sections")

    # The actual .docx file used for generation (<<placeholder>> marker format)
    docx_file = models.FileField(upload_to='report_templates/', null=True, blank=True)
    is_default = models.BooleanField(default=False)

    # Settings
    include_cvss_table = models.BooleanField(default=True)
    include_remediation_timeline = models.BooleanField(default=True)
    include_appendix = models.BooleanField(default=True)

    # Metadata
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Report(models.Model):
    """
    Generated report for an engagement
    """
    FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('DOCX', 'Word Document'),
        ('XLSX', 'Excel'),
        ('HTML', 'HTML'),
    ]

    engagement = models.ForeignKey(
        Engagement,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    template = models.ForeignKey(
        ReportTemplate,
        on_delete=models.SET_NULL,
        null=True
    )

    # Report content
    title = models.CharField(max_length=500)
    executive_summary = models.TextField(blank=True)
    methodology = models.TextField(blank=True)
    conclusion = models.TextField(blank=True)

    # Additional notes
    client_notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)

    # Versioning
    version = models.CharField(max_length=20, default='1.0')
    is_draft = models.BooleanField(default=True)

    # Generated files
    pdf_file = models.FileField(upload_to='reports/pdf/', null=True, blank=True)
    docx_file = models.FileField(upload_to='reports/docx/', null=True, blank=True)
    xlsx_file = models.FileField(upload_to='reports/xlsx/', null=True, blank=True)

    # Metadata
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report: {self.engagement.name} (v{self.version})"


class ReportMessage(models.Model):
    """
    Collaboration message on a report — visible to clients and/or pentesters
    """
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='report_messages')
    content = models.TextField(blank=True)
    is_internal = models.BooleanField(default=False, help_text="Internal note — not visible to clients")
    attachment = models.FileField(upload_to='report_attachments/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True, help_text="Original filename")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message by {self.author.email} on {self.report.title}"


class ReportExport(models.Model):
    """
    Track report exports/downloads
    """
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='exports')
    exported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    format = models.CharField(max_length=10, choices=Report.FORMAT_CHOICES)
    exported_at = models.DateTimeField(auto_now_add=True)
    file = models.FileField(upload_to='report_exports/', null=True, blank=True)

    class Meta:
        ordering = ['-exported_at']

    def __str__(self):
        return f"{self.report} - {self.format} export by {self.exported_by.email}"


class AttackChainEntry(models.Model):
    PHASE_CHOICES = [
        ('RECONNAISSANCE',      'Reconnaissance'),
        ('INITIAL_ACCESS',      'Initial Access'),
        ('EXECUTION',           'Execution'),
        ('PERSISTENCE',         'Persistence'),
        ('PRIVILEGE_ESCALATION','Privilege Escalation'),
        ('DEFENSE_EVASION',     'Defense Evasion'),
        ('CREDENTIAL_ACCESS',   'Credential Access'),
        ('LATERAL_MOVEMENT',    'Lateral Movement'),
        ('COLLECTION',          'Collection'),
        ('EXFILTRATION',        'Exfiltration'),
        ('IMPACT',              'Impact'),
    ]

    report   = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='attack_chain')
    finding  = models.ForeignKey('findings.Finding', on_delete=models.CASCADE, related_name='attack_chain_entries')
    phase    = models.CharField(max_length=30, choices=PHASE_CHOICES)
    position = models.PositiveIntegerField(default=0)
    notes    = models.TextField(blank=True)

    class Meta:
        ordering = ['phase', 'position']
        unique_together = [('report', 'finding', 'phase')]

    def __str__(self):
        return f"{self.finding.title} → {self.phase}"
