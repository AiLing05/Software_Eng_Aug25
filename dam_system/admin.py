from django.contrib import admin
from .models import Asset, Tag, MetadataField, AssetVersion


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'color', 'created_at']
    search_fields = ['name']
    ordering = ['name']


class MetadataFieldInline(admin.TabularInline):
    model = MetadataField
    extra = 1


class AssetVersionInline(admin.TabularInline):
    model = AssetVersion
    extra = 0
    readonly_fields = ['version', 'created_by', 'created_at']


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'file_type', 'file_size', 'uploaded_by',
        'version', 'status', 'created_at'
    ]
    list_filter = ['file_type', 'status', 'created_at', 'uploaded_by']
    search_fields = ['title', 'description']
    filter_horizontal = ['tags']
    readonly_fields = ['file_size', 'file_extension', 'created_at', 'updated_at']
    
    inlines = [MetadataFieldInline, AssetVersionInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'status')
        }),
        ('File Information', {
            'fields': ('file', 'file_type', 'file_size', 'file_extension', 'thumbnail')
        }),
        ('Categorization', {
            'fields': ('tags',)
        }),
        ('Versioning', {
            'fields': ('version',)
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'created_at', 'updated_at')
        }),
    )


@admin.register(MetadataField)
class MetadataFieldAdmin(admin.ModelAdmin):
    list_display = ['asset', 'key', 'value', 'field_type', 'created_at']
    list_filter = ['field_type', 'created_at']
    search_fields = ['key', 'value', 'asset__title']


@admin.register(AssetVersion)
class AssetVersionAdmin(admin.ModelAdmin):
    list_display = ['asset', 'version', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['asset__title', 'changes']
    readonly_fields = ['created_at']
