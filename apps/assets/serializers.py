from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from .models import Asset, Tag, MetadataField, AssetVersion


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model"""
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'created_at']
        read_only_fields = ['id', 'created_at']


class MetadataFieldSerializer(serializers.ModelSerializer):
    """Serializer for MetadataField model"""
    
    class Meta:
        model = MetadataField
        fields = ['id', 'key', 'value', 'field_type', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetVersionSerializer(serializers.ModelSerializer):
    """Serializer for AssetVersion model"""
    created_by = UserSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AssetVersion
        fields = [
            'id', 'asset_id', 'version', 'file_url',
            'changes', 'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file_url


class AssetSerializer(serializers.ModelSerializer):
    """Serializer for Asset model"""
    uploaded_by = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    metadata = MetadataFieldSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Asset
        fields = [
            'id', 'title', 'description', 'file_url', 'file_type',
            'file_size', 'file_extension', 'thumbnail_url',
            'uploaded_by', 'tags', 'metadata', 'version', 'status',
            'created_at', 'updated_at', 'tag_ids'
        ]
        read_only_fields = [
            'id', 'file_url', 'file_size', 'file_extension',
            'thumbnail_url', 'uploaded_by', 'created_at', 'updated_at'
        ]
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file_url
    
    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail_url
    
    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        asset = Asset.objects.create(**validated_data)
        
        if tag_ids:
            asset.tags.set(Tag.objects.filter(id__in=tag_ids))
        
        return asset
    
    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if tag_ids is not None:
            instance.tags.set(Tag.objects.filter(id__in=tag_ids))
        
        return instance


class AssetUploadSerializer(serializers.ModelSerializer):
    """Serializer for asset upload"""
    file = serializers.FileField()
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    metadata_fields = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Asset
        fields = [
            'title', 'description', 'file', 'file_type',
            'tag_ids', 'metadata_fields'
        ]
    
    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        metadata_fields = validated_data.pop('metadata_fields', [])
        
        # Create asset
        asset = Asset.objects.create(**validated_data)
        
        # Add tags
        if tag_ids:
            asset.tags.set(Tag.objects.filter(id__in=tag_ids))
        
        # Add metadata
        for field in metadata_fields:
            MetadataField.objects.create(
                asset=asset,
                key=field.get('key'),
                value=field.get('value'),
                field_type=field.get('field_type', 'text')
            )
        
        return asset


class AssetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for asset list"""
    uploaded_by = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Asset
        fields = [
            'id', 'title', 'description', 'version',
            'file_type', 'file_size', 'file_extension',
            'thumbnail_url', 'uploaded_by', 'tags',
            'status', 'created_at', 'updated_at'
        ]
    
    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail_url