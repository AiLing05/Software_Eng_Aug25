from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from .models import Asset, Tag, MetadataField

User = get_user_model()


class AssetTestCase(TestCase):
    """Test cases for Asset model and API"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.admin = User.objects.create_user(
            username='admin',
            password='admin123',
            role='admin'
        )
        
        self.editor = User.objects.create_user(
            username='editor',
            password='editor123',
            role='editor'
        )
        
        self.viewer = User.objects.create_user(
            username='viewer',
            password='viewer123',
            role='viewer'
        )
        
        # Create tags
        self.tag1 = Tag.objects.create(name='Test Tag 1', color='#FF0000')
        self.tag2 = Tag.objects.create(name='Test Tag 2', color='#00FF00')
    
    def test_create_asset(self):
        """Test creating an asset"""
        self.client.force_authenticate(user=self.editor)
        
        # Create a simple file
        file_content = b'test file content'
        file = SimpleUploadedFile('test.txt', file_content, content_type='text/plain')
        
        data = {
            'title': 'Test Asset',
            'description': 'Test description',
            'file': file,
            'file_type': 'document'
        }
        
        response = self.client.post('/api/assets/upload/', data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Asset.objects.filter(title='Test Asset').exists())
    
    def test_viewer_cannot_create_asset(self):
        """Test that viewer cannot create assets"""
        self.client.force_authenticate(user=self.viewer)
        
        file_content = b'test file content'
        file = SimpleUploadedFile('test.txt', file_content)
        
        data = {
            'title': 'Test Asset',
            'file': file,
            'file_type': 'document'
        }
        
        response = self.client.post('/api/assets/upload/', data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_list_assets(self):
        """Test listing assets"""
        self.client.force_authenticate(user=self.viewer)
        
        # Create test asset
        file_content = b'test'
        file = SimpleUploadedFile('test.txt', file_content)
        
        Asset.objects.create(
            title='Test Asset',
            file=file,
            file_type='document',
            file_size=len(file_content),
            file_extension='.txt',
            uploaded_by=self.editor
        )
        
        response = self.client.get('/api/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)
    
    def test_asset_with_tags(self):
        """Test creating asset with tags"""
        file_content = b'test'
        file = SimpleUploadedFile('test.txt', file_content)
        
        asset = Asset.objects.create(
            title='Test Asset',
            file=file,
            file_type='document',
            file_size=len(file_content),
            file_extension='.txt',
            uploaded_by=self.editor
        )
        
        asset.tags.add(self.tag1, self.tag2)
        
        self.assertEqual(asset.tags.count(), 2)
        self.assertIn(self.tag1, asset.tags.all())
    
    def test_asset_metadata(self):
        """Test adding metadata to assets"""
        file_content = b'test'
        file = SimpleUploadedFile('test.txt', file_content)
        
        asset = Asset.objects.create(
            title='Test Asset',
            file=file,
            file_type='document',
            file_size=len(file_content),
            file_extension='.txt',
            uploaded_by=self.editor
        )
        
        metadata = MetadataField.objects.create(
            asset=asset,
            key='author',
            value='Test Author',
            field_type='text'
        )
        
        self.assertEqual(asset.metadata.count(), 1)
        self.assertEqual(asset.metadata.first().key, 'author')


class TagTestCase(TestCase):
    """Test cases for Tag model"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass',
            role='editor'
        )
    
    def test_create_tag(self):
        """Test creating a tag"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'name': 'New Tag',
            'color': '#FF0000'
        }
        
        response = self.client.post('/api/tags/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Tag.objects.filter(name='New Tag').exists())
    
    def test_list_tags(self):
        """Test listing tags"""
        self.client.force_authenticate(user=self.user)
        
        Tag.objects.create(name='Tag 1', color='#FF0000')
        Tag.objects.create(name='Tag 2', color='#00FF00')
        
        response = self.client.get('/api/tags/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
