from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from .models import Asset, Tag, MetadataField, AssetVersion

import logging

class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model with validation and creation logic"""
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_name(self, value):
        """
        Validate tag name field
        - Ensures name is not empty
        - Converts to lowercase and strips whitespace
        - Checks for duplicate names (case-insensitive)
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Tag name cannot be empty")
        
        # Normalize name: strip whitespace and convert to lowercase
        value = value.strip().lower()
        
        # Check for duplicate names (case-insensitive)
        if self.instance:  # Update operation - exclude current instance
            existing_tag = Tag.objects.filter(name__iexact=value).exclude(id=self.instance.id).first()
        else:  # Create operation
            existing_tag = Tag.objects.filter(name__iexact=value).first()
            
        if existing_tag:
            raise serializers.ValidationError(f"Tag '{value}' already exists")
        
        return value
    
    def create(self, validated_data):
        """
        Create tag with additional validation and logging
        - Normalizes name field
        - Adds comprehensive logging
        - Handles creation errors gracefully
        """
        logger = logging.getLogger(__name__)
        logger.info(f"🏷️ Creating tag with data: {validated_data}")
        
        try:
            # Ensure name is normalized before creation
            validated_data['name'] = validated_data['name'].strip().lower()
            
            tag = Tag.objects.create(**validated_data)
            logger.info(f"✅ Tag created successfully: {tag.name} (ID: {tag.id})")
            return tag
            
        except Exception as e:
            logger.error(f"❌ Tag creation failed: {str(e)}")
            raise serializers.ValidationError(f"Failed to create tag: {str(e)}")


class MetadataFieldSerializer(serializers.ModelSerializer):
    """Serializer for MetadataField model with asset relationship"""
    
    # Primary key related field for asset association
    asset = serializers.PrimaryKeyRelatedField(queryset=Asset.objects.all(), required=True)
    
    class Meta:
        model = MetadataField
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """
        Create metadata field with asset validation
        - Ensures asset field is present
        - Falls back to context-based asset retrieval if needed
        """
        # Ensure asset field exists in validated data
        if 'asset' not in validated_data:
            # Try to get asset from view context as fallback
            view = self.context.get('view')
            if view and hasattr(view, 'get_asset'):
                validated_data['asset'] = view.get_asset()
            else:
                raise serializers.ValidationError({"asset": "This field is required."})
        
        return super().create(validated_data)


class AssetVersionSerializer(serializers.ModelSerializer):
    """Serializer for AssetVersion model with file URL generation"""
    
    created_by = UserSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AssetVersion
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_file_url(self, obj):
        """
        Generate absolute file URL for asset version
        - Uses request context to build absolute URL
        - Falls back to relative URL if no request context
        """
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class AssetSerializer(serializers.ModelSerializer):
    """
    Main serializer for Asset model with comprehensive field handling
    - Supports file and thumbnail URL generation
    - Handles tag and metadata relationships
    - Supports metadata JSON field
    """
    
    uploaded_by = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    metadata = MetadataFieldSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    metadata_json = serializers.JSONField(required=False, allow_null=True)
    
    # Write-only field for tag IDs during creation/update
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Asset
        fields = [
            'id', 'title', 'description', 'file_url', 'file_type',
            'file_size', 'file', 'file_extension', 'thumbnail_url',
            'uploaded_by', 'tags', 'metadata', 'version', 'status',
            'created_at', 'updated_at', 'tag_ids', 'metadata_json'
        ]
        read_only_fields = [
            'id', 'file_url', 'file_size', 'file_extension',
            'thumbnail_url', 'uploaded_by', 'created_at', 'updated_at'
        ]

    def get_file_url(self, obj):
        """
        Generate absolute file URL for asset
        - Uses request context for absolute URLs
        - Falls back to relative URL if no request context
        """
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None
    
    def get_thumbnail_url(self, obj):
        """
        Generate absolute thumbnail URL for asset
        - Uses request context for absolute URLs
        - Falls back to relative URL if no request context
        """
        request = self.context.get('request')
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url if obj.thumbnail else None
    
    def create(self, validated_data):
        """
        Create asset with tag relationships
        - Extracts tag IDs from validated data
        - Creates asset instance
        - Associates tags with the asset
        """
        tag_ids = validated_data.pop('tag_ids', [])
        asset = Asset.objects.create(**validated_data)
        
        # Associate tags if provided
        if tag_ids:
            tags = Tag.objects.filter(id__in=tag_ids)
            asset.tags.set(tags)
        
        return asset
    
    def update(self, instance, validated_data):
        """
        Update asset with tag relationships and metadata
        - Handles tag updates
        - Processes metadata JSON updates
        - Updates regular fields
        """
        tag_ids = validated_data.pop('tag_ids', None)
        metadata_json = validated_data.pop('metadata_json', None)

        # Update regular fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update metadata JSON if provided
        if metadata_json is not None:
            instance.metadata_json = metadata_json

        instance.save()
        
        # Update tags if provided
        if tag_ids is not None:
            tags = Tag.objects.filter(id__in=tag_ids)
            instance.tags.set(tags)
        
        return instance


class AssetUploadSerializer(serializers.ModelSerializer):
    """
    Serializer for asset upload operations
    - Handles file uploads with tag processing
    - Supports metadata JSON field
    - Processes tag names list
    """
    
    file = serializers.FileField()
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Asset
        fields = [
            'title', 'description', 'file', 'file_type',
            'tags', 'metadata_json'
        ]
    
    def create(self, validated_data):
        """
        Create asset from upload data
        - Processes tag names into Tag objects
        - Handles metadata JSON
        - Creates asset with all relationships
        """
        tag_names = validated_data.pop('tags', [])
        metadata_json = validated_data.pop('metadata_json', [])
        
        # Create asset instance
        asset = Asset.objects.create(**validated_data)
        
        # Process and create tags
        clean_tags = set(tag.strip().lower() for tag in tag_names if tag.strip())

        tag_objects = []
        for name in clean_tags:
            tag, _ = Tag.objects.get_or_create(name=name)
            tag_objects.append(tag)
        asset.tags.set(tag_objects)
        
        # Set metadata JSON if provided
        if metadata_json:
            asset.metadata_json = metadata_json
            asset.save()
        
        return asset
    

class AssetListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for asset list views
    - Optimized for list operations with minimal data
    - Includes essential fields and relationships
    - Generates thumbnail URLs
    """
    
    uploaded_by = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Asset
        fields = [
            'id', 'title', 'description', 'version',
            'file_type', 'file_size', 'file_extension',
            'thumbnail_url', 'uploaded_by', 'tags',
            'status', 'created_at', 'updated_at','file_url'
        ]
    
    def get_thumbnail_url(self, obj):
        """
        Generate absolute thumbnail URL for list view
        - Uses request context for absolute URLs
        - Falls back to relative URL if no request context
        """
        request = self.context.get('request')
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url if obj.thumbnail else None