from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0003_add_aescsf_framework'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='assessment',
            name='is_baseline',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='assessment',
            name='baseline',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='followups',
                to='assessments.assessment',
            ),
        ),
    ]
