from django.contrib import admin
from .models import GrcFramework, GrcFamily, GrcControl, GrcProject, GrcControlStatus, GrcEvidence


@admin.register(GrcFramework)
class GrcFrameworkAdmin(admin.ModelAdmin):
    list_display = ['key', 'name', 'version', 'is_active']
    list_filter  = ['is_active']


@admin.register(GrcFamily)
class GrcFamilyAdmin(admin.ModelAdmin):
    list_display = ['identifier', 'name', 'framework', 'order']
    list_filter  = ['framework']
    ordering     = ['framework', 'order']


@admin.register(GrcControl)
class GrcControlAdmin(admin.ModelAdmin):
    list_display  = ['control_id', 'title', 'family', 'is_category', 'order']
    list_filter   = ['family__framework', 'is_category']
    search_fields = ['control_id', 'title']
    ordering      = ['family', 'order']


@admin.register(GrcProject)
class GrcProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'framework', 'status', 'organization', 'created_at']
    list_filter  = ['framework', 'status']
    search_fields = ['title']


@admin.register(GrcControlStatus)
class GrcControlStatusAdmin(admin.ModelAdmin):
    list_display  = ['project', 'control', 'status', 'updated_at']
    list_filter   = ['status', 'project__framework']
    search_fields = ['control__control_id', 'project__title']


@admin.register(GrcEvidence)
class GrcEvidenceAdmin(admin.ModelAdmin):
    list_display = ['title', 'control_status', 'uploaded_by', 'uploaded_at']
