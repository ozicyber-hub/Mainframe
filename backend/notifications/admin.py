from django.contrib import admin
from .models import Notification, EmailLog, EmailTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read')
    search_fields = ('title', 'message', 'user__email')


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'subject', 'status', 'sent_at')
    list_filter = ('status',)
    search_fields = ('recipient', 'subject')


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'is_active')
    list_filter = ('is_active', 'organization')
    search_fields = ('subject', 'body')
