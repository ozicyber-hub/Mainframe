"""
User accounts and RBAC models
"""
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication"""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('Users must have an email address'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        return self.create_user(email, password, **extra_fields)


class Role(models.Model):
    """RBAC Role definitions"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    """Custom user model with email authentication"""
    email = models.EmailField(_('email address'), unique=True)
    username = None
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)

    ROLE_CHOICES = [
        ('SUPERADMIN',      'Super Admin - Full system access'),
        ('ADMIN',           'Admin - Organization admin'),
        ('GRC_CONSULTANT',  'GRC Consultant'),
        ('PENTESTER',       'Penetration Tester'),
        ('PROJECT_MANAGER', 'Project Manager'),
        ('CLIENT',          'Client - Read-only access'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CLIENT')
    custom_role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    # Organization linkage
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users'
    )

    # MFA / TOTP
    mfa_enabled   = models.BooleanField(default=False)
    mfa_secret    = models.CharField(max_length=64, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    def has_permission(self, permission):
        """Check if user has a specific permission"""
        if self.is_superuser:
            return True
        if self.custom_role and permission in self.custom_role.permissions:
            return True
        # Default role permissions
        role_permissions = {
            'SUPERADMIN':      ['all'],
            'ADMIN':           ['manage_users', 'manage_org', 'manage_engagements', 'manage_findings', 'view_reports', 'manage_assessments', 'manage_grc'],
            'GRC_CONSULTANT':  ['manage_assessments', 'manage_grc', 'view_engagements', 'manage_evidence', 'view_reports'],
            'PENTESTER':       ['manage_engagements', 'manage_findings', 'view_reports', 'manage_repository'],
            'PROJECT_MANAGER': ['manage_engagements', 'view_reports', 'view_findings'],
            'CLIENT':          ['view_own_findings', 'comment_findings', 'submit_evidence'],
        }
        perms = role_permissions.get(self.role, [])
        return permission in perms or 'all' in perms


class GoogleAccount(models.Model):
    """Google OAuth account linkage"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='google_account')
    google_id = models.CharField(max_length=255, unique=True)
    access_token = models.TextField(blank=True)
    refresh_token = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Google account for {self.user.email}"
