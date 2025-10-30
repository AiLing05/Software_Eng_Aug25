from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetViewSet, TagViewSet, MetadataFieldViewSet, AssetVersionViewSet 

router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'metadata', MetadataFieldViewSet, basename='metadata')

urlpatterns = [
    path('', include(router.urls)),
]
