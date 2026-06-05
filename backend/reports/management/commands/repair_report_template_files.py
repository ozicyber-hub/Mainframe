from pathlib import Path
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand

from reports.models import ReportTemplate


class Command(BaseCommand):
    help = 'Repair known seeded report template files that are referenced in the database but missing from MEDIA_ROOT.'

    def handle(self, *args, **options):
        repairs = {
            'report_templates/ozicyber_generator_template.docx': settings.BASE_DIR / 'template_upload.docx',
        }

        repaired = 0
        skipped = 0

        for relative_name, source_path in repairs.items():
            templates = ReportTemplate.objects.filter(docx_file=relative_name)
            if not templates.exists():
                continue

            if not source_path.exists():
                self.stderr.write(f'Seed template not found: {source_path}')
                skipped += templates.count()
                continue

            target_path = Path(settings.MEDIA_ROOT) / relative_name
            if target_path.exists():
                skipped += templates.count()
                continue

            target_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_path, target_path)
            repaired += templates.count()
            self.stdout.write(f'Repaired {relative_name} from {source_path}')

        self.stdout.write(self.style.SUCCESS(f'Repaired {repaired} template reference(s), skipped {skipped}.'))
