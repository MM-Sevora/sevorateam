import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Edit, Trash2, RefreshCw, CheckCircle, XCircle,
  ChevronDown, ChevronRight, Users, Save, X, Eye, Lock, Unlock,
  Settings, Package, Server, Building2, Activity, Layers, Search, UserCheck,
  Copy, Sparkles, FileText
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import api from '../../lib/api';

// Permission presets
const PERMISSION_PRESETS = {
  viewer: { create: false, read: true, update: false, delete: false, data_scope: 'own_assigned', can_edit_others: false, can_delete_others: false },
  editor: { create: true, read: true, update: true, delete: false, data_scope: 'team', can_edit_others: false, can_delete_others: false },
  manager: { create: true, read: true, update: true, delete: true, data_scope: 'department', can_edit_others: true, can_delete_others: false },
  admin: { create: true, read: true, update: true, delete: true, data_scope: 'all', can_edit_others: true, can_delete_others: true }
};

const DATA_SCOPE_OPTIONS = [
  { value: 'own', label: 'Own Only', description: 'Can only see their own records' },
  { value: 'own_assigned', label: 'Own + Assigned', description: 'Can see own and assigned records' },
  { value: 'team', label: 'Team', description: 'Can see all team records' },
  { value: 'department', label: 'Department', description: 'Can see all department records' },
  { value: 'all', label: 'All', description: 'Can see all records in the system' },
];

const CATEGORY_LABELS = {
  core: 'Core',
  collaboration: 'Collaboration',
  operations: 'Operations',
  business: 'Business',
  hr_finance: 'HR & Finance',
  analytics: 'Analytics',
  admin: 'Administration'
};

