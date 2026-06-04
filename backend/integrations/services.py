import hashlib
import hmac
import re
import json
from datetime import timedelta
from html import unescape
from html.parser import HTMLParser
from io import BytesIO
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

from .models import IntegrationDeliveryLog, IntegrationSetting, JiraIssueLink


DEFAULT_EVENTS = ['finding.created', 'finding.updated', 'finding.published', 'finding.status_changed']
SECRET_KEYS = {'api_token', 'secret', 'webhook_secret', 'jira_webhook_secret', 'password', 'access_token', 'refresh_token'}
DEFAULT_JIRA_FIELD_MAPPINGS = {
    'title': 'summary',
    'severity': 'description',
    'details': 'description',
    'description': 'description',
    'impact': 'description',
    'likelihood': 'description',
    'proof_of_concept': 'description',
    'recommendations': 'description',
    'supporting_evidence': 'attachment',
}
DEFAULT_JIRA_SLA_DAYS = {
    'CRITICAL': 7,
    'HIGH': 14,
    'MEDIUM': 30,
    'LOW': 90,
    'INFORMATIONAL': 180,
}
DEFAULT_JIRA_PRIORITY_MAP = {
    'CRITICAL': 'Highest',
    'HIGH': 'High',
    'MEDIUM': 'Medium',
    'LOW': 'Low',
    'INFORMATIONAL': 'Lowest',
}
JIRA_STATUS_TO_FINDING_STATUS = {
    'done': 'REMEDIATED',
    'in progress': 'IN_REVIEW',
    'in review': 'IN_REVIEW',
    'to do': 'OPEN',
    'open': 'OPEN',
    'backlog': 'OPEN',
}


def get_setting(provider, organization=None):
    setting, _ = IntegrationSetting.objects.get_or_create(provider=provider, organization=organization)
    return setting


def get_setting_for_organization(provider, organization, *, fallback_global=False):
    if organization is None:
        return get_setting(provider)
    setting = IntegrationSetting.objects.filter(provider=provider, organization=organization).first()
    if setting:
        return setting
    if fallback_global:
        return IntegrationSetting.objects.filter(provider=provider, organization__isnull=True).first()
    return None


def masked_config(config):
    masked = dict(config or {})
    for key in SECRET_KEYS:
        if masked.get(key):
            masked[key] = '********'
    return masked


def merge_config(existing, incoming):
    merged = dict(existing or {})
    for key, value in (incoming or {}).items():
        if key in SECRET_KEYS and value == '********':
            continue
        if key in SECRET_KEYS and value == '':
            merged[key] = ''
            continue
        merged[key] = value
    return merged


def finding_payload(event, finding, actor=None, extra=None):
    engagement = finding.engagement
    organization = engagement.organization
    payload = {
        'event': event,
        'source': 'ozireport',
        'finding': {
            'id': finding.id,
            'title': finding.title,
            'severity': finding.severity,
            'status': finding.status,
            'cvss_score': float(finding.cvss_score) if finding.cvss_score is not None else None,
            'affected_asset': finding.affected_asset,
            'description': finding.description,
            'impact': finding.impact,
            'recommendations': finding.recommendations,
            'created_at': finding.created_at.isoformat() if finding.created_at else None,
            'updated_at': finding.updated_at.isoformat() if finding.updated_at else None,
        },
        'engagement': {
            'id': engagement.id,
            'name': engagement.name,
            'status': engagement.status,
        },
        'organization': {
            'id': organization.id,
            'name': organization.name,
            'slug': organization.slug,
        },
    }
    if actor:
        payload['actor'] = {'id': actor.id, 'email': actor.email, 'name': actor.get_full_name()}
    if extra:
        payload['extra'] = extra
    return payload


def emit_finding_event(event, finding, actor=None, extra=None):
    payload = finding_payload(event, finding, actor=actor, extra=extra)
    send_webhook_event(event, finding, payload)
    maybe_create_jira_issue(event, finding, actor=actor)


def send_webhook_event(event, finding, payload, setting_override=None):
    organization = finding.engagement.organization if finding else None
    setting = setting_override or (get_setting_for_organization(IntegrationSetting.PROVIDER_WEBHOOK, organization) if organization else get_setting(IntegrationSetting.PROVIDER_WEBHOOK))
    if not setting:
        IntegrationDeliveryLog.objects.create(
            provider='webhook',
            event=event,
            status='SKIPPED',
            finding=finding,
            request_payload=payload,
            error_message='No webhook integration is configured for this finding organization.',
        )
        return
    config = setting.config or {}
    url = config.get('url', '').strip()
    events = config.get('events') or DEFAULT_EVENTS

    if not setting.enabled or not url or (event != 'integration.test' and event not in events):
        IntegrationDeliveryLog.objects.create(
            provider='webhook',
            event=event,
            status='SKIPPED',
            finding=finding,
            request_payload=payload,
            error_message='Webhook disabled, missing URL, or event not selected.',
        )
        return

    body = json.dumps(payload, separators=(',', ':'), default=str).encode('utf-8')
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'OziReport-Webhook/1.0',
        'X-OziReport-Event': event,
    }
    secret = config.get('secret', '')
    if secret:
        signature = hmac.new(secret.encode('utf-8'), body, hashlib.sha256).hexdigest()
        headers['X-OziReport-Signature'] = f'sha256={signature}'

    try:
        response = requests.post(url, data=body, headers=headers, timeout=10)
        IntegrationDeliveryLog.objects.create(
            provider='webhook',
            event=event,
            status='SUCCESS' if response.ok else 'FAILED',
            finding=finding,
            request_payload=payload,
            response_status=response.status_code,
            response_body=response.text[:4000],
        )
    except requests.RequestException as exc:
        IntegrationDeliveryLog.objects.create(
            provider='webhook',
            event=event,
            status='FAILED',
            finding=finding,
            request_payload=payload,
            error_message=str(exc),
        )


def jira_api_url(config, path):
    site_url = jira_site_url(config)
    return f'{site_url}/rest/api/3/{path.lstrip("/")}'


