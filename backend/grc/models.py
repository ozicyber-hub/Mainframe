from django.db import models
from django.conf import settings

FRAMEWORK_KEY_CHOICES = [
    ('NIST_CSF_2',      'NIST Cybersecurity Framework 2.0'),
    ('NIST_800_171_R3', 'NIST SP 800-171 Rev 3'),
    ('ISO_27001_2022',  'ISO/IEC 27001:2022'),
    ('SOC2',            'SOC 2 Type II'),
    ('HIPAA',           'HIPAA Security Rule'),
]

CONTROL_STATUS_CHOICES = [
    ('NOT_STARTED',           'Not Started'),
    ('IN_PROGRESS',           'In Progress'),
    ('IMPLEMENTED',           'Implemented'),
    ('PARTIALLY_IMPLEMENTED', 'Partially Implemented'),
    ('NOT_APPLICABLE',        'Not Applicable'),
    ('PLANNED',               'Planned'),
]

PROJECT_STATUS_CHOICES = [
    ('ACTIVE',    'Active'),
    ('COMPLETED', 'Completed'),
    ('ARCHIVED',  'Archived'),
]


class GrcFramework(models.Model):
    key         = models.CharField(max_length=30, unique=True, choices=FRAMEWORK_KEY_CHOICES)
    name        = models.CharField(max_length=200)
    version     = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class GrcFamily(models.Model):
    framework   = models.ForeignKey(GrcFramework, on_delete=models.CASCADE, related_name='families')
    identifier  = models.CharField(max_length=20)
    name        = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['framework', 'identifier']

    def __str__(self):
        return f"{self.identifier}: {self.name}"


class GrcControl(models.Model):
    family      = models.ForeignKey(GrcFamily, on_delete=models.CASCADE, related_name='controls')
    control_id  = models.CharField(max_length=30)
    title       = models.CharField(max_length=500)
    statement   = models.TextField(blank=True)
    discussion  = models.TextField(blank=True)
    is_category = models.BooleanField(default=False)
    parent      = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name='children')
    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['family', 'control_id']

    def __str__(self):
        return f"{self.control_id}: {self.title[:60]}"


class GrcProject(models.Model):
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE,
                                     related_name='grc_projects', null=True, blank=True)
    engagement   = models.ForeignKey('engagements.Engagement', on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='grc_projects')
    framework    = models.ForeignKey(GrcFramework, on_delete=models.PROTECT, related_name='projects')
    title        = models.CharField(max_length=300)
    description  = models.TextField(blank=True)
    status       = models.CharField(max_length=20, choices=PROJECT_STATUS_CHOICES, default='ACTIVE')
    assessor     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='grc_assessor')
    created_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, related_name='grc_created')
    notes        = models.TextField(blank=True)
    target_date  = models.DateField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def completion_stats(self):
        qs          = self.control_statuses.filter(control__is_category=False)
        total       = qs.count()
        implemented = qs.filter(status='IMPLEMENTED').count()
        partial     = qs.filter(status='PARTIALLY_IMPLEMENTED').count()
        in_progress = qs.filter(status='IN_PROGRESS').count()
        not_appl    = qs.filter(status='NOT_APPLICABLE').count()
        planned     = qs.filter(status='PLANNED').count()
        not_started = max(total - implemented - partial - in_progress - not_appl - planned, 0)
        return {
            'total':          total,
            'implemented':    implemented,
            'partial':        partial,
            'in_progress':    in_progress,
            'not_applicable': not_appl,
            'planned':        planned,
            'not_started':    not_started,
            'pct': round((implemented / total) * 100, 1) if total else 0,
        }


class GrcControlStatus(models.Model):
    project              = models.ForeignKey(GrcProject, on_delete=models.CASCADE,
                                             related_name='control_statuses')
    control              = models.ForeignKey(GrcControl, on_delete=models.CASCADE,
                                             related_name='statuses')
    status               = models.CharField(max_length=30, choices=CONTROL_STATUS_CHOICES,
                                            default='NOT_STARTED')
    implementation_notes = models.TextField(blank=True)
    owner                = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                              null=True, blank=True, related_name='owned_grc_controls')
    due_date             = models.DateField(null=True, blank=True)
    review_date          = models.DateField(null=True, blank=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['project', 'control']
        ordering        = ['control__order']

    def __str__(self):
        return f"{self.project.title} / {self.control.control_id}"


class GrcEvidence(models.Model):
    control_status = models.ForeignKey(GrcControlStatus, on_delete=models.CASCADE,
                                       related_name='evidence')
    title          = models.CharField(max_length=300)
    description    = models.TextField(blank=True)
    file           = models.FileField(upload_to='grc_evidence/', blank=True, null=True)
    url            = models.URLField(blank=True)
    uploaded_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
