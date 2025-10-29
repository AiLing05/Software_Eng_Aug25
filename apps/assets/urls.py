from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetViewSet, TagViewSet, MetadataFieldViewSet,  AssetVersionViewSet

router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'metadata-fields', MetadataFieldViewSet, basename='metadata-field')
router.register(r'asset-versions', AssetVersionViewSet, basename='asset-version')

urlpatterns = [
    path('', include(router.urls)),
]
