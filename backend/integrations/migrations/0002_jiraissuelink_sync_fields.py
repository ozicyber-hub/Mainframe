from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('integrations', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='jiraissuelink',
            name='assignee_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='jiraissuelink',
            name='last_synced_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='jiraissuelink',
            name='priority_name',
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name='jiraissuelink',
            name='raw_status',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='jiraissuelink',
            name='status_category',
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.AddField(
            model_name='jiraissuelink',
            name='status_name',
            field=models.CharField(blank=True, max_length=80),
        ),
    ]
