/**
 * Custom hook for managing Users & Permissions data and operations
 * Extracts state management and API calls from the main component
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';

export const useUsersPermissions = () => {
  const { api } = useAuth();
  
  // Core data state
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingLicenses, setSyncingLicenses] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    licensedUsers: 0,
    totalRoles: 0,
    totalModules: 0,
    totalCategories: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showLicensedOnly, setShowLicensedOnly] = useState(false);

  // Selection state for bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, modulesRes, categoriesRes, deptsRes] = await Promise.all([
        api.get('/workos/users'),
        api.get('/access/roles'),
        api.get('/workos/modules'),
        api.get('/workos/categories'),
        api.get('/hr/departments')
      ]);

      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
      setModules(modulesRes.data || []);
      setCategories(categoriesRes.data || []);
      setDepartments(deptsRes.data || []);

      // Calculate stats
      const activeUsers = (usersRes.data || []).filter(u => u.status === 'active').length;
      const licensedUsers = (usersRes.data || []).filter(u => u.azure_license_status === 'licensed').length;
      
      setStats({
        totalUsers: (usersRes.data || []).length,
        activeUsers,
        licensedUsers,
        totalRoles: (rolesRes.data || []).length,
        totalModules: (modulesRes.data || []).length,
        totalCategories: (categoriesRes.data || []).length
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesLicense = !showLicensedOnly || user.azure_license_status === 'licensed';
    return matchesSearch && matchesStatus && matchesLicense;
  });

  // Sync Azure AD licenses
  const syncLicenses = async () => {
    setSyncingLicenses(true);
    try {
      await api.post('/workos/sync-azure-licenses');
      toast.success('License sync initiated');
      await fetchData();
    } catch (error) {
      toast.error('Failed to sync licenses');
    } finally {
      setSyncingLicenses(false);
    }
  };

  // User CRUD operations
  const createUser = async (userData) => {
    try {
      await api.post('/workos/users', userData);
      toast.success('User created successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
      return false;
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      await api.put(`/workos/users/${userId}`, userData);
      toast.success('User updated successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
      return false;
    }
  };

  const deleteUser = async (userId) => {
    try {
      await api.delete(`/workos/users/${userId}`);
      toast.success('User deleted successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error('Failed to delete user');
      return false;
    }
  };

  const resetPassword = async (userId, newPassword) => {
    try {
      await api.post(`/workos/users/${userId}/reset-password`, { password: newPassword });
      toast.success('Password reset successfully');
      return true;
    } catch (error) {
      toast.error('Failed to reset password');
      return false;
    }
  };

  // Role operations
  const createRole = async (roleData) => {
    try {
      await api.post('/access/roles', roleData);
      toast.success('Role created successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create role');
      return false;
    }
  };

  const updateRole = async (roleId, roleData) => {
    try {
      await api.put(`/access/roles/${roleId}`, roleData);
      toast.success('Role updated successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
      return false;
    }
  };

  const deleteRole = async (roleId) => {
    try {
      await api.delete(`/access/roles/${roleId}`);
      toast.success('Role deleted successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete role');
      return false;
    }
  };

  const syncDefaultRoles = async () => {
    try {
      const res = await api.post('/workos/roles/sync');
      toast.success(res.data?.message || 'Roles synced');
      await fetchData();
      return true;
    } catch (error) {
      toast.error('Failed to sync roles');
      return false;
    }
  };

  // Module operations
  const createModule = async (moduleData) => {
    try {
      await api.post('/workos/modules', moduleData);
      toast.success('Module created successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create module');
      return false;
    }
  };

  const updateModule = async (moduleId, moduleData) => {
    try {
      await api.put(`/workos/modules/${moduleId}`, moduleData);
      toast.success('Module updated successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update module');
      return false;
    }
  };

  const deleteModule = async (moduleId) => {
    try {
      await api.delete(`/workos/modules/${moduleId}`);
      toast.success('Module deleted successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error('Failed to delete module');
      return false;
    }
  };

  // Category operations
  const createCategory = async (categoryData) => {
    try {
      await api.post('/workos/categories', categoryData);
      toast.success('Category created successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create category');
      return false;
    }
  };

  const updateCategory = async (categoryId, categoryData) => {
    try {
      await api.put(`/workos/categories/${categoryId}`, categoryData);
      toast.success('Category updated successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update category');
      return false;
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      await api.delete(`/workos/categories/${categoryId}`);
      toast.success('Category deleted successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error('Failed to delete category');
      return false;
    }
  };

  // User permissions
  const updateUserPermissions = async (userId, permissionData) => {
    try {
      await api.put(`/workos/users/${userId}/permissions`, permissionData);
      toast.success('Permissions updated successfully');
      await fetchData();
      return true;
    } catch (error) {
      toast.error('Failed to update permissions');
      return false;
    }
  };

  const fetchModuleDefinitions = async () => {
    try {
      const res = await api.get('/workos/modules/definitions');
      return res.data || [];
    } catch (error) {
      console.error('Failed to fetch module definitions:', error);
      return [];
    }
  };

  // Bulk operations
  const bulkDeactivate = async (userIds) => {
    try {
      await Promise.all(userIds.map(id => api.put(`/workos/users/${id}`, { status: 'inactive' })));
      toast.success(`${userIds.length} users deactivated`);
      await fetchData();
      return true;
    } catch (error) {
      toast.error('Failed to deactivate some users');
      return false;
    }
  };

  const bulkAssignRoles = async (userIds, roleIds) => {
    try {
      await Promise.all(userIds.map(id => 
        api.put(`/access/users/${id}/roles`, { custom_role_ids: roleIds })
      ));
      toast.success(`Roles assigned to ${userIds.length} users`);
      await fetchData();
      return true;
    } catch (error) {
      toast.error('Failed to assign roles to some users');
      return false;
    }
  };

  const bulkDelete = async (userIds) => {
    try {
      await Promise.all(userIds.map(id => api.delete(`/workos/users/${id}`)));
      toast.success(`${userIds.length} users deleted`);
      await fetchData();
      return true;
    } catch (error) {
      toast.error('Failed to delete some users');
      return false;
    }
  };

  // Selection helpers
  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUserIds(filteredUsers.map(u => u.id));
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  // Group modules by category
  const groupedModules = {};
  modules.forEach(mod => {
    const cat = mod.category || 'general';
    if (!groupedModules[cat]) groupedModules[cat] = [];
    groupedModules[cat].push(mod);
  });

  return {
    // Data
    users,
    filteredUsers,
    roles,
    modules,
    categories,
    departments,
    groupedModules,
    stats,
    loading,
    syncingLicenses,
    
    // Filters
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showLicensedOnly,
    setShowLicensedOnly,
    
    // Selection
    selectedUserIds,
    toggleUserSelection,
    selectAllUsers,
    clearSelection,
    
    // Actions
    fetchData,
    syncLicenses,
    
    // User operations
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    updateUserPermissions,
    fetchModuleDefinitions,
    
    // Role operations
    createRole,
    updateRole,
    deleteRole,
    syncDefaultRoles,
    
    // Module operations
    createModule,
    updateModule,
    deleteModule,
    
    // Category operations
    createCategory,
    updateCategory,
    deleteCategory,
    
    // Bulk operations
    bulkDeactivate,
    bulkAssignRoles,
    bulkDelete,
  };
};

export default useUsersPermissions;
