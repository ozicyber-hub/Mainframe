from rest_framework import serializers
from .models import GrcFramework, GrcFamily, GrcControl, GrcProject, GrcControlStatus, GrcEvidence


class GrcFamilyListSerializer(serializers.ModelSerializer):
    control_count = serializers.SerializerMethodField()

    class Meta:
        model  = GrcFamily
        fields = ['id', 'identifier', 'name', 'description', 'order', 'control_count']

    def get_control_count(self, obj):
        return obj.controls.filter(is_category=False).count()


class GrcFrameworkListSerializer(serializers.ModelSerializer):
    family_count  = serializers.SerializerMethodField()
    control_count = serializers.SerializerMethodField()
    families      = GrcFamilyListSerializer(many=True, read_only=True)

    class Meta:
        model  = GrcFramework
        fields = ['id', 'key', 'name', 'version', 'description',
                  'family_count', 'control_count', 'families']

    def get_family_count(self, obj):
        return obj.families.count()

    def get_control_count(self, obj):
        return GrcControl.objects.filter(family__framework=obj, is_category=False).count()


class GrcControlSerializer(serializers.ModelSerializer):
    family_id         = serializers.IntegerField(source='family.id', read_only=True)
    family_identifier = serializers.CharField(source='family.identifier', read_only=True)
    parent_id         = serializers.IntegerField(source='parent.id', read_only=True, allow_null=True)

    class Meta:
        model  = GrcControl
        fields = ['id', 'family_id', 'family_identifier', 'control_id', 'title',
                  'statement', 'discussion', 'is_category', 'parent_id', 'order']


class GrcProjectListSerializer(serializers.ModelSerializer):
    framework_key  = serializers.CharField(source='framework.key', read_only=True)
    framework_name = serializers.CharField(source='framework.name', read_only=True)
    stats          = serializers.SerializerMethodField()

    class Meta:
        model  = GrcProject
        fields = ['id', 'title', 'framework_key', 'framework_name', 'status',
                  'target_date', 'created_at', 'stats']

    def get_stats(self, obj):
        return obj.completion_stats()


class GrcProjectDetailSerializer(serializers.ModelSerializer):
    framework_key   = serializers.CharField(source='framework.key', read_only=True)
    framework_name  = serializers.CharField(source='framework.name', read_only=True)
    framework_id    = serializers.IntegerField(source='framework.id', read_only=True)
    stats           = serializers.SerializerMethodField()
    assessor_name   = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = GrcProject
        fields = ['id', 'title', 'description', 'framework_id', 'framework_key', 'framework_name',
                  'status', 'notes', 'target_date', 'created_at', 'updated_at',
                  'assessor_name', 'created_by_name', 'stats']

    def get_stats(self, obj):
        return obj.completion_stats()

    def get_assessor_name(self, obj):
        if obj.assessor:
            return f"{obj.assessor.first_name} {obj.assessor.last_name}".strip() or obj.assessor.email
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None


class GrcProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = GrcProject
        fields = ['id', 'title', 'description', 'framework', 'status', 'notes',
                  'target_date', 'organization', 'engagement', 'assessor']


class GrcEvidenceSerializer(serializers.ModelSerializer):
    file_url         = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = GrcEvidence
        fields = ['id', 'title', 'description', 'file_url', 'url',
                  'uploaded_by_name', 'uploaded_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip() or obj.uploaded_by.email
        return None


class GrcControlStatusSerializer(serializers.ModelSerializer):
    control_id         = serializers.CharField(source='control.control_id', read_only=True)
    control_title      = serializers.CharField(source='control.title', read_only=True)
    control_statement  = serializers.CharField(source='control.statement', read_only=True)
    control_discussion = serializers.CharField(source='control.discussion', read_only=True)
    is_category        = serializers.BooleanField(source='control.is_category', read_only=True)
    family_id          = serializers.IntegerField(source='control.family_id', read_only=True)
    parent_id          = serializers.SerializerMethodField()
    owner_name         = serializers.SerializerMethodField()
    evidence_count     = serializers.SerializerMethodField()
    evidence           = GrcEvidenceSerializer(many=True, read_only=True)
    order              = serializers.IntegerField(source='control.order', read_only=True)

    class Meta:
        model  = GrcControlStatus
        fields = ['id', 'control_id', 'control_title', 'control_statement', 'control_discussion',
                  'is_category', 'family_id', 'parent_id', 'order',
                  'status', 'implementation_notes', 'owner_name', 'due_date', 'review_date',
                  'updated_at', 'evidence_count', 'evidence']

    def get_parent_id(self, obj):
        return obj.control.parent_id

    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.first_name} {obj.owner.last_name}".strip() or obj.owner.email
        return None

    def get_evidence_count(self, obj):
        return obj.evidence.count()


class GrcControlStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = GrcControlStatus
        fields = ['status', 'implementation_notes', 'owner', 'due_date', 'review_date']
