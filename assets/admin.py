from django.contrib import admin
from .models import Asset, AssetVersion

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'file_type', 'uploaded_by', 'uploaded_at')
    search_fields = ('name', 'file_type', 'tags')
    list_filter = ('file_type', 'uploaded_at')

@admin.register(AssetVersion)
class AssetVersionAdmin(admin.ModelAdmin):
    list_display = ('id', 'asset', 'version_number', 'file', 'uploaded_at') 
    search_fields = ('asset__name',)
    list_filter = ('uploaded_at',)  
