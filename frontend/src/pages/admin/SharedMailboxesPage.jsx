import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, Plus, Edit2, Trash2, Users, Shield, Building2, 
  Search, Loader2, Check, X, AlertCircle, MoreVertical,
  Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { toast } from 'sonner';
import api from '../../lib/api';

const SharedMailboxesPage = () => {
  const [mailboxes, setMailboxes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMailbox, setEditingMailbox] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    display_name: '',
    description: '',
    allowed_users: [],
    allowed_roles: [],
    allowed_departments: [],
    is_active: true
  });

  const AVAILABLE_ROLES = ['super_admin', 'admin', 'manager', 'marketing', 'sales', 'hr', 'finance', 'employee'];
  const AVAILABLE_DEPARTMENTS = ['Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'IT', 'Support', 'Executive'];

  // Fetch mailboxes
  const fetchMailboxes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/shared-mailboxes');
      setMailboxes(response.data || []);
    } catch (error) {
      console.error('Failed to fetch mailboxes:', error);
      toast.error('Failed to load shared mailboxes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users for assignment
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchMailboxes();
    fetchUsers();
  }, [fetchMailboxes, fetchUsers]);

  // Open create/edit modal
  const openModal = (mailbox = null) => {
    if (mailbox) {
      setEditingMailbox(mailbox);
      setFormData({
        email: mailbox.email,
        display_name: mailbox.display_name,
        description: mailbox.description || '',
        allowed_users: mailbox.allowed_users || [],
        allowed_roles: mailbox.allowed_roles || [],
        allowed_departments: mailbox.allowed_departments || [],
        is_active: mailbox.is_active
      });
    } else {
      setEditingMailbox(null);
      setFormData({
        email: '',
        display_name: '',
        description: '',
        allowed_users: [],
        allowed_roles: [],
        allowed_departments: [],
        is_active: true
      });
    }
    setShowModal(true);
  };

  // Save mailbox
  const handleSave = async () => {
    if (!formData.email || !formData.display_name) {
      toast.error('Email and display name are required');
      return;
    }

    setSaving(true);
    try {
      if (editingMailbox) {
        await api.put(`/shared-mailboxes/${editingMailbox.id}`, {
          display_name: formData.display_name,
          description: formData.description,
          allowed_users: formData.allowed_users,
          allowed_roles: formData.allowed_roles,
          allowed_departments: formData.allowed_departments,
          is_active: formData.is_active
        });
        toast.success('Shared mailbox updated');
      } else {
        await api.post('/shared-mailboxes', formData);
        toast.success('Shared mailbox created');
      }
      setShowModal(false);
      fetchMailboxes();
    } catch (error) {
      console.error('Save failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to save mailbox');
    } finally {
      setSaving(false);
    }
  };

  // Delete mailbox
  const handleDelete = async (id) => {
    try {
      await api.delete(`/shared-mailboxes/${id}`);
      toast.success('Shared mailbox deleted');
      setDeleteConfirm(null);
      fetchMailboxes();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete mailbox');
    }
  };

  // Toggle user in allowed list
  const toggleUser = (userId) => {
    setFormData(prev => ({
      ...prev,
      allowed_users: prev.allowed_users.includes(userId)
        ? prev.allowed_users.filter(id => id !== userId)
        : [...prev.allowed_users, userId]
    }));
  };

  // Toggle role in allowed list
  const toggleRole = (role) => {
    setFormData(prev => ({
      ...prev,
      allowed_roles: prev.allowed_roles.includes(role)
        ? prev.allowed_roles.filter(r => r !== role)
        : [...prev.allowed_roles, role]
    }));
  };

  // Toggle department in allowed list
  const toggleDepartment = (dept) => {
    setFormData(prev => ({
      ...prev,
      allowed_departments: prev.allowed_departments.includes(dept)
        ? prev.allowed_departments.filter(d => d !== dept)
        : [...prev.allowed_departments, dept]
    }));
  };

  // Filter mailboxes
  const filteredMailboxes = mailboxes.filter(mb => 
    mb.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mb.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="shared-mailboxes-page">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-600" />
              Shared Mailboxes
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage shared mailboxes and user access permissions
            </p>
          </div>
          <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700" data-testid="add-mailbox-btn">
            <Plus className="h-4 w-4 mr-2" />
            Add Mailbox
          </Button>
        </div>

        {/* Search & Stats */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search mailboxes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-mailboxes"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchMailboxes}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-green-600 border-green-200">
              {mailboxes.filter(m => m.is_active).length} Active
            </Badge>
            <Badge variant="outline" className="text-gray-500 border-gray-200">
              {mailboxes.filter(m => !m.is_active).length} Inactive
            </Badge>
          </div>
        </div>

        {/* Mailboxes Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredMailboxes.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No shared mailboxes found</p>
                <Button onClick={() => openModal()} variant="link" className="text-blue-600 mt-2">
                  Create your first shared mailbox
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mailbox</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMailboxes.map((mailbox) => (
                    <TableRow key={mailbox.id} data-testid={`mailbox-row-${mailbox.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{mailbox.display_name}</p>
                            <p className="text-sm text-gray-500">{mailbox.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {mailbox.allowed_users?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {mailbox.allowed_users.length} users
                            </Badge>
                          )}
                          {mailbox.allowed_roles?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              {mailbox.allowed_roles.length} roles
                            </Badge>
                          )}
                          {mailbox.allowed_departments?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {mailbox.allowed_departments.length} depts
                            </Badge>
                          )}
                          {!mailbox.allowed_users?.length && !mailbox.allowed_roles?.length && !mailbox.allowed_departments?.length && (
                            <span className="text-xs text-gray-400">No access configured</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={mailbox.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                          {mailbox.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`mailbox-actions-${mailbox.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white">
                            <DropdownMenuItem onClick={() => openModal(mailbox)}>
                              <Edit2 className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteConfirm(mailbox)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                {editingMailbox ? 'Edit Shared Mailbox' : 'Create Shared Mailbox'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="shared@company.com"
                    disabled={!!editingMailbox}
                    data-testid="mailbox-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name *</Label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Marketing Team"
                    data-testid="mailbox-name-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose of this shared mailbox..."
                  rows={2}
                />
              </div>

              {/* Access Control */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Access Control
                </h3>

                {/* Roles */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Allowed Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ROLES.map(role => (
                      <Badge
                        key={role}
                        variant={formData.allowed_roles.includes(role) ? 'default' : 'outline'}
                        className={`cursor-pointer ${formData.allowed_roles.includes(role) ? 'bg-blue-600' : ''}`}
                        onClick={() => toggleRole(role)}
                      >
                        {role.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Departments */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Allowed Departments</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_DEPARTMENTS.map(dept => (
                      <Badge
                        key={dept}
                        variant={formData.allowed_departments.includes(dept) ? 'default' : 'outline'}
                        className={`cursor-pointer ${formData.allowed_departments.includes(dept) ? 'bg-green-600' : ''}`}
                        onClick={() => toggleDepartment(dept)}
                      >
                        {dept}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Individual Users */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Specific Users ({formData.allowed_users.length} selected)</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {users.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">No users available</p>
                    ) : (
                      users.slice(0, 20).map(user => (
                        <div 
                          key={user.id} 
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${formData.allowed_users.includes(user.id) ? 'bg-blue-50' : ''}`}
                          onClick={() => toggleUser(user.id)}
                        >
                          <Checkbox checked={formData.allowed_users.includes(user.id)} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.name || user.email}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is-active" className="text-sm">Active (users can access this mailbox)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="save-mailbox-btn">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                {editingMailbox ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="bg-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Delete Mailbox
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{deleteConfirm?.display_name}</strong>? 
              Users will no longer be able to access this mailbox.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button 
                onClick={() => handleDelete(deleteConfirm?.id)} 
                className="bg-red-600 hover:bg-red-700"
                data-testid="confirm-delete-btn"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SharedMailboxesPage;
