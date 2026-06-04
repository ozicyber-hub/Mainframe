import os
from django.core.exceptions import ValidationError

ALLOWED_EXTENSIONS = frozenset({
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'odt', 'ods', 'odp', 'rtf', 'txt', 'csv',
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif', 'webp',
    'zip', 'tar', 'gz',
    'json', 'xml', 'html', 'htm',
    'eml', 'msg',
    'mp4', 'mov', 'avi',
})

BLOCKED_EXTENSIONS = frozenset({
    'exe', 'com', 'bat', 'cmd', 'sh', 'bash', 'zsh', 'fish',
    'ps1', 'psm1', 'psd1', 'vbs', 'vbe', 'wsf', 'wsh',
    'js', 'jse', 'ts', 'mjs', 'cjs',
    'py', 'pyc', 'pyd', 'pyo', 'pyw',
    'rb', 'pl', 'php', 'php3', 'php4', 'php5', 'phtml',
    'asp', 'aspx', 'ashx', 'asmx', 'jsp', 'jspx',
    'jar', 'war', 'ear', 'class',
    'msi', 'msix', 'appx', 'apk', 'ipa',
    'dll', 'sys', 'drv', 'so', 'dylib',
    'scr', 'hta', 'pif', 'lnk', 'reg', 'inf',
    'go', 'rs', 'c', 'cpp', 'cc', 'cs', 'java',
    'bin', 'elf', 'out',
    'gadget', 'application', 'xbap',
})

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def validate_evidence_file(file):
    name = os.path.basename(file.name.strip()).lower()
    parts = name.split('.')

    if len(parts) < 2:
        raise ValidationError('File must have an extension.')

    # Check every extension segment for blocked types (double-extension bypass prevention)
    all_exts = parts[1:]
    for ext in all_exts:
        if ext in BLOCKED_EXTENSIONS:
            raise ValidationError(
                f'Files containing ".{ext}" are not permitted for security reasons.'
            )

    # Final extension must be in the allowlist
    final_ext = all_exts[-1]
    if final_ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f'File type ".{final_ext}" is not allowed. '
            f'Permitted types include PDF, Word, Excel, images, and other common document formats.'
        )

    if file.size > MAX_FILE_SIZE:
        raise ValidationError('File size must not exceed 50 MB.')
