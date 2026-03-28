import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription 
} from '../../components/ui/sheet';
import { 
  Plus, Trash2, Edit, RefreshCw, CheckCircle, Settings, 
  Users, Building2, User, Shield, ChevronDown, ChevronUp,
  GripVertical, AlertCircle, Layers
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

const APPROVAL_TYPES = [
  { value: 'expense_claim', label: 'Expense Claim' },
  { value: 'leave_request', label: 'Leave Request' },
  { value: 'purchase_requisition', label: 'Purchase Requisition' },
  { value: 'travel_request', label: 'Travel Request' },
  { value: 'vendor_payment', label: 'Vendor Payment' },
  { value: 'budget_request', label: 'Budget Request' },
  { value: 'content_approval', label: 'Content Approval' },
  { value: 'custom', label: 'Custom' },
];

const APPROVER_TYPES = [
  { value: 'reporting_manager', label: 'Reporting Manager', icon: User, description: "Requester's direct manager" },
  { value: 'department_head', label: 'Department Head', icon: Building2, description: "Head of requester's department" },
  { value: 'specific_user', label: 'Specific User', icon: User, description: 'A specific named user' },
  { value: 'role', label: 'Role-based', icon: Shield, description: 'Anyone with a specific role' },
];

const DEFAULT_LEVEL = {
  level: 1,
  name: '',
  approver_type: 'reporting_manager',
  approver_id: null,
  approver_role: null,
  is_required: true,
  can_skip_if_same_as_previous: true,
  timeout_hours: 48,
};

export default function ApprovalWorkflowsAdmin() {
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Sheet state for create/edit
  const [showSheet, setShowSheet] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    approval_type: 'expense_claim',
    is_active: true,
    is_default: false,
    min_amount: null,
    max_amount: null,
    department_ids: [],
    levels: [{ ...DEFAULT_LEVEL }],
    require_all_levels: true,
    notify_on_action: true,
  });
  
  const [deleteDialog, setDeleteDialog] = useState({ open: false, workflow: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workflowsRes, usersRes, rolesRes, deptsRes] = await Promise.all([
        api.get('/approvals/workflows'),
        api.get('/admin/users'),
        api.get('/rbac/roles'),
        api.get('/hr/departments'),
      ]);

      // Filter to only show new approval workflow system (has 'levels' field)
      const approvalWorkflows = (workflowsRes.data.workflows || []).filter(w => w.levels);
      setWorkflows(approvalWorkflows);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaults = async () => {
    try {
      const res = await api.post('/approvals/workflows/seed-defaults');
      toast.success(res.data.message);
      fetchData();
    } catch (error) {
      console.error('Failed to seed defaults:', error);
      toast.error('Failed to seed default workflows');
    }
  };

  const openCreateSheet = () => {
    setEditingWorkflow(null);
    setFormData({
      name: '',
      description: '',
      approval_type: 'expense_claim',
      is_active: true,
      is_default: false,
      min_amount: null,
      max_amount: null,
      department_ids: [],
      eligible_department_ids: [],
      eligible_role_ids: [],
      eligible_user_ids: [],
      excluded_user_ids: [],
      levels: [{ ...DEFAULT_LEVEL }],
      require_all_levels: true,
      notify_on_action: true,
    });
    setShowSheet(true);
  };

  const openEditSheet = (workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name || '',
      description: workflow.description || '',
      approval_type: workflow.approval_type || 'expense_claim',
      is_active: workflow.is_active !== false,
      is_default: workflow.is_default || false,
      min_amount: workflow.min_amount || null,
      max_amount: workflow.max_amount || null,
      department_ids: workflow.department_ids || [],
      eligible_department_ids: workflow.eligible_department_ids || [],
      eligible_role_ids: workflow.eligible_role_ids || [],
      eligible_user_ids: workflow.eligible_user_ids || [],
      excluded_user_ids: workflow.excluded_user_ids || [],
      levels: workflow.levels?.length > 0 ? workflow.levels : [{ ...DEFAULT_LEVEL }],
      require_all_levels: workflow.require_all_levels !== false,
      notify_on_action: workflow.notify_on_action !== false,
    });
    setShowSheet(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    if (formData.levels.length === 0) {
      toast.error('At least one approval level is required');
      return;
    }
    for (const level of formData.levels) {
      if (!level.name.trim()) {
        toast.error('All approval levels must have a name');
        return;
      }
    }

    setSaving(true);
    try {
      // Renumber levels
      const levels = formData.levels.map((level, index) => ({
        ...level,
        level: index + 1,
      }));

      const payload = {
        ...formData,
        levels,
        min_amount: formData.min_amount ? parseFloat(formData.min_amount) : null,
        max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
      };

      if (editingWorkflow) {
        await api.put(`/approvals/workflows/${editingWorkflow.id}`, payload);
        toast.success('Workflow updated successfully');
      } else {
        await api.post('/approvals/workflows', payload);
        toast.success('Workflow created successfully');
      }
      
      setShowSheet(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error(error.response?.data?.detail || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.workflow) return;
    
    try {
      await api.delete(`/approvals/workflows/${deleteDialog.workflow.id}`);
      toast.success('Workflow deleted');
      setDeleteDialog({ open: false, workflow: null });
      fetchData();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete workflow');
    }
  };

  const addLevel = () => {
    setFormData(prev => ({
      ...prev,
      levels: [
        ...prev.levels,
        { ...DEFAULT_LEVEL, level: prev.levels.length + 1, name: `Level ${prev.levels.length + 1} Approval` }
      ]
    }));
  };

  const removeLevel = (index) => {
    if (formData.levels.length <= 1) {
      toast.error('At least one approval level is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      levels: prev.levels.filter((_, i) => i !== index)
    }));
  };

  const updateLevel = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      levels: prev.levels.map((level, i) => 
        i === index ? { ...level, [field]: value } : level
      )
    }));
  };

  const moveLevel = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= formData.levels.length) return;
    
    const newLevels = [...formData.levels];
    [newLevels[index], newLevels[newIndex]] = [newLevels[newIndex], newLevels[index]];
    setFormData(prev => ({ ...prev, levels: newLevels }));
  };

  const getApprovalTypeLabel = (type) => {
    return APPROVAL_TYPES.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="approval-workflows-admin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Workflows</h1>
          <p className="text-muted-foreground">Configure approval chains for different request types</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={seedDefaults} variant="outline" size="sm">
            <Layers className="h-4 w-4 mr-2" />
            Seed Defaults
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreateSheet} data-testid="create-workflow-btn">
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
                <p className="text-2xl font-bold">{workflows.length}</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {workflows.filter(w => w.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Default Workflows</p>
                <p className="text-2xl font-bold text-blue-600">
                  {workflows.filter(w => w.is_default).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approval Types</p>
                <p className="text-2xl font-bold">
                  {new Set(workflows.map(w => w.approval_type)).size}
                </p>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      {workflows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Approval Workflows</h3>
            <p className="text-muted-foreground mb-4">
              Create your first workflow or seed the default templates
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={seedDefaults} variant="outline">
                <Layers className="h-4 w-4 mr-2" />
                Seed Defaults
              </Button>
              <Button onClick={openCreateSheet}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <Card 
              key={workflow.id} 
              className={`${!workflow.is_active ? 'opacity-60' : ''}`}
              data-testid={`workflow-card-${workflow.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{workflow.name}</h3>
                      <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {workflow.is_default && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Default
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {workflow.description || 'No description'}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Type:</span>
                        <Badge variant="outline">{getApprovalTypeLabel(workflow.approval_type)}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Levels:</span>
                        <span className="font-medium">{workflow.levels?.length || 0}</span>
                      </div>
                      {workflow.min_amount && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Min Amount:</span>
                          <span className="font-medium">₹{workflow.min_amount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Approval Chain Preview */}
                    {workflow.levels && workflow.levels.length > 0 && (
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        {workflow.levels.map((level, index) => (
                          <React.Fragment key={index}>
                            <div className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm">
                              {level.approver_type === 'reporting_manager' && <User className="h-3 w-3" />}
                              {level.approver_type === 'department_head' && <Building2 className="h-3 w-3" />}
                              {level.approver_type === 'role' && <Shield className="h-3 w-3" />}
                              {level.approver_type === 'specific_user' && <User className="h-3 w-3" />}
                              <span>{level.name}</span>
                            </div>
                            {index < workflow.levels.length - 1 && (
                              <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditSheet(workflow)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteDialog({ open: true, workflow })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}</SheetTitle>
            <SheetDescription>
              Configure the approval chain and settings for this workflow
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Workflow Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Expense Approval"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when this workflow should be used..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Approval Type *</Label>
                  <Select
                    value={formData.approval_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, approval_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPROVAL_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-6 pt-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                    <Label>Default</Label>
                  </div>
                </div>
              </div>

              {/* Amount Conditions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_amount">Min Amount (₹)</Label>
                  <Input
                    id="min_amount"
                    type="number"
                    value={formData.min_amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_amount: e.target.value }))}
                    placeholder="No minimum"
                  />
                </div>
                <div>
                  <Label htmlFor="max_amount">Max Amount (₹)</Label>
                  <Input
                    id="max_amount"
                    type="number"
                    value={formData.max_amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_amount: e.target.value }))}
                    placeholder="No maximum"
                  />
                </div>
              </div>
            </div>

            {/* Approval Levels */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Approval Levels</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLevel}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Level
                </Button>
              </div>

              <div className="space-y-3">
                {formData.levels.map((level, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveLevel(index, -1)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveLevel(index, 1)}
                          disabled={index === formData.levels.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Level Name *</Label>
                            <Input
                              value={level.name}
                              onChange={(e) => updateLevel(index, 'name', e.target.value)}
                              placeholder="e.g., Manager Approval"
                            />
                          </div>
                          <div>
                            <Label>Approver Type</Label>
                            <Select
                              value={level.approver_type}
                              onValueChange={(value) => updateLevel(index, 'approver_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {APPROVER_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2">
                                      <type.icon className="h-4 w-4" />
                                      {type.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Conditional fields based on approver type */}
                        {level.approver_type === 'specific_user' && (
                          <div>
                            <Label>Select User</Label>
                            <Select
                              value={level.approver_id || ''}
                              onValueChange={(value) => updateLevel(index, 'approver_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a user..." />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map(user => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {level.approver_type === 'role' && (
                          <div>
                            <Label>Select Role</Label>
                            <Select
                              value={level.approver_role || ''}
                              onValueChange={(value) => updateLevel(index, 'approver_role', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role..." />
                              </SelectTrigger>
                              <SelectContent>
                                {roles.map(role => (
                                  <SelectItem key={role.code || role.id} value={role.code || role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={level.is_required}
                              onCheckedChange={(checked) => updateLevel(index, 'is_required', checked)}
                            />
                            <Label className="text-sm">Required</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={level.can_skip_if_same_as_previous}
                              onCheckedChange={(checked) => updateLevel(index, 'can_skip_if_same_as_previous', checked)}
                            />
                            <Label className="text-sm">Skip if same as previous</Label>
                          </div>
                        </div>

                        <div className="w-32">
                          <Label>Timeout (hours)</Label>
                          <Input
                            type="number"
                            value={level.timeout_hours || ''}
                            onChange={(e) => updateLevel(index, 'timeout_hours', parseInt(e.target.value) || null)}
                            placeholder="48"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeLevel(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Settings</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.require_all_levels}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_all_levels: checked }))}
                />
                <Label>Require all levels to approve (sequential approval)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.notify_on_action}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_on_action: checked }))}
                />
                <Label>Send notifications on approval actions</Label>
              </div>
            </div>

            {/* Eligibility Restrictions */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label className="text-base font-semibold">Eligibility Restrictions</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to allow all users. Set restrictions to limit who can submit requests using this workflow.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Eligible Departments</Label>
                  <Select
                    value={formData.eligible_department_ids?.[0] || 'all'}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      eligible_department_ids: value === 'all' ? [] : [value]
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only users in selected departments can use this workflow
                  </p>
                </div>

                <div>
                  <Label>Eligible Roles</Label>
                  <Select
                    value={formData.eligible_role_ids?.[0] || 'all'}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      eligible_role_ids: value === 'all' ? [] : [value]
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.code || role.id} value={role.code || role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only users with selected roles can use this workflow
                  </p>
                </div>
              </div>

              <div>
                <Label>Specific Eligible Users (Optional)</Label>
                <Select
                  value={formData.eligible_user_ids?.[0] || 'all'}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    eligible_user_ids: value === 'all' ? [] : [value]
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users (no restriction)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users (No Restriction)</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Restrict to specific users only
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowSheet(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, workflow: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.workflow?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, workflow: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
