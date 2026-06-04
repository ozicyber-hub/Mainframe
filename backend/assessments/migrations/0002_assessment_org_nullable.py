from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0001_initial'),
        ('organizations', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='assessment',
            name='organization',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='assessments',
                to='organizations.organization',
            ),
        ),
    ]
