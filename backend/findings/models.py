"""
Finding models for penetration test findings
"""
from django.db import models
from django.conf import settings
from engagements.models import Engagement


class Finding(models.Model):
    """
    A security finding from a penetration test engagement
    """
    SEVERITY_CHOICES = [
        ('INFORMATIONAL', 'Informational', 0),
        ('LOW', 'Low', 1),
        ('MEDIUM', 'Medium', 2),
        ('HIGH', 'High', 3),
        ('CRITICAL', 'Critical', 4),
    ]

    PENTEST_TYPE_CHOICES = [
        ('WEB_APP',    'Web Application'),
        ('INTERNAL',   'Internal Network'),
        ('EXTERNAL',   'External Network'),
        ('MOBILE',     'Mobile Application'),
        ('API',        'API Testing'),
        ('CLOUD',      'Cloud Infrastructure'),
        ('SOCIAL_ENG', 'Social Engineering'),
        ('PHYSICAL',   'Physical Security'),
        ('RED_TEAM',   'Red Team'),
        ('WIRELESS',   'Wireless'),
        ('OTHER',      'Other'),
    ]

    RATING_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    ]

    LEVEL_OF_ACCESS_CHOICES = [
        ('UNAUTHENTICATED', 'Unauthenticated'),
        ('AUTHENTICATED', 'Authenticated'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft Finding'),
        ('OPEN', 'Open'),
        ('IN_REVIEW', 'In Review'),
        ('PUBLISHED', 'Published'),
        ('REMEDIATED', 'Remediated'),
        ('FALSE_POSITIVE', 'False Positive'),
        ('ACCEPTED_RISK', 'Risk Accepted'),
    ]

    # Core fields
    engagement = models.ForeignKey(
        Engagement,
        on_delete=models.CASCADE,
        related_name='findings'
    )
    title = models.CharField(max_length=500)
    severity = models.CharField(max_length=20, choices=[(s[0], s[1]) for s in SEVERITY_CHOICES])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')

    # Pentest type tag
    pentest_type = models.CharField(max_length=20, choices=PENTEST_TYPE_CHOICES, blank=True)

    # Key finding flag — surfaces title + mitigation snippet in the executive summary page
    is_key_finding = models.BooleanField(default=False)

    # Risk matrix ratings
    impact_rating = models.CharField(max_length=10, choices=RATING_CHOICES, blank=True)
    likelihood_rating = models.CharField(max_length=10, choices=RATING_CHOICES, blank=True)

    # CVSS 3.1 Scores
    cvss_score = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    cvss_vector = models.CharField(max_length=255, blank=True)

    # CVSS 3.1 Base Metrics
    # Attack Vector
    av = models.CharField(max_length=20, choices=[
        ('N', 'Network'), ('A', 'Adjacent'), ('L', 'Local'), ('P', 'Physical')
    ], blank=True)
    # Attack Complexity
    ac = models.CharField(max_length=20, choices=[
        ('L', 'Low'), ('H', 'High')
    ], blank=True)
    # Privileges Required
    pr = models.CharField(max_length=20, choices=[
        ('N', 'None'), ('L', 'Low'), ('H', 'High')
    ], blank=True)
    # User Interaction
    ui = models.CharField(max_length=20, choices=[
        ('N', 'None'), ('R', 'Required')
    ], blank=True)
    # Scope
    s = models.CharField(max_length=20, choices=[
        ('U', 'Unchanged'), ('C', 'Changed')
    ], blank=True)
    # Confidentiality Impact
    c = models.CharField(max_length=20, choices=[
        ('N', 'None'), ('L', 'Low'), ('H', 'High')
    ], blank=True)
    # Integrity Impact
    i = models.CharField(max_length=20, choices=[
        ('N', 'None'), ('L', 'Low'), ('H', 'High')
    ], blank=True)
    # Availability Impact
    a = models.CharField(max_length=20, choices=[
        ('N', 'None'), ('L', 'Low'), ('H', 'High')
    ], blank=True)

    # Level of access used during testing
    level_of_access = models.CharField(max_length=20, choices=LEVEL_OF_ACCESS_CHOICES, blank=True)

    # Affected asset
    affected_asset = models.TextField(blank=True, help_text="URLs, IPs, hostnames, or components affected by this finding")

    # Description fields
    description = models.TextField(help_text="Executive summary of the finding")
    details = models.TextField(blank=True, help_text="Technical details of how the vulnerability was discovered")
    impact = models.TextField(help_text="Business/technical impact if exploited")
    likelihood = models.TextField(help_text="Likelihood of exploitation")
    recommendations = models.TextField(help_text="Remediation recommendations")
    supporting_evidence = models.TextField(blank=True, help_text="Additional evidence, logs, screenshots description")

    # References
    references = models.TextField(blank=True, help_text="External references (CVE, CWE, OWASP, etc.)")
    cwe_id = models.CharField(max_length=50, blank=True, help_text="CWE ID (e.g., CWE-79)")
    cve_id = models.CharField(max_length=50, blank=True, help_text="CVE ID if applicable")

    # Custom fields (JSON for flexibility)
    custom_fields = models.JSONField(default=dict, blank=True)

    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_findings'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_findings'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    remediated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['engagement', 'severity']),
            models.Index(fields=['engagement', 'status']),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.title}"

    def save(self, *args, **kwargs):
        # Auto-calculate CVSS if vector is provided
        if self.cvss_vector and not self.cvss_score:
            self.cvss_score = self.calculate_cvss()

        # Set published_at when status changes to PUBLISHED
        if self.status == 'PUBLISHED' and not self.published_at:
            from django.utils import timezone
            self.published_at = timezone.now()

        # Set remediated_at when status changes to REMEDIATED
        if self.status == 'REMEDIATED' and not self.remediated_at:
            from django.utils import timezone
            self.remediated_at = timezone.now()

        super().save(*args, **kwargs)

    def calculate_cvss(self):
        """Calculate CVSS 3.1 score from base metrics"""
        if not all([self.av, self.ac, self.pr, self.ui, self.s, self.c, self.i, self.a]):
            return None

        # CVSS 3.1 calculation weights
        av_weights = {'N': 0.85, 'A': 0.62, 'L': 0.55, 'P': 0.20}
        ac_weights = {'L': 0.77, 'H': 0.44}
        pr_weights = {
            'N': 0.85 if self.s == 'C' else 0.85,
            'L': 0.62 if self.s == 'C' else 0.62,
            'H': 0.27 if self.s == 'C' else 0.27
        }
        ui_weights = {'N': 0.85, 'R': 0.62}
        c_weights = {'N': 0.0, 'L': 0.22, 'H': 0.56}
        i_weights = {'N': 0.0, 'L': 0.22, 'H': 0.56}
        a_weights = {'N': 0.0, 'L': 0.22, 'H': 0.56}

        # Calculate Impact Sub-Score
        isc_base = 1 - ((1 - c_weights[self.c]) * (1 - i_weights[self.i]) * (1 - a_weights[self.a]))

        if self.s == 'U':
            # Unchanged Scope
            impact = 6.42 * isc_base
            exploitability = 8.22 * av_weights[self.av] * ac_weights[self.ac] * pr_weights[self.pr] * ui_weights[self.ui]
        else:
            # Changed Scope
            impact = 7.52 * (isc_base - 0.029) - 3.25 * pow((isc_base - 0.02), 15)
            exploitability = 8.22 * av_weights[self.av] * ac_weights[self.ac] * pr_weights[self.pr] * ui_weights[self.ui] * 1.08

        if impact <= 0:
            return 0.0

        if self.s == 'U':
            score = min(10, 0.6 * impact + 0.4 * exploitability - 1.5)
        else:
            score = min(10, 0.6 * impact + 0.4 * exploitability - 1.5) * 1.08

        # Round to 1 decimal place
        return round(score, 1)

    @property
    def severity_weight(self):
        """Get numeric weight for severity"""
        weights = {'INFORMATIONAL': 0, 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}
        return weights.get(self.severity, 0)


