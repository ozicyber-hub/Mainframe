from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0003_reportmessage'),
    ]

    operations = [
        migrations.AlterField(
            model_name='reportexport',
            name='file',
            field=models.FileField(blank=True, null=True, upload_to='report_exports/'),
        ),
    ]
