from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0004_reportexport_file_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='reporttemplate',
            name='docx_file',
            field=models.FileField(blank=True, null=True, upload_to='report_templates/'),
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='is_default',
            field=models.BooleanField(default=False),
        ),
    ]
