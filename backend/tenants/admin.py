from django.contrib import admin

from .models import Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'plan', 'status', 'primary_domain', 'subscription_renews_at')
    list_filter = ('plan', 'status')
    search_fields = ('name', 'slug', 'primary_domain', 'primary_contact_email')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')

