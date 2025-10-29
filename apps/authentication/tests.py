from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AuthenticationTestCase(TestCase):
    """Test cases for authentication"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='editor'
        )
    
    def test_user_registration(self):
        """Test user registration"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'password_confirm': 'newpass123',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'viewer'
        }
        response = self.client.post('/api/auth/register/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())
    
    def test_user_login(self):
        """Test user login"""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
    
    def test_user_profile(self):
        """Test getting user profile"""
        # Login first
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/auth/user/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
    
    def test_user_roles(self):
        """Test user role properties"""
        admin = User.objects.create_user(
            username='admin',
            password='admin123',
            role='admin'
        )
        
        self.assertTrue(admin.is_admin)
        self.assertTrue(admin.can_edit)
        self.assertTrue(admin.can_delete)
        
        editor = User.objects.create_user(
            username='editor',
            password='editor123',
            role='editor'
        )
        
        self.assertFalse(editor.is_admin)
        self.assertTrue(editor.can_edit)
        self.assertFalse(editor.can_delete)
        
        viewer = User.objects.create_user(
            username='viewer',
            password='viewer123',
            role='viewer'
        )
        
        self.assertFalse(viewer.is_admin)
        self.assertFalse(viewer.can_edit)
        self.assertFalse(viewer.can_delete)
