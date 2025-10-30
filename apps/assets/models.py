import os
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import json




class Tag(models.Model):
   """Tags for categorizing assets"""
   name = models.CharField(max_length=50, unique=True)
   color = models.CharField(
       max_length=7,
       null=True,
       blank=True,
       help_text='Hex color code (e.g., #FF5733)'
   )
   created_at = models.DateTimeField(auto_now_add=True)
  
   class Meta:
       ordering = ['name']
       verbose_name = 'Tag'
       verbose_name_plural = 'Tags'
  
   def __str__(self):
       return self.name




class Asset(models.Model):
   """Main asset model for storing digital files"""
  
   STATUS_CHOICES = [
       ('active', 'Active'),
       ('archived', 'Archived'),
   ]
  
   FILE_TYPE_CHOICES = [
       ('image', 'Image'),
       ('3d_model', '3D Model'),
       ('video', 'Video'),
       ('document', 'Document'),
       ('other', 'Other'),
   ]
  
   # Basic information
   title = models.CharField(max_length=255)
   description = models.TextField(blank=True, null=True)
   metadata_json = models.JSONField(default=dict, blank=True)
  
   # File information
   file = models.FileField(upload_to='assets/%Y/%m/%d/')
   file_type = models.CharField(
       max_length=20,
       choices=FILE_TYPE_CHOICES,
       blank=True,
       null=True
   )
   file_size = models.BigIntegerField(help_text='File size in bytes')
   file_extension = models.CharField(max_length=10)


   # Thumbnail
   thumbnail = models.ImageField(
       upload_to='thumbnails/%Y/%m/%d/',
       null=True,
       blank=True
   )
  
   # Upload information
   uploaded_by = models.ForeignKey(
       settings.AUTH_USER_MODEL,
       on_delete=models.CASCADE,
       related_name='uploaded_assets'
   )
  
   # Categorization
   tags = models.ManyToManyField(Tag, blank=True, related_name='assets')
  
   # New: manually entered category field
   category = models.CharField(
       max_length=100,
       blank=True,
       null=True,
       help_text='Category, e.g., Marketing'
   )
  
   # Version and status
   version = models.IntegerField(default=1)
   status = models.CharField(
       max_length=10,
       choices=STATUS_CHOICES,
       default='active'
   )
  
   # Automatically extracted technical metadata (stored as JSON)
   technical_metadata = models.JSONField(
       default=dict,
       blank=True,
       help_text='Automatically extracted technical metadata'
   )
  
   created_at = models.DateTimeField(auto_now_add=True)
   updated_at = models.DateTimeField(auto_now=True)
  
   class Meta:
       ordering = ['-created_at']
       verbose_name = 'Asset'
       verbose_name_plural = 'Assets'
       indexes = [
           models.Index(fields=['file_type', 'status']),
           models.Index(fields=['created_at']),
           models.Index(fields=['uploaded_by']),
           models.Index(fields=['category']),
       ]
  
   def __str__(self):
       return f"{self.title} ({self.file_type})"
  
   def save(self, *args, **kwargs):
       # Set file metadata
       if self.file:
           self.file_size = self.file.size
           self.file_extension = os.path.splitext(self.file.name)[1].lower()
          
           # Determine file type
           if not self.file_type:
               self.file_type = self._determine_file_type()
          
           # Generate thumbnail for images
           if self.file_type == 'image' and not self.thumbnail:
               self._generate_thumbnail()
          
           # Extract technical metadata
           self._extract_technical_metadata()
      
       super().save(*args, **kwargs)
  
   def _determine_file_type(self):
       """Determine file type based on extension"""
       ext = self.file_extension
      
       if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']:
           return 'image'
       elif ext in ['.glb', '.gltf', '.obj', '.fbx', '.stl', '.dae']:
           return '3d_model'
       elif ext in ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv']:
           return 'video'
       elif ext in ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt']:
           return 'document'
       elif ext in ['.mp3', '.wav', '.ogg', '.flac', '.aac']:
           return 'audio'
       else:
           return 'other'
  
   def _generate_thumbnail(self):
       """Generate thumbnail for image files"""
       try:
           img = Image.open(self.file)
          
           # Convert to RGB if necessary
           if img.mode in ('RGBA', 'LA', 'P'):
               background = Image.new('RGB', img.size, (255, 255, 255))
               background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
               img = background
          
           # Resize image
           img.thumbnail(settings.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
          
           # Save thumbnail
           thumb_io = BytesIO()
           img.save(thumb_io, format='JPEG', quality=85)
           thumb_io.seek(0)
          
           # Create filename
           filename = os.path.splitext(os.path.basename(self.file.name))[0]
           thumb_filename = f"{filename}_thumb.jpg"
          
           self.thumbnail = InMemoryUploadedFile(
               thumb_io,
               None,
               thumb_filename,
               'image/jpeg',
               thumb_io.getbuffer().nbytes,
               None
           )
       except Exception as e:
           print(f"Error generating thumbnail for {self.file.name}: {e}")
  
   def _extract_technical_metadata(self):
       """Extract technical metadata"""
       try:
           base_metadata = {
               'file_name': os.path.basename(self.file.name),
               'file_type': self._get_file_type_display(),
               'file_size_mb': f"{(self.file_size / 1024 / 1024):.2f}",
           }
           self.technical_metadata.update(base_metadata)
          
           if self.file_type == 'image':
               self._extract_image_metadata()
           elif self.file_type == 'video':
               self._extract_video_metadata()
           elif self.file_type == 'audio':
               self._extract_audio_metadata()
           elif self.file_type == 'document':
               self._extract_document_metadata()
              
       except Exception as e:
           print(f"Error extracting technical metadata: {e}")
  
   def _extract_image_metadata(self):
       """Extract image metadata"""
       try:
           with Image.open(self.file) as img:
               width, height = img.size
              
               self.technical_metadata.update({
                   'file_name': os.path.basename(self.file.name),
                   'file_type': 'Image',
                   'resolution': f"{width} × {height}",
                   'width': width,
                   'height': height,
                   'color_mode': img.mode,
                   'format': img.format,
                   'color_space': self._get_image_color_space(img),
                   'dpi': img.info.get('dpi', 'N/A'),
               })
               print(f"Image size extracted successfully: {width} x {height}")
       except Exception as e:
           print(f"Error extracting image metadata: {e}")
  
   def _extract_video_metadata(self):
       """Extract technical metadata for video files"""
       self.technical_metadata.update({
           'file_name': os.path.basename(self.file.name),
           'file_type': 'Video',
           'duration': 'N/A',
           'resolution': 'N/A',
           'frame_rate': 'N/A',
           'bitrate': 'N/A',
           'codec': 'N/A',
           'audio_channels': 'N/A',
           'aspect_ratio': 'N/A',
           'color_space': 'N/A',
       })
  
   def _extract_audio_metadata(self):
       """Extract technical metadata for audio files"""
       self.technical_metadata.update({
           'file_name': os.path.basename(self.file.name),
           'file_type': 'Audio',
           'duration': 'N/A',
           'bitrate': 'N/A',
           'sample_rate': 'N/A',
           'channels': 'N/A',
           'format': 'N/A',
       })
  
   def _extract_document_metadata(self):
       """Extract technical metadata for document files"""
       self.technical_metadata.update({
           'file_name': os.path.basename(self.file.name),
           'file_type': 'Document',
           'page_count': 'N/A',
           'author': 'N/A',
           'created_date': 'N/A',
           'modified_date': 'N/A',
       })
  
   def _get_image_color_space(self, img):
       """Get color space for image"""
       color_spaces = {
           'RGB': 'sRGB',
           'L': 'Grayscale',
           'CMYK': 'CMYK',
           'LAB': 'LAB',
           'HSV': 'HSV'
       }
       return color_spaces.get(img.mode, img.mode)
  
   @property
   def file_url(self):
       """Get file URL"""
       return self.file.url if self.file else None
  
   @property
   def thumbnail_url(self):
       """Get thumbnail URL"""
       return self.thumbnail.url if self.thumbnail else None
  
   @property
   def duration(self):
       """Get duration from technical metadata"""
       return self.technical_metadata.get('duration', 'N/A')
  
   @property
   def resolution(self):
       """Get resolution from technical metadata"""
       return self.technical_metadata.get('resolution', 'N/A')
  
   @property
   def frame_rate(self):
       """Get frame rate from technical metadata"""
       return self.technical_metadata.get('frame_rate', 'N/A')
  
   @property
   def bitrate(self):
       """Get bitrate from technical metadata"""
       return self.technical_metadata.get('bitrate', 'N/A')
  
   @property
   def codec(self):
       """Get codec from technical metadata"""
       return self.technical_metadata.get('codec', 'N/A')




class MetadataField(models.Model):
   """Custom metadata fields for assets"""
  
   FIELD_TYPE_CHOICES = [
       ('text', 'Text'),
       ('number', 'Number'),
       ('date', 'Date'),
       ('boolean', 'Boolean'),
   ]
  
   asset = models.ForeignKey(
       Asset,
       on_delete=models.CASCADE,
       related_name='metadata' 
   )
  
   key = models.CharField(max_length=100)
   value = models.TextField()
   field_type = models.CharField(
       max_length=10,
       choices=FIELD_TYPE_CHOICES,
       default='text'
   )
  
   created_at = models.DateTimeField(auto_now_add=True)
   updated_at = models.DateTimeField(auto_now=True)
  
   class Meta:
       ordering = ['key']
       verbose_name = 'Metadata Field'
       verbose_name_plural = 'Metadata Fields'
       unique_together = ['asset', 'key']
  
   def __str__(self):
       return f"{self.asset.title} - {self.key}: {self.value}"




class AssetVersion(models.Model):
   """Version history for assets"""
  
   asset = models.ForeignKey(
       Asset,
       on_delete=models.CASCADE,
       related_name='versions'
   )
  
   version = models.IntegerField()
   file = models.FileField(upload_to='versions/%Y/%m/%d/')
  
   changes = models.TextField(help_text='Description of changes made')
  
   created_by = models.ForeignKey(
       settings.AUTH_USER_MODEL,
       on_delete=models.CASCADE,
       related_name='created_versions'
   )
  
   created_at = models.DateTimeField(auto_now_add=True)
  
   class Meta:
       ordering = ['-version']
       verbose_name = 'Asset Version'
       verbose_name_plural = 'Asset Versions'
       unique_together = ['asset', 'version']
  
   def __str__(self):
       return f"{self.asset.title} - v{self.version}"
  
   @property
   def file_url(self):
       """Get file URL"""
       return self.file.url if self.file else None
