from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0002_alter_report_engagement'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReportMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField(blank=True)),
                ('is_internal', models.BooleanField(default=False, help_text='Internal note — not visible to clients')),
                ('attachment', models.FileField(blank=True, null=True, upload_to='report_attachments/')),
                ('attachment_name', models.CharField(blank=True, help_text='Original filename', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='report_messages', to=settings.AUTH_USER_MODEL)),
                ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='reports.report')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
    ]
