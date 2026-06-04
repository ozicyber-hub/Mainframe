from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('integrations', '0002_jiraissuelink_sync_fields'),
        ('organizations', '0002_alter_organization_website'),
    ]

    operations = [
        migrations.AlterField(
            model_name='integrationsetting',
            name='provider',
            field=models.CharField(choices=[('webhook', 'Webhook'), ('jira', 'Jira')], max_length=40),
        ),
        migrations.AddField(
            model_name='integrationsetting',
            name='organization',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='integration_settings', to='organizations.organization'),
        ),
        migrations.AddConstraint(
            model_name='integrationsetting',
            constraint=models.UniqueConstraint(fields=('provider', 'organization'), name='unique_integration_provider_per_org'),
        ),
        migrations.AlterModelOptions(
            name='integrationsetting',
            options={'ordering': ['organization__name', 'provider']},
        ),
    ]
