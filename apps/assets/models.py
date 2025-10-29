import os
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from PIL import Image, ImageDraw
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile


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
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    file = models.FileField(upload_to='assets/%Y/%m/%d/')
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        blank=True,
        null=True
    )
    file_size = models.BigIntegerField(help_text='File size in bytes')
    file_extension = models.CharField(max_length=10)
    
    thumbnail = models.ImageField(
        upload_to='thumbnails/%Y/%m/%d/',
        null=True,
        blank=True
    )
    
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_assets'
    )
    
    tags = models.ManyToManyField(Tag, blank=True, related_name='assets')
    
    version = models.IntegerField(default=1)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='active'
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
        ]
    
    def __str__(self):
        return f"{self.title} ({self.file_type})"
    
    def save(self, *args, **kwargs):
        creating = self._state.adding  # True if object just created
        if self.file:
            self.file_size = self.file.size
            self.file_extension = os.path.splitext(self.file.name)[1].lower()
            if not self.file_type:
                self.file_type = self._determine_file_type()

        super().save(*args, **kwargs)

        if creating and not self.thumbnail:
            try:
                self._generate_thumbnail()
                super().save(update_fields=['thumbnail'])
                print(f"Thumbnail generated for {self.file.name}")
            except Exception as e:
                print(f"Failed to generate thumbnail after save: {e}")
    
    def _determine_file_type(self):
        """Determine file type based on extension"""
        ext = self.file_extension
        
        if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
            return 'image'
        elif ext in ['.glb', '.gltf', '.obj', '.fbx']:
            return '3d_model'
        elif ext in ['.mp4', '.webm', '.mov', '.avi']:
            return 'video'
        elif ext in ['.pdf', '.doc', '.docx', '.txt']:
            return 'document'
        else:
            return 'other'
    
    def _generate_thumbnail(self):
        """Generate thumbnail for all file types"""
        try:
            if self.file_type == 'image':
                self._generate_image_thumbnail()
            elif self.file_type == 'video':
                self._generate_video_thumbnail()
            elif self.file_type == 'document':
                self._generate_document_thumbnail()
            elif self.file_type == '3d_model':
                self._generate_3d_model_thumbnail()
            else:
                self._generate_generic_thumbnail()
        except Exception as e:
            print(f"Error generating thumbnail for {self.file.name}: {e}")
            self._generate_generic_thumbnail()
    
    def _generate_image_thumbnail(self):
        """Generate thumbnail for image files"""
        img = Image.open(self.file)
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Resize image
        img.thumbnail((300, 300), Image.Resampling.LANCZOS)
        
        # Save thumbnail
        thumb_io = BytesIO()
        img.save(thumb_io, format='JPEG', quality=85)
        thumb_io.seek(0)
        
        self._save_thumbnail_file(thumb_io, 'jpg')
    
    def _generate_video_thumbnail(self):
        """Generate thumbnail for video files - extract first frame"""
        import tempfile
        import imageio.v3 as iio
        from PIL import Image

        try:
            with tempfile.NamedTemporaryFile(suffix=self.file_extension, delete=False) as temp:
                temp.write(self.file.read())
                temp.flush()
                frame = iio.imread(temp.name, index=0)

            pil_img = Image.fromarray(frame)
            pil_img.thumbnail((300, 300), Image.Resampling.LANCZOS)

            thumb_io = BytesIO()
            pil_img.save(thumb_io, format='JPEG', quality=85)
            thumb_io.seek(0)

            self._save_thumbnail_file(thumb_io, 'jpg')
            print(f"Generated actual video thumbnail for {self.file.name}")

        except Exception as e:
            print(f"Video thumbnail generation failed for {self.file.name}: {e}")
            self._generate_generic_thumbnail()
    
    def _generate_document_thumbnail(self):
        """Generate document-style thumbnail for all document types"""
        try:
            # Create document-like thumbnail
            img = Image.new('RGB', (300, 300), (248, 249, 250)) 
            draw = ImageDraw.Draw(img)
            
            # Draw document outline
            draw.rectangle([20, 20, 280, 280], outline=(206, 212, 218), width=2)
            
            # Draw lines like text
            for i in range(5):
                y = 60 + i * 40
                draw.rectangle([40, y, 260, y + 20], fill=(233, 236, 239))
            
            thumb_io = BytesIO()
            img.save(thumb_io, format='JPEG', quality=85)
            thumb_io.seek(0)
            
            self._save_thumbnail_file(thumb_io, 'jpg')
            
        except Exception as e:
            print(f"Document thumbnail generation failed: {e}")
            self._generate_generic_thumbnail()

    def _generate_3d_model_thumbnail(self):
        """Generate 3D-style thumbnail for model files"""
        try:
            # Use dark gray color scheme
            img = Image.new('RGB', (300, 300), (40, 40, 40))  # Dark gray background
            draw = ImageDraw.Draw(img)
            
            # Draw modern 3D cube with black/gray gradient
            front_color = (80, 80, 80)    # Medium gray
            top_color = (120, 120, 120)   # Light gray
            side_color = (50, 50, 50)     # Dark gray
            
            # Main cube faces
            draw.polygon([(100, 120), (200, 120), (200, 220), (100, 220)], 
                        fill=front_color, outline=(200, 200, 200))
            draw.polygon([(100, 120), (130, 90), (230, 90), (200, 120)], 
                        fill=top_color, outline=(200, 200, 200))
            draw.polygon([(200, 120), (230, 90), (230, 190), (200, 220)], 
                        fill=side_color, outline=(200, 200, 200))
            
            # Add highlight effect
            draw.polygon([(110, 130), (190, 130), (190, 140), (110, 140)], 
                        fill=(150, 150, 150, 128))
            
            thumb_io = BytesIO()
            img.save(thumb_io, format='JPEG', quality=85)
            thumb_io.seek(0)
            
            self._save_thumbnail_file(thumb_io, 'jpg')
            
        except Exception as e:
            print(f"3D model thumbnail generation failed: {e}")
            self._generate_generic_thumbnail()
    
    def _generate_generic_thumbnail(self):
        """Generate generic thumbnail for unsupported file types"""
        from PIL import Image, ImageDraw
        
        # Create colored background based on file type
        colors = {
            'image': (74, 144, 226),
            'video': (220, 53, 69), 
            '3d_model': (162, 89, 255),
            'document': (40, 167, 69),
            'other': (108, 117, 125)
        }
        
        color = colors.get(self.file_type, colors['other'])
        img = Image.new('RGB', (300, 300), color)
        draw = ImageDraw.Draw(img)
        
        # Add file extension text
        text = f".{self.file_extension}"
        bbox = draw.textbbox((0, 0), text)
        text_width = bbox[2] - bbox[0]
        x = (300 - text_width) // 2
        y = 130
        draw.text((x, y), text, fill='white')
        
        thumb_io = BytesIO()
        img.save(thumb_io, format='JPEG', quality=85)
        thumb_io.seek(0)
        
        self._save_thumbnail_file(thumb_io, 'jpg')
    
    def _save_thumbnail_file(self, thumb_io, extension):
        """Helper method to save thumbnail file"""
        filename = os.path.splitext(os.path.basename(self.file.name))[0]
        thumb_filename = f"{filename}_thumb.{extension}"
        
        self.thumbnail = InMemoryUploadedFile(
            thumb_io,
            None,
            thumb_filename,
            f'image/{extension}',
            thumb_io.getbuffer().nbytes,
            None
        )
    
    @property
    def file_url(self):
        """Get file URL"""
        return self.file.url if self.file else None
    
    @property
    def thumbnail_url(self):
        """Get thumbnail URL"""
        return self.thumbnail.url if self.thumbnail else None


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