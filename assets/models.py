from django.db import models
from django.conf import settings

class Asset(models.Model):
    FILE_TYPES = (
        ('image', 'Image'),
        ('video', 'Video'),
        ('document', 'Document'),
        ('model3d', '3D Model'),
    )

    name = models.CharField(max_length=255)  
    description = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='assets/pictures/')  
    file_type = models.CharField(max_length=20, choices=FILE_TYPES)
    tags = models.CharField(max_length=255, blank=True, null=True) 
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_assets'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)  

    def __str__(self):
        return f"{self.name} ({self.file_type})"


class AssetVersion(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="versions")
    file = models.FileField(upload_to="assets/versions/")
    version_number = models.PositiveIntegerField(editable=False)  
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.version_number:
            last_version = AssetVersion.objects.filter(asset=self.asset).order_by('-version_number').first()
            self.version_number = last_version.version_number + 1 if last_version else 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.asset.name} - v{self.version_number}"
