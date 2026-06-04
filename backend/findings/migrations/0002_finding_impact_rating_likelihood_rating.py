from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('findings', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='finding',
            name='impact_rating',
            field=models.CharField(
                blank=True,
                choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')],
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='finding',
            name='likelihood_rating',
            field=models.CharField(
                blank=True,
                choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')],
                max_length=10,
            ),
        ),
    ]
