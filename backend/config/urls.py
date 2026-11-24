from django.contrib import admin
from django.urls import path
from accounts.views import register, login
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication APIs
    path('api/auth/register/', register, name='register'),
    path('api/auth/login/', login, name='login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]