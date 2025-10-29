import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

export const useAuth = () => {
  const { user, isAuthenticated, loading } = useSelector(
    (state: RootState) => state.auth
  );

  // Role check
  const hasRole = (role: 'admin' | 'editor' | 'viewer') => {
    return user?.role === role;
  };

  // Fine-grained permission controls
  const canAdd = () => hasRole('admin'); // permission to upload
  const canEdit = () => hasRole('admin') || hasRole('editor'); // permission to edit
  const canDelete = () => hasRole('admin'); // permission to delete
  const canView = () =>
    ['admin', 'editor', 'viewer'].includes(user?.role || ''); // permission to view

  return {
    user,
    isAuthenticated,
    loading,
    hasRole,
    canAdd,
    canEdit,
    canDelete,
    canView,
  };
};
