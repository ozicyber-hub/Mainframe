from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from findings.models import Finding
from organizations.models import Organization
from .models import IntegrationDeliveryLog, IntegrationSetting, JiraIssueLink
from .serializers import (
    IntegrationDeliveryLogSerializer,
    IntegrationSettingSerializer,
    JiraIssueLinkSerializer,
)
from .services import (
    create_jira_test_issue,
    create_jira_issue_for_finding,
    get_setting,
    list_jira_project_components,
    list_jira_create_fields,
    list_jira_issue_types,
    list_jira_priorities,
    list_jira_projects,
    process_jira_webhook,
    search_jira_assignable_users,
    search_jira_parent_issues,
    send_webhook_event,
    sync_all_jira_issue_links,
    test_jira_connection,
)


class CanManageIntegrations(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.role in ('SUPERADMIN', 'ADMIN') or user.has_permission('manage_integrations'))
        )


def can_access_finding(user, finding):
    if user.is_superuser:
        return True
    engagement = finding.engagement
    return bool(
        user.organization_id == engagement.organization_id
        or user == engagement.lead_pentester
        or user == engagement.project_manager
        or engagement.team_members.filter(pk=user.pk).exists()
    )


def organization_queryset_for_user(user):
    if user.is_superuser or user.role == 'SUPERADMIN':
        return Organization.objects.all()
    if user.organization_id:
        return Organization.objects.filter(pk=user.organization_id)
    return Organization.objects.filter(users=user).distinct()


def get_request_organization(request, required=False):
    org_id = (
        request.query_params.get('organization_id')
        or request.query_params.get('organization')
        or request.data.get('organization_id')
        or request.data.get('organization')
    )
    if not org_id and request.user.organization_id and request.user.role != 'SUPERADMIN' and not request.user.is_superuser:
        org_id = request.user.organization_id
    if not org_id:
        if required:
            raise ValueError('organization_id is required.')
        return None
    org = organization_queryset_for_user(request.user).filter(pk=org_id).first()
    if not org:
        raise ValueError('Organization not found or not accessible.')
    return org


def scoped_setting_from_request(request, provider, required_org=False):
    org = get_request_organization(request, required=required_org)
    return get_setting(provider, organization=org), org


class IntegrationOverviewView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        org = get_request_organization(request)
        google_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
        google_enabled = bool(google_client_id and google_client_id != 'your-google-client-id')
        scoped_qs = IntegrationSetting.objects.select_related('organization')
        if org:
            scoped_qs = scoped_qs.filter(organization=org)
        elif not (request.user.is_superuser or request.user.role == 'SUPERADMIN'):
            scoped_qs = scoped_qs.filter(organization__in=organization_queryset_for_user(request.user))
        return Response({
            'google': {
                'provider': 'google',
                'enabled': google_enabled,
                'client_id': google_client_id if google_enabled else '',
            },
            'selected_organization': org.id if org else None,
            'webhook': IntegrationSettingSerializer(get_setting(IntegrationSetting.PROVIDER_WEBHOOK, organization=org)).data,
            'jira': IntegrationSettingSerializer(get_setting(IntegrationSetting.PROVIDER_JIRA, organization=org)).data,
            'servicenow': IntegrationSettingSerializer(get_setting(IntegrationSetting.PROVIDER_SERVICENOW, organization=org)).data,
            'settings': IntegrationSettingSerializer(scoped_qs, many=True).data,
        })


