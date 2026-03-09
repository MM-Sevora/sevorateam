import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  Users, Search, Plus, Edit, Trash2, RefreshCw,
  CheckCircle, XCircle, UserPlus, Key, Eye, EyeOff
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
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
  
  // Form state - simplified for platform access only
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    status: 'active',
    notes: '',
  });
  
  const [saving, setSaving] = useState(false);

  // Stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  // Toggle user status
  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/workos/users/${user.id}`, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
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
      <div className="grid grid-cols-3 gap-4">
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
                <p className="text-sm text-[#5D4A3A]">Active Users</p>
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
                <p className="text-sm text-[#5D4A3A]">Inactive Users</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

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
                <TableHead className="text-[#4A3728]">Created</TableHead>
                <TableHead className="text-[#4A3728]">Last Login</TableHead>
                <TableHead className="text-[#4A3728] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#8B7355]" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#5D4A3A]">
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
                    <TableCell className="text-[#5D4A3A] text-sm">
                      {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-[#5D4A3A] text-sm">
                      {user.last_login ? format(new Date(user.last_login), 'MMM d, yyyy h:mm a') : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
    </div>
  );
};

export default UserManagementPage;