def jira_site_url(config):
    site_url = (config.get('site_url') or '').strip().rstrip('/')
    if not site_url:
        raise ValueError('Jira site URL is required.')
    parsed = urlparse(site_url)
    if not parsed.scheme:
        site_url = f'https://{site_url}'
    return site_url


def jira_gateway_url(config, path):
    cloud_id = jira_cloud_id(config)
    return f'https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/{path.lstrip("/")}'


def jira_cloud_id(config):
    cloud_id = (config.get('cloud_id') or '').strip()
    if cloud_id:
        return cloud_id

    response = requests.get(f'{jira_site_url(config)}/_edge/tenant_info', timeout=10)
    response.raise_for_status()
    cloud_id = response.json().get('cloudId')
    if not cloud_id:
        raise ValueError('Could not determine Jira cloudId from site URL.')
    return cloud_id


def jira_auth(config):
    email = (config.get('email') or '').strip()
    api_token = (config.get('api_token') or '').strip()
    if not email or not api_token:
        raise ValueError('Jira email and API token are required.')
    return (email, api_token)


def jira_headers():
    return {'Accept': 'application/json', 'Content-Type': 'application/json'}


def jira_request(config, method, path, *, headers=None, json_body=None, data=None, files=None, params=None, timeout=15):
    api_token = jira_auth(config)[1]
    default_headers = {'Accept': 'application/json'}
    if files is None:
        default_headers['Content-Type'] = 'application/json'
    merged_headers = {**default_headers, **(headers or {})}

    configured = (config.get('auth_mode') or '').strip()
    modes = [configured] if configured else []
    if looks_like_scoped_atlassian_token(api_token):
        modes += ['gateway_bearer', 'gateway_basic', 'site_basic']
    else:
        modes += ['site_basic', 'gateway_basic', 'gateway_bearer']

    seen = set()
    last_response = None
    last_error = None
    for mode in modes:
        if not mode or mode in seen:
            continue
        seen.add(mode)
        try:
            if mode == 'site_basic':
                url = jira_api_url(config, path)
                auth = jira_auth(config)
                request_headers = merged_headers
            elif mode == 'gateway_basic':
                url = jira_gateway_url(config, path)
                auth = jira_auth(config)
                request_headers = merged_headers
            elif mode == 'gateway_bearer':
                url = jira_gateway_url(config, path)
                auth = None
                request_headers = {**merged_headers, 'Authorization': f'Bearer {api_token}'}
            else:
                continue

            response = requests.request(
                method,
                url,
                auth=auth,
                headers=request_headers,
                data=json.dumps(json_body) if json_body is not None else data,
                files=files,
                params=params,
                timeout=timeout,
            )
            response.auth_mode = mode
            if should_accept_jira_response(response, path):
                return response
            last_response = response
        except requests.RequestException as exc:
            last_error = exc
            continue

    if last_response is not None:
        return last_response
    if last_error:
        raise last_error
    raise ValueError('No Jira authentication mode could be attempted.')


def looks_like_scoped_atlassian_token(token):
    return token.startswith(('ATSTT', 'ATATT', 'ATCTT'))


def should_accept_jira_response(response, path):
    if response.status_code == 401:
        return False
    # Scoped tokens can produce misleading empty/404 responses on the direct
    # atlassian.net API. Let the gateway modes try before accepting these.
    if getattr(response, 'auth_mode', '') == 'site_basic' and looks_like_project_lookup(path):
        if response.status_code == 404:
            return False
        if response.ok:
            try:
                data = response.json()
                if isinstance(data, dict) and (data.get('values') == [] or data.get('projects') == []):
                    return False
                if isinstance(data, list) and not data:
                    return False
            except ValueError:
                pass
    return True


def looks_like_project_lookup(path):
    return path.startswith(('project', 'issue/createmeta'))


def test_jira_connection(config):
    projects_response = jira_project_response(config, max_results=1)
    if not projects_response.ok:
        attempted = getattr(projects_response, 'auth_mode', 'unknown')
        return False, (
            f'Jira project access failed ({projects_response.status_code}) via {attempted}: '
            f'{clean_jira_error(projects_response.text)}'
        )
    if not is_json_response(projects_response):
        return False, (
            f'Jira authentication failed ({projects_response.status_code}) via '
            f'{getattr(projects_response, "auth_mode", "unknown")}: Jira did not return a valid JSON API response.'
        )
    if not parse_jira_projects(projects_response):
        token_ok, token_message = validate_jira_token(config)
        if not token_ok:
            return False, token_message
        return False, (
            'Jira authenticated, but no projects were returned. '
            'Grant the service account access to at least one Jira project and Browse Projects permission.'
        )

    project_key = (config.get('project_key') or '').strip()
    if project_key:
        project = jira_request(config, 'GET', f'project/{project_key}', headers={'Accept': 'application/json'}, timeout=10)
        if not project.ok:
            return False, f'Jira project lookup failed ({project.status_code}): {clean_jira_error(project.text)}'

    return True, f'Jira connection successful via {getattr(projects_response, "auth_mode", "Jira API")}.'


def is_json_response(response):
    content_type = (response.headers.get('content-type') or '').lower()
    if 'json' in content_type:
        return True
    try:
        response.json()
        return True
    except ValueError:
        return False


def validate_jira_token(config):
    token = jira_auth(config)[1]
    if not looks_like_scoped_atlassian_token(token):
        return False, (
            'Jira authentication failed: the token did not prove access to any Jira projects. '
            'Check the API token and service account email.'
        )

    try:
        response = requests.get(
            'https://api.atlassian.com/oauth/token/accessible-resources',
            headers={'Authorization': f'Bearer {token}', 'Accept': 'application/json'},
            timeout=10,
        )
    except requests.RequestException as exc:
        return False, f'Jira token validation failed: {exc}'

    if not response.ok or not is_json_response(response):
        return False, f'Jira token validation failed ({response.status_code}): {clean_jira_error(response.text)}'

    resources = response.json()
    cloud_id = jira_cloud_id(config)
    for resource in resources:
        if resource.get('id') == cloud_id:
            return True, 'Jira token validated.'
    return False, 'Jira token is valid, but it is not authorised for this Jira site.'


