from rest_framework import serializers
from apps.authentication.serializers import UserSerializer
from .models import Asset, Tag, MetadataField, AssetVersion

import logging

import logging


class TagSerializer(serializers.ModelSerializer):
   """Serializer for Tag model"""
  
   class Meta:
       model = Tag
       fields = ['id', 'name', 'color', 'created_at']
       read_only_fields = ['id', 'created_at']
  
   def validate_name(self, value):

       if not value or not value.strip():
           raise serializers.ValidationError("Tag name cannot be empty")

       value = value.strip().lower()
      
       if self.instance:  
           existing_tag = Tag.objects.filter(name__iexact=value).exclude(id=self.instance.id).first()
       else:  
           existing_tag = Tag.objects.filter(name__iexact=value).first()
          
       if existing_tag:
           raise serializers.ValidationError(f"Tag '{value}' already exists")
      
       return value
  
   def create(self, validated_data):
       logger = logging.getLogger(__name__)
       logger.info(f"🏷️ Creating tag with data: {validated_data}")
      
       try:

           validated_data['name'] = validated_data['name'].strip().lower()
          
           tag = Tag.objects.create(**validated_data)
           logger.info(f"Tag created successfully: {tag.name} (ID: {tag.id})")
           return tag
          
       except Exception as e:
           logger.error(f"Tag creation failed: {str(e)}")
           raise serializers.ValidationError(f"Failed to create tag: {str(e)}")

class MetadataFieldSerializer(serializers.ModelSerializer):
   """Serializer for MetadataField model"""


   asset = serializers.PrimaryKeyRelatedField(queryset=Asset.objects.all(), required=True)
  
   class Meta:
       model = MetadataField
       fields = '__all__'
       read_only_fields = ['id', 'created_at', 'updated_at']

   def create(self, validated_data):

       if 'asset' not in validated_data:

           view = self.context.get('view')
           if view and hasattr(view, 'get_asset'):
               validated_data['asset'] = view.get_asset()
           else:
               raise serializers.ValidationError({"asset": "This field is required."})
      
       return super().create(validated_data)

class AssetVersionSerializer(serializers.ModelSerializer):
   """Serializer for AssetVersion model"""
   created_by = UserSerializer(read_only=True)
   file_url = serializers.SerializerMethodField()
  
   class Meta:
       model = AssetVersion
       fields = [
           'id', 'asset', 'version', 'file_url',
           'changes', 'created_by', 'created_at'
       ]
       read_only_fields = ['id', 'created_at']

   def get_file_url(self, obj):
       request = self.context.get('request')
       if obj.file and request:
           return request.build_absolute_uri(obj.file.url)
       return obj.file.url if obj.file else None

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
       required=False,
       allow_empty=True 
   )
  
   class Meta:
       model = Asset
       fields = [
           'id', 'title', 'description', 'file_url', 'file_type',
           'file_size', 'file_extension', 'thumbnail_url',
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
       return obj.file.url if obj.file else None
  
   def get_thumbnail_url(self, obj):
       request = self.context.get('request')
       if obj.thumbnail and request:
           return request.build_absolute_uri(obj.thumbnail.url)
       return obj.thumbnail.url if obj.thumbnail else None
  
   def create(self, validated_data):
       tag_ids = validated_data.pop('tag_ids', [])
       asset = Asset.objects.create(**validated_data)
      
       if tag_ids:
           tags = Tag.objects.filter(id__in=tag_ids)
           asset.tags.set(tags)
      
       return asset
  
   def update(self, instance, validated_data):
       tag_ids = validated_data.pop('tag_ids', None)
      
       for attr, value in validated_data.items():
           setattr(instance, attr, value)
       instance.save()
      
       if tag_ids is not None:
           tags = Tag.objects.filter(id__in=tag_ids)
           instance.tags.set(tags)
      
       return instance

class AssetUploadSerializer(serializers.ModelSerializer):
   """Serializer for asset upload"""
   file = serializers.FileField()
   tags = serializers.ListField(
       child=serializers.CharField(),
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
           'tags', 'metadata_fields'
       ]
  
   def create(self, validated_data):
       tag_names = validated_data.pop('tags', [])
       metadata_fields = validated_data.pop('metadata_fields', [])
      
       # Create asset
       asset = Asset.objects.create(**validated_data)
      
       # Add tags
       clean_tags = set(tag.strip().lower() for tag in tag_names if tag.strip())


       tag_objects = []
       for name in clean_tags:
           tag, _ = Tag.objects.get_or_create(name=name)
           tag_objects.append(tag)
       asset.tags.set(tag_objects)
      
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
       return obj.thumbnail.url if obj.thumbnail else None
