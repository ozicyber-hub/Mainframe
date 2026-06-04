"""
Serializers for repository
"""
from rest_framework import serializers
from .models import FindingTemplate, FindingTemplateTag, RepositoryFolder


class RepositoryFolderSerializer(serializers.ModelSerializer):
    template_count = serializers.SerializerMethodField()
    child_count    = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    allowed_users_list = serializers.SerializerMethodField()

    class Meta:
        model = RepositoryFolder
        fields = [
            'id', 'parent', 'name', 'description', 'color', 'is_private',
            'organization', 'created_by', 'created_by_name',
            'allowed_users', 'allowed_users_list',
            'template_count', 'child_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_template_count(self, obj):
        return obj.templates.count()

    def get_child_count(self, obj):
        return obj.children.count()

    def get_allowed_users_list(self, obj):
        return [{'id': u.id, 'name': u.get_full_name(), 'email': u.email} for u in obj.allowed_users.all()]


class FindingTemplateSerializer(serializers.ModelSerializer):
    default_severity_display = serializers.CharField(source='get_default_severity_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    folder_color = serializers.CharField(source='folder.color', read_only=True)

    class Meta:
        model = FindingTemplate
        fields = [
            'id', 'organization', 'organization_name', 'is_global',
            'folder', 'folder_name', 'folder_color',
            'title', 'category', 'category_display', 'description', 'details',
            'impact', 'likelihood', 'recommendations', 'supporting_evidence',
            'default_severity', 'default_severity_display',
            'cvss_vector', 'av', 'ac', 'pr', 'ui', 's', 'c', 'i', 'a',
            'references', 'cwe_id', 'tags', 'usage_count',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']


class FindingTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FindingTemplate
        fields = [
            'organization', 'is_global', 'folder', 'title', 'category', 'description',
            'details', 'impact', 'likelihood', 'recommendations', 'supporting_evidence',
            'default_severity', 'cvss_vector', 'av', 'ac', 'pr', 'ui', 's', 'c', 'i', 'a',
            'references', 'cwe_id', 'tags'
        ]

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class FindingTemplateTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FindingTemplateTag
        fields = ['id', 'name', 'color']
