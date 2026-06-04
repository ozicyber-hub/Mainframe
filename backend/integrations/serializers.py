from rest_framework import serializers

from .models import IntegrationDeliveryLog, IntegrationSetting, JiraIssueLink
from .services import DEFAULT_EVENTS, masked_config, merge_config


class IntegrationSettingSerializer(serializers.ModelSerializer):
    config = serializers.JSONField()
    available_events = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = IntegrationSetting
        fields = ['id', 'provider', 'organization', 'organization_name', 'enabled', 'config', 'available_events', 'updated_at']
        read_only_fields = ['id', 'provider', 'organization_name', 'updated_at']

    def get_available_events(self, obj):
        return DEFAULT_EVENTS

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['config'] = masked_config(data.get('config'))
        return data

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if 'enabled' in validated_data:
            instance.enabled = validated_data['enabled']
        if 'organization' in validated_data and not instance.organization_id:
            instance.organization = validated_data['organization']
        if 'config' in validated_data:
            instance.config = merge_config(instance.config, validated_data['config'])
        if request and request.user and request.user.is_authenticated:
            if not instance.created_by_id:
                instance.created_by = request.user
            instance.updated_by = request.user
        instance.save()
        return instance


class IntegrationDeliveryLogSerializer(serializers.ModelSerializer):
    finding_title = serializers.CharField(source='finding.title', read_only=True)

    class Meta:
        model = IntegrationDeliveryLog
        fields = [
            'id', 'provider', 'event', 'status', 'finding', 'finding_title',
            'response_status', 'response_body', 'error_message', 'created_at'
        ]


class JiraIssueLinkSerializer(serializers.ModelSerializer):
    finding_title = serializers.CharField(source='finding.title', read_only=True)

    class Meta:
        model = JiraIssueLink
        fields = [
            'id', 'finding', 'finding_title', 'issue_key', 'issue_id', 'issue_url',
            'status_name', 'status_category', 'priority_name', 'assignee_name',
            'last_synced_at', 'created_at',
        ]
