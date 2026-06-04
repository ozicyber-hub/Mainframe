"""
Authentication URLs
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, GoogleLoginView, UserProfileView,
    ChangePasswordView, UserListView, UserDetailView, RoleListView, RoleDetailView,
    MFASetupView, MFAEnableView, MFADisableView, MFAVerifyView, SSOProvidersView,
    ClientPortalInviteView,
)

urlpatterns = [
    # Authentication
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('google-login/', GoogleLoginView.as_view(), name='google_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User management
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    path('client-invite/', ClientPortalInviteView.as_view(), name='client_portal_invite'),

    # Role management
    path('roles/', RoleListView.as_view(), name='role_list'),
    path('roles/<int:pk>/', RoleDetailView.as_view(), name='role_detail'),

    # SSO
    path('sso-providers/', SSOProvidersView.as_view(), name='sso_providers'),

    # MFA
    path('mfa/setup/',   MFASetupView.as_view(),   name='mfa_setup'),
    path('mfa/enable/',  MFAEnableView.as_view(),  name='mfa_enable'),
    path('mfa/disable/', MFADisableView.as_view(), name='mfa_disable'),
    path('mfa/verify/',  MFAVerifyView.as_view(),  name='mfa_verify'),
]
