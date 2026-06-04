"""
Engagement URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EngagementViewSet, EngagementNoteViewSet, EngagementAttachmentViewSet

router = DefaultRouter()
router.register(r'', EngagementViewSet, basename='engagement')

urlpatterns = [
    path('', include(router.urls)),
    # Notes
    path('<int:engagement_pk>/notes/', EngagementNoteViewSet.as_view({'get': 'list', 'post': 'create'}), name='engagement-note-list'),
    path('<int:engagement_pk>/notes/<int:pk>/', EngagementNoteViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='engagement-note-detail'),
    # Attachments
    path('<int:engagement_pk>/attachments/', EngagementAttachmentViewSet.as_view({'get': 'list', 'post': 'create'}), name='engagement-attachment-list'),
    path('<int:engagement_pk>/attachments/<int:pk>/', EngagementAttachmentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='engagement-attachment-detail'),
]
