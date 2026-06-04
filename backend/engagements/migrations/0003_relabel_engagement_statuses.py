from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('engagements', '0002_add_skip_weekends'),
    ]

    operations = [
        migrations.AlterField(
            model_name='engagement',
            name='status',
            field=models.CharField(
                choices=[
                    ('PLANNING', 'Placeholder'),
                    ('ACTIVE', 'Active'),
                    ('REPORTING', 'Reporting'),
                    ('REVIEW', 'Client Review'),
                    ('COMPLETED', 'Completed'),
                    ('ON_HOLD', 'Delayed'),
                    ('CANCELLED', 'Cancelled'),
                ],
                default='PLANNING',
                max_length=20,
            ),
        ),
    ]
