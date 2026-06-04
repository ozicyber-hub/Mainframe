"""
Finding views
"""
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import Finding, FindingImage, FindingComment, FindingCustomField
from .serializers import (
    FindingSerializer, FindingCreateSerializer, FindingListSerializer,
    FindingImageSerializer, FindingCommentSerializer, FindingCustomFieldSerializer,
    CVSSSerializer
)


# Roles that may only read findings, not create/edit/delete
_FINDING_READ_ONLY_ROLES = {'CLIENT', 'GRC_CONSULTANT', 'PROJECT_MANAGER'}
# Roles that may write findings
_FINDING_WRITE_ROLES = {'SUPERADMIN', 'ADMIN', 'PENTESTER'}


class IsFindingMember(permissions.BasePermission):
    """Permission class for finding access"""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        # Only writers can mutate findings
        if request.method not in permissions.SAFE_METHODS and user.role in _FINDING_READ_ONLY_ROLES:
            return False
        # Check organization membership
        if user.organization == obj.engagement.organization:
            return True
        # Check engagement team
        if (user == obj.engagement.lead_pentester or
            user == obj.engagement.project_manager or
            user in obj.engagement.team_members.all()):
            return True
        return False


class FindingViewSet(viewsets.ModelViewSet):
    """Finding CRUD operations"""
    permission_classes = [permissions.IsAuthenticated, IsFindingMember]
    filterset_fields = ['engagement', 'severity', 'status']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Finding.objects.all().select_related('engagement', 'created_by', 'assigned_to')

        # Filter by organization and engagement access
        return Finding.objects.filter(
            Q(engagement__organization__users=user) |
            Q(engagement__lead_pentester=user) |
            Q(engagement__project_manager=user) |
            Q(engagement__team_members=user)
        ).distinct().select_related('engagement', 'created_by', 'assigned_to').prefetch_related('images', 'comments')

    def get_serializer_class(self):
        if self.action == 'create':
            return FindingCreateSerializer
        elif self.action == 'list':
            return FindingListSerializer
        return FindingSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.role in _FINDING_READ_ONLY_ROLES:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Your role does not allow creating findings.')
        finding = serializer.save(created_by=user)
        # Auto-assign to creator if not specified
        if not finding.assigned_to:
            finding.assigned_to = user
            finding.save()

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Change finding status"""
        finding = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response({'error': 'Status required'}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = [choice[0] for choice in Finding.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choose from: {valid_statuses}'},
                          status=status.HTTP_400_BAD_REQUEST)

        finding.status = new_status
        finding.save()

        return Response({'message': f'Status changed to {new_status}', 'finding': FindingSerializer(finding).data})

    @action(detail=True, methods=['post'])
    def calculate_cvss(self, request, pk=None):
        """Calculate CVSS score from provided metrics"""
        finding = self.get_object()
        serializer = CVSSSerializer(data=request.data)

        if serializer.is_valid():
            metrics = serializer.validated_data
            # Update finding with metrics
            for key, value in metrics.items():
                setattr(finding, key, value)

            # Calculate score
            finding.cvss_score = finding.calculate_cvss()
            finding.cvss_vector = self._build_cvss_vector(metrics)
            finding.save()

            return Response({
                'cvss_score': finding.cvss_score,
                'cvss_vector': finding.cvss_vector,
                'severity': Finding.score_to_severity(finding.cvss_score) if finding.cvss_score else None
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _build_cvss_vector(self, metrics):
        """Build CVSS 3.1 vector string"""
        return f"CVSS:3.1/AV:{metrics.get('av', 'N')}/AC:{metrics.get('ac', 'L')}/PR:{metrics.get('pr', 'N')}/UI:{metrics.get('ui', 'N')}/S:{metrics.get('s', 'U')}/C:{metrics.get('c', 'N')}/I:{metrics.get('i', 'N')}/A:{metrics.get('a', 'N')}"


def _finding_accessible(user, finding_id):
    """Return True if the user has access to the given finding via org or team membership."""
    if user.is_superuser:
        return True
    return Finding.objects.filter(
        Q(engagement__organization__users=user) |
        Q(engagement__lead_pentester=user) |
        Q(engagement__project_manager=user) |
        Q(engagement__team_members=user),
        id=finding_id,
    ).exists()


class FindingImageViewSet(viewsets.ModelViewSet):
    """Finding images CRUD"""
    serializer_class = FindingImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        finding_id = self.kwargs.get('finding_pk')
        if not _finding_accessible(user, finding_id):
            return FindingImage.objects.none()
        return FindingImage.objects.filter(finding_id=finding_id)

    def perform_create(self, serializer):
        user = self.request.user
        finding_id = self.kwargs.get('finding_pk')
        if not _finding_accessible(user, finding_id) or user.role in _FINDING_READ_ONLY_ROLES:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        serializer.save(finding_id=finding_id)


class FindingCommentViewSet(viewsets.ModelViewSet):
    """Finding comments CRUD"""
    serializer_class = FindingCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        finding_id = self.kwargs.get('finding_pk')
        user = self.request.user
        if not _finding_accessible(user, finding_id):
            return FindingComment.objects.none()
        queryset = FindingComment.objects.filter(finding_id=finding_id)
        # Clients can only see non-internal comments
        if user.role == 'CLIENT':
            queryset = queryset.filter(is_internal=False)
        return queryset

    def perform_create(self, serializer):
        finding_id = self.kwargs.get('finding_pk')
        user = self.request.user
        if not _finding_accessible(user, finding_id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        # Default to internal for internal staff, external for clients
        is_internal = self.request.data.get('is_internal', user.role != 'CLIENT')
        if user.role == 'CLIENT':
            is_internal = False
        serializer.save(author=user, finding_id=finding_id, is_internal=is_internal)


class FindingCustomFieldViewSet(viewsets.ModelViewSet):
    """Custom field definitions CRUD — write access restricted to ADMIN/SUPERADMIN."""
    serializer_class = FindingCustomFieldSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return FindingCustomField.objects.all()
        return FindingCustomField.objects.filter(organization=user.organization, is_active=True)

    def _require_admin(self):
        user = self.request.user
        if not user.is_superuser and user.role not in ('ADMIN', 'SUPERADMIN'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only admins can manage custom field definitions.')

    def perform_create(self, serializer):
        self._require_admin()
        serializer.save(organization=self.request.user.organization)

    def perform_update(self, serializer):
        self._require_admin()
        serializer.save()

    def perform_destroy(self, instance):
        self._require_admin()
        instance.delete()


