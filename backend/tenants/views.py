from rest_framework import permissions, viewsets

from .models import Tenant
from .serializers import TenantSerializer


class IsPlatformAdmin(permissions.BasePermission):
    """Only the OziCyber-owned Django superuser can manage SaaS tenancies."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_superuser)


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsPlatformAdmin]
    search_fields = ['name', 'slug', 'primary_domain', 'primary_contact_email']
    ordering_fields = ['name', 'status', 'plan', 'subscription_renews_at', 'created_at']
    ordering = ['name']