def clean_jira_error(text):
    if not text:
        return ''
    stripped = text.strip()
    if stripped.startswith('<'):
        return 'Jira returned an HTML error page. The service account token likely lacks Jira project API scope or product/project access.'
    return stripped[:500]


def list_jira_projects(config):
    response = jira_project_response(config, max_results=100)
    response.raise_for_status()
    return parse_jira_projects(response)


def jira_project_response(config, max_results=100):
    candidates = [
        ('project/search', {'maxResults': max_results}),
        ('project', {'maxResults': max_results}),
        ('project/recent', {}),
        ('issue/createmeta', {'expand': 'projects'}),
    ]
    first_ok = None
    first_response = None
    for path, params in candidates:
        response = jira_request(
            config,
            'GET',
            path,
            headers={'Accept': 'application/json'},
            params=params,
            timeout=15,
        )
        if first_response is None:
            first_response = response
        if response.ok:
            if not is_json_response(response):
                continue
            first_ok = first_ok or response
            if parse_jira_projects(response):
                return response
    return first_ok or first_response


def parse_jira_projects(response):
    data = response.json()
    if isinstance(data, dict):
        projects = data.get('values') or data.get('projects') or data
    else:
        projects = data
    if not isinstance(projects, list):
        projects = []
    return [
        {
            'id': p.get('id'),
            'key': p.get('key'),
            'name': p.get('name'),
            'project_type_key': p.get('projectTypeKey'),
            'avatar_url': (p.get('avatarUrls') or {}).get('24x24'),
        }
        for p in projects
        if isinstance(p, dict)
    ]


def list_jira_issue_types(config, project_key):
    response = jira_request(config, 'GET', f'project/{project_key}/statuses', headers={'Accept': 'application/json'}, timeout=15)
    response.raise_for_status()
    seen = {}
    for item in response.json():
        issue_type = item.get('issueType') or {}
        if issue_type.get('name'):
            seen[issue_type['name']] = {
                'id': issue_type.get('id'),
                'name': issue_type.get('name'),
                'description': issue_type.get('description', ''),
            }
    if seen:
        return list(seen.values())
    params = {'projectKeys': project_key, 'expand': 'projects.issuetypes'}
    response = jira_request(config, 'GET', 'issue/createmeta', headers={'Accept': 'application/json'}, params=params, timeout=15)
    response.raise_for_status()
    projects = response.json().get('projects', [])
    for project in projects:
        for issue_type in project.get('issuetypes', []):
            if issue_type.get('name'):
                seen[issue_type['name']] = {
                    'id': issue_type.get('id'),
                    'name': issue_type.get('name'),
                    'description': issue_type.get('description', ''),
                }
    return list(seen.values())


def list_jira_create_fields(config, project_key, issue_type):
    params = {
        'projectKeys': project_key,
        'issuetypeNames': issue_type,
        'expand': 'projects.issuetypes.fields',
    }
    response = jira_request(config, 'GET', 'issue/createmeta', headers={'Accept': 'application/json'}, params=params, timeout=15)
    response.raise_for_status()
    projects = response.json().get('projects', [])
    if not projects or not projects[0].get('issuetypes'):
        return default_jira_fields()
    fields = projects[0]['issuetypes'][0].get('fields', {})
    result = []
    for key, meta in fields.items():
        schema = meta.get('schema') or {}
        result.append({
            'id': key,
            'name': meta.get('name', key),
            'required': meta.get('required', False),
            'schema_type': schema.get('type', ''),
            'schema_system': schema.get('system', ''),
            'schema_custom': schema.get('custom', ''),
            'operations': meta.get('operations', []),
            'allowed_values': [
                {
                    'id': v.get('id'),
                    'key': v.get('key'),
                    'account_id': v.get('accountId'),
                    'name': v.get('name') or v.get('value') or v.get('displayName'),
                    'value': v.get('value'),
                }
                for v in meta.get('allowedValues', [])[:50]
                if isinstance(v, dict)
            ],
        })
    return result or default_jira_fields()


def default_jira_fields():
    return [
        {'id': 'summary', 'name': 'Summary', 'required': True, 'schema_type': 'string'},
        {'id': 'description', 'name': 'Description', 'required': False, 'schema_type': 'doc'},
        {'id': 'attachment', 'name': 'Attachment', 'required': False, 'schema_type': 'attachment'},
    ]


def list_jira_priorities(config):
    response = jira_request(config, 'GET', 'priority', headers={'Accept': 'application/json'}, timeout=15)
    response.raise_for_status()
    return [
        {'id': p.get('id'), 'name': p.get('name'), 'icon_url': p.get('iconUrl')}
        for p in response.json()
        if isinstance(p, dict)
    ]


def list_jira_project_components(config, project_key):
    response = jira_request(config, 'GET', f'project/{project_key}/components', headers={'Accept': 'application/json'}, timeout=15)
    response.raise_for_status()
    return [
        {'id': c.get('id'), 'name': c.get('name'), 'description': c.get('description', '')}
        for c in response.json()
        if isinstance(c, dict)
    ]


def search_jira_assignable_users(config, project_key, query=''):
    params = {'project': project_key, 'query': query or '', 'maxResults': 50}
    response = jira_request(config, 'GET', 'user/assignable/search', headers={'Accept': 'application/json'}, params=params, timeout=15)
    response.raise_for_status()
    return [
        {
            'account_id': u.get('accountId'),
            'display_name': u.get('displayName') or u.get('emailAddress') or 'Jira user',
            'email': u.get('emailAddress', ''),
            'avatar_url': (u.get('avatarUrls') or {}).get('24x24'),
        }
        for u in response.json()
        if isinstance(u, dict) and u.get('accountId')
    ]


