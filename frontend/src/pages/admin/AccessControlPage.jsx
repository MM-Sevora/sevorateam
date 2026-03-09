import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Plus, Edit, Trash2, RefreshCw, Settings, Lock, Key, Layers
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
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
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const AccessControlPage = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('roles');
  
  // Roles state
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [modules, setModules] = useState({});
  const [moduleKeys, setModuleKeys] = useState([]);
  
  // Dialog states
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });
  
  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    module_access: [],
    module_permissions: {}, // New: { module_key: { create: true, read: true, update: true, delete: false } }
    can_manage_users: false,
    can_manage_employees: false,
    can_manage_roles: false
  });
  
  const [saving, setSaving] = useState(false);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const response = await api.get('/access/roles');
      setRoles(response.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setLoadingRoles(false);
    }
  }, [api]);

  // Fetch modules
  const fetchModules = useCallback(async () => {
    try {
      const response = await api.get('/access/modules');
      setModules(response.data?.modules || {});
      setModuleKeys(response.data?.module_keys || []);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchRoles();
    fetchModules();
  }, [fetchRoles, fetchModules]);

  // Create/Update role
  const handleSaveRole = async () => {
    if (!roleForm.name || !roleForm.code) {
      toast.error('Name and code are required');
      return;
    }
    
    setSaving(true);
    try {
      if (selectedRole) {
        await api.put(`/access/roles/${selectedRole.id}`, roleForm);
        toast.success('Role updated successfully');
      } else {
        await api.post('/access/roles', roleForm);
        toast.success('Role created successfully');
      }
      setShowRoleDialog(false);
      setSelectedRole(null);
      resetRoleForm();
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const handleDeleteRole = async () => {
    if (!deleteDialog.role) return;
    
    try {
      await api.delete(`/access/roles/${deleteDialog.role.id}`);
      toast.success('Role deleted');
      setDeleteDialog({ open: false, role: null });
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete role');
    }
  };

  // Reset forms
  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      code: '',
      description: '',
      module_access: [],
      module_permissions: {},
      can_manage_users: false,
      can_manage_employees: false,
      can_manage_roles: false
    });
  };

  // Open edit dialog
  const openEditRole = (role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      code: role.code,
      description: role.description || '',
      module_access: role.module_access || [],
      module_permissions: role.module_permissions || {},
      can_manage_users: role.can_manage_users || false,
      can_manage_employees: role.can_manage_employees || false,
      can_manage_roles: role.can_manage_roles || false
    });
    setShowRoleDialog(true);
  };

  // Toggle module access
  const toggleModule = (moduleKey) => {
    setRoleForm(prev => {
      const isCurrentlySelected = prev.module_access.includes(moduleKey);
      if (isCurrentlySelected) {
        // Remove module and its permissions
        const newPermissions = { ...prev.module_permissions };
        delete newPermissions[moduleKey];
        return {
          ...prev,
          module_access: prev.module_access.filter(m => m !== moduleKey),
          module_permissions: newPermissions
        };
      } else {
        // Add module with default permissions (all true)
        return {
          ...prev,
          module_access: [...prev.module_access, moduleKey],
          module_permissions: {
            ...prev.module_permissions,
            [moduleKey]: { create: true, read: true, update: true, delete: true }
          }
        };
      }
    });
  };

  // Toggle specific CRUD permission for a module
  const togglePermission = (moduleKey, permType) => {
    setRoleForm(prev => ({
      ...prev,
      module_permissions: {
        ...prev.module_permissions,
        [moduleKey]: {
          ...(prev.module_permissions[moduleKey] || { create: true, read: true, update: true, delete: true }),
          [permType]: !(prev.module_permissions[moduleKey]?.[permType] ?? true)
        }
      }
    }));
  };

  const tabs = [
    { id: 'roles', label: 'Custom Roles', icon: Shield, count: roles.length },
    { id: 'modules', label: 'System Modules', icon: Layers, count: moduleKeys.length },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="access-control-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Access Control & Permissions</h1>
          <p className="text-[#5D4A3A] text-sm">Manage system roles, permissions, and module access</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto text-[#8B7355] mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{roles.length}</p>
            <p className="text-xs text-[#5D4A3A]">Custom Roles</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Layers className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{moduleKeys.length}</p>
            <p className="text-xs text-[#5D4A3A]">System Modules</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Key className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">
              {roles.reduce((acc, r) => acc + (r.module_access?.length || 0), 0)}
            </p>
            <p className="text-xs text-[#5D4A3A]">Total Permissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#E8D5C4]">
          {tabs.map(tab => (
            <TabsTrigger 
              key={tab.id}
              value={tab.id} 
              className="data-[state=active]:bg-white"
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-2 bg-[#8B7355]/10">
                  {tab.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[#4A3728]">Custom Roles</h2>
            <Button
              onClick={() => {
                setSelectedRole(null);
                resetRoleForm();
                setShowRoleDialog(true);
              }}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
              data-testid="add-role-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>

          <Card className="border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5EDE5]">
                    <TableHead className="text-[#4A3728]">Role</TableHead>
                    <TableHead className="text-[#4A3728]">Module Access & CRUD</TableHead>
                    <TableHead className="text-[#4A3728]">Admin Permissions</TableHead>
                    <TableHead className="text-[#4A3728]">Employees</TableHead>
                    <TableHead className="text-[#4A3728] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRoles ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#4A3728]" />
                      </TableCell>
                    </TableRow>
                  ) : roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-[#5D4A3A]">
                        No roles found. Click "Create Role" to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id} className="hover:bg-[#F5EDE5]" data-testid={`role-row-${role.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[#4A3728]">{role.name}</p>
                            <p className="text-xs text-[#5D4A3A]">{role.code}</p>
                            {role.is_system_role && (
                              <Badge variant="outline" className="text-xs mt-1">System</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[350px]">
                            {(role.module_names || []).slice(0, 3).map((name, idx) => {
                              const moduleKey = (role.module_access || [])[idx];
                              const perms = role.module_permissions?.[moduleKey] || {};
                              const permStr = [
                                perms.create ? 'C' : '',
                                perms.read ? 'R' : '',
                                perms.update ? 'U' : '',
                                perms.delete ? 'D' : ''
                              ].filter(Boolean).join('');
                              return (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {name}
                                  {permStr && <span className="ml-1 text-[10px] opacity-70">({permStr})</span>}
                                </Badge>
                              );
                            })}
                            {(role.module_names || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{role.module_names.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {role.can_manage_users && (
                              <Badge className="bg-purple-100 text-purple-800 text-xs w-fit">Users</Badge>
                            )}
                            {role.can_manage_employees && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs w-fit">Employees</Badge>
                            )}
                            {role.can_manage_roles && (
                              <Badge className="bg-red-100 text-red-800 text-xs w-fit">Roles</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[#4A3728] font-medium">{role.employee_count || 0}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditRole(role)}
                              className="border-[#E8D5C4]"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!role.is_system_role && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, role })}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#4A3728] mb-4">System Modules</h2>
            <p className="text-sm text-[#5D4A3A] mb-4">
              These are the available modules that can be assigned to roles for access control.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleKeys.map((key) => {
              const module = modules[key] || {};
              return (
                <Card key={key} className="border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-[#8B7355]" />
                        <h4 className="font-medium text-[#4A3728]">{module.name || key}</h4>
                      </div>
                      {module.default_access && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#5D4A3A] mb-3">{module.description || 'No description'}</p>
                    <div className="text-xs text-[#8B7355]">
                      Key: <code className="bg-[#F5EDE5] px-1 rounded">{key}</code>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">
              {selectedRole ? 'Edit Role' : 'Create Custom Role'}
            </DialogTitle>
            <DialogDescription>
              {selectedRole 
                ? 'Update role settings and module access'
                : 'Define a new role with specific module access and permissions'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Role Name *</Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g., Marketing Manager"
                  className="border-[#E8D5C4]"
                  disabled={selectedRole?.is_system_role}
                />
              </div>
              <div>
                <Label className="text-[#4A3728]">Code *</Label>
                <Input
                  value={roleForm.code}
                  onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="e.g., marketing_manager"
                  className="border-[#E8D5C4]"
                  disabled={selectedRole}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Describe what this role is for..."
                className="border-[#E8D5C4]"
                rows={2}
              />
            </div>

            {/* Module Access with CRUD Permissions */}
            <div>
              <Label className="text-[#4A3728] mb-3 block">Module Access & CRUD Permissions</Label>
              <p className="text-xs text-[#5D4A3A] mb-3">Select modules and configure Create, Read, Update, Delete permissions for each.</p>
              <div className="space-y-3">
                {moduleKeys.map((key) => {
                  const module = modules[key] || {};
                  const isDefault = module.default_access;
                  const isSelected = roleForm.module_access.includes(key);
                  const perms = roleForm.module_permissions[key] || { create: true, read: true, update: true, delete: true };
                  
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border transition-colors ${
                        isSelected || isDefault
                          ? 'border-[#8B7355] bg-[#F5EDE5]'
                          : 'border-[#E8D5C4]'
                      } ${selectedRole?.is_system_role ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={isSelected || isDefault}
                          disabled={isDefault || selectedRole?.is_system_role}
                          onCheckedChange={() => !isDefault && toggleModule(key)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-[#4A3728] text-sm">{module.name || key}</p>
                        </div>
                        {isDefault && (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                      </div>
                      
                      {/* CRUD Permissions - Only show when module is selected */}
                      {(isSelected || isDefault) && (
                        <div className="ml-6 mt-2 flex gap-4 flex-wrap">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={perms.create}
                              disabled={selectedRole?.is_system_role}
                              onCheckedChange={() => togglePermission(key, 'create')}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-green-700 font-medium">Create</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={perms.read}
                              disabled={selectedRole?.is_system_role}
                              onCheckedChange={() => togglePermission(key, 'read')}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-blue-700 font-medium">Read</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={perms.update}
                              disabled={selectedRole?.is_system_role}
                              onCheckedChange={() => togglePermission(key, 'update')}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-amber-700 font-medium">Update</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={perms.delete}
                              disabled={selectedRole?.is_system_role}
                              onCheckedChange={() => togglePermission(key, 'delete')}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-red-700 font-medium">Delete</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Permissions */}
            <div>
              <Label className="text-[#4A3728] mb-3 block">Administrative Permissions</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_manage_users"
                    checked={roleForm.can_manage_users}
                    onCheckedChange={(checked) => setRoleForm({ ...roleForm, can_manage_users: checked })}
                    disabled={selectedRole?.is_system_role}
                  />
                  <Label htmlFor="can_manage_users" className="text-sm text-[#5D4A3A]">
                    Can manage users (create, edit, deactivate)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_manage_employees"
                    checked={roleForm.can_manage_employees}
                    onCheckedChange={(checked) => setRoleForm({ ...roleForm, can_manage_employees: checked })}
                    disabled={selectedRole?.is_system_role}
                  />
                  <Label htmlFor="can_manage_employees" className="text-sm text-[#5D4A3A]">
                    Can manage employees (onboarding, HR records)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="can_manage_roles"
                    checked={roleForm.can_manage_roles}
                    onCheckedChange={(checked) => setRoleForm({ ...roleForm, can_manage_roles: checked })}
                    disabled={selectedRole?.is_system_role}
                  />
                  <Label htmlFor="can_manage_roles" className="text-sm text-[#5D4A3A]">
                    Can manage roles and permissions
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={saving}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{deleteDialog.role?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccessControlPage;
