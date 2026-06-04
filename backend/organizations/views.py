"""
Organization views
"""
from rest_framework import generics, status, permissions, viewsets
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from .models import Organization, ClientContact, OrganizationMember
from .serializers import (
    OrganizationSerializer, OrganizationCreateSerializer,
    ClientContactSerializer, OrganizationMemberSerializer
)


class IsOrgAdminOrReadOnly(permissions.BasePermission):
    """Permission class for organization-level access control"""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.has_permission('manage_org')

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.organization == obj or request.user.is_superuser or request.user.role == 'SUPERADMIN'


class OrganizationViewSet(viewsets.ModelViewSet):
    """Organization CRUD operations"""
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrgAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role == 'SUPERADMIN':
            return Organization.objects.all()
        return Organization.objects.filter(users=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationCreateSerializer
        return OrganizationSerializer

    def perform_create(self, serializer):
        org = serializer.save()
        # Make the creator an admin of the organization
        OrganizationMember.objects.create(
            organization=org,
            user=self.request.user,
            role_override='ADMIN',
            joined_at=org.created_at
        )


class ClientContactViewSet(viewsets.ModelViewSet):
    """Client contacts for an organization"""
    serializer_class = ClientContactSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrgAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        org_id = self.kwargs.get('organization_pk')

        if org_id:
            if user.is_superuser or user.role == 'SUPERADMIN':
                return ClientContact.objects.filter(organization_id=org_id)
            return ClientContact.objects.filter(organization_id=org_id, organization__users=user)
        return ClientContact.objects.none()

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk')
        serializer.save(organization_id=org_id)


class OrganizationMemberViewSet(viewsets.ModelViewSet):
    """Manage organization members"""
    serializer_class = OrganizationMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrgAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        org_id = self.kwargs.get('organization_pk')

        if org_id:
            if user.is_superuser or user.role == 'SUPERADMIN':
                return OrganizationMember.objects.filter(organization_id=org_id)
            return OrganizationMember.objects.filter(
                organization_id=org_id,
                organization__users=user
            )
        return OrganizationMember.objects.none()

    def perform_create(self, serializer):
        # Set the inviter
        serializer.save(invited_by=self.request.user, joined_at=self.request.user.last_login)
