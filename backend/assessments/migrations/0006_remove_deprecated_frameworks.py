from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0005_add_control_config'),
    ]

    operations = [
        migrations.AlterField(
            model_name='assessmenttemplate',
            name='framework',
            field=models.CharField(
                choices=[
                    ('ESSENTIAL_EIGHT', 'Essential Eight (ACSC)'),
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
