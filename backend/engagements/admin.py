"""
Admin configuration for engagements
"""
from django.contrib import admin
from .models import Engagement, EngagementNote, EngagementAttachment


class EngagementNoteInline(admin.TabularInline):
    model = EngagementNote
    extra = 1
    readonly_fields = ('author', 'created_at', 'updated_at')


class EngagementAttachmentInline(admin.TabularInline):
    model = EngagementAttachment
    extra = 1
    readonly_fields = ('uploaded_by', 'uploaded_at')


@admin.register(Engagement)
class EngagementAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'engagement_type', 'status', 'lead_pentester', 'start_date', 'end_date')
    list_filter = ('status', 'engagement_type', 'organization', 'allow_client_access', 'is_confidential')
    search_fields = ('name', 'description', 'organization__name', 'client_name')
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    date_hierarchy = 'start_date'
    inlines = [EngagementNoteInline, EngagementAttachmentInline]
    filter_horizontal = ('team_members',)


@admin.register(EngagementNote)
class EngagementNoteAdmin(admin.ModelAdmin):
    list_display = ('engagement', 'author', 'is_pinned', 'created_at')
    list_filter = ('is_pinned', 'engagement')
    search_fields = ('content', 'author__email')


@admin.register(EngagementAttachment)
class EngagementAttachmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'engagement', 'uploaded_by', 'uploaded_at')
    list_filter = ('engagement',)
    search_fields = ('name', 'description')
