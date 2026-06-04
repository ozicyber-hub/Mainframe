"""
Repository URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FindingTemplateViewSet, FindingTemplateTagViewSet, RepositoryFolderViewSet

router = DefaultRouter()
router.register(r'templates', FindingTemplateViewSet, basename='finding-template')
router.register(r'tags', FindingTemplateTagViewSet, basename='finding-template-tag')
router.register(r'folders', RepositoryFolderViewSet, basename='repo-folder')

urlpatterns = [
    path('', include(router.urls)),
]
