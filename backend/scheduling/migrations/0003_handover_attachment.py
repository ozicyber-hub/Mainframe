from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import scheduling.models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0002_event_completion_comments'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='HandoverAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to=scheduling.models.handover_upload_path)),
                ('filename', models.CharField(max_length=300)),
                ('file_size', models.PositiveIntegerField(default=0)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='handover_attachments', to='scheduling.calendarevent')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='handover_uploads', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['uploaded_at']},
        ),
    ]
