import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  Users, Search, Plus, Edit, Trash2, RefreshCw,
  CheckCircle, XCircle, UserPlus, Key, Eye, EyeOff, Briefcase, ChevronDown, Shield, Building
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const UserManagementPage = () => {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog states
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [showPassword, setShowPassword] = useState(false);
  
  // Password management state
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null });
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [customPassword, setCustomPassword] = useState('');
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  
  // Onboarding state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [selectedUserForOnboard, setSelectedUserForOnboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [roles, setRoles] = useState([]);
  
  // Role assignment state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  
  const [onboardForm, setOnboardForm] = useState({
    department_id: '',
    grade_id: '',
    reports_to: '',
    custom_role_ids: [],
    designation: '',
    employment_type: 'full_time',
    work_mode: 'office',
    joining_date: new Date().toISOString().split('T')[0],
  });
  
  // Form state - simplified for platform access only
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    status: 'active',
    notes: '',
  });
  
  const [saving, setSaving] = useState(false);

  // Check if user is onboarded (has custom_role_ids and department_id OR employee record)
  const isUserOnboarded = useCallback((userId) => {
    const user = users.find(u => u.id === userId);
    // Check user's is_onboarded flag from API or custom_role_ids
    if (user?.is_onboarded) return true;
    if (user?.custom_role_ids?.length > 0 && user?.department_id) return true;
    // Fallback: check employees collection
    return employees.some(emp => emp.user_id === userId);
  }, [users, employees]);

  // Stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    onboarded: users.filter(u => isUserOnboarded(u.id)).length,
    pending: users.filter(u => !isUserOnboarded(u.id)).length,
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/workos/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get('/hr/v2/employees');
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  }, [api]);

  const fetchLookupData = useCallback(async () => {
    try {
      const [deptRes, gradeRes, roleRes] = await Promise.all([
        api.get('/workos/departments'),
        api.get('/hr/grades'),
        api.get('/access/roles'),
      ]);
      setDepartments(deptRes.data || []);
      setGrades(gradeRes.data || []);
      setRoles(roleRes.data || []);
    } catch (error) {
      console.error('Failed to fetch lookup data:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
    fetchLookupData();
  }, [fetchUsers, fetchEmployees, fetchLookupData]);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Create/Update user
  const handleSaveUser = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Name and Email are required');
      return;
    }
    
    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        status: formData.status,
        notes: formData.notes,
      };
      
      if (formData.password) {
        payload.password = formData.password;
      }
      
      if (editingUser) {
        await api.put(`/workos/users/${editingUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/workos/users', payload);
        toast.success('User created successfully');
      }
      
      setShowUserDialog(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    
    try {
      await api.delete(`/workos/users/${deleteDialog.user.id}`);
      toast.success('User deleted');
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  // Toggle user status - also syncs employee status
  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/workos/users/${user.id}`, { status: newStatus });
      
      // Also update employee status if user is onboarded
      const emp = employees.find(e => e.user_id === user.id);
      if (emp) {
        const empStatus = newStatus === 'active' ? 'active' : 'inactive';
        await api.put(`/hr/v2/employees/${emp.id}`, { status: empStatus });
      }
      
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchUsers();
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  // Password Management
  const openPasswordDialog = async (user) => {
    setPasswordDialog({ open: true, user });
    setGeneratedPassword(null);
    setCustomPassword('');
    setShowGeneratedPassword(false);
    
    // Check if user has a temp password
    try {
      const res = await api.get(`/workos/users/${user.id}/temp-password`);
      if (res.data.has_temp_password) {
        setGeneratedPassword(res.data.password);
      }
    } catch (error) {
      // No temp password available
    }
  };

  const generatePassword = async () => {
    if (!passwordDialog.user) return;
    setGeneratingPassword(true);
    try {
      const res = await api.post(`/workos/users/${passwordDialog.user.id}/generate-password`);
      setGeneratedPassword(res.data.password);
      setShowGeneratedPassword(true);
      toast.success('Password generated! Share this with the user.');
    } catch (error) {
      toast.error('Failed to generate password');
    } finally {
      setGeneratingPassword(false);
    }
  };

  const setCustomPasswordForUser = async () => {
    if (!passwordDialog.user || !customPassword) return;
    if (customPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setGeneratingPassword(true);
    try {
      await api.post(`/workos/users/${passwordDialog.user.id}/set-password`, {
        password: customPassword,
        must_change: true
      });
      setGeneratedPassword(customPassword);
      setShowGeneratedPassword(true);
      setCustomPassword('');
      toast.success('Password set successfully!');
    } catch (error) {
      toast.error('Failed to set password');
    } finally {
      setGeneratingPassword(false);
    }
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      toast.success('Password copied to clipboard');
    }
  };

  // Open edit dialog
  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      status: user.status || 'active',
      notes: user.notes || '',
    });
    setShowUserDialog(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditingUser(null);
    resetForm();
    setShowUserDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      status: 'active',
      notes: '',
    });
    setShowPassword(false);
  };

  // Open onboard modal
  const openOnboardModal = (user) => {
    setSelectedUserForOnboard(user);
    setOnboardForm({
      department_id: '',
      grade_id: '',
      reports_to: '',
      custom_role_ids: [],
      designation: '',
      employment_type: 'full_time',
      work_mode: 'office',
      joining_date: new Date().toISOString().split('T')[0],
    });
    setShowOnboardModal(true);
  };

  // Handle onboarding
  const handleOnboard = async () => {
    if (!selectedUserForOnboard || !onboardForm.department_id || onboardForm.custom_role_ids.length === 0) {
      toast.error('Department and at least one Access Role are required');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...onboardForm,
        grade_id: onboardForm.grade_id || null,
        reports_to: onboardForm.reports_to || null,
      };
      
      await api.post(`/access/onboard/${selectedUserForOnboard.id}`, payload);
      toast.success('Employee onboarded successfully!');
      setShowOnboardModal(false);
      setSelectedUserForOnboard(null);
      fetchUsers();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to onboard employee');
    }
    setSaving(false);
  };

  // Open role assignment modal
  const openRoleModal = (user) => {
    setSelectedUserForRole(user);
    // Get roles from user record (not employees)
    setSelectedRoleIds(user.custom_role_ids || []);
    setShowRoleModal(true);
  };

  // Save role assignment - Updates user record directly
  const handleSaveRoles = async () => {
    if (!selectedUserForRole) return;
    
    if (selectedRoleIds.length === 0) {
      toast.error('At least one role is required');
      return;
    }
    
    setSaving(true);
    try {
      // Use the new endpoint that updates user record directly
      await api.put(`/access/users/${selectedUserForRole.id}/roles`, {
        custom_role_ids: selectedRoleIds
      });
      toast.success('Roles updated successfully');
      setShowRoleModal(false);
      setSelectedUserForRole(null);
      fetchUsers();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update roles');
    }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="user-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">User Management</h1>
          <p className="text-[#5D4A3A] text-sm mt-1">Create and manage platform users for basic access</p>
        </div>
        <Button 
          onClick={openCreateDialog}
          className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
          data-testid="create-user-btn"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5D4A3A]">Total Users</p>
                <p className="text-2xl font-bold text-[#4A3728]">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-[#8B7355]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5D4A3A]">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5D4A3A]">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Onboarded</p>
                <p className="text-2xl font-bold text-green-700">{stats.onboarded}</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">Pending Onboard</p>
                <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
              </div>
              <UserPlus className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="border-[#E8D5C4] bg-gradient-to-r from-[#F5EDE5] to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[#8B7355]" />
              <span className="text-sm font-medium text-[#4A3728]">Quick Links:</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="/admin/employees" className="flex items-center gap-1 text-sm text-[#8B7355] hover:text-[#4A3728] transition-colors">
                <Briefcase className="w-4 h-4" /> Employee Database
              </a>
              <span className="text-[#E8D5C4]">|</span>
              <a href="/admin/access-control" className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors">
                <Shield className="w-4 h-4" /> Access Control
              </a>
              <span className="text-[#E8D5C4]">|</span>
              <a href="/admin/organization" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                <Building className="w-4 h-4" /> Organization Management
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> User Management handles platform login access only. Active users can access 
            Mail, Projects, and other basic modules. For HR data, department assignments, and roles, 
            use the <strong>Employee Database</strong> module.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7355]" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-[#E8D5C4]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 border-[#E8D5C4]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          onClick={fetchUsers}
          className="border-[#E8D5C4]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Users Table */}
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5EDE5]">
                <TableHead className="text-[#4A3728]">User</TableHead>
                <TableHead className="text-[#4A3728]">User ID</TableHead>
                <TableHead className="text-[#4A3728]">Status</TableHead>
                <TableHead className="text-[#4A3728]">HR Status</TableHead>
                <TableHead className="text-[#4A3728]">Roles</TableHead>
                <TableHead className="text-[#4A3728]">Created</TableHead>
                <TableHead className="text-[#4A3728] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#8B7355]" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#5D4A3A]">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-[#F5EDE5]" data-testid={`user-row-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8D5C4] flex items-center justify-center">
                          <span className="text-[#4A3728] font-medium">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#4A3728]">{user.name}</p>
                          <p className="text-sm text-[#5D4A3A]">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-[#F5EDE5] px-2 py-1 rounded text-[#5D4A3A]">
                        {user.id?.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                        }
                      >
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isUserOnboarded(user.id) ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Briefcase className="h-3 w-3 mr-1" /> Onboarded
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // First try user's custom_role_names (from enhanced user data)
                        let roleNames = user.custom_role_names || [];
                        
                        // Fallback: check employees collection
                        if (roleNames.length === 0) {
                          const emp = employees.find(e => e.user_id === user.id);
                          roleNames = emp?.custom_role_names || [];
                        }
                        
                        if (roleNames.length === 0) {
                          return <span className="text-gray-400 text-sm">No roles</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            {roleNames.slice(0, 2).map((name, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {name}
                              </Badge>
                            ))}
                            {roleNames.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{roleNames.length - 2}</Badge>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-[#5D4A3A] text-sm">
                      {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isUserOnboarded(user.id) ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openOnboardModal(user)}
                            className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
                          >
                            <Briefcase className="h-4 w-4 mr-1" /> Onboard
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRoleModal(user)}
                            className="border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            <Shield className="h-4 w-4 mr-1" /> Roles
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(user)}
                          className={user.status === 'active' 
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                          }
                        >
                          {user.status === 'active' ? (
                            <><XCircle className="h-4 w-4 mr-1" /> Deactivate</>
                          ) : (
                            <><CheckCircle className="h-4 w-4 mr-1" /> Activate</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openPasswordDialog(user)}
                          className="border-amber-200 text-amber-600 hover:bg-amber-50"
                          title="Manage Password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                          className="border-[#E8D5C4]"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteDialog({ open: true, user })}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">
              {editingUser ? 'Edit User' : 'Create User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Update user details for platform access'
                : 'Create a new user with basic platform access'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className="border-[#E8D5C4]"
              />
            </div>
            
            <div>
              <Label className="text-[#4A3728]">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="border-[#E8D5C4]"
                disabled={!!editingUser}
              />
            </div>
            
            <div>
              <Label className="text-[#4A3728]">
                Password {editingUser ? '(leave blank to keep current)' : '*'}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? '••••••••' : 'Enter password'}
                  className="border-[#E8D5C4] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7355]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <Label className="text-[#4A3728]">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[#8B7355] mt-1">
                Active users can login and access Mail, Projects, and other basic modules
              </p>
            </div>
            
            <div>
              <Label className="text-[#4A3728]">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this user..."
                className="border-[#E8D5C4]"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUserDialog(false)}
              className="border-[#E8D5C4]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={saving}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.user?.name}"? 
              This will remove their platform access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Onboard Employee Modal */}
      <Dialog open={showOnboardModal} onOpenChange={(open) => { setShowOnboardModal(open); if (!open) setSelectedUserForOnboard(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Onboard Employee</DialogTitle>
            <DialogDescription>
              Convert this user to a full employee with HR records
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* User Info */}
            <div className="bg-[#F5EDE5] p-3 rounded-lg">
              <p className="text-sm text-[#5D4A3A]">User</p>
              <p className="font-medium text-[#4A3728]">{selectedUserForOnboard?.name}</p>
              <p className="text-sm text-[#5D4A3A]">{selectedUserForOnboard?.email}</p>
            </div>

            {/* Department */}
            <div>
              <Label className="text-[#4A3728]">Department *</Label>
              <Select value={onboardForm.department_id} onValueChange={(v) => setOnboardForm({ ...onboardForm, department_id: v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Access Roles (Multi-select with checkboxes) */}
            <div>
              <Label className="text-[#4A3728]">Access Roles * (Select at least one)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between border-[#E8D5C4]">
                    {onboardForm.custom_role_ids.length > 0 
                      ? `${onboardForm.custom_role_ids.length} role(s) selected`
                      : 'Select roles...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-2">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {roles.map(role => (
                      <label key={role.id} className="flex items-center gap-2 p-2 hover:bg-[#F5EDE5] rounded cursor-pointer">
                        <Checkbox
                          checked={onboardForm.custom_role_ids.includes(role.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setOnboardForm({ ...onboardForm, custom_role_ids: [...onboardForm.custom_role_ids, role.id] });
                            } else {
                              setOnboardForm({ ...onboardForm, custom_role_ids: onboardForm.custom_role_ids.filter(id => id !== role.id) });
                            }
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium">{role.name}</p>
                          <p className="text-xs text-[#5D4A3A]">{role.code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Grade */}
            <div>
              <Label className="text-[#4A3728]">Grade</Label>
              <Select value={onboardForm.grade_id || "none"} onValueChange={(v) => setOnboardForm({ ...onboardForm, grade_id: v === "none" ? "" : v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grade</SelectItem>
                  {grades.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reporting Manager */}
            <div>
              <Label className="text-[#4A3728]">Reporting Manager</Label>
              <Select value={onboardForm.reports_to || "none"} onValueChange={(v) => setOnboardForm({ ...onboardForm, reports_to: v === "none" ? "" : v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Designation */}
            <div>
              <Label className="text-[#4A3728]">Designation</Label>
              <Input 
                value={onboardForm.designation} 
                onChange={(e) => setOnboardForm({ ...onboardForm, designation: e.target.value })}
                placeholder="e.g., Senior Developer"
                className="border-[#E8D5C4]"
              />
            </div>

            {/* Employment Type & Work Mode in row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Employment Type</Label>
                <Select value={onboardForm.employment_type} onValueChange={(v) => setOnboardForm({ ...onboardForm, employment_type: v })}>
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
                <Select value={onboardForm.work_mode} onValueChange={(v) => setOnboardForm({ ...onboardForm, work_mode: v })}>
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

            {/* Joining Date */}
            <div>
              <Label className="text-[#4A3728]">Joining Date</Label>
              <Input 
                type="date"
                value={onboardForm.joining_date} 
                onChange={(e) => setOnboardForm({ ...onboardForm, joining_date: e.target.value })}
                className="border-[#E8D5C4]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowOnboardModal(false); setSelectedUserForOnboard(null); }} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button
              onClick={handleOnboard}
              disabled={saving || !onboardForm.department_id || onboardForm.custom_role_ids.length === 0}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Briefcase className="h-4 w-4 mr-2" />}
              Complete Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Assignment Modal */}
      <Dialog open={showRoleModal} onOpenChange={(open) => { setShowRoleModal(open); if (!open) setSelectedUserForRole(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Manage Roles</DialogTitle>
            <DialogDescription>
              Assign access roles for {selectedUserForRole?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* User Info */}
            <div className="bg-[#F5EDE5] p-3 rounded-lg">
              <p className="font-medium text-[#4A3728]">{selectedUserForRole?.name}</p>
              <p className="text-sm text-[#5D4A3A]">{selectedUserForRole?.email}</p>
            </div>

            {/* Role Selection */}
            <div>
              <Label className="text-[#4A3728] mb-3 block">Select Roles</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {roles.map(role => (
                  <label 
                    key={role.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRoleIds.includes(role.id) 
                        ? 'border-purple-300 bg-purple-50' 
                        : 'border-[#E8D5C4] hover:bg-[#F5EDE5]'
                    }`}
                  >
                    <Checkbox
                      checked={selectedRoleIds.includes(role.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoleIds([...selectedRoleIds, role.id]);
                        } else {
                          setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-[#4A3728]">{role.name}</p>
                      <p className="text-xs text-[#5D4A3A]">{role.description || role.code}</p>
                    </div>
                    {role.is_system_role && (
                      <Badge variant="outline" className="text-xs">System</Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRoleModal(false); setSelectedUserForRole(null); }} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={saving || selectedRoleIds.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Management Dialog */}
      <Dialog open={passwordDialog.open} onOpenChange={(open) => !open && setPasswordDialog({ open: false, user: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <Key className="h-5 w-5" />
              Password Management
            </DialogTitle>
            <DialogDescription>
              Generate or set password for {passwordDialog.user?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* User Info */}
            <div className="bg-[#F5EDE5] p-3 rounded-lg">
              <p className="font-medium text-[#4A3728]">{passwordDialog.user?.name}</p>
              <p className="text-sm text-[#5D4A3A]">{passwordDialog.user?.email}</p>
            </div>

            {/* Generated Password Display */}
            {generatedPassword && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <Label className="text-green-800 font-medium mb-2 block">Current Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showGeneratedPassword ? 'text' : 'password'}
                    value={generatedPassword}
                    readOnly
                    className="font-mono bg-white"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowGeneratedPassword(!showGeneratedPassword)}
                  >
                    {showGeneratedPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                    className="border-green-300 text-green-600"
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-green-700 mt-2">Share this password securely with the user.</p>
              </div>
            )}

            {/* Generate Random Password */}
            <div className="border border-[#E8D5C4] p-4 rounded-lg">
              <Label className="text-[#4A3728] font-medium mb-2 block">Generate Random Password</Label>
              <Button
                onClick={generatePassword}
                disabled={generatingPassword}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                {generatingPassword ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                Generate Secure Password
              </Button>
            </div>

            {/* Set Custom Password */}
            <div className="border border-[#E8D5C4] p-4 rounded-lg">
              <Label className="text-[#4A3728] font-medium mb-2 block">Set Custom Password</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Enter custom password (min 8 chars)"
                  className="border-[#E8D5C4]"
                />
                <Button
                  onClick={setCustomPasswordForUser}
                  disabled={generatingPassword || !customPassword || customPassword.length < 8}
                  variant="outline"
                  className="border-[#E8D5C4]"
                >
                  Set
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPasswordDialog({ open: false, user: null })} 
              className="border-[#E8D5C4]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