def search_jira_parent_issues(config, project_key, query=''):
    jql = f'project = {project_key} AND issuetype in (Epic) ORDER BY updated DESC'
    params = {'jql': jql, 'fields': 'summary,issuetype,status', 'maxResults': 50}
    if query:
        params['jql'] = f'project = {project_key} AND issuetype in (Epic) AND summary ~ "{query}" ORDER BY updated DESC'
    response = jira_request(config, 'GET', 'search/jql', headers={'Accept': 'application/json'}, params=params, timeout=15)
    if response.status_code in (404, 410):
        response = jira_request(config, 'GET', 'search', headers={'Accept': 'application/json'}, params=params, timeout=15)
    if response.status_code == 400:
        return []
    response.raise_for_status()
    return [
        {
            'id': issue.get('id'),
            'key': issue.get('key'),
            'summary': (issue.get('fields') or {}).get('summary', ''),
            'status': ((issue.get('fields') or {}).get('status') or {}).get('name', ''),
        }
        for issue in response.json().get('issues', [])
        if isinstance(issue, dict)
    ]


def list_jira_issue_transitions(config, issue_key):
    response = jira_request(config, 'GET', f'issue/{issue_key}/transitions', headers={'Accept': 'application/json'}, timeout=15)
    response.raise_for_status()
    return [
        {
            'id': t.get('id'),
            'name': t.get('name'),
            'to': ((t.get('to') or {}).get('name') or ''),
        }
        for t in response.json().get('transitions', [])
        if isinstance(t, dict)
    ]


def maybe_create_jira_issue(event, finding, actor=None):
    setting = get_setting_for_organization(IntegrationSetting.PROVIDER_JIRA, finding.engagement.organization)
    if not setting:
        IntegrationDeliveryLog.objects.create(
            provider='jira',
            event=event,
            status='SKIPPED',
            finding=finding,
            error_message='No Jira integration is configured for this finding organization.',
        )
        return None
    config = setting.config or {}
    events = config.get('events') or ['finding.published']
    if not setting.enabled or event not in events:
        return None
    if hasattr(finding, 'jira_issue'):
        return finding.jira_issue
    return create_jira_issue_for_finding(finding, actor=actor, event=event)


def create_jira_issue_for_finding(finding, actor=None, event='manual'):
    setting = get_setting_for_organization(IntegrationSetting.PROVIDER_JIRA, finding.engagement.organization)
    if not setting:
        raise ValueError('No Jira integration is configured for this finding organization.')
    if not setting.enabled:
        raise ValueError('Jira integration is not enabled for this finding organization.')
    config = setting.config or {}
    project_key = (config.get('project_key') or '').strip()
    issue_type = (config.get('issue_type') or 'Task').strip()
    if not project_key:
        raise ValueError('Jira project key is required.')

    labels = jira_labels_for_finding(config, finding, ['ozireport', f'severity-{finding.severity.lower()}'])
    if finding.engagement.organization.slug:
        labels.append(f'org-{finding.engagement.organization.slug[:40]}')

    data = jira_issue_payload(config, project_key, issue_type, finding, labels=labels)

    try:
        response = jira_request(config, 'POST', 'issue', json_body=data, timeout=15)
        if not response.ok:
            error_text = clean_jira_error(response.text)
            IntegrationDeliveryLog.objects.create(
                provider='jira',
                event=event,
                status='FAILED',
                finding=finding,
                request_payload=data,
                response_status=response.status_code,
                response_body=response.text[:4000],
            )
            raise ValueError(error_text or f'Jira issue creation failed with status {response.status_code}.')

        result = response.json()
        issue_key = result.get('key')
        site_url = (config.get('site_url') or '').strip().rstrip('/')
        issue_url = f'{site_url}/browse/{issue_key}' if issue_key else ''
        if issue_key:
            maybe_transition_jira_issue(config, issue_key, finding=finding, event=event)
        link = JiraIssueLink.objects.create(
            finding=finding,
            issue_key=issue_key or '',
            issue_id=result.get('id', ''),
            issue_url=issue_url,
            created_by=actor,
        )
        if issue_key:
            maybe_create_jira_remote_link(config, issue_key, finding)
            try:
                sync_jira_issue_link(link, update_finding=False)
            except Exception as exc:
                IntegrationDeliveryLog.objects.create(
                    provider='jira',
                    event=f'{event}.sync',
                    status='FAILED',
                    finding=finding,
                    request_payload={'issue_key': issue_key},
                    error_message=str(exc),
                )
        IntegrationDeliveryLog.objects.create(
            provider='jira',
            event=event,
            status='SUCCESS',
            finding=finding,
            request_payload=data,
            response_status=response.status_code,
            response_body=json.dumps(result)[:4000],
        )
        attach_jira_evidence_images(config, link.issue_key, finding, event=event)
        return link
    except requests.RequestException as exc:
        if not IntegrationDeliveryLog.objects.filter(provider='jira', event=event, finding=finding).exists():
            IntegrationDeliveryLog.objects.create(
                provider='jira',
                event=event,
                status='FAILED',
                finding=finding,
                request_payload=data,
                error_message=str(exc),
            )
        raise


def create_jira_test_issue(actor=None, organization=None):
    setting = get_setting_for_organization(IntegrationSetting.PROVIDER_JIRA, organization) if organization else get_setting(IntegrationSetting.PROVIDER_JIRA)
    if not setting:
        raise ValueError('No Jira integration is configured for this organization.')
    config = setting.config or {}
    project_key = (config.get('project_key') or '').strip()
    issue_type = (config.get('issue_type') or 'Task').strip()
    if not project_key:
        raise ValueError('Jira project key is required.')

    fake = sample_finding()
    data = jira_issue_payload(config, project_key, issue_type, fake, labels=['ozireport', 'integration-test'])
    response = jira_request(config, 'POST', 'issue', json_body=data, timeout=15)
    IntegrationDeliveryLog.objects.create(
        provider='jira',
        event='integration.test',
        status='SUCCESS' if response.ok else 'FAILED',
        request_payload=data,
        response_status=response.status_code,
        response_body=response.text[:4000],
        error_message='' if response.ok else response.text[:1000],
    )
    if not response.ok:
        raise ValueError(clean_jira_error(response.text) or f'Jira test issue failed with status {response.status_code}.')
    result = response.json()
    issue_key = result.get('key', '')
    if issue_key:
        maybe_transition_jira_issue(config, issue_key, finding=fake, event='integration.test')
        attach_jira_test_evidence_images(config, issue_key)
    site_url = (config.get('site_url') or '').strip().rstrip('/')
    return {
        'issue_key': issue_key,
        'issue_id': result.get('id', ''),
        'issue_url': f"{site_url}/browse/{issue_key}" if issue_key else '',
    }


