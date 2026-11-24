from django.contrib import admin
from django.urls import path, include
from accounts.views import register, login, organization_settings
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication APIs
    path('api/auth/register/', register, name='register'),
    path('api/auth/login/', login, name='login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Inventory APIs
    path('api/', include('inventory.urls')),

    path('api/settings/', organization_settings, name='organization-settings'),
]