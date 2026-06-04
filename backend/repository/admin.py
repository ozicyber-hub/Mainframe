"""
Admin configuration for repository
"""
from django.contrib import admin
from .models import FindingTemplate, FindingTemplateTag


@admin.register(FindingTemplate)
class FindingTemplateAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'default_severity', 'organization', 'is_global', 'usage_count')
    list_filter = ('category', 'default_severity', 'is_global', 'organization')
    search_fields = ('title', 'description', 'tags', 'cwe_id')
    readonly_fields = ('usage_count', 'created_at', 'updated_at')


@admin.register(FindingTemplateTag)
class FindingTemplateTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'color')
    search_fields = ('name',)
