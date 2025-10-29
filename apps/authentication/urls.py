from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    UserRegistrationView,
    UserProfileView,
    ChangePasswordView,
    logout_view,
    user_list_view
)

urlpatterns = [
    # Authentication
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('logout/', logout_view, name='logout'),
    
    # User management
    path('user/', UserProfileView.as_view(), name='user-profile'),
    path('users/', user_list_view, name='user-list'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
