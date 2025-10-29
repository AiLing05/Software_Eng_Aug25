from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allow read access to all authenticated users,
    but write access only to admins
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_admin


class CanEditAsset(permissions.BasePermission):
    """
    Allow edit access to admins and editors
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.can_edit


class CanDeleteAsset(permissions.BasePermission):
    """
    Allow delete access only to admins
    """
    
    def has_permission(self, request, view):
        if request.method == 'DELETE':
            return request.user and request.user.can_delete
        return True
    
    def has_object_permission(self, request, view, obj):
        if request.method == 'DELETE':
            return request.user and request.user.can_delete
        return True
