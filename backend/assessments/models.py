from django.db import models
from django.conf import settings


FRAMEWORK_CHOICES = [
    ('ESSENTIAL_EIGHT', 'Essential Eight (ACSC)'),
    ('CIS',             'CIS Controls v8'),
    ('AESCSF',          'AESCSF 2023 (v2)'),
    ('AESCSF_V1',       'AESCSF v1'),
    ('CUSTOM',          'Custom'),
]

QUESTION_TYPE_CHOICES = [
    ('YESNO',   'Yes / No'),
    ('MATURITY','Maturity Level (0-3)'),
    ('CHOICE',  'Multiple Choice'),
    ('TEXT',    'Free Text'),
    ('RATING',  'Rating (1-5)'),
]

STATUS_CHOICES = [
    ('DRAFT',       'Draft'),
    ('IN_PROGRESS', 'In Progress'),
    ('COMPLETED',   'Completed'),
    ('ARCHIVED',    'Archived'),
]


class AssessmentTemplate(models.Model):
    name        = models.CharField(max_length=200)
    framework   = models.CharField(max_length=30, choices=FRAMEWORK_CHOICES, default='CUSTOM')
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['framework', 'name']

    def __str__(self):
        return self.name


class AssessmentSection(models.Model):
    template    = models.ForeignKey(AssessmentTemplate, on_delete=models.CASCADE, related_name='sections')
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.template.name} — {self.name}"


class AssessmentQuestion(models.Model):
    section        = models.ForeignKey(AssessmentSection, on_delete=models.CASCADE, related_name='questions')
    text           = models.TextField()
    guidance       = models.TextField(blank=True)
    question_type  = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default='YESNO')
    options        = models.JSONField(default=list, blank=True)
    maturity_level = models.PositiveIntegerField(null=True, blank=True)
    order          = models.PositiveIntegerField(default=0)
    is_required    = models.BooleanField(default=True)
    weight         = models.FloatField(default=1.0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text[:80]


class Assessment(models.Model):
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='assessments', null=True, blank=True)
    engagement   = models.ForeignKey('engagements.Engagement', on_delete=models.SET_NULL, null=True, blank=True, related_name='assessments')
    template     = models.ForeignKey(AssessmentTemplate, on_delete=models.PROTECT, related_name='instances')
    title        = models.CharField(max_length=300)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    assessor     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assessed')
    created_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_assessments')
    notes          = models.TextField(blank=True)
    score          = models.FloatField(null=True, blank=True)
    is_baseline    = models.BooleanField(default=False)
    # E8: {section_id: target_ml} e.g. {"12": 2, "13": 1}
    # Gap analysis: {section_id: True} for selected sub-frameworks
    control_config = models.JSONField(default=dict, blank=True)
    baseline     = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='followups')

    # Scheduling fields — mirrors Engagement model
    start_date      = models.DateField(null=True, blank=True)
    end_date        = models.DateField(null=True, blank=True)
    grc_consultant  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='grc_assessments',
        help_text='GRC Consultant assigned to conduct this assessment',
    )

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def calculate_score(self):
        framework  = self.template.framework
        is_aescsf  = framework in ('AESCSF', 'AESCSF_V1')
        is_e8      = framework == 'ESSENTIAL_EIGHT'
        is_cis     = framework == 'CIS'
        is_level   = is_e8 or is_cis

        config = (self.control_config or {}) if (is_level or is_aescsf) else None

        # AESCSF: global SP target stored in control_config as '__sp'
        sp_target = None
        if is_aescsf and config:
            raw = config.get('__sp')
            if raw is not None:
                try:
                    sp_target = int(float(raw))
                except (TypeError, ValueError):
                    pass

        POSITIVE      = {'YES', 'ACHIEVED', 'TRUE', 'Fully Implemented'}
        PARTIAL_75    = {'Largely Implemented'}
        PARTIAL_50    = {'PARTIAL', 'Partially Implemented'}

        responses = self.responses.select_related('question')
        total_weight = achieved_weight = 0.0
        for r in responses:
            q = r.question

            # AESCSF: SP scope filter — q.weight stores the SP level
            if is_aescsf and sp_target is not None:
                q_sp = int(q.weight) if q.weight else 1
                if q_sp > sp_target:
                    continue

            # E8/CIS: per-section ML scope filter
            if is_level and config is not None:
                sec_id    = str(q.section_id)
                target_ml = int(config.get(sec_id, config.get(q.section_id, 1)))
                if q.maturity_level is not None and q.maturity_level > target_ml:
                    continue

            # AESCSF uses uniform weight 1.0 (q.weight stores SP, not importance)
            w = 1.0 if is_aescsf else q.weight
            total_weight += w

            ans = r.answer
            if ans in POSITIVE or r.maturity_achieved:
                achieved_weight += w
            elif ans in PARTIAL_75:
                achieved_weight += w * 0.75
            elif ans in PARTIAL_50:
                achieved_weight += w * 0.5

        if total_weight == 0:
            return None
        return round((achieved_weight / total_weight) * 100, 1)


