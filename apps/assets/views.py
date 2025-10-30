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
from PIL import Image
import logging
import json


# Initialize logger for this module
logger = logging.getLogger(__name__)

def compare_metadata(old_metadata, new_metadata):
    """Compare two metadata JSON objects and return changes as Deleted/New format"""

    old = json.loads(old_metadata or "{}")
    new = json.loads(new_metadata or "{}")

    changes_list = []
    all_keys = set(old.keys()) | set(new.keys())
    
    print(f"[BACKEND DEBUG] compare_metadata - All keys: {all_keys}")
    print(f"Old metadata: {old}")
    print(f"New metadata: {new}")
    
    for key in all_keys:
        old_value = old.get(key)
        new_value = new.get(key)
        
        print(f"[BACKEND DEBUG] Comparing key '{key}':")
        print(f"Old value: '{old_value}'")
        print(f"New value: '{new_value}'")
        
        if key not in old:
            changes_list.append(f"{key}: (none) → {new_value}")
            print(f"New field detected: {key}: (none) → {new_value}")
        
        elif key not in new:
            changes_list.append(f"{key}: {old_value} → (removed)")
            print(f"Deleted field detected: {key}: {old_value} → (removed)")
        
        elif old_value != new_value:
            changes_list.append(f"{key}: {old_value} → (removed)")
            changes_list.append(f"{key}: (none) → {new_value}")
            print(f"Value changed: {key}: {old_value} → {new_value}")
        
        else:
            print(f"No change for key '{key}'")
    
    print(f"[BACKEND DEBUG] Total changes found: {len(changes_list)}")
    print(f"Changes list: {changes_list}")
    return changes_list

