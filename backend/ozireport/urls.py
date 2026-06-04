"""
OziReport URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

def api_root(request):
    return JsonResponse({
        'message': 'Welcome to OziReport API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/',
            'organizations': '/api/organizations/',
            'engagements': '/api/engagements/',
            'findings': '/api/findings/',
            'repository': '/api/repository/',
            'reports': '/api/reports/',
            'comments': '/api/comments/',
            'integrations': '/api/integrations/',
            'tenants': '/api/tenants/',
        }
    })

schema_view = get_schema_view(
    openapi.Info(
        title='OziReport API',
        default_version='v1',
        description='Penetration Testing Reporting Portal API',
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root),
    path('api/auth/', include('accounts.urls')),
    path('api/organizations/', include('organizations.urls')),
    path('api/engagements/', include('engagements.urls')),
    path('api/findings/', include('findings.urls')),
    path('api/repository/', include('repository.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/comments/', include('comments.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/scheduling/', include('scheduling.urls')),
    path('api/assessments/', include('assessments.urls')),
    path('api/breach/',      include('breach.urls')),
    path('api/grc/',         include('grc.urls')),
    path('api/integrations/', include('integrations.urls')),
    path('api/tenants/', include('tenants.urls')),
    path('api-auth/', include('rest_framework.urls')),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/docs/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
