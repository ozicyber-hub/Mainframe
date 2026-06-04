"""
Serializers for authentication and user management
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from organizations.models import Organization, OrganizationMember
from .models import User, Role


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 'role_display',
            'custom_role', 'phone', 'avatar', 'organization', 'organization_name',
            'is_verified', 'is_superuser', 'mfa_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_verified', 'is_superuser', 'mfa_enabled', 'created_at', 'updated_at']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 'first_name', 'last_name',
            'role', 'organization', 'phone'
        ]

    def validate(self, data):
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "Email already registered"})
        password = data.get('password', '')
        password_confirm = data.get('password_confirm', '')
        if password and password != password_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match"})
        return data

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('password_confirm', None)
        if password:
            user = User.objects.create_user(password=password, **validated_data)
        else:
            # No password — account inactive until set via activation or admin
            user = User.objects.create_user(password=User.objects.make_random_password(), **validated_data)
            user.set_unusable_password()
            user.save()
        return user


class ClientPortalInviteSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    organization = serializers.IntegerField(required=False, allow_null=True)

    def validate_email(self, value):
        email = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A portal account with this email already exists.")
        return email

    def validate(self, data):
        request = self.context['request']
        requester = request.user
        is_global_admin = requester.role == 'SUPERADMIN' or requester.is_superuser
        is_internal_admin = requester.role in ('ADMIN', 'SUPERADMIN') or requester.is_superuser

        if is_internal_admin and data.get('organization'):
            organizations = Organization.objects.all()
            if not is_global_admin:
                organizations = organizations.filter(users=requester)
            organization = organizations.filter(pk=data['organization']).first()
            if not organization:
                raise serializers.ValidationError({"organization": "Selected client organization was not found."})
        else:
            organization = requester.organization

        if not organization:
            raise serializers.ValidationError({"organization": "A client organization is required before inviting portal users."})

        data['organization_obj'] = organization
        return data

    def create(self, validated_data):
        request = self.context['request']
        organization = validated_data.pop('organization_obj')
        validated_data.pop('organization', None)
        user = User.objects.create_user(
            role='CLIENT',
            organization=organization,
            is_active=True,
            is_verified=False,
            **validated_data
        )
        user.set_unusable_password()
        user.save(update_fields=['password'])
        OrganizationMember.objects.get_or_create(
            organization=organization,
            user=user,
            defaults={
                'role_override': 'CLIENT',
                'invited_by': request.user,
                'is_active': True,
            }
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['is_superuser'] = user.is_superuser
        if user.organization:
            token['organization_id'] = user.organization.id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = UserSerializer(user).data
        if user.mfa_enabled:
            data['mfa_required'] = True
            data['mfa_token']    = data.pop('refresh')
            data.pop('access', None)
        return data


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'created_at', 'updated_at']


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, min_length=8)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match"})
        return data
