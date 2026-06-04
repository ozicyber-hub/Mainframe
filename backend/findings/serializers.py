"""
Serializers for findings
"""
from rest_framework import serializers
from .models import Finding, FindingImage, FindingComment, FindingCustomField
from engagements.serializers import EngagementSerializer
from accounts.serializers import UserSerializer


class CVSSSerializer(serializers.Serializer):
    """Serializer for CVSS calculation"""
    av = serializers.ChoiceField(choices=[('N', 'Network'), ('A', 'Adjacent'), ('L', 'Local'), ('P', 'Physical')])
    ac = serializers.ChoiceField(choices=[('L', 'Low'), ('H', 'High')])
    pr = serializers.ChoiceField(choices=[('N', 'None'), ('L', 'Low'), ('H', 'High')])
    ui = serializers.ChoiceField(choices=[('N', 'None'), ('R', 'Required')])
    s = serializers.ChoiceField(choices=[('U', 'Unchanged'), ('C', 'Changed')])
    c = serializers.ChoiceField(choices=[('N', 'None'), ('L', 'Low'), ('H', 'High')])
    i = serializers.ChoiceField(choices=[('N', 'None'), ('L', 'Low'), ('H', 'High')])
    a = serializers.ChoiceField(choices=[('N', 'None'), ('L', 'Low'), ('H', 'High')])


class FindingImageSerializer(serializers.ModelSerializer):
    image_url = serializers.CharField(source='image.url', read_only=True)

    class Meta:
        model = FindingImage
        fields = ['id', 'finding', 'image', 'image_url', 'caption', 'order', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class FindingCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)

    class Meta:
        model = FindingComment
        fields = [
            'id', 'finding', 'author', 'author_name', 'author_email',
            'content', 'is_internal', 'created_at', 'updated_at', 'edited_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'edited_at']


class FindingCustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = FindingCustomField
        fields = [
            'id', 'organization', 'name', 'field_type', 'options',
            'required', 'default_value', 'order', 'is_active'
        ]
        read_only_fields = ['id']



class FindingSerializer(serializers.ModelSerializer):
    # Readable fields
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    engagement_name = serializers.CharField(source='engagement.name', read_only=True)

    # Related
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)

    # CVSS metrics display
    av_display = serializers.CharField(source='get_av_display', read_only=True)
    ac_display = serializers.CharField(source='get_ac_display', read_only=True)
    pr_display = serializers.CharField(source='get_pr_display', read_only=True)
    ui_display = serializers.CharField(source='get_ui_display', read_only=True)
    s_display = serializers.CharField(source='get_s_display', read_only=True)
    c_display = serializers.CharField(source='get_c_display', read_only=True)
    i_display = serializers.CharField(source='get_i_display', read_only=True)
    a_display = serializers.CharField(source='get_a_display', read_only=True)

    # Counts
    images_count = serializers.IntegerField(source='images.count', read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    jira_issue_key = serializers.CharField(source='jira_issue.issue_key', read_only=True)
    jira_issue_url = serializers.CharField(source='jira_issue.issue_url', read_only=True)

    class Meta:
        model = Finding
        fields = [
            # Core
            'id', 'engagement', 'engagement_name', 'title', 'severity', 'severity_display',
            'status', 'status_display',
            # CVSS
            'cvss_score', 'cvss_vector',
            'av', 'av_display', 'ac', 'ac_display', 'pr', 'pr_display',
            'ui', 'ui_display', 's', 's_display', 'c', 'c_display',
            'i', 'i_display', 'a', 'a_display',
            # Pentest type
            'pentest_type',
            # Key finding
            'is_key_finding',
            # Risk matrix
            'impact_rating', 'likelihood_rating',
            # Description
            'level_of_access', 'affected_asset', 'description', 'details', 'impact', 'likelihood', 'recommendations', 'supporting_evidence',
            # References
            'references', 'cwe_id', 'cve_id',
            # Custom
            'custom_fields',
            # Tracking
            'created_by', 'created_by_name', 'assigned_to', 'assigned_to_name',
            'created_at', 'updated_at', 'published_at', 'remediated_at',
            # Counts
            'images_count', 'comments_count',
            'jira_issue_key', 'jira_issue_url',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'published_at', 'remediated_at',
            'cvss_score'
        ]

    def validate(self, data):
        # Validate that severity matches CVSS score if both provided
        if 'cvss_score' in data and 'severity' in data:
            score = data.get('cvss_score') or self.instance.cvss_score if self.instance else None
            if score:
                expected_severity = self.score_to_severity(float(score))
                if data['severity'] != expected_severity:
                    # Just a warning, don't enforce
                    pass
        return data

    @staticmethod
    def score_to_severity(score):
        if score >= 9.0:
            return 'CRITICAL'
        elif score >= 7.0:
            return 'HIGH'
        elif score >= 4.0:
            return 'MEDIUM'
        elif score > 0:
            return 'LOW'
        return 'INFORMATIONAL'


class FindingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Finding
        fields = [
            'id', 'engagement', 'title', 'severity', 'status',
            'cvss_vector',
            'av', 'ac', 'pr', 'ui', 's', 'c', 'i', 'a',
            'pentest_type', 'impact_rating', 'likelihood_rating',
            'level_of_access', 'affected_asset', 'description', 'details', 'impact', 'likelihood', 'recommendations', 'supporting_evidence',
            'references', 'cwe_id', 'cve_id',
            'custom_fields', 'assigned_to'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        finding = super().create(validated_data)
        return finding


class FindingListSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    engagement_name = serializers.CharField(source='engagement.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    jira_issue_key = serializers.CharField(source='jira_issue.issue_key', read_only=True)
    jira_issue_url = serializers.CharField(source='jira_issue.issue_url', read_only=True)

    class Meta:
        model = Finding
        fields = [
            'id', 'title', 'severity', 'severity_display', 'status', 'status_display',
            'cvss_score', 'pentest_type', 'impact_rating', 'likelihood_rating', 'affected_asset',
            'description', 'impact',
            'engagement', 'engagement_name', 'created_by_name',
            'created_at', 'updated_at', 'published_at',
            'jira_issue_key', 'jira_issue_url'
        ]
