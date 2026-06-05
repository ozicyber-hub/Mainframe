from django.db import migrations


def restore_seeded_template_reference(apps, schema_editor):
    ReportTemplate = apps.get_model('reports', 'ReportTemplate')
    ReportTemplate.objects.filter(
        name='Penetration Test Report v1.0',
        docx_file='',
    ).update(docx_file='report_templates/ozicyber_generator_template.docx')


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0008_clear_stale_seeded_report_template_reference'),
    ]

    operations = [
        migrations.RunPython(restore_seeded_template_reference, migrations.RunPython.noop),
    ]
