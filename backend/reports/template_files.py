from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage


SEEDED_REPORT_TEMPLATE_FILES = {
    'report_templates/ozicyber_generator_template.docx': 'template_upload.docx',
}


def seeded_report_template_source(relative_name):
    source_name = SEEDED_REPORT_TEMPLATE_FILES.get(relative_name)
    if not source_name:
        return None
    return Path(settings.BASE_DIR) / source_name


def ensure_seeded_report_template_file(relative_name, storage=None):
    storage = storage or default_storage
    source_path = seeded_report_template_source(relative_name)
    if source_path is None:
        return False

    if storage.exists(relative_name):
        return True

    if not source_path.exists():
        return False

    with source_path.open('rb') as source:
        saved_name = storage.save(relative_name, File(source, name=Path(relative_name).name))

    return saved_name == relative_name or storage.exists(relative_name)
