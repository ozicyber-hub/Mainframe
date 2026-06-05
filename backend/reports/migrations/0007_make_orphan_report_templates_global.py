from django.db import migrations


def make_orphan_templates_global(apps, schema_editor):
    ReportTemplate = apps.get_model('reports', 'ReportTemplate')
    ReportTemplate.objects.filter(
        organization__isnull=True,
        is_global=False,
    ).update(is_global=True)


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0006_attackchainentry'),
    ]

    operations = [
        migrations.RunPython(make_orphan_templates_global, migrations.RunPython.noop),
    ]
