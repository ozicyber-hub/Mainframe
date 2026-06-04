from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0004_add_baseline_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='assessment',
            name='control_config',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name='assessmenttemplate',
            name='framework',
            field=models.CharField(
                choices=[
                    ('ESSENTIAL_EIGHT', 'Essential Eight (ACSC)'),
                    ('GAP_ANALYSIS',    'Gap Analysis (Generic)'),
                    ('NIST_CSF',        'NIST Cybersecurity Framework 2.0'),
                    ('ISO_27001',       'ISO/IEC 27001:2022'),
                    ('ISM',             'Australian Government ISM'),
                    ('CIS',             'CIS Controls v8'),
                    ('AESCSF',          'AESCSF 2023 (v2)'),
                    ('AESCSF_V1',       'AESCSF v1'),
                    ('CUSTOM',          'Custom'),
                ],
                default='CUSTOM',
                max_length=30,
            ),
        ),
    ]
