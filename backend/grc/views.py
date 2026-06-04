from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse

from .models import GrcFramework, GrcFamily, GrcControl, GrcProject, GrcControlStatus, GrcEvidence
from .validators import validate_evidence_file
from .serializers import (
    GrcFrameworkListSerializer, GrcControlSerializer,
    GrcProjectListSerializer, GrcProjectDetailSerializer, GrcProjectCreateSerializer,
    GrcControlStatusSerializer, GrcControlStatusUpdateSerializer,
    GrcEvidenceSerializer,
)


class GrcFrameworkViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = GrcFrameworkListSerializer

    def get_queryset(self):
        return GrcFramework.objects.filter(is_active=True).prefetch_related('families')

    @action(detail=True, methods=['get'])
    def controls(self, request, pk=None):
        framework = self.get_object()
        controls  = GrcControl.objects.filter(
            family__framework=framework
        ).select_related('family', 'parent').order_by('order')
        return Response(GrcControlSerializer(controls, many=True).data)


class GrcProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return GrcProjectCreateSerializer
        if self.action == 'list':
            return GrcProjectListSerializer
        return GrcProjectDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_superuser', False) or getattr(user, 'role', '') in ('SUPERADMIN', 'ADMIN'):
            return GrcProject.objects.select_related('framework', 'assessor', 'created_by').all()
        return GrcProject.objects.select_related('framework', 'assessor', 'created_by').filter(
            Q(organization__users=user) | Q(created_by=user) | Q(assessor=user)
        ).distinct()

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        self._init_controls(project)

    @transaction.atomic
    def _init_controls(self, project):
        controls = GrcControl.objects.filter(family__framework=project.framework)
        existing = set(project.control_statuses.values_list('control_id', flat=True))
        new_statuses = [
            GrcControlStatus(project=project, control=c)
            for c in controls if c.id not in existing
        ]
        GrcControlStatus.objects.bulk_create(new_statuses, ignore_conflicts=True)

    @action(detail=True, methods=['post'])
    def init_controls(self, request, pk=None):
        project = self.get_object()
        self._init_controls(project)
        return Response({'status': 'initialized'})

    @action(detail=True, methods=['get'])
    def control_statuses(self, request, pk=None):
        project  = self.get_object()
        statuses = project.control_statuses.select_related(
            'control', 'control__family', 'control__parent', 'owner'
        ).prefetch_related('evidence').order_by('control__order')
        return Response(
            GrcControlStatusSerializer(statuses, many=True, context={'request': request}).data
        )

    @action(detail=True, methods=['get'])
    def family_stats(self, request, pk=None):
        project  = self.get_object()
        families = GrcFamily.objects.filter(framework=project.framework).order_by('order')
        result   = []
        for fam in families:
            qs          = project.control_statuses.filter(control__family=fam, control__is_category=False)
            total       = qs.count()
            implemented = qs.filter(status='IMPLEMENTED').count()
            partial     = qs.filter(status='PARTIALLY_IMPLEMENTED').count()
            in_prog     = qs.filter(status='IN_PROGRESS').count()
            not_started = qs.filter(status='NOT_STARTED').count()
            result.append({
                'id':          fam.id,
                'identifier':  fam.identifier,
                'name':        fam.name,
                'total':       total,
                'implemented': implemented,
                'partial':     partial,
                'in_progress': in_prog,
                'not_started': not_started,
                'pct': round((implemented / total) * 100, 1) if total else 0,
            })
        return Response(result)

    @action(detail=True, methods=['get'])
    def gap_analysis_report(self, request, pk=None):
        import traceback as tb
        import logging
        logger = logging.getLogger(__name__)

        try:
            from .report_generator import generate_gap_analysis_report

            project = self.get_object()

            def _full_name(user):
                if not user:
                    return None
                name = f"{user.first_name} {user.last_name}".strip()
                return name or user.email

            project.assessor_name   = _full_name(project.assessor)
            project.created_by_name = _full_name(project.created_by)

            statuses = list(project.control_statuses.select_related(
                'control', 'control__family', 'control__parent', 'owner'
            ).prefetch_related('evidence').order_by('control__order'))

            for cs in statuses:
                cs.owner_name = _full_name(cs.owner)

            families     = GrcFamily.objects.filter(framework=project.framework).order_by('order')
            family_stats = []
            for fam in families:
                qs          = project.control_statuses.filter(control__family=fam, control__is_category=False)
                total       = qs.count()
                implemented = qs.filter(status='IMPLEMENTED').count()
                partial     = qs.filter(status='PARTIALLY_IMPLEMENTED').count()
                in_prog     = qs.filter(status='IN_PROGRESS').count()
                not_started = qs.filter(status='NOT_STARTED').count()
                family_stats.append({
                    'id':          fam.id,
                    'identifier':  fam.identifier,
                    'name':        fam.name,
                    'total':       total,
                    'implemented': implemented,
                    'partial':     partial,
                    'in_progress': in_prog,
                    'not_started': not_started,
                    'pct': round((implemented / total) * 100, 1) if total else 0,
                })

            fmt        = request.query_params.get('output', 'html').lower()
            safe_title = project.title.replace(' ', '_').replace('/', '-')[:60]

            if fmt == 'docx':
                from .docx_generator import generate_gap_analysis_docx
                docx_bytes = generate_gap_analysis_docx(project, list(statuses), family_stats)
                resp = HttpResponse(
                    docx_bytes,
                    content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                )
                resp['Content-Disposition'] = (
                    f'attachment; filename="GRC_Gap_Analysis_{safe_title}.docx"'
                )
                return resp

            html = generate_gap_analysis_report(project, list(statuses), family_stats)
            resp = HttpResponse(html, content_type='text/html; charset=utf-8')
            resp['Content-Disposition'] = f'inline; filename="GRC_Gap_Analysis_{safe_title}.html"'
            return resp

        except Exception as exc:
            trace = tb.format_exc()
            logger.error('gap_analysis_report error: %s\n%s', exc, trace)
            return Response(
                {'error': str(exc), 'traceback': trace},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GrcControlStatusViewSet(viewsets.GenericViewSet,
                              viewsets.mixins.RetrieveModelMixin,
                              viewsets.mixins.UpdateModelMixin):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GrcControlStatus.objects.select_related(
            'control', 'control__family', 'owner'
        ).prefetch_related('evidence')

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return GrcControlStatusUpdateSerializer
        return GrcControlStatusSerializer

    @action(detail=True, methods=['post'])
    def add_evidence(self, request, pk=None):
        cs = self.get_object()
        if 'file' in request.FILES:
            uploaded_file = request.FILES['file']
            try:
                validate_evidence_file(uploaded_file)
            except Exception as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        ev = GrcEvidence(
            control_status=cs,
            title=request.data.get('title', ''),
            description=request.data.get('description', ''),
            url=request.data.get('url', ''),
            uploaded_by=request.user,
        )
        if 'file' in request.FILES:
            ev.file = request.FILES['file']
        ev.save()
        return Response(
            GrcEvidenceSerializer(ev, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class GrcEvidenceViewSet(viewsets.GenericViewSet,
                         viewsets.mixins.DestroyModelMixin):
    permission_classes = [IsAuthenticated]
    serializer_class   = GrcEvidenceSerializer

    def get_queryset(self):
        return GrcEvidence.objects.all()