def jira_issue_payload(config, project_key, issue_type, finding, labels=None):
    field_meta = jira_create_field_meta(config, project_key, issue_type)
    fields = {
        'project': {'key': project_key},
        'issuetype': {'name': issue_type},
    }
    if 'labels' in field_meta or labels:
        fields['labels'] = normalize_jira_labels(labels or ['ozireport'])
    mappings = {**DEFAULT_JIRA_FIELD_MAPPINGS, **(config.get('field_mappings') or {})}
    summary_field = mappings.get('title') or 'summary'
    if summary_field == 'summary':
        fields['summary'] = f'[{finding.severity}] {finding.title}'[:255]
    else:
        fields['summary'] = f'[{finding.severity}] {finding.title}'[:255]

    description_sections = []
    for source_key, label in [
        ('severity', 'Severity / Risk'),
        ('details', 'Details'),
        ('description', 'Description'),
        ('impact', 'Impact / Consequence'),
        ('likelihood', 'Likelihood'),
        ('proof_of_concept', 'Proof of Concept'),
        ('recommendations', 'Recommendation'),
        ('supporting_evidence', 'Supporting Evidence'),
    ]:
        target = mappings.get(source_key, 'description')
        value = get_finding_value(finding, source_key)
        if not value:
            continue
        if target == 'description':
            description_sections.append((label, value))
        elif target == 'summary':
            if source_key == 'title':
                fields['summary'] = str(value)[:255]
            else:
                description_sections.append((label, value))
        elif target != 'attachment':
            coerced = coerce_jira_field_value(target, value, field_meta.get(target))
            if coerced is not None:
                fields[target] = coerced

    fields['description'] = jira_doc_from_sections(finding, description_sections)
    apply_jira_pipeline_fields(config, fields, field_meta, finding)
    normalize_jira_adf_fields(fields)
    return {'fields': fields}


def jira_create_field_meta(config, project_key, issue_type):
    try:
        return {field['id']: field for field in list_jira_create_fields(config, project_key, issue_type)}
    except Exception:
        return {field['id']: field for field in default_jira_fields()}


def apply_jira_pipeline_fields(config, fields, field_meta, finding):
    severity = getattr(finding, 'severity', 'INFORMATIONAL') or 'INFORMATIONAL'
    if config.get('priority_enabled', True) and 'priority' in field_meta and 'priority' not in fields:
        priority = jira_priority_value(config, severity, field_meta.get('priority'))
        if priority:
            fields['priority'] = priority

    if config.get('due_date_enabled', True) and 'duedate' in field_meta and 'duedate' not in fields:
        sla_days = {**DEFAULT_JIRA_SLA_DAYS, **(config.get('sla_days') or {})}
        try:
            days = int(sla_days.get(severity, DEFAULT_JIRA_SLA_DAYS.get(severity, 30)))
            fields['duedate'] = (timezone.localdate() + timedelta(days=days)).isoformat()
        except (TypeError, ValueError):
            pass

    component_ids = config.get('component_ids') or []
    if component_ids and 'components' in field_meta:
        fields['components'] = [{'id': str(component_id)} for component_id in component_ids if component_id]

    assignee_account_id = (config.get('assignee_account_id') or '').strip()
    if assignee_account_id and 'assignee' in field_meta:
        fields['assignee'] = {'accountId': assignee_account_id}

    parent_key = (config.get('parent_key') or '').strip()
    if parent_key and ('parent' in field_meta or 'parent' not in fields):
        fields['parent'] = {'key': parent_key}


def jira_priority_value(config, severity, priority_meta=None):
    priority_map = {**DEFAULT_JIRA_PRIORITY_MAP, **(config.get('priority_map') or {})}
    wanted = priority_map.get(severity, 'Medium')
    allowed = (priority_meta or {}).get('allowed_values') or []
    for option in allowed:
        if (option.get('name') or '').lower() == wanted.lower():
            return {'id': option.get('id')} if option.get('id') else {'name': option.get('name')}
    if allowed:
        fallback_order = ['highest', 'high', 'medium', 'low', 'lowest']
        desired_index = fallback_order.index(wanted.lower()) if wanted.lower() in fallback_order else 2
        sorted_allowed = sorted(
            allowed,
            key=lambda item: fallback_order.index((item.get('name') or '').lower()) if (item.get('name') or '').lower() in fallback_order else 99,
        )
        if sorted_allowed:
            selected = sorted_allowed[min(desired_index, len(sorted_allowed) - 1)]
            return {'id': selected.get('id')} if selected.get('id') else {'name': selected.get('name')}
    return {'name': wanted}


def coerce_jira_field_value(field_id, value, meta=None):
    if value is None or value == '':
        return None
    meta = meta or {}
    schema_type = meta.get('schema_type') or ''
    schema_system = meta.get('schema_system') or ''
    schema_custom = meta.get('schema_custom') or ''
    allowed = meta.get('allowed_values') or []
    text = normalize_jira_text(value)

    if field_id == 'description' or schema_type == 'doc' or schema_custom.endswith(':textarea'):
        return adf_text(text)
    if field_id == 'labels' or schema_system == 'labels':
        return normalize_jira_labels(text.split(','))
    if schema_system == 'priority':
        return jira_option_value(text, allowed)
    if schema_system == 'components':
        return [jira_option_value(part.strip(), allowed) for part in text.split(',') if part.strip()]
    if schema_system == 'parent':
        return {'key': text.strip()}
    if schema_type == 'number':
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
    if schema_type == 'array':
        values = [part.strip() for part in text.split(',') if part.strip()]
        return [jira_option_value(part, allowed) for part in values] if allowed else values
    if allowed:
        return jira_option_value(text, allowed)
    return text[:32000]


