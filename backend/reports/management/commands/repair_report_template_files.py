from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage

from reports.models import ReportTemplate
from reports.template_files import (
    SEEDED_REPORT_TEMPLATE_FILES,
    ensure_seeded_report_template_file,
    seeded_report_template_source,
)


class Command(BaseCommand):
    help = 'Repair known seeded report template files that are referenced in the database but missing from MEDIA_ROOT.'

    def handle(self, *args, **options):
        repaired = 0
        skipped = 0

        for relative_name in SEEDED_REPORT_TEMPLATE_FILES:
            templates = ReportTemplate.objects.filter(docx_file=relative_name)
            if not templates.exists():
                continue

            source_path = seeded_report_template_source(relative_name)
            if not source_path.exists():
                self.stderr.write(f'Seed template not found: {source_path}')
                skipped += templates.count()
                continue

            if default_storage.exists(relative_name):
                skipped += templates.count()
                continue

            if ensure_seeded_report_template_file(relative_name):
                repaired += templates.count()
                self.stdout.write(f'Repaired {relative_name} from {source_path}')
            else:
                skipped += templates.count()

        self.stdout.write(self.style.SUCCESS(f'Repaired {repaired} template reference(s), skipped {skipped}.'))
