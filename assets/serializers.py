from rest_framework import serializers
from .models import Asset, AssetVersion

class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = "__all__"
        read_only_fields = ("uploaded_by", "uploaded_at") 


class AssetVersionSerializer(serializers.ModelSerializer):
    version_number = serializers.IntegerField(read_only=True) 

    class Meta:
        model = AssetVersion
        fields = "__all__"
        read_only_fields = ("uploaded_at", "version_number")
