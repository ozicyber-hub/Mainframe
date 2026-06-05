from django.db import migrations


def clear_stale_seeded_template_reference(apps, schema_editor):
    ReportTemplate = apps.get_model('reports', 'ReportTemplate')
    ReportTemplate.objects.filter(
        docx_file='report_templates/ozicyber_generator_template.docx',
    ).update(docx_file='')


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0007_make_orphan_report_templates_global'),
    ]

    operations = [
        migrations.RunPython(clear_stale_seeded_template_reference, migrations.RunPython.noop),
    ]
