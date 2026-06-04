from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('findings', '0002_finding_impact_rating_likelihood_rating'),
    ]

    operations = [
        migrations.AddField(
            model_name='finding',
            name='affected_asset',
            field=models.TextField(blank=True, help_text='URLs, IPs, hostnames, or components affected by this finding'),
        ),
    ]
