import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

export const useAuth = () => {
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  const hasPermission = (requiredRole: 'admin' | 'editor' | 'viewer') => {
    if (!user) return false;

    const roleHierarchy = {
      admin: 3,
      editor: 2,
      viewer: 1,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  const canEdit = () => hasPermission('editor');
  const canDelete = () => hasPermission('admin');
  const canView = () => hasPermission('viewer');

  return {
    user,
    isAuthenticated,
    loading,
    hasPermission,
    canEdit,
    canDelete,
    canView,
  };
};