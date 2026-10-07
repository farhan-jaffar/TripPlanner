from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .auth_serializers import (
    CustomTokenObtainPairSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .models import Profile


class RegisterView(APIView):
    """
    Public endpoint for registering a new user account.
    Returns the newly created user profile along with JWT access and refresh tokens.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(
                description="Registration successful",
                response=UserSerializer,
            )
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        user = result["user"]
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "access": result["access"],
                    "refresh": result["refresh"],
                },
            },
            status=status.HTTP_201_CREATED,
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Public endpoint for obtaining JWT tokens and initial user/profile state upon login.
    """

    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class CustomTokenRefreshView(TokenRefreshView):
    """
    Public endpoint for exchanging a valid refresh token for a new access token.
    """

    permission_classes = [AllowAny]


class LogoutView(APIView):
    """
    Blacklists the provided refresh token and invalidates the session.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request={
            "application/json": {
                "type": "object",
                "properties": {"refresh": {"type": "string"}},
                "required": ["refresh"],
            }
        },
        responses={
            205: OpenApiResponse(description="Successfully logged out."),
            400: OpenApiResponse(description="Invalid or missing refresh token."),
        },
    )
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"refresh": ["Refresh token is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"detail": "Successfully logged out."},
                status=status.HTTP_205_RESET_CONTENT,
            )
        except (TokenError, InvalidToken):
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProfileMeView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the authenticated user's profile information.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile
