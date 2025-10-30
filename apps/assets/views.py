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


import logging


logger = logging.getLogger(__name__)


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
  
   def update(self, request, *args, **kwargs):
       logger.info(f"Asset update request - Method: {request.method}")
       logger.info(f"Request data: {request.data}")
       logger.info(f"Metadata field in request: {request.data.get('metadata')}")
      
       try:
           return super().update(request, *args, **kwargs)
       except Exception as e:
           logger.error(f"Asset update error: {str(e)}")
           raise
  
   def partial_update(self, request, *args, **kwargs):
       logger.info(f"Asset partial_update request - Method: {request.method}")
       logger.info(f"Request data: {request.data}")
       logger.info(f"Metadata field in request: {request.data.get('metadata')}")
      
       instance = self.get_object()
       logger.info(f"Current asset metadata: {instance.metadata}")
      
       try:
           response = super().partial_update(request, *args, **kwargs)
           logger.info(f"Asset update successful: {response.data}")
           return response
       except Exception as e:
           logger.error(f"Asset partial_update error: {str(e)}")
           raise
  
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
  
    #Build and Filter Query Set
   @action(detail=False, methods=['get'], url_path='search')
   def search(self, request):
       """Advanced search for assets"""
       queryset = self.filter_queryset(self.get_queryset())

      #apply pagination
       page = self.paginate_queryset(queryset)
       if page is not None:
           serializer = AssetListSerializer(
               page,
               many=True,
               context={'request': request}
           )
           return self.get_paginated_response(serializer.data)
    #handle non-paginated response
       serializer = AssetListSerializer(
           queryset,
           many=True,
           context={'request': request}
       )
       return Response(serializer.data)
  
   @action(detail=True, methods=['put', 'patch'], url_path='update-image')
   def update_image(self, request, pk=None):
       """Update asset image"""
       logger.info(f"Image update request for asset {pk}")
       logger.info(f"Files: {request.FILES}")
      
       asset = self.get_object()
       new_image = request.FILES.get('image')
      
       if not new_image:
           return Response(
               {'error': 'No image file provided'},
               status=status.HTTP_400_BAD_REQUEST
           )
      
       allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
       if new_image.content_type not in allowed_types:
           return Response(
               {'error': 'Invalid file type'},
               status=status.HTTP_400_BAD_REQUEST
           )
      
       try:
           asset.file = new_image
           asset.save()
          
           logger.info(f"Image updated successfully for asset {pk}")
           serializer = AssetSerializer(asset, context={'request': request})
           return Response(serializer.data)
          
       except Exception as e:
           logger.error(f"Image update error: {str(e)}")
           return Response(
               {'error': str(e)},
               status=status.HTTP_400_BAD_REQUEST
           )




class TagViewSet(viewsets.ModelViewSet):
   """ViewSet for Tag model"""
   queryset = Tag.objects.all()
   serializer_class = TagSerializer
   permission_classes = [IsAuthenticated]
   filter_backends = [filters.SearchFilter, filters.OrderingFilter]
   search_fields = ['name']
   ordering_fields = ['name', 'created_at']
   ordering = ['name']
  
   def create(self, request, *args, **kwargs):
       logger.info(f"🏷️ Tag creation request - Data: {request.data}")
       logger.info(f"🏷️ User: {request.user}")
      
       try:
           response = super().create(request, *args, **kwargs)
           logger.info(f"Tag created successfully: {response.data}")
           return response
       except Exception as e:
           logger.error(f"Tag creation error: {str(e)}")
           return Response(
               {'error': str(e)},
               status=status.HTTP_400_BAD_REQUEST
           )
       
  
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