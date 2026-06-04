"""
Engagement views
"""
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Engagement, EngagementNote, EngagementAttachment
from .serializers import (
    EngagementSerializer, EngagementCreateSerializer,
    EngagementNoteSerializer, EngagementAttachmentSerializer
)
from notifications.utils import notify_users

User = get_user_model()


_ENGAGEMENT_WRITE_ROLES = {'SUPERADMIN', 'ADMIN', 'PENTESTER', 'PROJECT_MANAGER'}
_ENGAGEMENT_MANAGE_ROLES = {'SUPERADMIN', 'ADMIN', 'PENTESTER', 'PROJECT_MANAGER'}


class IsEngagementMember(permissions.BasePermission):
    """Permission class for engagement access"""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        # Clients may only read engagements
        if request.method not in permissions.SAFE_METHODS and user.role == 'CLIENT':
            return False
        # Check if user belongs to the organization
        if user.organization == obj.organization:
            return True
        # Check if user is assigned to the engagement
        if user == obj.lead_pentester or user == obj.project_manager or user in obj.team_members.all():
            return True
        return False


class EngagementViewSet(viewsets.ModelViewSet):
    """Engagement CRUD operations"""
    permission_classes = [permissions.IsAuthenticated, IsEngagementMember]
    filterset_fields = ['organization', 'status', 'engagement_type']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Engagement.objects.all().select_related('organization', 'lead_pentester', 'project_manager')
        # Filter by organization and team membership
        return Engagement.objects.filter(
            Q(organization__users=user) |
            Q(lead_pentester=user) |
            Q(project_manager=user) |
            Q(team_members=user)
        ).distinct().select_related('organization', 'lead_pentester', 'project_manager')

    def get_serializer_class(self):
        if self.action == 'create':
            return EngagementCreateSerializer
        return EngagementSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.role not in _ENGAGEMENT_WRITE_ROLES:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Your role does not allow creating engagements.')
        engagement = serializer.save(created_by=user)
        engagement.team_members.add(user)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_lead = instance.lead_pentester_id
        old_start = instance.start_date
        old_end = instance.end_date
        serializer.save()
        eng = serializer.instance

        try:
            # Lead changed via direct PATCH (not reassign action)
            if eng.lead_pentester_id != old_lead:
                if eng.lead_pentester:
                    notify_users(
                        [eng.lead_pentester], 'ASSIGNMENT',
                        f'Assigned as lead: {eng.name}',
                        f'You have been assigned as lead tester for "{eng.name}".',
                        related_type='engagement', related_id=eng.id,
                    )
                if old_lead:
                    try:
                        old_user = User.objects.get(id=old_lead)
                        notify_users(
                            [old_user], 'ENGAGEMENT_UPDATE',
                            f'Unassigned from: {eng.name}',
                            f'You have been unassigned from "{eng.name}" as lead tester.',
                            related_type='engagement', related_id=eng.id,
                        )
                    except User.DoesNotExist:
                        pass

            # Date rescheduled — notify everyone on the engagement
            if eng.start_date != old_start or eng.end_date != old_end:
                seen = set()
                to_notify = []
                for u in list(eng.team_members.all()):
                    if u.id not in seen:
                        seen.add(u.id); to_notify.append(u)
                if eng.lead_pentester and eng.lead_pentester_id not in seen:
                    to_notify.append(eng.lead_pentester)
                if to_notify:
                    notify_users(
                        to_notify, 'ENGAGEMENT_UPDATE',
                        f'Schedule updated: {eng.name}',
                        f'"{eng.name}" has been rescheduled to {eng.start_date} – {eng.end_date}.',
                        related_type='engagement', related_id=eng.id,
                    )
        except Exception:
            pass

    @action(detail=True, methods=['post'], url_path='reassign')
    def reassign(self, request, pk=None):
        if not request.user.is_superuser and request.user.role not in _ENGAGEMENT_MANAGE_ROLES:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        engagement = self.get_object()
        source_id = request.data.get('source_id')
        target_id = request.data.get('target_id')
        new_start_date = request.data.get('new_start_date')
        new_end_date = request.data.get('new_end_date')

        if not target_id:
            return Response({'error': 'target_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = User.objects.get(id=target_id)
        except User.DoesNotExist:
            return Response({'error': 'Target user not found'}, status=status.HTTP_400_BAD_REQUEST)

        add_to_team = request.data.get('add_to_team', False)
        if add_to_team:
            if not engagement.team_members.filter(id=target.id).exists():
                engagement.team_members.add(target)
            try:
                notify_users(
                    [target], 'ASSIGNMENT',
                    f'Added to team: {engagement.name}',
                    f'You have been added to the team for engagement "{engagement.name}".',
                    related_type='engagement', related_id=engagement.id,
                )
            except Exception:
                pass
            engagement.refresh_from_db()
            serializer = EngagementSerializer(engagement, context={'request': request})
            return Response(serializer.data)

        update_fields = []

        if not source_id:
            # Assigning from unassigned pool — set target as lead
            engagement.lead_pentester = target
            update_fields.append('lead_pentester')
            m2m_remove_from_source = None
            m2m_remove_target_from_team = True
        else:
            try:
                source = User.objects.get(id=source_id)
            except User.DoesNotExist:
                return Response({'error': 'Source user not found'}, status=status.HTTP_400_BAD_REQUEST)

            if engagement.lead_pentester_id == source.id:
                engagement.lead_pentester = target
                update_fields.append('lead_pentester')
                m2m_remove_from_source = source
                m2m_remove_target_from_team = True
            elif engagement.project_manager_id == source.id:
                engagement.project_manager = target
                update_fields.append('project_manager')
                m2m_remove_from_source = source
                m2m_remove_target_from_team = False
            else:
                m2m_remove_from_source = source
                m2m_remove_target_from_team = False
                if not engagement.team_members.filter(id=target.id).exists():
                    engagement.team_members.add(target)

        if new_start_date:
            engagement.start_date = new_start_date
            update_fields.append('start_date')
        if new_end_date:
            engagement.end_date = new_end_date
            update_fields.append('end_date')

        if update_fields:
            engagement.save(update_fields=update_fields)

        if m2m_remove_from_source:
            engagement.team_members.remove(m2m_remove_from_source)
        if m2m_remove_target_from_team:
            engagement.team_members.remove(target)

        engagement.refresh_from_db()  # coerce any string-assigned dates back to date objects

        role_label = 'lead tester' if not source_id or engagement.lead_pentester_id == target.id else 'team member'
        date_suffix = f' ({engagement.start_date} – {engagement.end_date})' if engagement.start_date else ''

        # Notify target (assigned)
        try:
            notify_users(
                [target], 'ASSIGNMENT',
                f'Assigned to {engagement.name}',
                f'You have been assigned to "{engagement.name}" as {role_label}{date_suffix}.',
                related_type='engagement', related_id=engagement.id,
            )
        except Exception:
            pass

        # Notify source (replaced/removed)
        if source_id:
            try:
                source_user = User.objects.get(id=source_id)
                notify_users(
                    [source_user], 'ENGAGEMENT_UPDATE',
                    f'Replaced on: {engagement.name}',
                    f'You have been replaced on "{engagement.name}" by {target.get_full_name()}.',
                    related_type='engagement', related_id=engagement.id,
                )
            except Exception:
                pass

        # If dates also changed, notify remaining team members
        if new_start_date or new_end_date:
            try:
                notified = {target.id}
                if source_id:
                    notified.add(int(source_id))
                others = [
                    u for u in list(engagement.team_members.all())
                    if u.id not in notified
                ]
                if engagement.lead_pentester and engagement.lead_pentester_id not in notified:
                    others.append(engagement.lead_pentester)
                if others:
                    notify_users(
                        others, 'ENGAGEMENT_UPDATE',
                        f'Schedule updated: {engagement.name}',
                        f'"{engagement.name}" has been rescheduled to {engagement.start_date} – {engagement.end_date}.',
                        related_type='engagement', related_id=engagement.id,
                    )
            except Exception:
                pass
        serializer = EngagementSerializer(engagement, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='remove_member')
    def remove_member(self, request, pk=None):
        if not request.user.is_superuser and request.user.role not in _ENGAGEMENT_MANAGE_ROLES:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        engagement = self.get_object()
        member_id = request.data.get('member_id')

        if not member_id:
            return Response({'error': 'member_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = User.objects.get(id=member_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_400_BAD_REQUEST)

        if engagement.lead_pentester_id == member.id:
            engagement.lead_pentester = None
            engagement.save(update_fields=['lead_pentester'])
        if engagement.project_manager_id == member.id:
            engagement.project_manager = None
            engagement.save(update_fields=['project_manager'])
        engagement.team_members.remove(member)

        try:
            notify_users(
                [member],
                'ENGAGEMENT_UPDATE',
                f'Removed from {engagement.name}',
                f'You have been unassigned from the engagement "{engagement.name}".',
                related_type='engagement',
                related_id=engagement.id,
            )
        except Exception:
            pass

        serializer = EngagementSerializer(engagement, context={'request': request})
        return Response(serializer.data)


def _engagement_accessible(user, engagement_id):
    """Return True if the user has access to the given engagement."""
    if user.is_superuser:
        return True
    return Engagement.objects.filter(
        Q(organization__users=user) | Q(lead_pentester=user) |
        Q(project_manager=user) | Q(team_members=user),
        id=engagement_id,
    ).exists()


class EngagementNoteViewSet(viewsets.ModelViewSet):
    """Engagement notes CRUD"""
    serializer_class = EngagementNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        engagement_id = self.kwargs.get('engagement_pk')
        if not _engagement_accessible(user, engagement_id):
            return EngagementNote.objects.none()
        return EngagementNote.objects.filter(engagement_id=engagement_id)

    def perform_create(self, serializer):
        engagement_id = self.kwargs.get('engagement_pk')
        if not _engagement_accessible(self.request.user, engagement_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        serializer.save(author=self.request.user, engagement_id=engagement_id)


class EngagementAttachmentViewSet(viewsets.ModelViewSet):
    """Engagement attachments CRUD"""
    serializer_class = EngagementAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        engagement_id = self.kwargs.get('engagement_pk')
        if not _engagement_accessible(user, engagement_id):
            return EngagementAttachment.objects.none()
        return EngagementAttachment.objects.filter(engagement_id=engagement_id)

    def perform_create(self, serializer):
        engagement_id = self.kwargs.get('engagement_pk')
        if not _engagement_accessible(self.request.user, engagement_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        serializer.save(uploaded_by=self.request.user, engagement_id=engagement_id)
