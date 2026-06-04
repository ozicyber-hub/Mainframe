from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0006_remove_deprecated_frameworks'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SectionEvidenceRequirement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, help_text='What this evidence must contain or demonstrate')),
                ('document_type', models.CharField(
                    choices=[
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
                    ],
                    default='POLICY',
                    max_length=20,
                )),
                ('required', models.BooleanField(default=True)),
                ('validation_prompt', models.TextField(blank=True, help_text='Additional AI validation criteria')),
                ('order', models.PositiveIntegerField(default=0)),
                ('section', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='evidence_requirements',
                    to='assessments.assessmentsection',
                )),
            ],
            options={'ordering': ['order', 'id']},
        ),
        migrations.CreateModel(
            name='EvidenceSubmission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(blank=True, null=True, upload_to='evidence_submissions/%Y/%m/')),
                ('filename', models.CharField(blank=True, max_length=255)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(
                    choices=[
                        ('not_started', 'Not Started'),
                        ('submitted',   'Submitted — Pending Review'),
                        ('ai_reviewed', 'AI Review Complete'),
                        ('accepted',    'Accepted'),
                        ('rejected',    'Rejected — Resubmit Required'),
                        ('na',          'Not Applicable'),
                    ],
                    default='not_started',
                    max_length=20,
                )),
                ('ai_result', models.JSONField(blank=True, null=True)),
                ('ai_validated_at', models.DateTimeField(blank=True, null=True)),
                ('reviewer_notes', models.TextField(blank=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assessment', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='evidence_submissions',
                    to='assessments.assessment',
                )),
                ('requirement', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='submissions',
                    to='assessments.sectionevidencerequirement',
                )),
                ('submitted_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='evidence_submitted',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('reviewed_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='evidence_reviewed',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['requirement__order', 'requirement__id'],
                'unique_together': {('assessment', 'requirement')},
            },
        ),
    ]