class AssetViewSet(viewsets.ModelViewSet):
    """ViewSet for Asset model providing comprehensive CRUD operations"""
    
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated, CanEditAsset, CanDeleteAsset]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = AssetFilter
    search_fields = ['title', 'description', 'tags__name']
    ordering_fields = ['created_at', 'updated_at', 'title', 'file_size']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Dynamically select serializer based on action"""

        if self.action == 'list':
            return AssetListSerializer
        elif self.action == 'upload':
            return AssetUploadSerializer
        return AssetSerializer

    def perform_create(self, serializer):
        """Set the uploaded_by field to current user when creating assets"""

        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=['patch'], url_path='update_asset')
    def update_asset(self, request, pk=None):
        """Comprehensive asset update endpoint handling multiple data types"""

        logger.info(f"Update asset request for asset {pk}")
        logger.debug(f"Raw request data keys: {list(request.data.keys())}")
        logger.debug(f"Request FILES keys: {list(request.FILES.keys())}")
        
        print("[DEBUG] update_asset() called!")
        print("Full request data:", request.data)
        print("Request FILES:", dict(request.FILES))

        # Retrieve the target asset
        asset = self.get_object()

        old_data = {
            "title": asset.title,
            "description": asset.description,
            "tags": [t.name for t in asset.tags.all()],
            "metadata_json": asset.metadata_json,
        }
        print(f"[DEBUG] Old data snapshot: {old_data}")

        # Handle file upload if present
        new_file = request.FILES.get("file") or request.FILES.get("image")
        if new_file:
            logger.info(f"New file uploaded: {new_file.name}, type={new_file.content_type}, size={new_file.size}")
            print(f"[DEBUG] File received: {new_file.name}, size: {new_file.size} bytes")
            
            asset.file = new_file
            asset.file_type = new_file.content_type.split("/")[0]
            asset.save(update_fields=["file", "file_type"])
            print(f"[DEBUG] File saved to asset: {asset.file.name}")
        else:
            print("[DEBUG] No file found in request.FILES")
            print(f"[DEBUG] Available FILES keys: {list(request.FILES.keys())}")

        # Update basic text fields using serializer
        serializer = AssetSerializer(asset, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info("Basic serializer.save() completed.")

        # Handle custom metadata JSON
        metadata_json_raw = request.data.get("metadata_json")
        logger.info(f"Received metadata_json: {metadata_json_raw}")
        if metadata_json_raw:
            try:
                metadata_dict = json.loads(metadata_json_raw)
                # Remove width/height as they are handled separately
                for k in ["width", "height"]:
                    metadata_dict.pop(k, None)

                asset.metadata_json = metadata_dict
                asset.save(update_fields=["metadata_json"])
                logger.info(f"metadata_json replaced and saved (width/height removed): {metadata_dict}")

                # Synchronize with MetadataField model
                MetadataField.objects.filter(asset=asset).delete()
                for key, value in metadata_dict.items():
                    MetadataField.objects.create(asset=asset, key=key, value=value)

            except Exception as e:
                logger.error(f"Failed to parse or save metadata_json: {str(e)}")

        # Handle tag updates
        try:
            tag_names = request.data.getlist("tag_names", [])
        except Exception:
            tag_names = request.data.get("tag_names", [])
            
        print(f"[DEBUG] Raw tag_names from request: {tag_names}")
        print(f"[DEBUG] Type of tag_names: {type(tag_names)}")

        if tag_names:
            print(f"[DEBUG] Processing tag names: {tag_names}")
            tag_objs = []
            for tag_name in tag_names:
                if tag_name and str(tag_name).strip():
                    name_clean = str(tag_name).strip().lower()
                    print(f"[DEBUG] Creating/finding tag: '{name_clean}'")
                    tag_obj, created = Tag.objects.get_or_create(name=name_clean)
                    tag_objs.append(tag_obj)
                    print(f"[DEBUG] Tag {'created' if created else 'found'}: {tag_obj.name}")
            
            print(f"[DEBUG] Setting tags to asset: {[t.name for t in tag_objs]}")
            asset.tags.set(tag_objs)
            logger.info(f"🏷️ Updated tags: {[t.name for t in asset.tags.all()]}")
        else:
            print("[DEBUG] No tag names provided")

        # Create version if changes detected
        new_data = {
            "title": asset.title,
            "description": asset.description,
            "tags": [t.name for t in asset.tags.all()],
            "metadata_json": asset.metadata_json,
        }

        # Check individual field changes with detailed logging
        title_changed = old_data['title'] != new_data["title"]
        description_changed = old_data['description'] != new_data["description"]
        tags_changed = old_data["tags"] != new_data["tags"]
        metadata_changed = old_data["metadata_json"] != new_data["metadata_json"]

        print(f"[DEBUG] metadata_changed = {metadata_changed}")
        print(f"Old metadata type: {type(old_data['metadata_json'])}, value: {old_data['metadata_json']}")
        print(f"New metadata type: {type(new_data['metadata_json'])}, value: {new_data['metadata_json']}")

        file_changed = bool(new_file)

        print(f"[DEBUG] Change detection:")
        print(f"Title changed: {title_changed} ('{old_data['title']}' -> '{new_data['title']}')")
        print(f"Description changed: {description_changed}")
        print(f"Tags changed: {tags_changed} ({old_data['tags']} -> {new_data['tags']})")
        print(f"Metadata changed: {metadata_changed}")
        print(f"File changed: {file_changed}")

        should_create_version = title_changed or description_changed or tags_changed or metadata_changed or file_changed

        print(f"🔍 [DEBUG] Should create version: {should_create_version}")

        if should_create_version:
            # Create the version first, then increment the version number
            new_version_number = (asset.version or 0) + 1
            
            # Build detailed changes message with arrows
            changes_list = []
            if title_changed: 
                changes_list.append(f"Title: {old_data['title']} → {new_data['title']}")
            if description_changed: 
                changes_list.append(f"Description: {old_data['description']} → {new_data['description']}")
            if tags_changed: 
                changes_list.append(f"Tags: {', '.join(old_data['tags'])} → {', '.join(new_data['tags'])}")
            if file_changed: 
                changes_list.append("File: Updated to new file")
            if metadata_changed:
                print(f"[DEBUG] Metadata changed detected!")
                print(f"Old metadata: {old_data['metadata_json']}")
                print(f"New metadata: {new_data['metadata_json']}")

                metadata_changes = compare_metadata(
                    json.dumps(old_data["metadata_json"]),
                    json.dumps(new_data["metadata_json"])
                )
                print(f"Metadata changes found: {metadata_changes}")

                changes_list.extend(metadata_changes)
                print(f"[DEBUG] Metadata changes: {metadata_changes}")

            changes_text = "\n".join(changes_list) if changes_list else "File or metadata updated"
            
            print(f"[DEBUG] Creating version {new_version_number} with changes:")
            print(f"Changes text: {changes_text}")

            # Create version history
            try:
                version = AssetVersion.objects.create(
                    asset=asset,
                    version=new_version_number, 
                    file=asset.file,
                    changes=changes_text,  
                    created_by=request.user,

                    #delete if error
                    title=asset.title,
                    description=asset.description,
                    tags_json=json.dumps([t.name for t in asset.tags.all()])
                )
                print(f"[DEBUG] AssetVersion created successfully: {version.id}")
                
                # Update asset version
                asset.version = new_version_number
                asset.save(update_fields=["version"])
                print(f"[DEBUG] Asset version updated to: {asset.version}")
                
                logger.info(f"Created new version {asset.version} with detailed changes")
                
            except Exception as e:
                print(f"[DEBUG] Failed to create AssetVersion: {e}")
                logger.error(f"Failed to create AssetVersion: {e}")
        else:
            print("[DEBUG] No changes detected, skipping version creation")

        # Extract image dimensions for image files
        try:
            if getattr(asset, "file", None) and getattr(asset.file, "path", None):
                file_path = asset.file.path
                if file_path.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    with Image.open(file_path) as img:
                        width, height = img.size
                        MetadataField.objects.update_or_create(
                            asset=asset,
                            key="Dimensions",
                            defaults={"value": f"{width}x{height}"}
                        )
                        logger.info(f"Dimensions metadata updated: {width}x{height}")
        except Exception as e:
            logger.error(f"Failed to extract image size: {e}")

        # Return updated asset data
        serializer = AssetSerializer(asset, context={'request': request})
        logger.info(f"Asset {asset.id} successfully updated and returned to frontend.")
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        """Upload a new asset with file and metadata"""

        logger.info(f"Upload request - Data: {request.data}")
        logger.info(f"Files: {request.FILES}")

        serializer = AssetUploadSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        asset = serializer.save(uploaded_by=request.user)

        # Create version 1 
        changes_list = []
        
        # Add file information
        if asset.file:
            # Get file URL
            file_url = request.build_absolute_uri(asset.file.url) if asset.file.url else None
            if file_url:
                changes_list.append("File: Initial upload")
            else:
                changes_list.append(f"File: Initial upload - {asset.file.name}")
        
        # Add title
        if asset.title:
            changes_list.append(f"Title: {asset.title}")
        
        # Add description
        if asset.description:
            changes_list.append(f"Description: {asset.description}")
        
        # Add tags
        if asset.tags.exists():
            tag_names = [tag.name for tag in asset.tags.all()]
            changes_list.append(f"Tags: {', '.join(tag_names)}")
        
        # Add metadata
        if asset.metadata_json:
            for key, value in asset.metadata_json.items():
                changes_list.append(f"{key}: {value}")
        
        # If no other information, then update
        if not changes_list:
            changes_list.append("Initial asset creation")
        
        changes_text = "\n".join(changes_list)
        
        print(f"[DEBUG] Creating version 1 with complete asset info:")
        print(f"Changes: {changes_text}")

        file_instance = asset.file
        file_url = request.build_absolute_uri(file_instance.url) if file_instance else None

        # Create version
        AssetVersion.objects.create(
            asset=asset,
            version=1,
            file=file_instance, 
            changes=changes_text,
            created_by=request.user,
            #delete if error
            title=asset.title,
            description=asset.description,
            tags_json=json.dumps([t.name for t in asset.tags.all()])
        )

        logger.info(f"Created initial version 1 for asset {asset.id} with complete information")

        # Extract image dimensions for uploaded image files
        try:
            if getattr(asset, "file", None) and getattr(asset.file, "path", None):
                file_path = asset.file.path
                if file_path.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    from PIL import Image
                    with Image.open(file_path) as img:
                        width, height = img.size
                        logger.info(f"Image size extracted successfully: {width} x {height}")
                        # Update metadata_json
                        if not asset.metadata_json or not isinstance(asset.metadata_json, dict):
                            asset.metadata_json = {}
                        from .models import MetadataField
                        MetadataField.objects.create(asset=asset, key="Dimensions", value=f"{width}x{height}")
                        logger.info(f"Technical metadata saved: {width}x{height}")
        except Exception as e:
            logger.error(f"Failed to extract image size on upload: {e}")

        # Handle tag names from upload
        tag_names = []
        if 'tag_names' in request.data:
            if isinstance(request.data['tag_names'], list):
                tag_names = request.data['tag_names']
            else:
                tag_names = [request.data['tag_names']]

        tag_names_from_list = request.data.getlist('tag_names', [])
        if tag_names_from_list:
            tag_names = tag_names_from_list

        logger.info(f"Upload tag names: {tag_names}")

        if tag_names:
            tag_objs = []
            for tag_name in tag_names:
                if tag_name and tag_name.strip():
                    tag_name_clean = tag_name.strip()
                    tag_obj, created = Tag.objects.get_or_create(name=tag_name_clean)
                    tag_objs.append(tag_obj)
            asset.tags.set(tag_objs)
            asset.save()

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
            created_by=request.user,

            #delete if error
            title=asset.title,
            description=asset.description,
            tags_json=json.dumps([t.name for t in asset.tags.all()])
        )

        # Update asset with new file if provided
        new_file = request.FILES.get('file')
        if new_file:
            asset.file = new_file
            asset.version += 1
            asset.save()

        serializer = AssetSerializer(asset, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='archive')
    def archive(self, request, pk=None):
        """Archive an asset (soft delete)"""

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
        """Advanced search for assets with filtering and pagination"""

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

    @action(detail=True, methods=['put', 'patch'], url_path='update-image')
    def update_image(self, request, pk=None):
        """Update only the image of an asset"""

        logger.info(f"Image update request for asset {pk}")
        logger.info(f"Files: {request.FILES}")

        asset = self.get_object()
        new_image = request.FILES.get('image')

        if not new_image:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
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
    """ViewSet for Tag model providing tag management operations"""
    
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']  # Default ordering: alphabetical

    def create(self, request, *args, **kwargs):
        """Create a new tag with enhanced logging"""

        logger.info(f"Tag creation request - Data: {request.data}")
        logger.info(f"User: {request.user}")

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
        """Get all assets associated with this tag"""

        tag = self.get_object()
        assets = tag.assets.filter(status='active')
        serializer = AssetListSerializer(
            assets,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)


class MetadataFieldViewSet(viewsets.ModelViewSet):
    """ViewSet for MetadataField model providing custom metadata management"""
    
    queryset = MetadataField.objects.all()
    serializer_class = MetadataFieldSerializer
    permission_classes = [IsAuthenticated, CanEditAsset]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['asset']

    def perform_create(self, serializer):
        """Save metadata field instance"""
        serializer.save()


class AssetVersionViewSet(viewsets.ModelViewSet):
    """ViewSet for AssetVersion model providing version history management"""
    
    queryset = AssetVersion.objects.all()
    serializer_class = AssetVersionSerializer

    def perform_create(self, serializer):
        """Set the created_by field to current user when creating versions"""
        serializer.save(created_by=self.request.user)