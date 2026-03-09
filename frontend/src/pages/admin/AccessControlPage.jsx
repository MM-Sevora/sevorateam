import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Users, Plus, Edit, Trash2, Check, X, RefreshCw,
  UserPlus, Settings, ChevronRight, Search, Building2, Briefcase
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
  
  // Draft users state
  const [draftUsers, setDraftUsers] = useState([]);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lookup data
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [positions, setPositions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Dialog states
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });
  
  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    module_access: [],
    can_manage_users: false,
    can_manage_employees: false,
    can_manage_roles: false
  });
  
  const [onboardForm, setOnboardForm] = useState({
    department_id: '',
    team_id: '',
    position_id: '',
    grade_id: '',
    reports_to: '',
    custom_role_id: '',
    designation: '',
    employment_type: 'full_time',
    work_mode: 'office',
    joining_date: new Date().toISOString().split('T')[0]
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

  // Fetch draft users
  const fetchDraftUsers = useCallback(async () => {
    setLoadingDraft(true);
    try {
      let url = '/access/draft-users';
      if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;
      const response = await api.get(url);
      setDraftUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch draft users:', error);
    } finally {
      setLoadingDraft(false);
    }
  }, [api, searchQuery]);

  // Fetch lookup data
  const fetchLookupData = useCallback(async () => {
    try {
      const [deptRes, teamRes, posRes, gradeRes, empRes] = await Promise.all([
        api.get('/workos/departments'),
        api.get('/hr/teams'),
        api.get('/hr/positions'),
        api.get('/hr/grades'),
        api.get('/hr/employees')
      ]);
      setDepartments(deptRes.data || []);
      setTeams(teamRes.data || []);
      setPositions(posRes.data || []);
      setGrades(gradeRes.data || []);
      setEmployees(empRes.data || []);
    } catch (error) {
      console.error('Failed to fetch lookup data:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchRoles();
    fetchModules();
    fetchLookupData();
  }, [fetchRoles, fetchModules, fetchLookupData]);

  useEffect(() => {
    if (activeTab === 'onboarding') {
      fetchDraftUsers();
    }
  }, [activeTab, fetchDraftUsers]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'onboarding') {
        fetchDraftUsers();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Onboard user
  const handleOnboard = async () => {
    if (!selectedUser || !onboardForm.department_id || !onboardForm.custom_role_id) {
      toast.error('Department and Role are required');
      return;
    }
    
    setSaving(true);
    try {
      const response = await api.post(`/access/onboard/${selectedUser.id}`, onboardForm);
      toast.success(response.data?.message || 'User onboarded successfully');
      setShowOnboardDialog(false);
      setSelectedUser(null);
      resetOnboardForm();
      fetchDraftUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to onboard user');
    } finally {
      setSaving(false);
    }
  };

  // Reset forms
  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      code: '',
      description: '',
      module_access: [],
      can_manage_users: false,
      can_manage_employees: false,
      can_manage_roles: false
    });
  };

  const resetOnboardForm = () => {
    setOnboardForm({
      department_id: '',
      team_id: '',
      position_id: '',
      grade_id: '',
      reports_to: '',
      custom_role_id: '',
      designation: '',
      employment_type: 'full_time',
      work_mode: 'office',
      joining_date: new Date().toISOString().split('T')[0]
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
      can_manage_users: role.can_manage_users || false,
      can_manage_employees: role.can_manage_employees || false,
      can_manage_roles: role.can_manage_roles || false
    });
    setShowRoleDialog(true);
  };

  // Open onboard dialog
  const openOnboardDialog = (user) => {
    setSelectedUser(user);
    resetOnboardForm();
    setShowOnboardDialog(true);
  };

  // Toggle module access
  const toggleModule = (moduleKey) => {
    setRoleForm(prev => ({
      ...prev,
      module_access: prev.module_access.includes(moduleKey)
        ? prev.module_access.filter(m => m !== moduleKey)
        : [...prev.module_access, moduleKey]
    }));
  };

  // Filter teams by department
  const filteredTeams = teams.filter(t => !onboardForm.department_id || t.department_id === onboardForm.department_id);

  return (
    <div className="p-8 space-y-6" data-testid="access-control-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Access Control</h1>
          <p className="text-[#5D4A3A] text-sm">Manage roles, permissions, and user onboarding</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto text-[#8B7355] mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{roles.length}</p>
            <p className="text-xs text-[#5D4A3A]">Custom Roles</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{draftUsers.length}</p>
            <p className="text-xs text-[#5D4A3A]">Pending Onboarding</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Settings className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{moduleKeys.length}</p>
            <p className="text-xs text-[#5D4A3A]">System Modules</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Building2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{employees.length}</p>
            <p className="text-xs text-[#5D4A3A]">Active Employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#E8D5C4]">
          <TabsTrigger value="roles" className="data-[state=active]:bg-white">
            <Shield className="h-4 w-4 mr-2" />
            Custom Roles
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="data-[state=active]:bg-white">
            <UserPlus className="h-4 w-4 mr-2" />
            User Onboarding
          </TabsTrigger>
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
                    <TableHead className="text-[#4A3728]">Module Access</TableHead>
                    <TableHead className="text-[#4A3728]">Permissions</TableHead>
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
                          <div className="flex flex-wrap gap-1 max-w-[300px]">
                            {(role.module_names || []).slice(0, 3).map((name, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
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

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[#4A3728]">Users Pending Onboarding</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5D4A3A]" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-[#E8D5C4]"
              />
            </div>
          </div>

          <Card className="border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5EDE5]">
                    <TableHead className="text-[#4A3728]">User</TableHead>
                    <TableHead className="text-[#4A3728]">Source</TableHead>
                    <TableHead className="text-[#4A3728]">Status</TableHead>
                    <TableHead className="text-[#4A3728]">Created</TableHead>
                    <TableHead className="text-[#4A3728] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDraft ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#4A3728]" />
                      </TableCell>
                    </TableRow>
                  ) : draftUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-[#5D4A3A]">
                        No users pending onboarding
                      </TableCell>
                    </TableRow>
                  ) : (
                    draftUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-[#F5EDE5]" data-testid={`draft-user-${user.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#E8D5C4] flex items-center justify-center">
                              <span className="text-[#4A3728] font-medium">
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-[#4A3728]">{user.name}</p>
                              <p className="text-xs text-[#5D4A3A]">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {user.microsoft_id ? 'Microsoft AD' : 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            user.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {user.status || 'draft'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[#5D4A3A]">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => openOnboardDialog(user)}
                            className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
                            size="sm"
                            data-testid={`onboard-btn-${user.id}`}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Onboard
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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

            {/* Module Access */}
            <div>
              <Label className="text-[#4A3728] mb-3 block">Module Access</Label>
              <div className="grid grid-cols-2 gap-3">
                {moduleKeys.map((key) => {
                  const module = modules[key] || {};
                  const isDefault = module.default_access;
                  const isSelected = roleForm.module_access.includes(key);
                  
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected || isDefault
                          ? 'border-[#8B7355] bg-[#F5EDE5]'
                          : 'border-[#E8D5C4] hover:border-[#8B7355]'
                      } ${selectedRole?.is_system_role ? 'opacity-60 pointer-events-none' : ''}`}
                      onClick={() => !isDefault && toggleModule(key)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected || isDefault}
                          disabled={isDefault || selectedRole?.is_system_role}
                          className="pointer-events-none"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-[#4A3728] text-sm">{module.name || key}</p>
                          <p className="text-xs text-[#5D4A3A]">{module.description}</p>
                        </div>
                        {isDefault && (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                      </div>
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

      {/* Onboard Dialog */}
      <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Onboard User</DialogTitle>
            <DialogDescription>
              Complete the employee profile for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info (Read-only) */}
            <Card className="border-[#E8D5C4]">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#E8D5C4] flex items-center justify-center">
                    <span className="text-[#4A3728] font-bold text-lg">
                      {selectedUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#4A3728]">{selectedUser?.name}</p>
                    <p className="text-sm text-[#5D4A3A]">{selectedUser?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization */}
            <div>
              <h4 className="font-medium text-[#4A3728] mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Department *</Label>
                  <Select 
                    value={onboardForm.department_id} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, department_id: v, team_id: '' })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Team</Label>
                  <Select 
                    value={onboardForm.team_id} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, team_id: v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {filteredTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Position</Label>
                  <Select 
                    value={onboardForm.position_id} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, position_id: v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {positions.map(pos => (
                        <SelectItem key={pos.id} value={pos.id}>{pos.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Grade</Label>
                  <Select 
                    value={onboardForm.grade_id} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, grade_id: v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {grades.map(grade => (
                        <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Employment */}
            <div>
              <h4 className="font-medium text-[#4A3728] mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Employment
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Designation</Label>
                  <Input
                    value={onboardForm.designation}
                    onChange={(e) => setOnboardForm({ ...onboardForm, designation: e.target.value })}
                    placeholder="e.g., Senior Developer"
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div>
                  <Label className="text-[#4A3728]">Joining Date</Label>
                  <Input
                    type="date"
                    value={onboardForm.joining_date}
                    onChange={(e) => setOnboardForm({ ...onboardForm, joining_date: e.target.value })}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div>
                  <Label className="text-[#4A3728]">Employment Type</Label>
                  <Select 
                    value={onboardForm.employment_type} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, employment_type: v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Work Mode</Label>
                  <Select 
                    value={onboardForm.work_mode} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, work_mode: v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Reporting & Access */}
            <div>
              <h4 className="font-medium text-[#4A3728] mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Reporting & Access
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Reports To</Label>
                  <Select 
                    value={onboardForm.reports_to} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, reports_to: v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Access Role *</Label>
                  <Select 
                    value={onboardForm.custom_role_id} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, custom_role_id: v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnboardDialog(false)} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button
              onClick={handleOnboard}
              disabled={saving || !onboardForm.department_id || !onboardForm.custom_role_id}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Complete Onboarding
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