def jira_option_value(value, allowed):
    for option in allowed:
        if str(option.get('name') or '').lower() == str(value).lower() or str(option.get('value') or '').lower() == str(value).lower():
            if option.get('id'):
                return {'id': option['id']}
            if option.get('value'):
                return {'value': option['value']}
            return {'name': option.get('name')}
    return {'value': value}


def normalize_jira_labels(values):
    labels = []
    for value in values or []:
        for part in str(value).replace(',', ' ').split():
            label = ''.join(ch.lower() if ch.isalnum() else '-' for ch in part).strip('-')
            if label and label not in labels:
                labels.append(label[:255])
    return labels


def jira_labels_for_finding(config, finding, base_labels=None):
    labels = list(base_labels or [])
    labels.extend(config.get('default_labels') or [])
    for attr in ('pentest_type', 'cwe_id', 'cve_id'):
        value = getattr(finding, attr, '')
        if value:
            labels.append(str(value).lower())
    return normalize_jira_labels(labels)


def normalize_jira_adf_fields(fields):
    if 'description' in fields and isinstance(fields['description'], str):
        fields['description'] = adf_text(normalize_jira_text(fields['description']))


def get_finding_value(finding, key):
    if key == 'severity':
        return getattr(finding, 'severity', '')
    if key == 'cvss_score':
        value = getattr(finding, 'cvss_score', '')
        return str(value) if value not in (None, '') else ''
    if key == 'proof_of_concept':
        return normalize_jira_text(getattr(finding, 'details', ''))
    if key == 'recommendations':
        return normalize_jira_text(getattr(finding, 'recommendations', ''))
    value = getattr(finding, key, '')
    if isinstance(value, str):
        return normalize_jira_text(value)
    return value


def jira_doc_from_sections(finding, sections):
    content = [
        adf_paragraph('Imported from OziReport'),
        adf_rule(),
        adf_heading('MainFrame Context', level=3),
        adf_bullet_list([
            f'Engagement: {finding.engagement.name}',
            f'Organization: {finding.engagement.organization.name}',
            f'Status: {finding.status}',
            f'CVSS: {finding.cvss_score or "N/A"}',
            f'Affected asset: {finding.affected_asset or "N/A"}',
        ]),
    ]
    for label, value in sections:
        content.append(adf_heading(label, level=3))
        content.extend(adf_paragraphs(normalize_jira_text(value)))
    return {'type': 'doc', 'version': 1, 'content': content}


def attach_jira_evidence_images(config, issue_key, finding, event='manual'):
    mappings = {**DEFAULT_JIRA_FIELD_MAPPINGS, **(config.get('field_mappings') or {})}
    if mappings.get('supporting_evidence') != 'attachment' or not issue_key or not hasattr(finding, 'images'):
        return
    for image in finding.images.all():
        if not image.image:
            continue
        try:
            image.image.open('rb')
            files = {'file': (image.image.name.split('/')[-1], image.image, 'application/octet-stream')}
            response = jira_request(
                config,
                'POST',
                f'issue/{issue_key}/attachments',
                headers={'X-Atlassian-Token': 'no-check'},
                files=files,
                timeout=20,
            )
            IntegrationDeliveryLog.objects.create(
                provider='jira',
                event=f'{event}.attachment',
                status='SUCCESS' if response.ok else 'FAILED',
                finding=finding,
                response_status=response.status_code,
                response_body=response.text[:4000],
            )
        except Exception as exc:
            IntegrationDeliveryLog.objects.create(
                provider='jira',
                event=f'{event}.attachment',
                status='FAILED',
                finding=finding,
                error_message=str(exc),
            )
        finally:
            try:
                image.image.close()
            except Exception:
                pass


def attach_jira_test_evidence_images(config, issue_key):
    evidence = [
        ('mainframe-test-evidence-01-request.png', 'Request Evidence', 'GET /login?id=1 OR 1=1', 'HTTP 200 OK - simulated vulnerable response'),
        ('mainframe-test-evidence-02-response.png', 'Response Evidence', 'POST /api/auth/login', 'Set-Cookie returned after injection payload'),
        ('mainframe-test-evidence-03-remediation.png', 'Remediation Evidence', 'Prepared statement regression test', 'Expected: injection payload rejected'),
    ]
    for filename, title, line_one, line_two in evidence:
        image_bytes = build_test_evidence_png(issue_key, title, line_one, line_two)
        files = {'file': (filename, image_bytes, 'image/png')}
        response = jira_request(
            config,
            'POST',
            f'issue/{issue_key}/attachments',
            headers={'X-Atlassian-Token': 'no-check'},
            files=files,
            timeout=20,
        )
        IntegrationDeliveryLog.objects.create(
            provider='jira',
            event='integration.test.attachment',
            status='SUCCESS' if response.ok else 'FAILED',
            request_payload={'issue_key': issue_key, 'filename': filename},
            response_status=response.status_code,
            response_body=response.text[:4000],
            error_message='' if response.ok else response.text[:1000],
        )
        if not response.ok:
            raise ValueError(clean_jira_error(response.text) or f'Jira test issue created, but {filename} upload failed.')


def maybe_transition_jira_issue(config, issue_key, finding=None, event='manual'):
    target = (config.get('target_transition_name') or '').strip()
    if not target or not issue_key:
        return None
    try:
        transitions = list_jira_issue_transitions(config, issue_key)
        selected = next((item for item in transitions if (item.get('name') or '').lower() == target.lower()), None)
        if not selected:
            selected = next((item for item in transitions if (item.get('to') or '').lower() == target.lower()), None)
        if not selected:
            IntegrationDeliveryLog.objects.create(
                provider='jira',
                event=f'{event}.transition',
                status='SKIPPED',
                finding=finding if hasattr(finding, 'pk') else None,
                request_payload={'issue_key': issue_key, 'target': target},
                error_message='Requested Jira transition was not available for this issue workflow.',
            )
            return None
        response = jira_request(
            config,
            'POST',
            f'issue/{issue_key}/transitions',
            json_body={'transition': {'id': selected['id']}},
            timeout=15,
        )
        IntegrationDeliveryLog.objects.create(
            provider='jira',
            event=f'{event}.transition',
            status='SUCCESS' if response.ok else 'FAILED',
            finding=finding if hasattr(finding, 'pk') else None,
            request_payload={'issue_key': issue_key, 'transition': selected},
            response_status=response.status_code,
            response_body=response.text[:4000],
            error_message='' if response.ok else response.text[:1000],
        )
        return response
    except Exception as exc:
        IntegrationDeliveryLog.objects.create(
            provider='jira',
            event=f'{event}.transition',
            status='FAILED',
            finding=finding if hasattr(finding, 'pk') else None,
            request_payload={'issue_key': issue_key, 'target': target},
            error_message=str(exc),
        )
        return None