class IntegrationSettingView(APIView):
    permission_classes = [CanManageIntegrations]
    provider = None

    def get(self, request):
        setting, _ = scoped_setting_from_request(request, self.provider)
        return Response(IntegrationSettingSerializer(setting).data)

    def patch(self, request):
        setting, _ = scoped_setting_from_request(request, self.provider, required_org=True)
        serializer = IntegrationSettingSerializer(setting, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class WebhookSettingView(IntegrationSettingView):
    provider = IntegrationSetting.PROVIDER_WEBHOOK


class JiraSettingView(IntegrationSettingView):
    provider = IntegrationSetting.PROVIDER_JIRA


class ServiceNowSettingView(IntegrationSettingView):
    provider = IntegrationSetting.PROVIDER_SERVICENOW


class WebhookTestView(APIView):
    permission_classes = [CanManageIntegrations]

    def post(self, request):
        setting, org = scoped_setting_from_request(request, IntegrationSetting.PROVIDER_WEBHOOK, required_org=True)
        payload = {
            'event': 'integration.test',
            'source': 'ozireport',
            'message': 'Webhook test from OziReport',
            'actor': request.user.email,
            'organization': {'id': org.id, 'name': org.name},
        }
        previous_enabled = setting.enabled
        setting.enabled = True
        setting.save(update_fields=['enabled'])
        try:
            send_webhook_event('integration.test', None, payload, setting_override=setting)
        finally:
            if previous_enabled != setting.enabled:
                setting.enabled = previous_enabled
                setting.save(update_fields=['enabled'])
        latest = IntegrationDeliveryLog.objects.filter(provider='webhook', event='integration.test').first()
        if latest and latest.status == 'SUCCESS':
            return Response({'message': 'Webhook test delivered.', 'log': IntegrationDeliveryLogSerializer(latest).data})
        return Response(
            {'error': latest.error_message or latest.response_body if latest else 'Webhook test failed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


class JiraTestView(APIView):
    permission_classes = [CanManageIntegrations]

    def post(self, request):
        setting, _ = scoped_setting_from_request(request, IntegrationSetting.PROVIDER_JIRA, required_org=True)
        config = setting.config
        ok, message = test_jira_connection(config)
        if ok:
            return Response({'message': message})
        return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


class JiraProjectsView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        try:
            setting, _ = scoped_setting_from_request(request, IntegrationSetting.PROVIDER_JIRA, required_org=True)
            projects = list_jira_projects(setting.config)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(projects)


class JiraIssueTypesView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        setting, _ = scoped_setting_from_request(request, IntegrationSetting.PROVIDER_JIRA, required_org=True)
        project_key = request.query_params.get('project_key') or setting.config.get('project_key')
        if not project_key:
            return Response({'error': 'project_key is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            issue_types = list_jira_issue_types(setting.config, project_key)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(issue_types)


class JiraFieldsView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        setting, _ = scoped_setting_from_request(request, IntegrationSetting.PROVIDER_JIRA, required_org=True)
        config = setting.config
        project_key = request.query_params.get('project_key') or config.get('project_key')
        issue_type = request.query_params.get('issue_type') or config.get('issue_type') or 'Task'
        if not project_key:
            return Response({'error': 'project_key is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            fields = list_jira_create_fields(config, project_key, issue_type)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(fields)


class JiraComponentsView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        setting, _ = scoped_setting_from_request(request, IntegrationSetting.PROVIDER_JIRA, required_org=True)
        config = setting.config
        project_key = request.query_params.get('project_key') or config.get('project_key')
        if not project_key:
            return Response({'error': 'project_key is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            components = list_jira_project_components(config, project_key)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(components)


class JiraUsersView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        setting, _ = scoped_setting_from_request(request, IntegrationSetting.PROVIDER_JIRA, required_org=True)
        config = setting.config
        project_key = request.query_params.get('project_key') or config.get('project_key')
        query = request.query_params.get('query', '')
        if not project_key:
            return Response({'error': 'project_key is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            users = search_jira_assignable_users(config, project_key, query=query)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(users)


class JiraParentsView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        setting, _ = scoped_setting_from_request(request, IntegrationSetting.PROVIDER_JIRA, required_org=True)
        config = setting.config
        project_key = request.query_params.get('project_key') or config.get('project_key')
        query = request.query_params.get('query', '')
        if not project_key:
            return Response({'error': 'project_key is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            parents = search_jira_parent_issues(config, project_key, query=query)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(parents)


class JiraPrioritiesView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        try:
            setting, _ = scoped_setting_from_request(request, IntegrationSetting.PROVIDER_JIRA, required_org=True)
            priorities = list_jira_priorities(setting.config)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(priorities)


class JiraTestIssueView(APIView):
    permission_classes = [CanManageIntegrations]

    def post(self, request):
        try:
            org = get_request_organization(request, required=True)
            result = create_jira_test_issue(actor=request.user, organization=org)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Test issue created in Jira.', **result}, status=status.HTTP_201_CREATED)


class JiraSyncStatusView(APIView):
    permission_classes = [CanManageIntegrations]

    def post(self, request):
        try:
            org = get_request_organization(request, required=True)
            results = sync_all_jira_issue_links(update_finding=request.data.get('update_findings', True), organization=org)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': f'Synced {len(results)} Jira issue link(s).', 'results': results})


class JiraWebhookReceiverView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        secret = request.query_params.get('secret') or request.headers.get('X-OziReport-Jira-Secret', '')
        try:
            result = process_jira_webhook(request.data or {}, secret=secret)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class JiraSyncFindingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        finding_id = request.data.get('finding_id')
        if not finding_id:
            return Response({'error': 'finding_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            finding = Finding.objects.select_related('engagement', 'engagement__organization').get(pk=finding_id)
        except Finding.DoesNotExist:
            return Response({'error': 'Finding not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not can_access_finding(request.user, finding) or request.user.role == 'CLIENT':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if hasattr(finding, 'jira_issue'):
            return Response(JiraIssueLinkSerializer(finding.jira_issue).data)
        try:
            link = create_jira_issue_for_finding(finding, actor=request.user, event='manual')
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(JiraIssueLinkSerializer(link).data, status=status.HTTP_201_CREATED)


class IntegrationLogListView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        org = get_request_organization(request)
        provider = request.query_params.get('provider')
        qs = IntegrationDeliveryLog.objects.select_related('finding', 'finding__engagement', 'finding__engagement__organization')
        if org:
            qs = qs.filter(finding__engagement__organization=org)
        elif not (request.user.is_superuser or request.user.role == 'SUPERADMIN'):
            qs = qs.filter(finding__engagement__organization__in=organization_queryset_for_user(request.user))
        if provider:
            qs = qs.filter(provider=provider)
        return Response(IntegrationDeliveryLogSerializer(qs[:50], many=True).data)


class JiraIssueLinkListView(APIView):
    permission_classes = [CanManageIntegrations]

    def get(self, request):
        org = get_request_organization(request)
        qs = JiraIssueLink.objects.select_related('finding', 'finding__engagement', 'finding__engagement__organization')
        if org:
            qs = qs.filter(finding__engagement__organization=org)
        elif not (request.user.is_superuser or request.user.role == 'SUPERADMIN'):
            qs = qs.filter(finding__engagement__organization__in=organization_queryset_for_user(request.user))
        return Response(JiraIssueLinkSerializer(qs[:50], many=True).data)
