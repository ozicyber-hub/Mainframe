"""
Organization URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, ClientContactViewSet, OrganizationMemberViewSet

router = DefaultRouter()
router.register(r'', OrganizationViewSet, basename='organization')

urlpatterns = [
    path('', include(router.urls)),
    path('<int:organization_pk>/contacts/', ClientContactViewSet.as_view({'get': 'list', 'post': 'create'}), name='client-contact-list'),
    path('<int:organization_pk>/contacts/<int:pk>/', ClientContactViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='client-contact-detail'),
    path('<int:organization_pk>/members/', OrganizationMemberViewSet.as_view({'get': 'list', 'post': 'create'}), name='org-member-list'),
    path('<int:organization_pk>/members/<int:pk>/', OrganizationMemberViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='org-member-detail'),
]