def maybe_create_jira_remote_link(config, issue_key, finding):
    app_base_url = (config.get('app_base_url') or '').strip().rstrip('/')
    if not app_base_url or not issue_key or not getattr(finding, 'pk', None):
        return None
    url = f'{app_base_url}/findings/{finding.pk}/edit'
    payload = {
        'object': {
            'url': url,
            'title': 'View finding in MainFrame',
            'summary': f'Open OziReport/MainFrame finding #{finding.pk}',
            'icon': {'url16x16': f'{app_base_url}/favicon.ico', 'title': 'MainFrame'},
        }
    }
    try:
        response = jira_request(config, 'POST', f'issue/{issue_key}/remotelink', json_body=payload, timeout=15)
        IntegrationDeliveryLog.objects.create(
            provider='jira',
            event='manual.remote_link',
            status='SUCCESS' if response.ok else 'FAILED',
            finding=finding,
            request_payload=payload,
            response_status=response.status_code,
            response_body=response.text[:4000],
            error_message='' if response.ok else response.text[:1000],
        )
        return response
    except Exception as exc:
        IntegrationDeliveryLog.objects.create(
            provider='jira',
            event='manual.remote_link',
            status='FAILED',
            finding=finding,
            request_payload=payload,
            error_message=str(exc),
        )
        return None


def sync_all_jira_issue_links(update_finding=True, organization=None):
    results = []
    qs = JiraIssueLink.objects.select_related('finding', 'finding__engagement', 'finding__engagement__organization')
    if organization:
        qs = qs.filter(finding__engagement__organization=organization)
    for link in qs[:200]:
        results.append(sync_jira_issue_link(link, update_finding=update_finding))
    return results


