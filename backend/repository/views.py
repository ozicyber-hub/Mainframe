"""
Repository views
"""
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import FindingTemplate, FindingTemplateTag, RepositoryFolder
from .serializers import (
    FindingTemplateSerializer, FindingTemplateCreateSerializer,
    FindingTemplateTagSerializer, RepositoryFolderSerializer,
)


def get_org(request):
    return getattr(request.user, 'organization', None)


class RepositoryFolderViewSet(viewsets.ModelViewSet):
    serializer_class = RepositoryFolderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org = get_org(self.request)
        user = self.request.user
        if user.is_superuser:
            return RepositoryFolder.objects.all()
        # Show non-private folders for the org, plus private folders the user has access to
        return RepositoryFolder.objects.filter(organization=org).filter(
            Q(is_private=False) | Q(created_by=user) | Q(allowed_users=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(organization=get_org(self.request), created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def set_users(self, request, pk=None):
        """Replace allowed_users list for a private folder."""
        folder = self.get_object()
        user_ids = request.data.get('user_ids', [])
        folder.allowed_users.set(user_ids)
        return Response(RepositoryFolderSerializer(folder, context={'request': request}).data)


class IsOrgMemberOrGlobal(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        if obj.is_global:
            return True
        if user.organization == obj.organization:
            return True
        return False


class FindingTemplateViewSet(viewsets.ModelViewSet):
    """Finding template CRUD operations"""
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['category', 'default_severity', 'is_global', 'folder']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return FindingTemplate.objects.all()
        return FindingTemplate.objects.filter(
            Q(is_global=True) | Q(organization=user.organization)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return FindingTemplateCreateSerializer
        return FindingTemplateSerializer

    def perform_create(self, serializer):
        is_global = self.request.data.get('is_global', False)
        if not is_global and not self.request.data.get('organization'):
            serializer.save(organization=self.request.user.organization, created_by=self.request.user)
        else:
            serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a template."""
        original = self.get_object()
        copy = FindingTemplate.objects.create(
            organization=original.organization,
            folder=original.folder,
            is_global=False,
            title=f"{original.title} (Copy)",
            category=original.category,
            description=original.description,
            details=original.details,
            impact=original.impact,
            likelihood=original.likelihood,
            recommendations=original.recommendations,
            supporting_evidence=original.supporting_evidence,
            default_severity=original.default_severity,
            cvss_vector=original.cvss_vector,
            av=original.av, ac=original.ac, pr=original.pr, ui=original.ui,
            s=original.s, c=original.c, i=original.i, a=original.a,
            references=original.references,
            cwe_id=original.cwe_id,
            tags=list(original.tags) if original.tags else [],
            created_by=request.user,
        )
        return Response(FindingTemplateSerializer(copy).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search templates by title, tags, or description"""
        query = request.query_params.get('q', '')
        category = request.query_params.get('category', '')
        severity = request.query_params.get('severity', '')
        tags = request.query_params.getlist('tags', [])

        queryset = self.get_queryset()
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query) | Q(description__icontains=query) | Q(tags__icontains=query)
            )
        if category:
            queryset = queryset.filter(category=category)
        if severity:
            queryset = queryset.filter(default_severity=severity)
        for tag in tags:
            queryset = queryset.filter(tags__contains=[tag])

        return Response(FindingTemplateSerializer(queryset, many=True).data)

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Apply a template to create a finding"""
        template = self.get_object()
        engagement_id = request.data.get('engagement_id')
        if not engagement_id:
            return Response({'error': 'engagement_id required'}, status=status.HTTP_400_BAD_REQUEST)
        template.increment_usage()
        return Response({
            'message': 'Template applied successfully',
            'template': FindingTemplateSerializer(template).data,
            'prefilled': {
                'engagement_id': engagement_id,
                'title': template.title,
                'severity': template.default_severity,
                'description': template.description,
                'details': template.details,
                'impact': template.impact,
                'likelihood': template.likelihood,
                'recommendations': template.recommendations,
                'supporting_evidence': template.supporting_evidence,
                'cvss_vector': template.cvss_vector,
                'av': template.av, 'ac': template.ac, 'pr': template.pr, 'ui': template.ui,
                's': template.s, 'c': template.c, 'i': template.i, 'a': template.a,
                'references': template.references,
                'cwe_id': template.cwe_id,
            }
        })


class FindingTemplateTagViewSet(viewsets.ModelViewSet):
    serializer_class = FindingTemplateTagSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = FindingTemplateTag.objects.all()
    search_fields = ['name']
