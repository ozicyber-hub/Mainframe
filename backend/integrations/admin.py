from django.contrib import admin

from .models import IntegrationDeliveryLog, IntegrationSetting, JiraIssueLink


@admin.register(IntegrationSetting)
class IntegrationSettingAdmin(admin.ModelAdmin):
    list_display = ('provider', 'organization', 'enabled', 'updated_at')
    list_filter = ('provider', 'organization', 'enabled')


@admin.register(IntegrationDeliveryLog)
class IntegrationDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ('provider', 'event', 'status', 'finding', 'response_status', 'created_at')
    list_filter = ('provider', 'event', 'status')
    search_fields = ('event', 'error_message', 'response_body', 'finding__title')
    readonly_fields = ('created_at',)


@admin.register(JiraIssueLink)
class JiraIssueLinkAdmin(admin.ModelAdmin):
    list_display = ('issue_key', 'finding', 'status_name', 'priority_name', 'assignee_name', 'last_synced_at', 'created_at')
    search_fields = ('issue_key', 'finding__title')
