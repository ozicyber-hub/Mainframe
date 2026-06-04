"""
Scheduling views — calendar events, team tasks, time-slot requests.
"""
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import CalendarEvent, TeamTask, TimeSlotRequest, EventComment, HandoverAttachment
from .serializers import (
    CalendarEventSerializer, TeamTaskSerializer,
    TimeSlotRequestSerializer, EventCommentSerializer, HandoverAttachmentSerializer,
)
from engagements.models import Engagement


def get_org(request):
    return getattr(request.user, 'organization', None)


class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org = get_org(self.request)
        if org is None:
            # Superadmin: show events from all orgs they're involved with
            from django.db.models import Q as Qm
            user = self.request.user
            visible_orgs = Engagement.objects.filter(
                Qm(lead_pentester=user) | Qm(project_manager=user) | Qm(team_members=user)
            ).values_list('organization_id', flat=True)
            qs = CalendarEvent.objects.filter(organization_id__in=visible_orgs).prefetch_related('attendees', 'comments')
        else:
            qs = CalendarEvent.objects.filter(organization=org).prefetch_related('attendees', 'comments')

        if self.request.user.role == 'CLIENT':
            qs = qs.filter(is_client_visible=True)

        start    = self.request.query_params.get('start')
        end      = self.request.query_params.get('end')
        attendee = self.request.query_params.get('attendee')

        if start:
            qs = qs.filter(end_date__date__gte=start)
        if end:
            qs = qs.filter(start_date__date__lte=end)
        if attendee:
            qs = qs.filter(attendees__id=attendee)
        return qs

    def _resolve_org(self, request):
        org = get_org(request)
        if org is None:
            eng_id = request.data.get('engagement')
            if eng_id:
                try:
                    return Engagement.objects.get(id=eng_id).organization
                except Engagement.DoesNotExist:
                    pass
            # Fall back to first org the user is associated with
            eng = (
                Engagement.objects.filter(lead_pentester=request.user).select_related('organization').first() or
                Engagement.objects.filter(project_manager=request.user).select_related('organization').first() or
                Engagement.objects.filter(team_members=request.user).select_related('organization').first()
            )
            if eng:
                return eng.organization
        return org

    def perform_create(self, serializer):
        serializer.save(organization=self._resolve_org(self.request), created_by=self.request.user)
        event = serializer.instance
        attendees = list(event.attendees.exclude(id=self.request.user.id))
        if attendees:
            try:
                from notifications.utils import notify_users
                notify_users(
                    attendees, 'ASSIGNMENT',
                    f'Added to event: {event.title}',
                    f'You have been added as an attendee to "{event.title}" on {event.start_date.strftime("%Y-%m-%d") if event.start_date else "TBD"}.',
                    related_type='calendar_event', related_id=event.id,
                )
            except Exception:
                pass

    def perform_update(self, serializer):
        from notifications.utils import notify_users
        from django.contrib.auth import get_user_model
        _User = get_user_model()

        old_attendees = set(serializer.instance.attendees.values_list('id', flat=True))
        old_start = serializer.instance.start_date
        old_end = serializer.instance.end_date
        serializer.save()
        event = serializer.instance
        new_attendees = set(event.attendees.values_list('id', flat=True))

        added_ids   = new_attendees - old_attendees
        removed_ids = old_attendees - new_attendees
        dates_changed = (event.start_date != old_start or event.end_date != old_end)
        date_str = event.start_date.strftime('%Y-%m-%d %H:%M') if event.start_date else 'TBD'

        try:
            # Newly added attendees
            if added_ids:
                added_users = list(_User.objects.filter(id__in=added_ids))
                notify_users(
                    added_users, 'ASSIGNMENT',
                    f'Added to event: {event.title}',
                    f'You have been added as an attendee to "{event.title}" on {date_str}.',
                    related_type='calendar_event', related_id=event.id,
                )

            # Removed attendees
            if removed_ids:
                removed_users = list(_User.objects.filter(id__in=removed_ids))
                notify_users(
                    removed_users, 'ENGAGEMENT_UPDATE',
                    f'Removed from event: {event.title}',
                    f'You have been removed from the event "{event.title}".',
                    related_type='calendar_event', related_id=event.id,
                )

            # Existing attendees notified of date/time change
            if dates_changed:
                unchanged_ids = new_attendees & old_attendees
                if unchanged_ids:
                    unchanged_users = list(_User.objects.filter(id__in=unchanged_ids))
                    notify_users(
                        unchanged_users, 'ENGAGEMENT_UPDATE',
                        f'Event rescheduled: {event.title}',
                        f'"{event.title}" has been rescheduled to {date_str}.',
                        related_type='calendar_event', related_id=event.id,
                    )
        except Exception:
            pass

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        event = self.get_object()
        event.is_completed = not event.is_completed
        event.save(update_fields=['is_completed'])
        return Response(CalendarEventSerializer(event).data)

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        event = self.get_object()
        if request.method == 'GET':
            return Response(EventCommentSerializer(event.comments.all(), many=True).data)
        serializer = EventCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(event=event, author=request.user)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get', 'post'])
    def attachments(self, request, pk=None):
        event = self.get_object()
        if request.method == 'GET':
            qs = event.handover_attachments.all()
            return Response(HandoverAttachmentSerializer(qs, many=True, context={'request': request}).data)
        f = request.FILES.get('file')
        if not f:
            return Response({'error': 'No file provided.'}, status=400)
        attachment = HandoverAttachment.objects.create(
            event=event,
            uploaded_by=request.user,
            file=f,
            filename=f.name,
            file_size=f.size,
        )
        return Response(HandoverAttachmentSerializer(attachment, context={'request': request}).data, status=201)

    @action(detail=True, methods=['delete'], url_path='attachments/(?P<att_id>[0-9]+)')
    def delete_attachment(self, request, pk=None, att_id=None):
        event = self.get_object()
        try:
            att = event.handover_attachments.get(id=att_id)
        except HandoverAttachment.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        att.file.delete(save=False)
        att.delete()
        return Response(status=204)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        now = timezone.now()
        qs  = self.get_queryset().filter(start_date__gte=now)[:10]
        return Response(CalendarEventSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'])
    def sync_engagements(self, request):
        org     = get_org(request)
        created = 0
        for eng in Engagement.objects.filter(organization=org):
            for date_field, etype, suffix in [
                ('start_date',      'ENGAGEMENT_START', 'Start'),
                ('end_date',        'ENGAGEMENT_END',   'End'),
                ('report_due_date', 'REPORT_DUE',       'Report Due'),
            ]:
                dt = getattr(eng, date_field)
                if not dt:
                    continue
                from datetime import datetime, time
                import datetime as dt_mod
                if isinstance(dt, dt_mod.date) and not isinstance(dt, dt_mod.datetime):
                    from django.utils.timezone import make_aware
                    dt = make_aware(datetime.combine(dt, time(9, 0)))
                title = f'{eng.name} — {suffix}'
                if not CalendarEvent.objects.filter(organization=org, engagement=eng, event_type=etype).exists():
                    CalendarEvent.objects.create(
                        organization=org, engagement=eng, event_type=etype,
                        title=title, start_date=dt, end_date=dt,
                        all_day=(etype != 'TESTING_WINDOW'),
                        is_client_visible=(etype in ('ENGAGEMENT_START', 'ENGAGEMENT_END')),
                        created_by=request.user,
                    )
                    created += 1
        return Response({'created': created})


class TeamTaskViewSet(viewsets.ModelViewSet):
    serializer_class = TeamTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org = get_org(self.request)
        if org is None:
            from django.db.models import Q as Qm
            user = self.request.user
            visible_orgs = Engagement.objects.filter(
                Qm(lead_pentester=user) | Qm(project_manager=user) | Qm(team_members=user)
            ).values_list('organization_id', flat=True)
            qs = TeamTask.objects.filter(organization_id__in=visible_orgs).select_related('assigned_to', 'engagement')
        else:
            qs = TeamTask.objects.filter(organization=org).select_related('assigned_to', 'engagement')
        if self.request.user.role == 'CLIENT':
            return qs.none()
        assigned = self.request.query_params.get('assigned_to')
        status_  = self.request.query_params.get('status')
        eng      = self.request.query_params.get('engagement')
        if assigned:
            qs = qs.filter(assigned_to=assigned)
        if status_:
            qs = qs.filter(status=status_)
        if eng:
            qs = qs.filter(engagement=eng)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self._resolve_org(self.request), created_by=self.request.user)
        task = serializer.instance
        if task.assigned_to and task.assigned_to_id != self.request.user.id:
            from notifications.utils import notify_users
            try:
                notify_users(
                    [task.assigned_to], 'ASSIGNMENT',
                    f'Task assigned: {task.title}',
                    f'You have been assigned to the task "{task.title}"' + (f' (due {task.due_date})' if task.due_date else '') + '.',
                    related_type='team_task', related_id=task.id,
                )
            except Exception:
                pass

    def perform_update(self, serializer):
        from notifications.utils import notify_users
        from django.contrib.auth import get_user_model
        _User = get_user_model()

        old_assigned = serializer.instance.assigned_to_id
        old_due = serializer.instance.due_date
        serializer.save()
        task = serializer.instance

        try:
            assignee_changed = task.assigned_to_id != old_assigned
            due_changed = task.due_date != old_due

            if assignee_changed:
                # Notify new assignee
                if task.assigned_to:
                    notify_users(
                        [task.assigned_to], 'ASSIGNMENT',
                        f'Task assigned: {task.title}',
                        f'You have been assigned to the task "{task.title}"' + (f' (due {task.due_date})' if task.due_date else '') + '.',
                        related_type='team_task', related_id=task.id,
                    )
                # Notify old assignee they were unassigned
                if old_assigned:
                    try:
                        old_user = _User.objects.get(id=old_assigned)
                        notify_users(
                            [old_user], 'ENGAGEMENT_UPDATE',
                            f'Task unassigned: {task.title}',
                            f'You have been unassigned from the task "{task.title}".',
                            related_type='team_task', related_id=task.id,
                        )
                    except _User.DoesNotExist:
                        pass

            elif due_changed and task.assigned_to:
                # Same assignee but due date moved
                notify_users(
                    [task.assigned_to], 'ENGAGEMENT_UPDATE',
                    f'Task rescheduled: {task.title}',
                    f'The due date for task "{task.title}" has been updated to {task.due_date}.',
                    related_type='team_task', related_id=task.id,
                )
        except Exception:
                pass

    def _resolve_org(self, request):
        org = get_org(request)
        if org is None:
            eng_id = request.data.get('engagement')
            if eng_id:
                try:
                    return Engagement.objects.get(id=eng_id).organization
                except Engagement.DoesNotExist:
                    pass
            eng = (
                Engagement.objects.filter(lead_pentester=request.user).select_related('organization').first() or
                Engagement.objects.filter(project_manager=request.user).select_related('organization').first() or
                Engagement.objects.filter(team_members=request.user).select_related('organization').first()
            )
            if eng:
                return eng.organization
        return org

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status       = 'DONE'
        task.completed_at = timezone.now()
        task.save()
        return Response(TeamTaskSerializer(task).data)


class TimeSlotRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TimeSlotRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org = get_org(self.request)
        qs  = TimeSlotRequest.objects.filter(organization=org).select_related('requested_by', 'reviewed_by', 'engagement')
        if self.request.user.role == 'CLIENT':
            qs = qs.filter(requested_by=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=get_org(self.request), requested_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role not in ('ADMIN', 'SUPERADMIN'):
            return Response({'error': 'Permission denied'}, status=403)
        slot = self.get_object()
        slot.status       = 'APPROVED'
        slot.reviewed_by  = request.user
        slot.admin_notes  = request.data.get('admin_notes', '')
        slot.save()
        return Response(TimeSlotRequestSerializer(slot).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role not in ('ADMIN', 'SUPERADMIN'):
            return Response({'error': 'Permission denied'}, status=403)
        slot = self.get_object()
        slot.status       = 'REJECTED'
        slot.reviewed_by  = request.user
        slot.admin_notes  = request.data.get('admin_notes', '')
        slot.save()
        return Response(TimeSlotRequestSerializer(slot).data)
