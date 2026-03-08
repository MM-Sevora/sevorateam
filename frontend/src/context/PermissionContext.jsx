import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({});
  const [departments, setDepartments] = useState([]);
  const [roleLevel, setRoleLevel] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const res = await api.get('/workos/my-permissions');
      setPermissions(res.data.permissions || {});
      setDepartments(res.data.departments || []);
      setRoleLevel(res.data.role_level || 0);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Check if user has a specific permission
  // Usage: hasPermission('marketing', 'contacts', 'delete')
  const hasPermission = useCallback((department, module, action) => {
    // Super admin (level 100) or admin (level 80+) has all permissions
    if (roleLevel >= 80) return true;
    
    const deptPerms = permissions[department];
    if (!deptPerms) return false;
    
    const modulePerms = deptPerms[module];
    if (!modulePerms) return false;
    
    return modulePerms.includes(action);
  }, [permissions, roleLevel]);

  // Check if user can access a department
  const canAccessDepartment = useCallback((department) => {
    if (roleLevel >= 80) return true;
    return departments.includes(department);
  }, [departments, roleLevel]);

  // Check if user has any permission in a module
  const hasModuleAccess = useCallback((department, module) => {
    if (roleLevel >= 80) return true;
    
    const deptPerms = permissions[department];
    if (!deptPerms) return false;
    
    const modulePerms = deptPerms[module];
    return modulePerms && modulePerms.length > 0;
  }, [permissions, roleLevel]);

  // Check if user is admin level
  const isAdmin = useCallback(() => {
    return roleLevel >= 80;
  }, [roleLevel]);

  // Check if user is manager level
  const isManager = useCallback(() => {
    return roleLevel >= 50;
  }, [roleLevel]);

  const value = {
    permissions,
    departments,
    roleLevel,
    loading,
    hasPermission,
    canAccessDepartment,
    hasModuleAccess,
    isAdmin,
    isManager,
    refreshPermissions: fetchPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Higher-order component for permission-based rendering
export const PermissionGate = ({ 
  department, 
  module, 
  action, 
  children, 
  fallback = null 
}) => {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) return null;
  
  if (hasPermission(department, module, action)) {
    return children;
  }
  
  return fallback;
};

// Convenience wrapper for common permission checks
export const CanView = ({ department, module, children, fallback = null }) => (
  <PermissionGate department={department} module={module} action="view" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanEdit = ({ department, module, children, fallback = null }) => (
  <PermissionGate department={department} module={module} action="edit" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanDelete = ({ department, module, children, fallback = null }) => (
  <PermissionGate department={department} module={module} action="delete" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanCreate = ({ department, module, children, fallback = null }) => (
  <PermissionGate department={department} module={module} action="create" fallback={fallback}>
    {children}
  </PermissionGate>
);

export default PermissionContext;
