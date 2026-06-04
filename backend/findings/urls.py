"""
Finding URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FindingViewSet, FindingImageViewSet, FindingCommentViewSet, FindingCustomFieldViewSet
from .ai_views import ai_enhance

router = DefaultRouter()
router.register(r'', FindingViewSet, basename='finding')

urlpatterns = [
    path('', include(router.urls)),
    # Images
    path('<int:finding_pk>/images/', FindingImageViewSet.as_view({'get': 'list', 'post': 'create'}), name='finding-image-list'),
    path('<int:finding_pk>/images/<int:pk>/', FindingImageViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='finding-image-detail'),
    # Comments
    path('<int:finding_pk>/comments/', FindingCommentViewSet.as_view({'get': 'list', 'post': 'create'}), name='finding-comment-list'),
    path('<int:finding_pk>/comments/<int:pk>/', FindingCommentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='finding-comment-detail'),
    # Custom fields
    path('custom-fields/', FindingCustomFieldViewSet.as_view({'get': 'list', 'post': 'create'}), name='finding-custom-field-list'),
    path('custom-fields/<int:pk>/', FindingCustomFieldViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='finding-custom-field-detail'),
    # AI enhancement
    path('ai/enhance/', ai_enhance, name='ai-enhance'),
]
