"""
Report URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet, ReportTemplateViewSet, ReportExportViewSet, ReportMessageViewSet

# Use separate routers to avoid prefix collision between '' and 'templates'/'exports'
report_router = DefaultRouter()
report_router.register(r'', ReportViewSet, basename='report')

template_router = DefaultRouter()
template_router.register(r'', ReportTemplateViewSet, basename='report-template')

export_router = DefaultRouter()
export_router.register(r'', ReportExportViewSet, basename='report-export')

message_router = DefaultRouter()
message_router.register(r'', ReportMessageViewSet, basename='report-message')

urlpatterns = [
    path('templates/', include(template_router.urls)),
    path('exports/', include(export_router.urls)),
    path('messages/', include(message_router.urls)),
    path('', include(report_router.urls)),
]
