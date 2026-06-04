from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssessmentTemplateViewSet, AssessmentViewSet,
    AssessmentResponseViewSet, AssessmentEvidenceViewSet,
)

router = DefaultRouter()
router.register('templates',  AssessmentTemplateViewSet,  basename='assessment-template')
router.register('list',       AssessmentViewSet,           basename='assessment')
router.register('responses',  AssessmentResponseViewSet,   basename='assessment-response')
router.register('evidence',   AssessmentEvidenceViewSet,   basename='assessment-evidence')

urlpatterns = [path('', include(router.urls))]
