"""
Breach Monitor views — search breach databases and import findings.
Uses HaveIBeenPwned API when HIBP_API_KEY is configured, otherwise returns demo data.
"""
import requests as http
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

HIBP_BASE = 'https://haveibeenpwned.com/api/v3'
HIBP_HEADERS = {
    'User-Agent': 'OziReport-BreachMonitor/1.0',
    'hibp-api-key': '',
}

DEMO_BREACHES = [
    {
        'Name': 'ExampleCorp2023',
        'Title': 'Example Corp (Demo)',
        'Domain': 'example.com',
        'BreachDate': '2023-04-15',
        'AddedDate': '2023-05-01T00:00:00Z',
        'ModifiedDate': '2023-05-01T00:00:00Z',
        'PwnCount': 845231,
        'Description': 'Demo breach data. Configure HIBP_API_KEY in settings to enable live breach lookups.',
        'DataClasses': ['Email addresses', 'Passwords', 'Usernames', 'IP addresses'],
        'IsVerified': True,
        'IsFabricated': False,
        'IsSensitive': False,
        'IsRetired': False,
        'IsSpamList': False,
        'LogoPath': '',
    },
    {
        'Name': 'DemoLeak2022',
        'Title': 'Demo Leak (Demo)',
        'Domain': 'demo-target.com',
        'BreachDate': '2022-11-20',
        'AddedDate': '2022-12-01T00:00:00Z',
        'ModifiedDate': '2022-12-01T00:00:00Z',
        'PwnCount': 312000,
        'Description': 'Another demo breach entry. Real data requires HIBP API key.',
        'DataClasses': ['Email addresses', 'Phone numbers', 'Physical addresses'],
        'IsVerified': True,
        'IsFabricated': False,
        'IsSensitive': False,
        'IsRetired': False,
        'IsSpamList': False,
        'LogoPath': '',
    },
]


def _hibp_headers():
    h = dict(HIBP_HEADERS)
    h['hibp-api-key'] = getattr(settings, 'HIBP_API_KEY', '')
    return h


def _has_api_key():
    return bool(getattr(settings, 'HIBP_API_KEY', ''))


class BreachSearchView(APIView):
    """
    Search for breaches by domain or email.
    POST body: { "query": "example.com", "type": "domain" | "email" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        query = (request.data.get('query') or '').strip().lower()
        qtype = (request.data.get('type') or 'domain').lower()

        if not query:
            return Response({'error': 'query is required'}, status=400)

        if not _has_api_key():
            # Return demo data filtered by query
            demo = [b for b in DEMO_BREACHES if query in b['Domain'].lower() or query == 'demo']
            if not demo:
                demo = DEMO_BREACHES
            return Response({
                'results': demo,
                'count':   len(demo),
                'query':   query,
                'type':    qtype,
                'demo':    True,
                'message': 'Demo mode — configure HIBP_API_KEY for live breach data.',
            })

        try:
            if qtype == 'email':
                url = f'{HIBP_BASE}/breachedaccount/{http.utils.quote(query)}?truncateResponse=false'
                resp = http.get(url, headers=_hibp_headers(), timeout=10)
                if resp.status_code == 404:
                    return Response({'results': [], 'count': 0, 'query': query, 'type': qtype})
                resp.raise_for_status()
                breaches = resp.json()
            else:
                # Domain search: get all breaches and filter by domain
                url = f'{HIBP_BASE}/breaches'
                resp = http.get(url, headers=_hibp_headers(), timeout=15)
                resp.raise_for_status()
                all_breaches = resp.json()
                breaches = [b for b in all_breaches if query in (b.get('Domain') or '').lower()]

            return Response({
                'results': breaches,
                'count':   len(breaches),
                'query':   query,
                'type':    qtype,
                'demo':    False,
            })
        except http.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                return Response({'error': 'Invalid HIBP API key.'}, status=400)
            if e.response.status_code == 429:
                return Response({'error': 'HIBP rate limit reached. Please wait and try again.'}, status=429)
            return Response({'error': f'HIBP API error: {e.response.status_code}'}, status=400)
        except Exception as e:
            return Response({'error': f'Search failed: {str(e)}'}, status=500)


class BreachPasteSearchView(APIView):
    """Search pastes by email address."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        if not email:
            return Response({'error': 'email is required'}, status=400)
        if not _has_api_key():
            return Response({'results': [], 'demo': True, 'message': 'Demo mode.'})
        try:
            url = f'{HIBP_BASE}/pasteaccount/{http.utils.quote(email)}'
            resp = http.get(url, headers=_hibp_headers(), timeout=10)
            if resp.status_code == 404:
                return Response({'results': [], 'count': 0})
            resp.raise_for_status()
            return Response({'results': resp.json(), 'count': len(resp.json())})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class BreachImportFindingView(APIView):
    """
    Import a breach as a finding in an engagement.
    POST body: { "breach": {...}, "engagement_id": 123 }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from findings.models import Finding
        from engagements.models import Engagement
        from django.utils import timezone

        breach      = request.data.get('breach', {})
        eng_id      = request.data.get('engagement_id')

        if not breach or not eng_id:
            return Response({'error': 'breach and engagement_id are required'}, status=400)

        try:
            engagement = Engagement.objects.get(pk=eng_id, organization=request.user.organization)
        except Engagement.DoesNotExist:
            return Response({'error': 'Engagement not found'}, status=404)

        title        = f"Data Breach Exposure – {breach.get('Title', breach.get('Name', 'Unknown'))}"
        domain       = breach.get('Domain', '')
        pwn_count    = breach.get('PwnCount', 0)
        breach_date  = breach.get('BreachDate', 'Unknown')
        data_classes = ', '.join(breach.get('DataClasses', []))
        description  = breach.get('Description', '')

        finding = Finding.objects.create(
            engagement    = engagement,
            title         = title,
            severity      = 'HIGH',
            status        = 'OPEN',
            pentest_type  = 'OTHER',
            description   = (
                f'<p>A data breach involving the domain <strong>{domain}</strong> was identified in '
                f'threat intelligence sources.</p>'
                f'<p><strong>Breach Date:</strong> {breach_date}<br>'
                f'<strong>Accounts Compromised:</strong> {pwn_count:,}<br>'
                f'<strong>Exposed Data:</strong> {data_classes}</p>'
                f'<p>{description}</p>'
            ),
            impact        = '<p>Compromised credentials may allow attackers to perform credential stuffing attacks, account takeovers, or targeted phishing campaigns against the organisation.</p>',
            recommendations = (
                '<p><ul>'
                '<li>Immediately reset passwords for all accounts associated with the breached domain.</li>'
                '<li>Enable multi-factor authentication on all corporate accounts.</li>'
                '<li>Monitor for suspicious login activity and credential reuse across services.</li>'
                '<li>Notify affected users and provide guidance on password hygiene.</li>'
                '</ul></p>'
            ),
            created_by    = request.user,
        )

        return Response({
            'message':    f'Finding created: {title}',
            'finding_id': finding.id,
        }, status=201)


class BreachStatusView(APIView):
    """Return breach monitor configuration status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'hibp_configured': _has_api_key(),
            'demo_mode':       not _has_api_key(),
        })
