"""
Serializers for engagements
"""
from rest_framework import serializers
from .models import Engagement, EngagementNote, EngagementAttachment
from accounts.serializers import UserSerializer
from organizations.serializers import OrganizationSerializer


class EngagementSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    engagement_type_display = serializers.CharField(source='get_engagement_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    lead_pentester_name = serializers.CharField(source='lead_pentester.get_full_name', read_only=True)
    project_manager_name = serializers.CharField(source='project_manager.get_full_name', read_only=True)
    team_members_details = UserSerializer(source='team_members', many=True, read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    findings_count = serializers.IntegerField(read_only=True)
    critical_findings_count = serializers.IntegerField(read_only=True)
    high_findings_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Engagement
        fields = [
            'id', 'organization', 'organization_name', 'name', 'description',
            'engagement_type', 'engagement_type_display', 'status', 'status_display',
            'start_date', 'end_date', 'report_due_date',
            'lead_pentester', 'lead_pentester_name', 'project_manager', 'project_manager_name',
            'team_members', 'team_members_details',
            'scope', 'out_of_scope', 'objectives',
            'client_name', 'client_email', 'client_phone',
            'allow_client_access', 'is_confidential', 'skip_weekends',
            'days_remaining', 'findings_count', 'critical_findings_count', 'high_findings_count',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class EngagementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Engagement
        fields = [
            'id', 'organization', 'name', 'description', 'engagement_type',
            'start_date', 'end_date', 'report_due_date',
            'lead_pentester', 'project_manager', 'team_members',
            'scope', 'out_of_scope', 'objectives',
            'client_name', 'client_email', 'client_phone',
            'allow_client_access', 'is_confidential', 'skip_weekends'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class EngagementNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)

    class Meta:
        model = EngagementNote
        fields = ['id', 'engagement', 'author', 'author_name', 'author_email', 'content', 'is_pinned', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class EngagementAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    file_url = serializers.CharField(source='file.url', read_only=True)
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = EngagementAttachment
        fields = ['id', 'engagement', 'file', 'file_url', 'name', 'description', 'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'file_size']
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at', 'file_url', 'file_size']

    def get_file_size(self, obj):
        if obj.file:
            size = obj.file.size
            for unit in ['B', 'KB', 'MB', 'GB']:
                if size < 1024:
                    return f"{size:.1f} {unit}"
                size /= 1024
        return None
