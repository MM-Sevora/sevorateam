import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, ShieldCheck, ShieldOff, Save, RotateCcw, RefreshCw, 
  Eye, PenLine, Trash2, Plus, Download, ChevronDown, ChevronRight,
  Check, X, AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
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
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const PERMISSION_ACTIONS = [
  { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
  { id: 'create', name: 'Create', icon: Plus, color: 'text-green-600' },
  { id: 'edit', name: 'Edit', icon: PenLine, color: 'text-amber-600' },
  { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
  { id: 'export', name: 'Export', icon: Download, color: 'text-purple-600' },
];

const DEPARTMENT_COLORS = {
  marketing: 'bg-amber-100 text-amber-800 border-amber-300',
  sales: 'bg-stone-100 text-stone-800 border-stone-300',
  social: 'bg-rose-100 text-rose-800 border-rose-300',
  mail: 'bg-blue-100 text-blue-800 border-blue-300',
  admin: 'bg-purple-100 text-purple-800 border-purple-300',
};

const PermissionsPage = () => {
  const { api, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [editedPermissions, setEditedPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState(['marketing', 'sales', 'social', 'mail', 'admin']);
  const [resetDialog, setResetDialog] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/admin/users?status=active');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, [api]);

  // Fetch modules
  const fetchModules = useCallback(async () => {
    try {
      const response = await api.get('/admin/modules');
      setModules(response.data || {});
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    }
  }, [api]);

  // Fetch user permissions
  const fetchUserPermissions = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await api.get(`/admin/users/${userId}/permissions`);
      setUserPermissions(response.data);
      setEditedPermissions(JSON.parse(JSON.stringify(response.data.permissions)));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      toast.error('Failed to fetch user permissions');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchUsers();
    fetchModules();
  }, [fetchUsers, fetchModules]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserPermissions(selectedUserId);
    }
  }, [selectedUserId, fetchUserPermissions]);

  // Toggle permission
  const togglePermission = (dept, module, action) => {
    if (!editedPermissions) return;
    
    const newPerms = { ...editedPermissions };
    if (!newPerms[dept]) newPerms[dept] = {};
    if (!newPerms[dept][module]) newPerms[dept][module] = [];
    
    const modulePerms = [...newPerms[dept][module]];
    const index = modulePerms.indexOf(action);
    
    if (index > -1) {
      modulePerms.splice(index, 1);
    } else {
      modulePerms.push(action);
    }
    
    newPerms[dept][module] = modulePerms;
    setEditedPermissions(newPerms);
    setHasChanges(true);
  };

  // Check if action is enabled
  const isActionEnabled = (dept, module, action) => {
    if (!editedPermissions) return false;
    return editedPermissions[dept]?.[module]?.includes(action) || false;
  };

  // Toggle all actions for a module
  const toggleAllModuleActions = (dept, module, enable) => {
    if (!editedPermissions) return;
    
    const newPerms = { ...editedPermissions };
    if (!newPerms[dept]) newPerms[dept] = {};
    
    if (enable) {
      newPerms[dept][module] = PERMISSION_ACTIONS.map(a => a.id);
    } else {
      newPerms[dept][module] = [];
    }
    
    setEditedPermissions(newPerms);
    setHasChanges(true);
  };

  // Toggle all actions for a department
  const toggleAllDeptActions = (dept, enable) => {
    if (!editedPermissions || !modules[dept]) return;
    
    const newPerms = { ...editedPermissions };
    newPerms[dept] = {};
    
    if (enable) {
      modules[dept].forEach(module => {
        newPerms[dept][module.id] = PERMISSION_ACTIONS.map(a => a.id);
      });
    } else {
      modules[dept].forEach(module => {
        newPerms[dept][module.id] = [];
      });
    }
    
    setEditedPermissions(newPerms);
    setHasChanges(true);
  };

  // Save permissions
  const handleSave = async () => {
    if (!selectedUserId || !editedPermissions) return;
    
    setSaving(true);
    try {
      await api.put(`/admin/users/${selectedUserId}/permissions`, {
        permissions: editedPermissions,
        use_custom: true
      });
      toast.success('Permissions saved successfully');
      setHasChanges(false);
      fetchUserPermissions(selectedUserId);
    } catch (error) {
      console.error('Failed to save permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // Reset to role defaults
  const handleReset = async () => {
    if (!selectedUserId) return;
    
    try {
      await api.delete(`/admin/users/${selectedUserId}/permissions`);
      toast.success('Permissions reset to role defaults');
      fetchUserPermissions(selectedUserId);
    } catch (error) {
      console.error('Failed to reset permissions:', error);
      toast.error('Failed to reset permissions');
    } finally {
      setResetDialog(false);
    }
  };

  // Get selected user
  const selectedUser = users.find(u => u.id === selectedUserId);

  // Count permissions
  const countPermissions = (dept) => {
    if (!editedPermissions || !editedPermissions[dept]) return 0;
    let count = 0;
    Object.values(editedPermissions[dept]).forEach(actions => {
      count += actions.length;
    });
    return count;
  };

  return (
    <div className="p-8 space-y-6" data-testid="permissions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728] flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permission Management
          </h1>
          <p className="text-[#5D4A3A] text-sm">Configure module-level access control for users</p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
              data-testid="save-permissions-btn"
            >
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* User Selection */}
      <Card className="border-[#E8D5C4]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#4A3728]">Select User</CardTitle>
          <CardDescription>Choose a user to view and modify their permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[400px] border-[#E8D5C4]">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.name}</span>
                      <span className="text-xs text-gray-500">({user.email})</span>
                      <Badge variant="outline" className="text-xs">{user.role.replace('_', ' ')}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedUser && userPermissions && (
              <div className="flex items-center gap-2">
                <Badge className={userPermissions.has_custom_permissions ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                  {userPermissions.has_custom_permissions ? (
                    <><ShieldCheck className="h-3 w-3 mr-1" /> Custom Permissions</>
                  ) : (
                    <><Shield className="h-3 w-3 mr-1" /> Role Defaults</>
                  )}
                </Badge>
                {userPermissions.has_custom_permissions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResetDialog(true)}
                    className="border-[#E8D5C4]"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset to Defaults
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      {selectedUserId && (
        <Card className="border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-[#4A3728]">Permission Matrix</CardTitle>
                <CardDescription>Configure access to each module</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#5D4A3A]">
                {PERMISSION_ACTIONS.map(action => (
                  <div key={action.id} className="flex items-center gap-1">
                    <action.icon className={`h-3 w-3 ${action.color}`} />
                    <span>{action.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-[#4A3728]" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(modules).map(([dept, deptModules]) => (
                  <Collapsible
                    key={dept}
                    open={expandedDepts.includes(dept)}
                    onOpenChange={(open) => {
                      if (open) {
                        setExpandedDepts([...expandedDepts, dept]);
                      } else {
                        setExpandedDepts(expandedDepts.filter(d => d !== dept));
                      }
                    }}
                  >
                    <div className={`rounded-lg border ${DEPARTMENT_COLORS[dept] || 'border-gray-200'}`}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            {expandedDepts.includes(dept) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-semibold capitalize">{dept}</span>
                            <Badge variant="outline" className="text-xs">
                              {countPermissions(dept)} permissions
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAllDeptActions(dept, true)}
                              className="h-6 text-xs text-green-600 hover:text-green-700"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAllDeptActions(dept, false)}
                              className="h-6 text-xs text-red-600 hover:text-red-700"
                            >
                              <X className="h-3 w-3 mr-1" />
                              None
                            </Button>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-inherit">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-white/50">
                                <th className="text-left p-2 text-sm font-medium text-[#4A3728]">Module</th>
                                {PERMISSION_ACTIONS.map(action => (
                                  <th key={action.id} className="text-center p-2 w-20">
                                    <div className="flex flex-col items-center">
                                      <action.icon className={`h-4 w-4 ${action.color}`} />
                                    </div>
                                  </th>
                                ))}
                                <th className="w-20"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {deptModules.map((module) => (
                                <tr key={module.id} className="border-t border-inherit hover:bg-white/30">
                                  <td className="p-2">
                                    <div>
                                      <p className="text-sm font-medium text-[#4A3728]">{module.name}</p>
                                      <p className="text-xs text-[#5D4A3A]">{module.description}</p>
                                    </div>
                                  </td>
                                  {PERMISSION_ACTIONS.map(action => (
                                    <td key={action.id} className="text-center p-2">
                                      <Checkbox
                                        checked={isActionEnabled(dept, module.id, action.id)}
                                        onCheckedChange={() => togglePermission(dept, module.id, action.id)}
                                        className="mx-auto"
                                        data-testid={`perm-${dept}-${module.id}-${action.id}`}
                                      />
                                    </td>
                                  ))}
                                  <td className="p-2">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleAllModuleActions(dept, module.id, true)}
                                        className="h-6 w-6 p-0 text-green-600"
                                        title="Enable all"
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleAllModuleActions(dept, module.id, false)}
                                        className="h-6 w-6 p-0 text-red-600"
                                        title="Disable all"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialog} onOpenChange={setResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Permissions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset this user's permissions to their role defaults? 
              This will remove all custom permission settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-amber-600 hover:bg-amber-700">
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PermissionsPage;