class AssessmentResponse(models.Model):
    assessment        = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='responses')
    question          = models.ForeignKey(AssessmentQuestion, on_delete=models.CASCADE, related_name='responses')
    answer            = models.CharField(max_length=500, blank=True)
    maturity_achieved = models.BooleanField(default=False)
    notes             = models.TextField(blank=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['assessment', 'question']

    def __str__(self):
        return f"{self.assessment.title} / Q{self.question.id}"


class AssessmentEvidence(models.Model):
    response    = models.ForeignKey(AssessmentResponse, on_delete=models.CASCADE, related_name='evidence')
    file        = models.FileField(upload_to='assessment_evidence/')
    description = models.CharField(max_length=500, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.description or self.file.name


# ── GRC Evidence Request / Submission System ─────────────────────────────────

class SectionEvidenceRequirement(models.Model):
    """Template-level: defines what evidence must be submitted for a section."""

    DOC_TYPE_CHOICES = [
        ('POLICY',        'Policy Document'),
        ('PROCEDURE',     'Procedure / SOP'),
        ('PLAN',          'Plan (BCP / IR / DR)'),
        ('LOG',           'Log / Audit Trail'),
        ('REPORT',        'Report / Assessment'),
        ('CERTIFICATION', 'Certification / Accreditation'),
        ('SCREENSHOT',    'Screenshot / Demonstration'),
        ('CONTRACT',      'Contract / Agreement'),
        ('TRAINING',      'Training Records'),
        ('OTHER',         'Other Evidence'),
    ]

    section           = models.ForeignKey(AssessmentSection, on_delete=models.CASCADE, related_name='evidence_requirements')
    title             = models.CharField(max_length=200)
    description       = models.TextField(blank=True, help_text="What this evidence must contain or demonstrate")
    document_type     = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES, default='POLICY')
    required          = models.BooleanField(default=True)
    validation_prompt = models.TextField(blank=True, help_text="Additional AI validation criteria")
    order             = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.section.name} — {self.title}"


SUBMISSION_STATUS_CHOICES = [
    ('not_started', 'Not Started'),
    ('submitted',   'Submitted — Pending Review'),
    ('ai_reviewed', 'AI Review Complete'),
    ('accepted',    'Accepted'),
    ('rejected',    'Rejected — Resubmit Required'),
    ('na',          'Not Applicable'),
]


class EvidenceSubmission(models.Model):
    """Assessment-level: a client's uploaded evidence against one requirement."""

    assessment      = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='evidence_submissions')
    requirement     = models.ForeignKey(SectionEvidenceRequirement, on_delete=models.CASCADE, related_name='submissions')

    file            = models.FileField(upload_to='evidence_submissions/%Y/%m/', null=True, blank=True)
    filename        = models.CharField(max_length=255, blank=True)

    submitted_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='evidence_submitted')
    submitted_at    = models.DateTimeField(null=True, blank=True)

    status          = models.CharField(max_length=20, choices=SUBMISSION_STATUS_CHOICES, default='not_started')

    # AI validation result
    ai_result       = models.JSONField(null=True, blank=True)
    ai_validated_at = models.DateTimeField(null=True, blank=True)

    # Auditor review
    reviewer_notes  = models.TextField(blank=True)
    reviewed_by     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='evidence_reviewed')
    reviewed_at     = models.DateTimeField(null=True, blank=True)

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['assessment', 'requirement']
        ordering        = ['requirement__order', 'requirement__id']

    def __str__(self):
        return f"{self.assessment.title} — {self.requirement.title} ({self.status})"
