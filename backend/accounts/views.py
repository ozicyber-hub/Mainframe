"""
Authentication and user management views
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from .models import GoogleAccount
from .serializers import (
    UserSerializer, UserCreateSerializer, CustomTokenObtainPairSerializer,
    RoleSerializer, ChangePasswordSerializer, ClientPortalInviteSerializer
)
from .models import Role

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new user"""
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Send verification email (to be implemented)
        # user.send_verification_email()

        return Response({
            'message': 'User registered successfully. Please verify your email.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """Login and get JWT tokens"""
    serializer_class = CustomTokenObtainPairSerializer


class GoogleLoginView(APIView):
    """Google OAuth login"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('credential')
        if not token:
            return Response({'error': 'Google credential required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify Google token
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            email = idinfo.get('email')
            google_id = idinfo.get('sub')

            if not email:
                return Response({'error': 'Google account did not return an email address.'}, status=status.HTTP_400_BAD_REQUEST)

            # Get or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': idinfo.get('given_name', ''),
                    'last_name': idinfo.get('family_name', ''),
                    'is_verified': True,
                    'role': 'CLIENT',
                }
            )

            if created:
                GoogleAccount.objects.create(user=user, google_id=google_id)
            else:
                # Update Google tokens if needed
                ga, _ = GoogleAccount.objects.get_or_create(user=user)
                ga.google_id = google_id
                ga.save()

            # Generate JWT tokens
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })

        except ValueError as e:
            return Response({'error': f'Invalid Google token: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get and update current user profile"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """Change user password"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['current_password']):
                return Response({'current_password': 'Current password is incorrect'},
                              status=status.HTTP_400_BAD_REQUEST)

            validate_password(serializer.validated_data['new_password'])
            user.set_password(serializer.validated_data['new_password'])
            user.save()

            return Response({'message': 'Password changed successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListCreateAPIView):
    """List users (filtered by organization) or create a new user (admin only)"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role == 'SUPERADMIN':
            qs = User.objects.all()
        else:
            qs = User.objects.filter(organization=user.organization)
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs

    def create(self, request, *args, **kwargs):
        if request.user.role not in ('ADMIN', 'SUPERADMIN') and not request.user.is_superuser:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if not user.organization and request.user.organization:
            user.organization = request.user.organization
            user.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, delete a specific user"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role == 'SUPERADMIN':
            return User.objects.all()
        return User.objects.filter(organization=user.organization)

    def partial_update(self, request, *args, **kwargs):
        password = request.data.get('password')
        response = super().partial_update(request, *args, **kwargs)
        if password:
            user = self.get_object()
            user.set_password(password)
            user.is_active = True
            user.save(update_fields=['password', 'is_active'])
        return response


class ClientPortalInviteView(APIView):
    """Invite a client-only portal user into a client organization."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ClientPortalInviteSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class RoleListView(generics.ListCreateAPIView):
    """List and create custom roles"""
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Role.objects.all()


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, delete a custom role"""
    serializer_class = RoleSerializer
    queryset = Role.objects.all()
    permission_classes = [permissions.IsAuthenticated]


class SSOProvidersView(APIView):
    """Return configured SSO providers so the frontend can render the right buttons."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.conf import settings as django_settings
        providers = {}
        google_id = getattr(django_settings, 'GOOGLE_CLIENT_ID', '')
        if google_id and google_id != 'your-google-client-id':
            providers['google'] = {'enabled': True, 'client_id': google_id}
        else:
            providers['google'] = {'enabled': False, 'client_id': ''}
        return Response(providers)


class MFASetupView(APIView):
    """Generate a TOTP secret and QR code URI for the current user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import pyotp, qrcode, io, base64
        user = request.user
        if not user.mfa_secret:
            user.mfa_secret = pyotp.random_base32()
            user.save(update_fields=['mfa_secret'])
        totp = pyotp.TOTP(user.mfa_secret)
        uri  = totp.provisioning_uri(name=user.email, issuer_name='OziReport')
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_b64 = base64.b64encode(buf.getvalue()).decode()
        return Response({
            'secret':  user.mfa_secret,
            'qr_code': f'data:image/png;base64,{qr_b64}',
            'uri':     uri,
            'enabled': user.mfa_enabled,
        })


class MFAEnableView(APIView):
    """Verify a TOTP code and enable MFA."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import pyotp
        code = str(request.data.get('code', '')).strip()
        user = request.user
        if not user.mfa_secret:
            return Response({'error': 'MFA not set up. Call GET /auth/mfa/setup/ first.'}, status=400)
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'error': 'Invalid code. Please try again.'}, status=400)
        user.mfa_enabled = True
        user.save(update_fields=['mfa_enabled'])
        return Response({'message': 'MFA enabled successfully.', 'enabled': True})


class MFADisableView(APIView):
    """Disable MFA after verifying a code."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import pyotp
        code = str(request.data.get('code', '')).strip()
        user = request.user
        if not user.mfa_enabled:
            return Response({'error': 'MFA is not enabled.'}, status=400)
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'error': 'Invalid code.'}, status=400)
        user.mfa_enabled = False
        user.mfa_secret  = ''
        user.save(update_fields=['mfa_enabled', 'mfa_secret'])
        return Response({'message': 'MFA disabled.', 'enabled': False})


class MFAVerifyView(APIView):
    """
    Called after login when MFA is enabled.
    Validates the TOTP code and returns a full JWT pair.
    Requires a temporary `mfa_token` (the refresh token from the login step)
    plus the user's TOTP `code`.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import pyotp
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError

        mfa_token = request.data.get('mfa_token', '')
        code      = str(request.data.get('code', '')).strip()

        try:
            refresh = RefreshToken(mfa_token)
            user_id = refresh['user_id']
        except (TokenError, KeyError):
            return Response({'error': 'Invalid or expired session. Please log in again.'}, status=400)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=400)

        if not user.mfa_enabled:
            return Response({'error': 'MFA is not enabled for this account.'}, status=400)

        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'error': 'Invalid authentication code.'}, status=400)

        new_refresh = RefreshToken.for_user(user)
        return Response({
            'access':  str(new_refresh.access_token),
            'refresh': str(new_refresh),
            'user':    UserSerializer(user).data,
        })