class FindingImage(models.Model):
    """
    Images/screenshots for a finding
    """
    finding = models.ForeignKey(Finding, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='finding_images/')
    caption = models.CharField(max_length=500, blank=True)
    order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'uploaded_at']

    def __str__(self):
        return f"Image for {self.finding.title}"


class FindingComment(models.Model):
    """
    Comments on findings
    """
    finding = models.ForeignKey(Finding, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    is_internal = models.BooleanField(default=False, help_text="Internal only comment (not visible to client)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.email} on {self.finding.title}"


class FindingCustomField(models.Model):
    """
    Custom field definitions for findings
    """
    FIELD_TYPE_CHOICES = [
        ('TEXT', 'Text'),
        ('TEXTAREA', 'Text Area'),
        ('NUMBER', 'Number'),
        ('DATE', 'Date'),
        ('SELECT', 'Select Dropdown'),
        ('CHECKBOX', 'Checkbox'),
        ('URL', 'URL'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='finding_custom_fields'
    )
    name = models.CharField(max_length=100)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES)
    options = models.JSONField(default=list, blank=True, help_text="Options for SELECT type")
    required = models.BooleanField(default=False)
    default_value = models.CharField(max_length=500, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']
        unique_together = ['organization', 'name']

    def __str__(self):
        return f"{self.name} ({self.field_type})"


