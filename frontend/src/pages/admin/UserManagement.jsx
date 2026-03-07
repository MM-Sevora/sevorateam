import React, { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Users, Search, Plus, Edit, Trash2, Shield, ShieldCheck, ShieldOff,
  UserCheck, UserX, MoreVertical, RefreshCw, Filter, Download,
  CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  { id: 'super_admin', name: 'Super Admin', color: 'bg-red-100 text-red-800' },
  { id: 'admin', name: 'Admin', color: 'bg-purple-100 text-purple-800' },
  { id: 'marketing_manager', name: 'Marketing Manager', color: 'bg-amber-100 text-amber-800' },
  { id: 'sales_manager', name: 'Sales Manager', color: 'bg-stone-100 text-stone-800' },
  { id: 'social_manager', name: 'Social Manager', color: 'bg-rose-100 text-rose-800' },
  { id: 'viewer', name: 'Viewer', color: 'bg-gray-100 text-gray-800' },
];

const DEPARTMENTS = [
  { id: 'admin', name: 'Admin' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'sales', name: 'Sales' },
  { id: 'social', name: 'Social' },
];

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  inactive: { label: 'Inactive', color: 'bg-red-100 text-red-800', icon: XCircle },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
};

const UserManagementPage = () => {
  const { api, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Dialog states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer',
    department: 'sales',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/admin/users?';
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      if (roleFilter !== 'all') url += `role=${roleFilter}&`;
      if (departmentFilter !== 'all') url += `department=${departmentFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}`;
      
      const response = await api.get(url);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter, roleFilter, departmentFilter, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Create user
  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/admin/users', formData);
      toast.success('User created successfully');
      setShowAddUser(false);
      setFormData({ name: '', email: '', password: '', role: 'viewer', department: 'sales', status: 'pending' });
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}`, {
        name: formData.name,
        role: formData.role,
        department: formData.department,
        status: formData.status,
      });
      toast.success('User updated successfully');
      setShowEditUser(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  // Activate/Deactivate user
  const handleToggleStatus = async (user, newStatus) => {
    try {
      const endpoint = newStatus === 'active' ? 'activate' : 'deactivate';
      await api.put(`/admin/users/${user.id}/${endpoint}`);
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user status');
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    
    try {
      await api.delete(`/admin/users/${deleteDialog.user.id}`);
      toast.success('User deleted');
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  // Open edit dialog
  const openEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department,
      status: user.status || 'active',
    });
    setShowEditUser(true);
  };

  // Get role badge
  const getRoleBadge = (role) => {
    const roleConfig = ROLES.find(r => r.id === role);
    return roleConfig ? (
      <Badge className={roleConfig.color}>{roleConfig.name}</Badge>
    ) : (
      <Badge variant="outline">{role}</Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '-';
    }
  };

  return (
    <div className="p-8 space-y-6" data-testid="user-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">User Management</h1>
          <p className="text-[#5D4A3A] text-sm">Manage user accounts and access permissions</p>
        </div>
        <Button
          onClick={() => {
            setFormData({ name: '', email: '', password: '', role: 'viewer', department: 'sales', status: 'pending' });
            setShowAddUser(true);
          }}
          className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
          data-testid="add-user-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-[#E8D5C4]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#4A3728]">{stats.total_users}</p>
              <p className="text-xs text-[#5D4A3A]">Total Users</p>
            </CardContent>
          </Card>
          <Card className="border-[#E8D5C4]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.active_users}</p>
              <p className="text-xs text-[#5D4A3A]">Active</p>
            </CardContent>
          </Card>
          <Card className="border-[#E8D5C4]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending_users}</p>
              <p className="text-xs text-[#5D4A3A]">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-[#E8D5C4]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.inactive_users}</p>
              <p className="text-xs text-[#5D4A3A]">Inactive</p>
            </CardContent>
          </Card>
          <Card className="border-[#E8D5C4]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.recent_logins}</p>
              <p className="text-xs text-[#5D4A3A]">Recent Logins</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#5D4A3A]" />
                <Input
                  placeholder="Search by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-[#E8D5C4]"
                  data-testid="user-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] border-[#E8D5C4]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px] border-[#E8D5C4]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map(role => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[140px] border-[#E8D5C4]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchUsers} className="border-[#E8D5C4]">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5EDE5]">
                <TableHead className="text-[#4A3728]">User</TableHead>
                <TableHead className="text-[#4A3728]">Role</TableHead>
                <TableHead className="text-[#4A3728]">Department</TableHead>
                <TableHead className="text-[#4A3728]">Status</TableHead>
                <TableHead className="text-[#4A3728]">Last Login</TableHead>
                <TableHead className="text-[#4A3728] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#4A3728]" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#5D4A3A]">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
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
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <span className="capitalize text-[#5D4A3A]">{user.department}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status || 'active')}</TableCell>
                    <TableCell>
                      <span className="text-sm text-[#5D4A3A]">
                        {formatDate(user.last_login)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          {user.status !== 'active' && (
                            <DropdownMenuItem onClick={() => handleToggleStatus(user, 'active')}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {user.status === 'active' && user.role !== 'super_admin' && (
                            <DropdownMenuItem onClick={() => handleToggleStatus(user, 'inactive')}>
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {currentUser?.role === 'super_admin' && user.role !== 'super_admin' && (
                            <DropdownMenuItem 
                              onClick={() => setDeleteDialog({ open: true, user })}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Add New User</DialogTitle>
            <DialogDescription>Create a new user account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Full Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="border-[#E8D5C4]"
                data-testid="user-name-input"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@sevora.com"
                className="border-[#E8D5C4]"
                data-testid="user-email-input"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Password *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 6 characters"
                className="border-[#E8D5C4]"
                data-testid="user-password-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="border-[#E8D5C4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.filter(r => currentUser?.role === 'super_admin' || r.id !== 'super_admin').map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#4A3728]">Department</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger className="border-[#E8D5C4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[#4A3728]">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={saving}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
              data-testid="save-user-btn"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Edit User</DialogTitle>
            <DialogDescription>Update user details and permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Full Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-[#E8D5C4]"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Email</Label>
              <Input
                value={formData.email}
                disabled
                className="border-[#E8D5C4] bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                  disabled={selectedUser?.role === 'super_admin' && currentUser?.role !== 'super_admin'}
                >
                  <SelectTrigger className="border-[#E8D5C4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.filter(r => currentUser?.role === 'super_admin' || r.id !== 'super_admin').map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#4A3728]">Department</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger className="border-[#E8D5C4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[#4A3728]">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v })}
                disabled={selectedUser?.role === 'super_admin'}
              >
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUser(false)} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={saving}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.user?.name}</strong>? 
              This action cannot be undone.
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
    </div>
  );
};

export default UserManagementPage;
