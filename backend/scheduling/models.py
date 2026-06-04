"""
Scheduling models — calendar events, team tasks, client time-slot requests.
"""
from django.db import models
from django.conf import settings
from engagements.models import Engagement


class CalendarEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('ENGAGEMENT_START',   'Engagement Start'),
        ('ENGAGEMENT_END',     'Engagement End'),
        ('TESTING_WINDOW',     'Active Testing'),
        ('REPORT_DUE',         'Report Due'),
        ('KICKOFF',            'Kickoff Meeting'),
        ('DEBRIEF',            'Debrief / Closeout'),
        ('HANDOVER',           'Tester Handover'),
        ('RETEST',             'Re-test / Verification'),
        ('SCOPING',            'Scoping Call'),
        ('REMEDIATION_REVIEW', 'Remediation Review'),
        ('CLIENT_MEETING',     'Client Meeting'),
        ('INTERNAL_REVIEW',    'Internal Review'),
        ('LEAVE',              'Leave / Holiday'),
        ('OTHER',              'Other'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='calendar_events',
    )
    engagement = models.ForeignKey(
        Engagement,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='calendar_events',
    )
    title       = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    event_type  = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES, default='OTHER')
    start_date  = models.DateTimeField()
    end_date    = models.DateTimeField()
    all_day     = models.BooleanField(default=False)
    location    = models.CharField(max_length=300, blank=True)
    color       = models.CharField(max_length=7, blank=True)
    is_client_visible  = models.BooleanField(default=False)
    is_completed       = models.BooleanField(default=False)
    handover_notes     = models.TextField(blank=True)

    attendees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='attending_events',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_events',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date']

    def __str__(self):
        return f'{self.title} ({self.start_date.date()})'


class TeamTask(models.Model):
    PRIORITY_CHOICES = [
        ('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent'),
    ]
    STATUS_CHOICES = [
        ('TODO', 'To Do'), ('IN_PROGRESS', 'In Progress'),
        ('BLOCKED', 'Blocked'), ('REVIEW', 'In Review'), ('DONE', 'Done'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='team_tasks',
    )
    engagement = models.ForeignKey(
        Engagement,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tasks',
    )
    title       = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    priority    = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    status      = models.CharField(max_length=15, choices=STATUS_CHOICES, default='TODO')
    due_date    = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_tasks',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tasks',
    )
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['due_date', '-priority']

    def __str__(self):
        return self.title


class TimeSlotRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'), ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'), ('CANCELLED', 'Cancelled'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='timeslot_requests',
    )
    engagement = models.ForeignKey(
        Engagement,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='timeslot_requests',
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='timeslot_requests',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_timeslots',
    )
    title           = models.CharField(max_length=300)
    notes           = models.TextField(blank=True)
    preferred_start = models.DateTimeField()
    preferred_end   = models.DateTimeField()
    status          = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    admin_notes     = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.status}'


class EventComment(models.Model):
    event      = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE, related_name='comments')
    author     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_comments')
    text       = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.author} on {self.event}'


def handover_upload_path(instance, filename):
    return f'handover/{instance.event_id}/{filename}'


class HandoverAttachment(models.Model):
    event      = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE, related_name='handover_attachments')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='handover_uploads')
    file        = models.FileField(upload_to=handover_upload_path)
    filename    = models.CharField(max_length=300)
    file_size   = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']

    def __str__(self):
        return f'{self.filename} — event {self.event_id}'
