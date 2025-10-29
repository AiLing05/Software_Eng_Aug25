import django_filters
from .models import Asset


class AssetFilter(django_filters.FilterSet):
    """Filter for Asset model"""
    
    keyword = django_filters.CharFilter(method='filter_keyword')
    tags = django_filters.BaseInFilter(field_name='tags__id', lookup_expr='in')
    file_type = django_filters.CharFilter(field_name='file_type', lookup_expr='exact')
    date_from = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    uploaded_by = django_filters.NumberFilter(field_name='uploaded_by__id')
    status = django_filters.CharFilter(field_name='status', lookup_expr='exact')
    
    class Meta:
        model = Asset
        fields = ['file_type', 'status', 'uploaded_by']
    
    def filter_keyword(self, queryset, name, value):
        """Filter by keyword in title, description, or tags"""
        return queryset.filter(
            models.Q(title__icontains=value) |
            models.Q(description__icontains=value) |
            models.Q(tags__name__icontains=value)
        ).distinct()


from django.db import models
