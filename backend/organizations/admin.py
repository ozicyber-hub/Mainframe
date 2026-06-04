"""
Admin configuration for organizations
"""
from django.contrib import admin
from .models import Organization, ClientContact, OrganizationMember


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'allow_client_portal', 'created_at')
    list_filter = ('is_active', 'allow_client_portal', 'email_notifications_enabled')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ClientContact)
class ClientContactAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'organization', 'is_primary')
    list_filter = ('is_primary', 'notify_on_new_finding', 'organization')
    search_fields = ('first_name', 'last_name', 'email', 'organization__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'role_override', 'is_active', 'joined_at')
    list_filter = ('is_active', 'organization')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'organization__name')
    readonly_fields = ('invited_at', 'joined_at')
