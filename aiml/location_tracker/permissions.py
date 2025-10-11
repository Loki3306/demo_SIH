from rest_framework import permissions


class IsStaffOrSuperUser(permissions.BasePermission):
    """
    Custom permission to only allow staff or superusers to access admin endpoints.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.is_staff or request.user.is_superuser
        )