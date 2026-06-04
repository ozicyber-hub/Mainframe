"""
Admin configuration for reports
"""
from django.contrib import admin
from .models import ReportTemplate, Report, ReportExport


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'is_global', 'primary_color', 'created_at')
    list_filter = ('is_global', 'organization')
    search_fields = ('name', 'description')


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'engagement', 'version', 'is_draft', 'generated_at')
    list_filter = ('is_draft', 'engagement__status')
    search_fields = ('title', 'engagement__name')
    readonly_fields = ('created_at', 'updated_at', 'generated_at')


@admin.register(ReportExport)
class ReportExportAdmin(admin.ModelAdmin):
    list_display = ('report', 'exported_by', 'format', 'exported_at')
    list_filter = ('format',)
    search_fields = ('report__title', 'exported_by__email')
