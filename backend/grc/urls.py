from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GrcFrameworkViewSet, GrcProjectViewSet,
    GrcControlStatusViewSet, GrcEvidenceViewSet,
)

router = DefaultRouter()
router.register('frameworks',       GrcFrameworkViewSet,     basename='grc-framework')
router.register('projects',         GrcProjectViewSet,       basename='grc-project')
router.register('control_statuses', GrcControlStatusViewSet, basename='grc-control-status')
router.register('evidence',         GrcEvidenceViewSet,      basename='grc-evidence')

urlpatterns = [path('', include(router.urls))]