const RoleManagement = () => {
  // State
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [modulesByCategory, setModulesByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState(PERMISSION_PRESETS);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showPermissionsPreview, setShowPermissionsPreview] = useState(false);
  const [previewUserId, setPreviewUserId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  
  // Users for preview
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Form state
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    module_access: [],
    module_permissions: {},
    can_manage_users: false,
    can_manage_roles: false
  });
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(['core', 'operations', 'business']);
  
  // Role templates dialog
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  
  // Users list for a role
  const [roleUsersDialog, setRoleUsersDialog] = useState({ open: false, role: null, users: [] });
  const [loadingRoleUsers, setLoadingRoleUsers] = useState(false);

  // Role templates for quick setup
  const ROLE_TEMPLATES = [
    {
      name: 'Marketing Viewer',
      code: 'marketing_viewer',
      description: 'Read-only access to marketing modules',
      module_access: ['dashboard', 'marketing_ops', 'social', 'analytics_insights', 'notifications'],
      module_permissions: {
        marketing_ops: { create: false, read: true, update: false, delete: false, data_scope: 'all' },
        social: { create: false, read: true, update: false, delete: false, data_scope: 'all' },
        analytics_insights: { create: false, read: true, update: false, delete: false, data_scope: 'all' },
      },
      can_manage_users: false,
      can_manage_roles: false,
      icon: 'eye',
      color: 'blue'
    },
    {
      name: 'Sales Manager',
      code: 'sales_manager_template',
      description: 'Full sales access with team management',
      module_access: ['dashboard', 'sales', 'analytics_insights', 'meetings', 'mail', 'notifications'],
      module_permissions: {
        sales: { create: true, read: true, update: true, delete: true, data_scope: 'department', can_edit_others: true },
        analytics_insights: { create: false, read: true, update: false, delete: false, data_scope: 'department' },
        meetings: { create: true, read: true, update: true, delete: false, data_scope: 'team' },
      },
      can_manage_users: false,
      can_manage_roles: false,
      icon: 'trending-up',
      color: 'green'
    },
    {
      name: 'Project Contributor',
      code: 'project_contributor',
      description: 'Can contribute to projects and tasks',
      module_access: ['dashboard', 'project_management', 'operational_tasks', 'meetings', 'notifications'],
      module_permissions: {
        project_management: { create: true, read: true, update: true, delete: false, data_scope: 'team' },
        operational_tasks: { create: true, read: true, update: true, delete: false, data_scope: 'own_assigned' },
        meetings: { create: true, read: true, update: true, delete: false, data_scope: 'team' },
      },
      can_manage_users: false,
      can_manage_roles: false,
      icon: 'folder-kanban',
      color: 'purple'
    },
    {
      name: 'HR Specialist',
      code: 'hr_specialist',
      description: 'HR operations with limited admin access',
      module_access: ['dashboard', 'hr', 'expense', 'employee_self_service', 'notifications'],
      module_permissions: {
        hr: { create: true, read: true, update: true, delete: false, data_scope: 'all', can_approve: true },
        expense: { create: false, read: true, update: true, delete: false, data_scope: 'all', can_approve: true },
      },
      can_manage_users: true,
      can_manage_roles: false,
      icon: 'users',
      color: 'amber'
    },
    {
      name: 'Finance Approver',
      code: 'finance_approver',
      description: 'Can approve expenses and view financial data',
      module_access: ['dashboard', 'expense', 'analytics_insights', 'notifications'],
      module_permissions: {
        expense: { create: false, read: true, update: true, delete: false, data_scope: 'all', can_approve: true },
        analytics_insights: { create: false, read: true, update: false, delete: false, data_scope: 'all' },
      },
      can_manage_users: false,
      can_manage_roles: false,
      icon: 'receipt',
      color: 'teal'
    },
  ];

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, modulesRes, presetsRes] = await Promise.all([
        api.get('/rbac/roles'),
        api.get('/rbac/modules'),
        api.get('/rbac/presets')
      ]);
      
      setRoles(rolesRes.data || []);
      setModules(modulesRes.data?.modules || []);
      setPresets(presetsRes.data || PERMISSION_PRESETS);
      
      // Group modules by category
      const grouped = {};
      (modulesRes.data?.modules || []).forEach(m => {
        if (!grouped[m.category]) grouped[m.category] = [];
        grouped[m.category].push(m);
      });
      setModulesByCategory(grouped);
    } catch (err) {
      console.error('Failed to fetch RBAC data:', err);
      toast.error('Failed to load roles and modules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch users for permissions preview
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fetch user's effective permissions
  const fetchUserPermissions = async (userId) => {
    try {
      const res = await api.get(`/rbac/users/${userId}/permissions`);
      setPreviewData(res.data);
    } catch (err) {
      console.error('Failed to fetch user permissions:', err);
      toast.error('Failed to load user permissions');
    }
  };

  // Open permissions preview dialog
  const openPermissionsPreview = async (userId = null) => {
    setShowPermissionsPreview(true);
    setPreviewData(null);
    
    // Fetch users if not loaded
    if (users.length === 0) {
      await fetchUsers();
    }
    
    // If userId provided, fetch their permissions
    if (userId) {
      setPreviewUserId(userId);
      await fetchUserPermissions(userId);
    }
  };

  // Get filtered users for search
  const filteredUsers = users.filter(u => 
    userSearchQuery === '' || 
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Clone a role (create new role from template or existing role)
  const cloneRole = (sourceRole) => {
    setRoleForm({
      name: `${sourceRole.name} (Copy)`,
      code: `${sourceRole.code}_copy`,
      description: sourceRole.description || '',
      module_access: [...(sourceRole.module_access || [])],
      module_permissions: JSON.parse(JSON.stringify(sourceRole.module_permissions || {})),
      can_manage_users: sourceRole.can_manage_users || false,
      can_manage_roles: sourceRole.can_manage_roles || false
    });
    setShowTemplatesDialog(false);
    setShowCreateModal(true);
  };

  // Create role from template
  const createFromTemplate = (template) => {
    setRoleForm({
      name: template.name,
      code: template.code,
      description: template.description,
      module_access: [...template.module_access],
      module_permissions: JSON.parse(JSON.stringify(template.module_permissions)),
      can_manage_users: template.can_manage_users,
      can_manage_roles: template.can_manage_roles
    });
    setShowTemplatesDialog(false);
    setShowCreateModal(true);
  };

  // Fetch users for a specific role
  const fetchRoleUsers = async (role) => {
    setRoleUsersDialog({ open: true, role, users: [] });
    setLoadingRoleUsers(true);
    try {
      const res = await api.get('/admin/users');
      const allUsers = res.data || [];
      // Filter users who have this role (check role_ids, custom_role_ids, and legacy role field)
      const roleCode = role.code || '';
      const roleName = role.name?.toLowerCase().replace(/ /g, '_') || '';
      const roleUsers = allUsers.filter(u => 
        (u.role_ids || []).includes(role.id) || 
        (u.custom_role_ids || []).includes(role.id) ||
        u.role === roleCode ||
        u.role === roleName
      );
      setRoleUsersDialog(prev => ({ ...prev, users: roleUsers }));
    } catch (err) {
      console.error('Failed to fetch role users:', err);
      toast.error('Failed to load users for this role');
    } finally {
      setLoadingRoleUsers(false);
    }
  };

  // Open create/edit modal
  const openCreateModal = (role = null) => {
    if (role) {
      setRoleForm({
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description || '',
        module_access: role.module_access || [],
        module_permissions: role.module_permissions || {},
        can_manage_users: role.can_manage_users || false,
        can_manage_roles: role.can_manage_roles || false
      });
    } else {
      setRoleForm({
        name: '',
        code: '',
        description: '',
        module_access: [],
        module_permissions: {},
        can_manage_users: false,
        can_manage_roles: false
      });
    }
    setShowCreateModal(true);
  };

  // Toggle module access
  const toggleModuleAccess = (moduleCode) => {
    const isEnabled = roleForm.module_access.includes(moduleCode);
    
    if (isEnabled) {
      // Remove module
      setRoleForm(prev => ({
        ...prev,
        module_access: prev.module_access.filter(m => m !== moduleCode),
        module_permissions: { ...prev.module_permissions, [moduleCode]: undefined }
      }));
    } else {
      // Add module with default permissions (viewer)
      setRoleForm(prev => ({
        ...prev,
        module_access: [...prev.module_access, moduleCode],
        module_permissions: { 
          ...prev.module_permissions, 
          [moduleCode]: { ...presets.viewer }
        }
      }));
    }
  };

  // Apply preset to module
  const applyPresetToModule = (moduleCode, presetName) => {
    const preset = presets[presetName];
    if (!preset) return;
    
    setRoleForm(prev => ({
      ...prev,
      module_permissions: {
        ...prev.module_permissions,
        [moduleCode]: { ...preset }
      }
    }));
  };

  // Update module permission
  const updateModulePermission = (moduleCode, field, value) => {
    setRoleForm(prev => ({
      ...prev,
      module_permissions: {
        ...prev.module_permissions,
        [moduleCode]: {
          ...(prev.module_permissions[moduleCode] || presets.viewer),
          [field]: value
        }
      }
    }));
  };

  // Save role
  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    if (!roleForm.code.trim()) {
      toast.error('Role code is required');
      return;
    }
    
    setSaving(true);
    try {
      // Clean up permissions - only include enabled modules
      const cleanPermissions = {};
      roleForm.module_access.forEach(moduleCode => {
        if (roleForm.module_permissions[moduleCode]) {
          cleanPermissions[moduleCode] = roleForm.module_permissions[moduleCode];
        }
      });
      
      const payload = {
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
        module_access: roleForm.module_access,
        module_permissions: cleanPermissions,
        can_manage_users: roleForm.can_manage_users,
        can_manage_roles: roleForm.can_manage_roles
      };
      
      if (roleForm.id) {
        await api.put(`/rbac/roles/${roleForm.id}`, payload);
        toast.success('Role updated successfully');
      } else {
        await api.post('/rbac/roles', payload);
        toast.success('Role created successfully');
      }
      
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    
    try {
      await api.delete(`/rbac/roles/${selectedRole.id}`);
      toast.success('Role deleted');
      setShowDeleteDialog(false);
      setSelectedRole(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete role');
    }
  };

  // Get module permission display
  const getModulePermissionBadge = (permissions) => {
    if (!permissions) return <Badge variant="outline">No Access</Badge>;
    
    const { create, read, update, delete: del } = permissions;
    const crud = [create && 'C', read && 'R', update && 'U', del && 'D'].filter(Boolean).join('');
    
    let variant = 'outline';
    if (crud === 'CRUD') variant = 'default';
    else if (crud.includes('C') || crud.includes('U') || crud.includes('D')) variant = 'secondary';
    
    return <Badge variant={variant}>{crud || 'None'}</Badge>;
  };

  // Get role CRUD summary - shows overall permissions across all modules
  const getRoleCrudSummary = (role) => {
    const perms = role.module_permissions || {};
    const modules = role.module_access || [];
    
    if (modules.length === 0) return { summary: 'No Access', color: 'gray' };
    
    let hasCreate = false, hasRead = false, hasUpdate = false, hasDelete = false;
    let totalPerms = 0;
    
    Object.values(perms).forEach(p => {
      if (p.create) { hasCreate = true; totalPerms++; }
      if (p.read) { hasRead = true; totalPerms++; }
      if (p.update) { hasUpdate = true; totalPerms++; }
      if (p.delete) { hasDelete = true; totalPerms++; }
    });
    
    // If no explicit permissions but has modules, assume read access
    if (totalPerms === 0 && modules.length > 0) {
      return { 
        summary: 'Read Only',
        badges: [{ label: 'R', color: 'bg-blue-100 text-blue-700' }],
        color: 'blue'
      };
    }
    
    const badges = [];
    if (hasCreate) badges.push({ label: 'C', color: 'bg-green-100 text-green-700' });
    if (hasRead) badges.push({ label: 'R', color: 'bg-blue-100 text-blue-700' });
    if (hasUpdate) badges.push({ label: 'U', color: 'bg-yellow-100 text-yellow-700' });
    if (hasDelete) badges.push({ label: 'D', color: 'bg-red-100 text-red-700' });
    
    const crud = [hasCreate && 'C', hasRead && 'R', hasUpdate && 'U', hasDelete && 'D'].filter(Boolean).join('');
    
    return {
      summary: crud || 'Custom',
      badges,
      color: crud === 'CRUD' ? 'purple' : 'gray'
    };
  };

  return (
    <div className="p-6 space-y-6" data-testid="role-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            Role Management
          </h1>
          <p className="text-gray-500 mt-1">
            Create and manage roles with granular CRUD permissions and data scope controls
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplatesDialog(true)} data-testid="use-template-btn">
            <Sparkles className="w-4 h-4 mr-2" />
            Use Template
          </Button>
          <Button variant="outline" onClick={() => openPermissionsPreview()} data-testid="preview-permissions-btn">
            <Eye className="w-4 h-4 mr-2" />
            Preview User Permissions
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => openCreateModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Roles</p>
                <p className="text-2xl font-bold">{roles.length}</p>
              </div>
              <Shield className="w-8 h-8 text-indigo-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">System Roles</p>
                <p className="text-2xl font-bold">{roles.filter(r => r.is_system_role).length}</p>
              </div>
              <Lock className="w-8 h-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Modules</p>
                <p className="text-2xl font-bold">{modules.length}</p>
              </div>
              <Package className="w-8 h-8 text-teal-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Categories</p>
                <p className="text-2xl font-bold">{Object.keys(modulesByCategory).length}</p>
              </div>
              <Layers className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Roles</CardTitle>
          <CardDescription>
            Click on a role to edit its permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading roles...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Admin Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(role => {
                  const crudSummary = getRoleCrudSummary(role);
                  return (
                  <TableRow key={role.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openCreateModal(role)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${role.is_system_role ? 'text-amber-500' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-medium">{role.name}</p>
                          <p className="text-xs text-gray-500">{role.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{role.module_access?.length || 0} modules</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {crudSummary.badges?.length > 0 ? (
                          crudSummary.badges.map((b, i) => (
                            <span key={i} className={`px-1.5 py-0.5 text-xs font-medium rounded ${b.color}`}>
                              {b.label}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">{crudSummary.summary}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-indigo-600"
                        onClick={(e) => { e.stopPropagation(); if (role.user_count > 0) fetchRoleUsers(role); }}
                        title={role.user_count > 0 ? "Click to view users" : "No users assigned"}
                      >
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className={role.user_count > 0 ? "text-indigo-600 underline" : ""}>{role.user_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {role.can_manage_users && <Badge variant="secondary">Users</Badge>}
                        {role.can_manage_roles && <Badge variant="secondary">Roles</Badge>}
                        {!role.can_manage_users && !role.can_manage_roles && <span className="text-gray-400">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {role.is_system_role ? (
                        <Badge className="bg-amber-100 text-amber-700">System</Badge>
                      ) : role.is_active !== false ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => cloneRole(role)} title="Clone Role">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openCreateModal(role)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!role.is_system_role && (
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedRole(role); setShowDeleteDialog(true); }}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Role Modal */}
      <Sheet open={showCreateModal} onOpenChange={setShowCreateModal}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {roleForm.id ? 'Edit Role' : 'Create Role'}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 py-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role Name *</Label>
                <Input
                  value={roleForm.name}
                  onChange={e => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Marketing Manager"
                />
              </div>
              <div>
                <Label>Role Code *</Label>
                <Input
                  value={roleForm.code}
                  onChange={e => setRoleForm(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="e.g., marketing_manager"
                  disabled={roleForm.id && roles.find(r => r.id === roleForm.id)?.is_system_role}
                />
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={roleForm.description}
                onChange={e => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role's purpose..."
                rows={2}
              />
            </div>
            
            {/* Administrative Access */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Administrative Access
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Can Manage Users</p>
                    <p className="text-xs text-gray-500">Create, edit, and deactivate user accounts</p>
                  </div>
                  <Switch
                    checked={roleForm.can_manage_users}
                    onCheckedChange={v => setRoleForm(prev => ({ ...prev, can_manage_users: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Can Manage Roles</p>
                    <p className="text-xs text-gray-500">Create, edit, and delete roles (except system roles)</p>
                  </div>
                  <Switch
                    checked={roleForm.can_manage_roles}
                    onCheckedChange={v => setRoleForm(prev => ({ ...prev, can_manage_roles: v }))}
                  />
                </div>
              </div>
            </div>
            
            {/* Module Permissions */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Module Access & Permissions
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Enable modules and configure CRUD permissions with data scope for each
              </p>
              
              <Accordion type="multiple" defaultValue={expandedCategories}>
                {Object.entries(modulesByCategory).map(([category, categoryModules]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{CATEGORY_LABELS[category] || category}</Badge>
                        <span className="text-sm text-gray-500">
                          ({categoryModules.filter(m => roleForm.module_access.includes(m.code)).length}/{categoryModules.length} enabled)
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {categoryModules.map(module => {
                          const isEnabled = roleForm.module_access.includes(module.code);
                          const permissions = roleForm.module_permissions[module.code] || {};
                          
                          return (
                            <div key={module.code} className={`p-3 rounded-lg border ${isEnabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isEnabled}
                                    onCheckedChange={() => toggleModuleAccess(module.code)}
                                  />
                                  <div>
                                    <p className="font-medium text-sm">{module.name}</p>
                                    <p className="text-xs text-gray-500">{module.description}</p>
                                  </div>
                                </div>
                                {isEnabled && (
                                  <Select onValueChange={v => applyPresetToModule(module.code, v)}>
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue placeholder="Apply Preset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="viewer">Viewer</SelectItem>
                                      <SelectItem value="editor">Editor</SelectItem>
                                      <SelectItem value="manager">Manager</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              
                              {isEnabled && (
                                <div className="ml-7 mt-3 space-y-3">
                                  {/* CRUD Permissions */}
                                  <div className="flex flex-wrap gap-4">
                                    {['create', 'read', 'update', 'delete'].map(action => (
                                      <label key={action} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={permissions[action] || false}
                                          onCheckedChange={v => updateModulePermission(module.code, action, v)}
                                        />
                                        <span className="text-sm capitalize">{action}</span>
                                      </label>
                                    ))}
                                  </div>
                                  
                                  {/* Data Scope */}
                                  <div className="flex items-center gap-4">
                                    <Label className="text-sm w-24">Data Scope:</Label>
                                    <Select
                                      value={permissions.data_scope || 'own'}
                                      onValueChange={v => updateModulePermission(module.code, 'data_scope', v)}
                                    >
                                      <SelectTrigger className="w-48 h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DATA_SCOPE_OPTIONS.map(opt => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Advanced Permissions */}
                                  <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <Checkbox
                                        checked={permissions.can_edit_others || false}
                                        onCheckedChange={v => updateModulePermission(module.code, 'can_edit_others', v)}
                                      />
                                      <span className="text-sm">Edit Others' Records</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <Checkbox
                                        checked={permissions.can_delete_others || false}
                                        onCheckedChange={v => updateModulePermission(module.code, 'can_delete_others', v)}
                                      />
                                      <span className="text-sm">Delete Others' Records</span>
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRole} disabled={saving}>
                {saving ? 'Saving...' : roleForm.id ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRole?.name}"? This action cannot be undone.
              {selectedRole?.user_count > 0 && (
                <span className="block mt-2 text-red-500 font-medium">
                  Warning: This role is assigned to {selectedRole.user_count} user(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-red-600 hover:bg-red-700">
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Preview Dialog */}
      <Dialog open={showPermissionsPreview} onOpenChange={setShowPermissionsPreview}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              User Permissions Preview
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* User Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="user-search-input"
              />
            </div>
            
            {/* User List */}
            {!previewData && (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {usersLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No users found</div>
                ) : (
                  <div className="divide-y">
                    {filteredUsers.slice(0, 20).map(user => (
                      <div
                        key={user.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                        onClick={() => {
                          setPreviewUserId(user.id);
                          fetchUserPermissions(user.id);
                        }}
                        data-testid={`user-item-${user.id}`}
                      >
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <Badge variant="outline">{user.role || 'No role'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Permissions Preview Panel */}
            {previewData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreviewData(null);
                      setPreviewUserId(null);
                    }}
                  >
                    <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                    Back to user list
                  </Button>
                </div>
                
                {/* User Info */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-lg">{previewData.user_name}</p>
                        <p className="text-sm text-gray-500">{previewData.user_email}</p>
                      </div>
                      <div className="ml-auto flex gap-2">
                        {previewData.is_admin && <Badge className="bg-red-100 text-red-700">Admin</Badge>}
                        {previewData.can_manage_users && <Badge className="bg-amber-100 text-amber-700">Manage Users</Badge>}
                        {previewData.can_manage_roles && <Badge className="bg-purple-100 text-purple-700">Manage Roles</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Assigned Roles */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Assigned Roles ({previewData.roles?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {previewData.roles?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {previewData.roles.map(role => (
                          <Badge key={role.id} variant="secondary" className="py-1">
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No roles assigned</p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Module Access */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Module Access ({previewData.modules?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {previewData.modules?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {previewData.modules.map(module => (
                          <Badge key={module} variant="outline" className="py-1">
                            {module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No modules accessible</p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Detailed Permissions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Module Permissions Detail
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {Object.keys(previewData.permissions || {}).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(previewData.permissions).map(([module, perms]) => (
                          <div key={module} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">
                                {module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {perms.data_scope?.replace(/_/g, ' ') || 'All'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {perms.create && <Badge className="bg-green-100 text-green-700 text-xs">Create</Badge>}
                              {perms.read && <Badge className="bg-blue-100 text-blue-700 text-xs">Read</Badge>}
                              {perms.update && <Badge className="bg-yellow-100 text-yellow-700 text-xs">Update</Badge>}
                              {perms.delete && <Badge className="bg-red-100 text-red-700 text-xs">Delete</Badge>}
                              {perms.can_edit_others && <Badge className="bg-purple-100 text-purple-700 text-xs">Edit Others</Badge>}
                              {perms.can_delete_others && <Badge className="bg-pink-100 text-pink-700 text-xs">Delete Others</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No detailed permissions set (using defaults)</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Templates Dialog */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Role Templates
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Choose a template to quickly create a new role with pre-configured permissions.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {ROLE_TEMPLATES.map(template => (
                <div 
                  key={template.code}
                  className="p-4 border rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors"
                  onClick={() => createFromTemplate(template)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      template.color === 'blue' ? 'bg-blue-100' :
                      template.color === 'green' ? 'bg-green-100' :
                      template.color === 'purple' ? 'bg-purple-100' :
                      template.color === 'amber' ? 'bg-amber-100' :
                      template.color === 'teal' ? 'bg-teal-100' : 'bg-gray-100'
                    }`}>
                      <FileText className={`w-5 h-5 ${
                        template.color === 'blue' ? 'text-blue-600' :
                        template.color === 'green' ? 'text-green-600' :
                        template.color === 'purple' ? 'text-purple-600' :
                        template.color === 'amber' ? 'text-amber-600' :
                        template.color === 'teal' ? 'text-teal-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {template.module_access.length} modules
                        </Badge>
                        {template.can_manage_users && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">Manage Users</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 mb-3">Or clone an existing role:</p>
              <div className="flex flex-wrap gap-2">
                {roles.slice(0, 6).map(role => (
                  <Button 
                    key={role.id} 
                    variant="outline" 
                    size="sm"
                    onClick={() => cloneRole(role)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {role.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Users Dialog */}
      <Dialog open={roleUsersDialog.open} onOpenChange={(open) => setRoleUsersDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Users with "{roleUsersDialog.role?.name}" Role
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingRoleUsers ? (
              <div className="text-center py-8 text-gray-500">Loading users...</div>
            ) : roleUsersDialog.users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No users assigned to this role</div>
            ) : (
              <div className="border rounded-lg max-h-80 overflow-y-auto divide-y">
                {roleUsersDialog.users.map(user => (
                  <div key={user.id} className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 font-medium">{user.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`ml-auto ${user.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {user.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-sm text-gray-500 text-center">
              Total: {roleUsersDialog.users.length} user(s)
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;
