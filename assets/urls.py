from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetViewSet, AssetVersionViewSet

router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'versions', AssetVersionViewSet, basename='assetversion')

urlpatterns = [
    path('', include(router.urls)),
]
