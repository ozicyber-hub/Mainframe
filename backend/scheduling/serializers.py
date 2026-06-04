from rest_framework import serializers
from .models import CalendarEvent, TeamTask, TimeSlotRequest, EventComment, HandoverAttachment


class EventCommentSerializer(serializers.ModelSerializer):
    author_name   = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email  = serializers.EmailField(source='author.email', read_only=True)

    class Meta:
        model  = EventComment
        fields = ['id', 'event', 'author', 'author_name', 'author_email', 'text', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']


class CalendarEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    attendee_ids       = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    attendees_detail   = serializers.SerializerMethodField(read_only=True)
    engagement_name    = serializers.CharField(source='engagement.name', read_only=True)
    created_by_name    = serializers.CharField(source='created_by.get_full_name', read_only=True)
    comments_count      = serializers.SerializerMethodField(read_only=True)
    attachments_count   = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = CalendarEvent
        fields = [
            'id', 'title', 'description', 'event_type', 'event_type_display',
            'start_date', 'end_date', 'all_day', 'location', 'color',
            'is_client_visible', 'is_completed', 'handover_notes',
            'engagement', 'engagement_name',
            'attendee_ids', 'attendees_detail',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'comments_count', 'attachments_count',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_attendees_detail(self, obj):
        return [{'id': u.id, 'name': u.get_full_name(), 'email': u.email} for u in obj.attendees.all()]

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_attachments_count(self, obj):
        return obj.handover_attachments.count()

    def create(self, validated_data):
        attendee_ids = validated_data.pop('attendee_ids', [])
        event = super().create(validated_data)
        if attendee_ids:
            event.attendees.set(attendee_ids)
        return event

    def update(self, instance, validated_data):
        attendee_ids = validated_data.pop('attendee_ids', None)
        event = super().update(instance, validated_data)
        if attendee_ids is not None:
            event.attendees.set(attendee_ids)
        return event


class HandoverAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    url              = serializers.SerializerMethodField()

    class Meta:
        model  = HandoverAttachment
        fields = ['id', 'event', 'filename', 'file_size', 'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'url']
        read_only_fields = ['id', 'event', 'uploaded_by', 'uploaded_at']

    def get_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class TeamTaskSerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display   = serializers.CharField(source='get_status_display',   read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    engagement_name  = serializers.CharField(source='engagement.name', read_only=True)
    created_by_name  = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model  = TeamTask
        fields = [
            'id', 'title', 'description', 'priority', 'priority_display',
            'status', 'status_display', 'due_date',
            'assigned_to', 'assigned_to_name',
            'engagement', 'engagement_name',
            'created_by', 'created_by_name',
            'created_at', 'updated_at', 'completed_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'completed_at']


class TimeSlotRequestSerializer(serializers.ModelSerializer):
    status_display    = serializers.CharField(source='get_status_display',    read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name  = serializers.CharField(source='reviewed_by.get_full_name',  read_only=True)
    engagement_name   = serializers.CharField(source='engagement.name', read_only=True)

    class Meta:
        model  = TimeSlotRequest
        fields = [
            'id', 'title', 'notes', 'preferred_start', 'preferred_end',
            'status', 'status_display', 'admin_notes',
            'engagement', 'engagement_name',
            'requested_by', 'requested_by_name',
            'reviewed_by', 'reviewed_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'requested_by', 'reviewed_by', 'status', 'admin_notes',
            'created_at', 'updated_at',
        ]
