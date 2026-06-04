"""
Admin configuration for findings
"""
from django.contrib import admin
from .models import Finding, FindingImage, FindingComment, FindingCustomField


class FindingImageInline(admin.TabularInline):
    model = FindingImage
    extra = 1


class FindingCommentInline(admin.TabularInline):
    model = FindingComment
    extra = 0
    readonly_fields = ('author', 'created_at', 'updated_at')


@admin.register(Finding)
class FindingAdmin(admin.ModelAdmin):
    list_display = ('title', 'engagement', 'severity', 'status', 'cvss_score', 'created_by', 'created_at')
    list_filter = ('severity', 'status', 'engagement', 'created_at')
    search_fields = ('title', 'description', 'engagement__name', 'cwe_id', 'cve_id')
    readonly_fields = ('created_at', 'updated_at', 'published_at', 'remediated_at')
    date_hierarchy = 'created_at'
    inlines = [FindingImageInline, FindingCommentInline]
    filter_horizontal = ()

    fieldsets = (
        ('Core Information', {
            'fields': ('engagement', 'title', 'severity', 'status')
        }),
        ('CVSS 3.1', {
            'fields': ('cvss_score', 'cvss_vector'),
            'description': 'Base Metrics'
        }),
        ('CVSS Base Metrics', {
            'fields': (('av', 'ac', 'pr', 'ui'), ('s', 'c', 'i', 'a')),
            'classes': ('collapse',)
        }),
        ('Description', {
            'fields': ('description', 'details', 'impact', 'likelihood', 'recommendations', 'supporting_evidence')
        }),
        ('References', {
            'fields': ('references', 'cwe_id', 'cve_id'),
            'classes': ('collapse',)
        }),
        ('Custom Fields', {
            'fields': ('custom_fields',),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('created_by', 'assigned_to', 'created_at', 'updated_at', 'published_at', 'remediated_at')
        }),
    )


@admin.register(FindingImage)
class FindingImageAdmin(admin.ModelAdmin):
    list_display = ('finding', 'caption', 'order', 'uploaded_at')
    list_filter = ('finding',)


@admin.register(FindingComment)
class FindingCommentAdmin(admin.ModelAdmin):
    list_display = ('finding', 'author', 'is_internal', 'created_at')
    list_filter = ('is_internal', 'finding')


@admin.register(FindingCustomField)
class FindingCustomFieldAdmin(admin.ModelAdmin):
    list_display = ('name', 'field_type', 'organization', 'required', 'is_active', 'order')
    list_filter = ('field_type', 'required', 'is_active', 'organization')
