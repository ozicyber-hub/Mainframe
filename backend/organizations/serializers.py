"""
Serializers for organizations
"""
from rest_framework import serializers
from .models import Organization, ClientContact, OrganizationMember


class OrganizationSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    engagement_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    primary_contact = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'description', 'logo', 'primary_color',
            'secondary_color', 'website', 'phone', 'address', 'is_active',
            'allow_client_portal', 'email_notifications_enabled', 'user_count',
            'engagement_count', 'primary_contact', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'user_count', 'engagement_count']

    def get_primary_contact(self, obj):
        contact = obj.client_contacts.filter(is_primary=True).first()
        if contact:
            return {
                'id': contact.id,
                'name': f"{contact.first_name} {contact.last_name}".strip(),
                'email': contact.email,
                'phone': contact.phone,
                'job_title': contact.job_title,
            }
        return None

    def get_user_count(self, obj):
        return obj.users.count()

    def get_engagement_count(self, obj):
        return obj.engagements.count()

    def validate_slug(self, value):
        if not value.replace('-', '').replace('_', '').isalnum():
            raise serializers.ValidationError("Slug must contain only letters, numbers, hyphens, and underscores")
        return value


class OrganizationCreateSerializer(serializers.ModelSerializer):
    # Primary contact fields (creates a ClientContact record)
    contact_first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, write_only=True)
    contact_last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, write_only=True)
    contact_email = serializers.EmailField(required=False, allow_blank=True, write_only=True)
    contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, write_only=True)
    contact_job_title = serializers.CharField(max_length=150, required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Organization
        fields = [
            'name', 'description', 'phone', 'website', 'address',
            'contact_first_name', 'contact_last_name', 'contact_email',
            'contact_phone', 'contact_job_title',
        ]

    def create(self, validated_data):
        from django.utils.text import slugify
        contact_fields = {
            'first_name': validated_data.pop('contact_first_name', ''),
            'last_name': validated_data.pop('contact_last_name', ''),
            'email': validated_data.pop('contact_email', ''),
            'phone': validated_data.pop('contact_phone', ''),
            'job_title': validated_data.pop('contact_job_title', ''),
        }
        validated_data['slug'] = slugify(validated_data['name'])
        validated_data['created_by'] = self.context['request'].user
        org = super().create(validated_data)
        if contact_fields.get('email'):
            ClientContact.objects.create(
                organization=org,
                is_primary=True,
                **contact_fields
            )
        return org


class ClientContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientContact
        fields = [
            'id', 'organization', 'first_name', 'last_name', 'email', 'phone',
            'job_title', 'notify_on_new_finding', 'notify_on_finding_update',
            'notify_on_report_published', 'is_primary', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class OrganizationMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    effective_role = serializers.CharField(read_only=True)

    class Meta:
        model = OrganizationMember
        fields = [
            'id', 'organization', 'user', 'user_email', 'user_name', 'role_override',
            'effective_role', 'is_active', 'invited_at', 'joined_at', 'invited_by'
        ]
        read_only_fields = ['id', 'invited_at', 'joined_at', 'invited_by']
