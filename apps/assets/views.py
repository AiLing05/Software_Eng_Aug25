from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404

from .models import Asset, Tag, MetadataField, AssetVersion
from .serializers import (
    AssetSerializer,
    AssetListSerializer,
    AssetUploadSerializer,
    TagSerializer,
    MetadataFieldSerializer,
    AssetVersionSerializer
)
from .permissions import CanEditAsset, CanDeleteAsset
from .filters import AssetFilter


class AssetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Asset model
    Provides CRUD operations and additional actions
    """
    queryset = Asset.objects.all().prefetch_related('tags', 'metadata', 'uploaded_by')
    permission_classes = [IsAuthenticated, CanEditAsset, CanDeleteAsset]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = AssetFilter
    search_fields = ['title', 'description', 'tags__name']
    ordering_fields = ['created_at', 'updated_at', 'title', 'file_size']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AssetListSerializer
        elif self.action == 'upload':
            return AssetUploadSerializer
        return AssetSerializer
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
    
    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        """Upload a new asset"""
        serializer = AssetUploadSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        asset = serializer.save(uploaded_by=request.user)
        
        # Return full asset data
        response_serializer = AssetSerializer(asset, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """Download asset file"""
        asset = self.get_object()
        
        if not asset.file:
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = FileResponse(asset.file.open('rb'))
        response['Content-Disposition'] = f'attachment; filename="{asset.file.name}"'
        return response
    
    @action(detail=True, methods=['get'], url_path='versions')
    def versions(self, request, pk=None):
        """Get version history for an asset"""
        asset = self.get_object()
        versions = asset.versions.all()
        serializer = AssetVersionSerializer(
            versions,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='create-version')
    def create_version(self, request, pk=None):
        """Create a new version of an asset"""
        asset = self.get_object()
        
        # Check permission
        if not request.user.can_edit:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Save current file as version
        AssetVersion.objects.create(
            asset=asset,
            version=asset.version,
            file=asset.file,
            changes=request.data.get('changes', 'Updated version'),
            created_by=request.user
        )
        
        # Update asset with new file
        new_file = request.FILES.get('file')
        if new_file:
            asset.file = new_file
            asset.version += 1
            asset.save()
        
        serializer = AssetSerializer(asset, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='archive')
    def archive(self, request, pk=None):
        """Archive an asset"""
        asset = self.get_object()
        asset.status = 'archived'
        asset.save()
        
        serializer = AssetSerializer(asset, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='restore')
    def restore(self, request, pk=None):
        """Restore an archived asset"""
        asset = self.get_object()
        asset.status = 'active'
        asset.save()
        
        serializer = AssetSerializer(asset, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """Advanced search for assets"""
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AssetListSerializer(
                page,
                many=True,
                context={'request': request}
            )
            return self.get_paginated_response(serializer.data)
        
        serializer = AssetListSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='restore-version')
    def restore_version(self, request, pk=None):
        """Restore asset to a specific version"""
        asset = self.get_object()
        version_id = request.data.get('version_id')

        if not version_id:
            return Response({'error': 'version_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        version = get_object_or_404(AssetVersion, id=version_id, asset=asset)

        # Restore fields
        asset.title = version.title or asset.title
        asset.description = version.description or asset.description
        if version.file:
            asset.file = version.file
            asset.file_type = version.file_type
        if version.tags.exists():
            asset.tags.set(version.tags.all())

        # Increment asset version
        asset.version += 1
        asset.save()

        serializer = self.get_serializer(asset, context={'request': request})
        return Response(serializer.data)    

class TagViewSet(viewsets.ModelViewSet):
    """ViewSet for Tag model"""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    @action(detail=True, methods=['get'], url_path='assets')
    def assets(self, request, pk=None):
        """Get all assets with this tag"""
        tag = self.get_object()
        assets = tag.assets.filter(status='active')
        serializer = AssetListSerializer(
            assets,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)


class MetadataFieldViewSet(viewsets.ModelViewSet):
    """ViewSet for MetadataField model"""
    queryset = MetadataField.objects.all()
    serializer_class = MetadataFieldSerializer
    permission_classes = [IsAuthenticated, CanEditAsset]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['asset']
    
    def perform_create(self, serializer):
        serializer.save()

class AssetVersionViewSet(viewsets.ModelViewSet):
    """ViewSet for AssetVersion model"""
    queryset = AssetVersion.objects.all()
    serializer_class = AssetVersionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)