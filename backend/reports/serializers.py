"""
Serializers for reports
"""
from rest_framework import serializers
from .models import ReportTemplate, Report, ReportExport, ReportMessage, AttackChainEntry
from engagements.serializers import EngagementSerializer


class ReportTemplateSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    docx_url = serializers.SerializerMethodField()

    class Meta:
        model = ReportTemplate
        fields = [
            'id', 'organization', 'organization_name', 'is_global', 'is_default',
            'name', 'description', 'docx_file', 'docx_url',
            'logo', 'primary_color', 'secondary_color',
            'executive_summary_template', 'methodology_template',
            'introduction_template', 'conclusion_template',
            'custom_sections', 'include_cvss_table',
            'include_remediation_timeline', 'include_appendix',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_docx_url(self, obj):
        request = self.context.get('request')
        path = f'/api/reports/templates/{obj.pk}/download_docx/'
        if request:
            return request.build_absolute_uri(path)
        return path


class ReportSerializer(serializers.ModelSerializer):
    engagement_name = serializers.CharField(source='engagement.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True)
    findings_count = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    docx_url = serializers.SerializerMethodField()
    xlsx_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'engagement', 'engagement_name', 'template', 'template_name',
            'title', 'executive_summary', 'methodology', 'conclusion',
            'client_notes', 'internal_notes',
            'version', 'is_draft',
            'pdf_file', 'pdf_url', 'docx_file', 'docx_url', 'xlsx_file', 'xlsx_url',
            'generated_by', 'generated_by_name', 'generated_at',
            'created_at', 'updated_at', 'findings_count'
        ]
        read_only_fields = ['id', 'generated_at', 'created_at', 'updated_at']

    def get_findings_count(self, obj):
        return obj.engagement.findings.count() if obj.engagement else 0

    def get_pdf_url(self, obj):
        return obj.pdf_file.url if obj.pdf_file else None

    def get_docx_url(self, obj):
        return obj.docx_file.url if obj.docx_file else None

    def get_xlsx_url(self, obj):
        return obj.xlsx_file.url if obj.xlsx_file else None


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'id', 'engagement', 'template', 'title', 'version', 'executive_summary',
            'methodology', 'conclusion', 'client_notes', 'internal_notes'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        validated_data['generated_by'] = self.context['request'].user
        return super().create(validated_data)


class ReportMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = ReportMessage
        fields = [
            'id', 'report', 'author', 'author_name', 'author_email', 'author_role',
            'content', 'is_internal', 'attachment', 'attachment_name', 'attachment_url',
            'created_at',
        ]
        read_only_fields = ['id', 'author', 'author_name', 'author_email', 'author_role', 'created_at']

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None


class AttackChainEntrySerializer(serializers.ModelSerializer):
    finding_title    = serializers.CharField(source='finding.title',            read_only=True)
    finding_severity = serializers.CharField(source='finding.severity',         read_only=True)
    finding_status   = serializers.CharField(source='finding.status',           read_only=True)
    phase_display    = serializers.CharField(source='get_phase_display',        read_only=True)

    class Meta:
        model  = AttackChainEntry
        fields = ['id', 'report', 'finding', 'finding_title', 'finding_severity',
                  'finding_status', 'phase', 'phase_display', 'position', 'notes']
        read_only_fields = ['id']


class ReportExportSerializer(serializers.ModelSerializer):
    exported_by_name = serializers.CharField(source='exported_by.get_full_name', read_only=True)
    file_url = serializers.CharField(source='file.url', read_only=True)

    class Meta:
        model = ReportExport
        fields = ['id', 'report', 'exported_by', 'exported_by_name', 'format', 'exported_at', 'file', 'file_url']
        read_only_fields = ['id', 'exported_by', 'exported_at', 'file_url']