def sync_jira_issue_link(link, update_finding=True):
    setting = get_setting_for_organization(IntegrationSetting.PROVIDER_JIRA, link.finding.engagement.organization)
    if not setting:
        raise ValueError('No Jira integration is configured for this issue organization.')
    config = setting.config or {}
    response = jira_request(
        config,
        'GET',
        f'issue/{link.issue_key}',
        headers={'Accept': 'application/json'},
        params={'fields': 'status,priority,assignee,resolution'},
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    apply_jira_issue_snapshot(link, data, config=config, update_finding=update_finding)
    return {
        'issue_key': link.issue_key,
        'status_name': link.status_name,
        'priority_name': link.priority_name,
        'assignee_name': link.assignee_name,
        'last_synced_at': link.last_synced_at,
    }


def apply_jira_issue_snapshot(link, issue_data, config=None, update_finding=True):
    fields = issue_data.get('fields') or {}
    status_data = fields.get('status') or {}
    priority_data = fields.get('priority') or {}
    assignee_data = fields.get('assignee') or {}
    status_category = status_data.get('statusCategory') or {}
    link.status_name = status_data.get('name', '') or link.status_name
    link.status_category = status_category.get('key') or status_category.get('name') or link.status_category
    link.priority_name = priority_data.get('name', '') if priority_data else link.priority_name
    link.assignee_name = assignee_data.get('displayName', '') if assignee_data else ''
    link.raw_status = {
        'status': status_data,
        'priority': priority_data,
        'assignee': assignee_data,
        'resolution': fields.get('resolution') or {},
    }
    link.last_synced_at = timezone.now()
    link.save(update_fields=[
        'status_name', 'status_category', 'priority_name', 'assignee_name',
        'raw_status', 'last_synced_at', 'updated_at',
    ])
    if update_finding and (config or {}).get('sync_status_to_finding', True):
        sync_finding_status_from_jira(link)


def sync_finding_status_from_jira(link):
    status_key = (link.status_name or '').lower()
    if not status_key and (link.status_category or '').lower() == 'done':
        status_key = 'done'
    new_status = JIRA_STATUS_TO_FINDING_STATUS.get(status_key)
    if not new_status and (link.status_category or '').lower() == 'done':
        new_status = 'REMEDIATED'
    if new_status and link.finding.status != new_status:
        link.finding.status = new_status
        link.finding.save(update_fields=['status', 'updated_at', 'remediated_at', 'published_at'])


def process_jira_webhook(payload, secret=''):
    issue = payload.get('issue') or {}
    issue_key = issue.get('key')
    if not issue_key:
        raise ValueError('Jira webhook payload did not include an issue key.')
    link = JiraIssueLink.objects.select_related('finding').filter(issue_key=issue_key).first()
    if not link:
        return {'matched': False, 'issue_key': issue_key}
    setting = get_setting_for_organization(IntegrationSetting.PROVIDER_JIRA, link.finding.engagement.organization)
    if not setting:
        raise ValueError('No Jira integration is configured for this issue organization.')
    config = setting.config or {}
    expected_secret = (config.get('jira_webhook_secret') or '').strip()
    if expected_secret and not hmac.compare_digest(expected_secret, secret or ''):
        raise ValueError('Invalid Jira webhook secret.')
    apply_jira_issue_snapshot(link, issue, config=config, update_finding=True)
    IntegrationDeliveryLog.objects.create(
        provider='jira',
        event=payload.get('webhookEvent') or 'jira.webhook',
        status='SUCCESS',
        finding=link.finding,
        request_payload={'issue_key': issue_key},
        response_body=json.dumps({'status': link.status_name, 'priority': link.priority_name})[:4000],
    )
    return {'matched': True, 'issue_key': issue_key, 'status_name': link.status_name}


def build_test_evidence_png(issue_key, title='MainFrame Test Evidence', line_one='GET /login?id=1 OR 1=1', line_two='HTTP 200 OK - simulated vulnerable response'):
    image = Image.new('RGB', (900, 520), '#f5f7f8')
    draw = ImageDraw.Draw(image)
    try:
        title_font = ImageFont.truetype('DejaVuSans-Bold.ttf', 34)
        body_font = ImageFont.truetype('DejaVuSans.ttf', 22)
        mono_font = ImageFont.truetype('DejaVuSansMono.ttf', 20)
    except OSError:
        title_font = body_font = mono_font = None

    draw.rectangle((32, 32, 868, 488), outline='#24483E', width=4)
    draw.rectangle((32, 32, 868, 96), fill='#24483E')
    draw.text((56, 50), title, fill='white', font=title_font)
    draw.text((56, 138), f'Jira issue: {issue_key}', fill='#1f2933', font=body_font)
    draw.text((56, 186), 'This generated PNG confirms Supporting Evidence image upload.', fill='#1f2933', font=body_font)
    draw.rectangle((56, 252, 844, 410), fill='white', outline='#cfd8dc', width=2)
    draw.text((80, 280), line_one, fill='#c62828', font=mono_font)
    draw.text((80, 330), line_two, fill='#2e7d32', font=mono_font)
    draw.text((56, 444), 'Generated by OziReport / MainFrame Jira integration test', fill='#546e7a', font=body_font)

    output = BytesIO()
    image.save(output, format='PNG')
    output.seek(0)
    return output


def adf_text(text):
    text = normalize_jira_text(text)
    return {
        'type': 'doc',
        'version': 1,
        'content': [
            {
                'type': 'paragraph',
                'content': [{'type': 'text', 'text': text[:32000]}],
            }
        ],
    }


def adf_paragraph(text):
    return {'type': 'paragraph', 'content': text_to_adf_inline(normalize_jira_text(text))}


def adf_paragraphs(text):
    paragraphs = [part.strip() for part in normalize_jira_text(text).split('\n\n') if part.strip()]
    return [adf_paragraph(part) for part in paragraphs] or [adf_paragraph('')]


def adf_heading(text, level=3):
    return {'type': 'heading', 'attrs': {'level': level}, 'content': text_to_adf_inline(text)}


def adf_rule():
    return {'type': 'rule'}


def adf_bullet_list(items):
    return {
        'type': 'bulletList',
        'content': [
            {'type': 'listItem', 'content': [adf_paragraph(item)]}
            for item in items
            if item
        ],
    }


def text_to_adf_inline(text):
    parts = []
    lines = normalize_jira_text(text).splitlines()
    for index, line in enumerate(lines):
        if line:
            parts.append({'type': 'text', 'text': line[:30000]})
        if index < len(lines) - 1:
            parts.append({'type': 'hardBreak'})
    return parts or [{'type': 'text', 'text': ' '}]


class JiraHTMLToTextParser(HTMLParser):
    block_tags = {'address', 'article', 'aside', 'blockquote', 'div', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'li', 'ol', 'p', 'pre', 'section', 'table', 'tr', 'ul'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == 'br':
            self.parts.append('\n')
        elif tag == 'li':
            self._ensure_block_break()
            self.parts.append('- ')
        elif tag in self.block_tags:
            self._ensure_block_break()

    def handle_endtag(self, tag):
        if tag in self.block_tags:
            self._ensure_block_break()

    def handle_data(self, data):
        if data:
            self.parts.append(data)

    def get_text(self):
        return ''.join(self.parts)

    def _ensure_block_break(self):
        current = ''.join(self.parts)
        if current and not current.endswith('\n\n'):
            if current.endswith('\n'):
                self.parts.append('\n')
            else:
                self.parts.append('\n\n')


def normalize_jira_text(value):
    if value is None:
        return ''
    text = str(value)
    if '<' in text and '>' in text:
        parser = JiraHTMLToTextParser()
        try:
            parser.feed(text)
            text = parser.get_text()
        except Exception:
            text = re.sub(r'<[^>]+>', ' ', text)
    text = unescape(text).replace('\xa0', ' ')
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.splitlines()]
    collapsed = []
    blank = False
    for line in lines:
        if not line:
            if not blank and collapsed:
                collapsed.append('')
            blank = True
            continue
        collapsed.append(line)
        blank = False
    return '\n'.join(collapsed).strip()


def sample_finding():
    class Obj:
        pass

    org = Obj()
    org.name = 'Example Customer'
    org.slug = 'example-customer'
    engagement = Obj()
    engagement.name = 'Example Web Application Penetration Test'
    engagement.organization = org
    finding = Obj()
    finding.title = 'Example SQL Injection Finding'
    finding.severity = 'HIGH'
    finding.status = 'DRAFT'
    finding.cvss_score = '8.1'
    finding.affected_asset = 'https://app.example.local/login'
    finding.description = 'The login form accepts unsanitised input that may alter backend SQL queries.'
    finding.details = "A payload such as ' OR '1'='1 returned a different application response."
    finding.impact = 'Successful exploitation could allow unauthorised data access.'
    finding.likelihood = 'Likely where the endpoint is internet-facing and lacks compensating controls.'
    finding.recommendations = 'Use parameterised queries and add regression tests for injection payloads.'
    finding.supporting_evidence = 'Placeholder evidence text. Real finding screenshots are uploaded to Jira as attachments.'
    finding.engagement = engagement
    return finding


def jira_description(finding):
    text = (
        f"Imported from OziReport\n\n"
        f"Engagement: {finding.engagement.name}\n"
        f"Organization: {finding.engagement.organization.name}\n"
        f"Severity: {finding.severity}\n"
        f"Status: {finding.status}\n"
        f"CVSS: {finding.cvss_score or 'N/A'}\n"
        f"Affected asset: {finding.affected_asset or 'N/A'}\n\n"
        f"Description:\n{finding.description}\n\n"
        f"Impact:\n{finding.impact}\n\n"
        f"Recommendation:\n{finding.recommendations}\n"
    )
    return adf_text(text)
