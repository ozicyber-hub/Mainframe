from rest_framework import serializers

from .models import Tenant


class TenantSerializer(serializers.ModelSerializer):
    tenant_url = serializers.CharField(read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)

    class Meta:
        model = Tenant
        fields = [
            'id',
            'name',
            'slug',
            'primary_domain',
            'tenant_url',
            'plan',
            'status',
            'primary_contact_name',
            'primary_contact_email',
            'notes',
            'subscription_started_at',
            'subscription_renews_at',
            'max_users',
            'max_organizations',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def validate_slug(self, value):
        value = value.lower().strip()
        reserved = {'admin', 'api', 'app', 'login', 'mainframe', 'platform-admin', 'support', 'www'}
        if value in reserved:
            raise serializers.ValidationError('This tenant slug is reserved.')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

