from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('integrations', '0003_integrationsetting_organization_scope'),
    ]

    operations = [
        migrations.AlterField(
            model_name='integrationsetting',
            name='provider',
            field=models.CharField(choices=[('webhook', 'Webhook'), ('jira', 'Jira'), ('servicenow', 'ServiceNow')], max_length=40),
        ),
    ]
