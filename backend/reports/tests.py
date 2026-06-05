from datetime import date
from io import BytesIO
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from engagements.models import Engagement
from organizations.models import Organization
from reports.generator import generate_report_docx
from reports.models import Report, ReportTemplate


class ReportDocxExportTemplateTests(TestCase):
    def setUp(self):
        self.media_root = TemporaryDirectory()
        self.settings_override = override_settings(MEDIA_ROOT=self.media_root.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.addCleanup(self.media_root.cleanup)

        self.org = Organization.objects.create(name='OziCyber', slug='ozicyber')
        self.user = get_user_model().objects.create_user(
            email='admin@example.com',
            password='password',
            first_name='Admin',
            last_name='User',
            role='SUPERADMIN',
            organization=self.org,
            is_staff=True,
            is_superuser=True,
            is_verified=True,
        )
        self.org.created_by = self.user
        self.org.save(update_fields=['created_by'])

        self.engagement = Engagement.objects.create(
            organization=self.org,
            name='Web App Pentest',
            engagement_type='WEB_APP',
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 15),
            lead_pentester=self.user,
            project_manager=self.user,
            created_by=self.user,
        )
        self.report = Report.objects.create(
            engagement=self.engagement,
            title='Web App Pentest Report',
            generated_by=self.user,
        )

        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.export_url = f'/api/reports/{self.report.pk}/export/'

    def test_docx_export_requires_selected_or_linked_template(self):
        default_template = ReportTemplate.objects.create(
            name='Organisation Default',
            organization=self.org,
            is_default=True,
            created_by=self.user,
        )
        default_template.docx_file.save(
            'default_template.docx',
            ContentFile(b'placeholder'),
            save=True,
        )

        response = self.client.post(
            self.export_url,
            {'format': 'DOCX'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('Select an uploaded DOCX report template', response.data['error'])

    def test_docx_export_rejects_template_without_docx_file(self):
        template = ReportTemplate.objects.create(
            name='Metadata Only Template',
            organization=self.org,
            created_by=self.user,
        )

        response = self.client.post(
            self.export_url,
            {'format': 'DOCX', 'template_id': template.pk},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('has no DOCX file uploaded', response.data['error'])

    def test_docx_export_rejects_template_from_another_organisation(self):
        other_org = Organization.objects.create(name='Other Org', slug='other-org')
        template = ReportTemplate.objects.create(
            name='Other Org Template',
            organization=other_org,
            created_by=self.user,
        )
        template.docx_file.save(
            'other_org_template.docx',
            ContentFile(b'placeholder'),
            save=True,
        )

        response = self.client.post(
            self.export_url,
            {'format': 'DOCX', 'template_id': template.pk},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('not available for this engagement', response.data['error'])

    @patch('reports.generator.generate_report_docx')
    def test_docx_export_allows_superadmin_orphan_template(self, mock_generate):
        mock_generate.return_value = BytesIO(b'generated docx')
        template = ReportTemplate.objects.create(
            name='Superadmin Uploaded Template',
            created_by=self.user,
        )
        template.docx_file.save(
            'superadmin_template.docx',
            ContentFile(b'placeholder'),
            save=True,
        )

        response = self.client.post(
            self.export_url,
            {'format': 'DOCX', 'template_id': template.pk},
            format='json',
        )

        self.assertEqual(response.status_code, 200)

    @patch('reports.generator.generate_report_docx')
    def test_docx_export_uses_selected_uploaded_template(self, mock_generate):
        mock_generate.return_value = BytesIO(b'generated docx')
        template = ReportTemplate.objects.create(
            name='Selected Template',
            organization=self.org,
            created_by=self.user,
        )
        template.docx_file.save(
            'selected_template.docx',
            ContentFile(b'placeholder'),
            save=True,
        )

        response = self.client.post(
            self.export_url,
            {'format': 'DOCX', 'template_id': template.pk},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'generated docx')
        mock_generate.assert_called_once()
        passed_template_file = mock_generate.call_args.args[2]
        self.assertIn('selected_template', passed_template_file.name)

    def test_docx_generator_has_no_default_template_fallback(self):
        with self.assertRaisesMessage(ValueError, 'A DOCX report template is required.'):
            generate_report_docx(self.report, [], None)

    def test_superadmin_template_upload_without_organisation_becomes_global(self):
        self.user.organization = None
        self.user.save(update_fields=['organization'])

        response = self.client.post(
            '/api/reports/templates/',
            {
                'name': 'Global Superadmin Template',
                'description': '',
                'primary_color': '#24483E',
                'secondary_color': '#FFF1AA',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        template = ReportTemplate.objects.get(pk=response.data['id'])
        self.assertIsNone(template.organization)
        self.assertTrue(template.is_global)

    def test_repair_report_template_files_restores_seeded_template(self):
        template = ReportTemplate.objects.create(
            name='Penetration Test Report v1.0',
            is_global=True,
            created_by=self.user,
        )
        template.docx_file.name = 'report_templates/ozicyber_generator_template.docx'
        template.save(update_fields=['docx_file'])

        target = Path(self.media_root.name) / template.docx_file.name
        self.assertFalse(target.exists())

        output = StringIO()
        call_command('repair_report_template_files', stdout=output)

        self.assertTrue(target.exists())
        self.assertGreater(target.stat().st_size, 0)
        self.assertIn('Repaired 1 template reference', output.getvalue())
