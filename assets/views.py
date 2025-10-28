from rest_framework import viewsets, permissions
from .models import Asset, AssetVersion
from .serializers import AssetSerializer, AssetVersionSerializer


class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().order_by('-uploaded_at')  
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class AssetVersionViewSet(viewsets.ModelViewSet):
    queryset = AssetVersion.objects.all().order_by('-uploaded_at') 
    serializer_class = AssetVersionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        asset = serializer.validated_data['asset']

        last_version = AssetVersion.objects.filter(asset=asset).order_by('-version_number').first()
        next_version = 1 if last_version is None else last_version.version_number + 1

        serializer.save(version_number=next_version)
