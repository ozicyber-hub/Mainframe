"""
Report views
"""
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.http import FileResponse, HttpResponse
from .models import Report, ReportTemplate, ReportExport, ReportMessage, AttackChainEntry
from .serializers import ReportSerializer, ReportCreateSerializer, ReportTemplateSerializer, ReportExportSerializer, ReportMessageSerializer, AttackChainEntrySerializer
from findings.models import Finding
import re


_REPORT_WRITE_ROLES = {'SUPERADMIN', 'ADMIN', 'PENTESTER', 'PROJECT_MANAGER'}
_TEMPLATE_ADMIN_ROLES = {'SUPERADMIN', 'ADMIN'}


def _template_allowed_for_report(template, report, user=None):
    report_org_id = getattr(report.engagement, 'organization_id', None)
    if template.is_global or template.organization_id == report_org_id:
        return True
    return bool(user and user.is_superuser and template.organization_id is None)


class ReportTemplateViewSet(viewsets.ModelViewSet):
    """Report template CRUD — write access restricted to ADMIN/SUPERADMIN."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReportTemplateSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return ReportTemplate.objects.all()
        from django.db.models import Q
        return ReportTemplate.objects.filter(
            Q(organization=user.organization) | Q(is_global=True)
        )

    def _require_template_admin(self):
        user = self.request.user
        if not user.is_superuser and user.role not in _TEMPLATE_ADMIN_ROLES:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only admins can manage report templates.')

    def perform_create(self, serializer):
        self._require_template_admin()
        user = self.request.user
        organization = user.organization
        save_kwargs = {
            'created_by': user,
            'organization': organization,
        }
        if organization is None:
            if not user.is_superuser:
                from rest_framework.exceptions import ValidationError
                raise ValidationError('Your account must belong to an organisation to create report templates.')
            save_kwargs['is_global'] = True
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        self._require_template_admin()
        instance = serializer.save()
        # If this template is being set as default, unset all others for the org
        if instance.is_default and instance.organization:
            ReportTemplate.objects.filter(
                organization=instance.organization,
                is_default=True,
            ).exclude(pk=instance.pk).update(is_default=False)

    def perform_destroy(self, instance):
        self._require_template_admin()
        instance.delete()

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        self._require_template_admin()
        tmpl = self.get_object()
        ReportTemplate.objects.filter(
            organization=tmpl.organization, is_default=True
        ).update(is_default=False)
        tmpl.is_default = True
        tmpl.save(update_fields=['is_default'])
        return Response({'is_default': True})


class ReportViewSet(viewsets.ModelViewSet):
    """Report CRUD and export operations"""
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['engagement']

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        if user.is_superuser:
            return Report.objects.all().select_related('engagement', 'template')
        return Report.objects.filter(
            Q(engagement__organization__users=user) |
            Q(engagement__lead_pentester=user) |
            Q(engagement__project_manager=user) |
            Q(engagement__team_members=user)
        ).distinct().select_related('engagement', 'template')

    def _require_report_writer(self):
        user = self.request.user
        if not user.is_superuser and user.role not in _REPORT_WRITE_ROLES:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Your role does not allow modifying reports.')

    def perform_create(self, serializer):
        self._require_report_writer()
        serializer.save()

    def perform_update(self, serializer):
        self._require_report_writer()
        serializer.save()

    def perform_destroy(self, instance):
        self._require_report_writer()
        instance.delete()

    def get_serializer_class(self):
        if self.action == 'create':
            return ReportCreateSerializer
        return ReportSerializer

    @action(detail=True, methods=['post'])
    def export(self, request, pk=None):
        """Export report as DOCX, streaming the generated file directly.

        Body params:
          format      — must be 'DOCX' (PDF/XLSX return 501 for now)
          template_id — required unless the report already has a linked template
        """
        self._require_report_writer()
        report = self.get_object()
        export_format = request.data.get('format', 'DOCX').upper()

        if export_format not in ['PDF', 'DOCX', 'XLSX']:
            return Response({'error': 'Invalid format. Choose PDF, DOCX, or XLSX'},
                          status=status.HTTP_400_BAD_REQUEST)

        if export_format == 'DOCX':
            try:
                from .generator import generate_report_docx
            except ImportError as e:
                return Response({'error': f'Generator not available: {e}'},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            findings_qs = Finding.objects.filter(
                engagement=report.engagement
            ).select_related('engagement')

            template_id = request.data.get('template_id')
            if template_id:
                try:
                    template_id = int(template_id)
                except (TypeError, ValueError):
                    return Response({'error': 'Invalid report template selection.'},
                                    status=status.HTTP_400_BAD_REQUEST)

                try:
                    template = ReportTemplate.objects.get(pk=template_id)
                except ReportTemplate.DoesNotExist:
                    return Response({'error': 'Selected report template was not found.'},
                                    status=status.HTTP_404_NOT_FOUND)
            else:
                template = report.template
                if not template:
                    return Response(
                        {'error': 'Select an uploaded DOCX report template before generating.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if not _template_allowed_for_report(template, report, request.user):
                return Response(
                    {'error': 'Selected report template is not available for this engagement.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not template.docx_file or not template.docx_file.name:
                return Response(
                    {'error': f'Selected report template "{template.name}" has no DOCX file uploaded.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                template.docx_file.open('rb')
            except Exception as e:
                return Response(
                    {'error': f'Selected report template "{template.name}" could not be opened: {e}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                buffer = generate_report_docx(report, findings_qs, template.docx_file)
            except Exception as e:
                return Response({'error': f'Report generation failed for template "{template.name}": {e}'},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                template.docx_file.close()

            # Log the export
            ReportExport.objects.create(
                report=report,
                exported_by=request.user,
                format=export_format,
            )

            safe_title = re.sub(r'[^\w\s-]', '', report.title).strip().replace(' ', '_') or 'report'
            filename = f"{safe_title}_v{report.version}.docx"
            response = HttpResponse(
                buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        # PDF / XLSX — placeholder
        export = ReportExport.objects.create(
            report=report,
            exported_by=request.user,
            format=export_format,
        )
        return Response({
            'message': f'{export_format} export is not yet implemented',
            'export': ReportExportSerializer(export).data,
        }, status=status.HTTP_501_NOT_IMPLEMENTED)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download report file"""
        report = self.get_object()
        format_type = request.query_params.get('format', 'PDF').upper()

        file_field = None
        content_type = 'application/octet-stream'

        if format_type == 'PDF' and report.pdf_file:
            file_field = report.pdf_file
            content_type = 'application/pdf'
        elif format_type == 'DOCX' and report.docx_file:
            file_field = report.docx_file
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif format_type == 'XLSX' and report.xlsx_file:
            file_field = report.xlsx_file
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

        if not file_field:
            return Response({'error': f'{format_type} file not available'},
                          status=status.HTTP_404_NOT_FOUND)

        response = FileResponse(file_field, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{report.title}.{format_type.lower()}"'
        return response

    @action(detail=True, methods=['get'])
    def attack_chain(self, request, pk=None):
        report  = self.get_object()
        entries = AttackChainEntry.objects.filter(report=report).select_related('finding')
        return Response(AttackChainEntrySerializer(entries, many=True).data)

    @action(detail=True, methods=['post'])
    def attack_chain_update(self, request, pk=None):
        """Bulk replace the entire attack chain for this report."""
        self._require_report_writer()
        report  = self.get_object()
        entries = request.data.get('entries', [])
        AttackChainEntry.objects.filter(report=report).delete()
        created = []
        for e in entries:
            obj = AttackChainEntry.objects.create(
                report=report,
                finding_id=e['finding'],
                phase=e['phase'],
                position=e.get('position', 0),
                notes=e.get('notes', ''),
            )
            created.append(obj)
        return Response(AttackChainEntrySerializer(created, many=True).data)



class ReportMessageViewSet(viewsets.ModelViewSet):
    """Collaboration messages on a report"""
    serializer_class = ReportMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        report_id = self.request.query_params.get('report')
        if not report_id:
            return ReportMessage.objects.none()
        qs = ReportMessage.objects.filter(report_id=report_id).select_related('author')
        # Clients can only see non-internal messages
        if getattr(user, 'role', None) == 'CLIENT':
            qs = qs.filter(is_internal=False)
        return qs

    def perform_create(self, serializer):
        # Clients cannot mark messages as internal
        is_internal = serializer.validated_data.get('is_internal', False)
        if getattr(self.request.user, 'role', None) == 'CLIENT':
            is_internal = False
        # Store original filename before saving
        attachment = serializer.validated_data.get('attachment')
        attachment_name = attachment.name if attachment else ''
        serializer.save(author=self.request.user, is_internal=is_internal, attachment_name=attachment_name)


class ReportExportViewSet(viewsets.ModelViewSet):
    """Report export history"""
    serializer_class = ReportExportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return ReportExport.objects.all()
        return ReportExport.objects.filter(
            report__engagement__organization__users=user
        )
