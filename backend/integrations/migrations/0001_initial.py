from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('findings', '0006_add_level_of_access'),
    ]

    operations = [
        migrations.CreateModel(
            name='IntegrationSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(choices=[('webhook', 'Webhook'), ('jira', 'Jira')], max_length=40, unique=True)),
                ('enabled', models.BooleanField(default=False)),
                ('config', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_integration_settings', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_integration_settings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['provider'],
            },
        ),
        migrations.CreateModel(
            name='IntegrationDeliveryLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(max_length=40)),
                ('event', models.CharField(max_length=80)),
                ('status', models.CharField(choices=[('SUCCESS', 'Success'), ('FAILED', 'Failed'), ('SKIPPED', 'Skipped')], max_length=20)),
                ('request_payload', models.JSONField(blank=True, default=dict)),
                ('response_status', models.PositiveIntegerField(blank=True, null=True)),
                ('response_body', models.TextField(blank=True)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('finding', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='integration_logs', to='findings.finding')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='JiraIssueLink',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('issue_key', models.CharField(max_length=40)),
                ('issue_id', models.CharField(blank=True, max_length=80)),
                ('issue_url', models.URLField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('finding', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='jira_issue', to='findings.finding')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
