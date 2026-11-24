from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Organization
from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    name = request.data.get('organization_name')
    email = request.data.get('email')
    password = request.data.get('password')

    if not name or not email or not password:
        return Response(
            {'error': 'Organization name, email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=email).exists():
        return Response(
            {'error': 'An account with this email already exists.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password
    )

    Organization.objects.create(
        name=name,
        owner=user
    )

    return Response(
        {'message': 'Organization registered successfully.'},
        status=status.HTTP_201_CREATED
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {'error': 'Email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(username=email, password=password)

    if user is None:
        return Response(
            {'error': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)

    return Response({
        'message': 'Login successful.',
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'organization': user.organization.name
    })

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def organization_settings(request):
    organization = request.user.organization

    if request.method == 'GET':
        return Response({
            'organization_name': organization.name,
            'default_low_stock_threshold': organization.default_low_stock_threshold,
        })

    threshold = request.data.get('default_low_stock_threshold')

    if threshold is None:
        return Response(
            {'error': 'Default low-stock threshold is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        threshold = int(threshold)
        if threshold < 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response(
            {'error': 'Threshold must be a non-negative integer.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    organization.default_low_stock_threshold = threshold
    organization.save()

    return Response({
        'message': 'Organization settings updated successfully.',
        'default_low_stock_threshold': organization.default_low_stock_threshold,
    })