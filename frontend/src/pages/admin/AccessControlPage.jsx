import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Edit, RefreshCw, Settings, Key, Layers, Users, Search, Save, ExternalLink,
  ChevronDown, ChevronRight, Package
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const AccessControlPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  // Data state
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Permission dialog state
  const [permDialog, setPermDialog] = useState({ open: false, user: null });
  const [permForm, setPermForm] = useState({
    role_ids: [],
    module_access: [],
    sub_module_access: {},
  });
  const [expandedModules, setExpandedModules] = useState([]);
  const [saving, setSaving] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, modulesRes, categoriesRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/access/roles'),
        api.get('/system-modules/'),
        api.get('/module-categories/'),
      ]);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
      setModules(modulesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Open permission dialog for a user
  const openPermDialog = async (user) => {
    try {
      const res = await api.get(`/system-modules/user/${user.id}/access`);
      const userModules = res.data?.modules || [];
      
      setPermForm({
        role_ids: user.custom_role_ids || [],
        module_access: userModules.filter(m => m.has_access).map(m => m.code),
        sub_module_access: user.sub_module_access || {},
      });
      setPermDialog({ open: true, user });
    } catch (error) {
      setPermForm({
        role_ids: user.custom_role_ids || [],
        module_access: user.merged_module_access || [],
        sub_module_access: user.sub_module_access || {},
      });
      setPermDialog({ open: true, user });
    }
  };

  // Toggle role assignment
  const toggleRole = (roleId) => {
    setPermForm(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId]
    }));
  };

  // Toggle module access
  const toggleModule = (moduleCode) => {
    setPermForm(prev => {
      const hasAccess = prev.module_access.includes(moduleCode);
      if (hasAccess) {
        const newSubModules = { ...prev.sub_module_access };
        delete newSubModules[moduleCode];
        return {
          ...prev,
          module_access: prev.module_access.filter(m => m !== moduleCode),
          sub_module_access: newSubModules
        };
      } else {
        const mod = modules.find(m => m.code === moduleCode);
        const allSubModules = mod?.sub_modules?.map(s => s.code) || [];
        return {
          ...prev,
          module_access: [...prev.module_access, moduleCode],
          sub_module_access: {
            ...prev.sub_module_access,
            [moduleCode]: allSubModules
          }
        };
      }
    });
  };

  // Toggle sub-module access
  const toggleSubModule = (moduleCode, subModuleCode) => {
    setPermForm(prev => {
      const currentSubs = prev.sub_module_access[moduleCode] || [];
      const hasSub = currentSubs.includes(subModuleCode);
      
      const newSubs = hasSub
        ? currentSubs.filter(s => s !== subModuleCode)
        : [...currentSubs, subModuleCode];
      
      return {
        ...prev,
        sub_module_access: {
          ...prev.sub_module_access,
          [moduleCode]: newSubs
        }
      };
    });
  };

  // Save user permissions
  const savePermissions = async () => {
    if (!permDialog.user) return;
    setSaving(true);
    try {
      // Update user's roles
      await api.put(`/admin/users/${permDialog.user.id}/roles`, {
        role_ids: permForm.role_ids
      });
      
      // Update user's direct module access
      await api.put(`/system-modules/user/${permDialog.user.id}/access`, {
        granted_modules: permForm.module_access,
        denied_modules: []
      });
      
      toast.success('Permissions updated');
      setPermDialog({ open: false, user: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get role names for a user
  const getUserRoleNames = (user) => {
    const roleIds = user.custom_role_ids || [];
    return roles.filter(r => roleIds.includes(r.id)).map(r => r.name);
  };

  // Get module count for a user
  const getUserModuleCount = (user) => {
    return (user.merged_module_access || []).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7355]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="user-permissions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#8B7355] uppercase tracking-wider">Administration</p>
          <h1 className="text-3xl font-bold text-[#4A3728] flex items-center gap-2">
            <Key className="h-8 w-8" /> User Permissions
          </h1>
          <p className="text-[#5D4A3A] mt-1">Assign roles, modules, and sub-modules to users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/system-modules')} className="border-[#E8D5C4]">
            <Settings className="h-4 w-4 mr-2" /> Manage Roles & Modules
          </Button>
          <Button variant="outline" onClick={fetchData} className="border-[#E8D5C4]">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-[#8B7355] mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{users.length}</p>
            <p className="text-xs text-[#5D4A3A]">Total Users</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{roles.length}</p>
            <p className="text-xs text-[#5D4A3A]">Available Roles</p>
          </CardContent>
        </Card>
        <Card 
          className="border-[#E8D5C4] cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
          onClick={() => navigate('/admin/system-modules')}
        >
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{modules.length}</p>
            <p className="text-xs text-[#5D4A3A] flex items-center justify-center gap-1">
              System Modules <ExternalLink className="h-3 w-3" />
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Layers className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">
              {modules.reduce((acc, m) => acc + (m.sub_modules?.length || 0), 0)}
            </p>
            <p className="text-xs text-[#5D4A3A]">Sub-Modules</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7355]" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border-[#E8D5C4]"
        />
      </div>

      {/* Users Table */}
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-center">Modules</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => {
                const roleNames = getUserRoleNames(user);
                const moduleCount = getUserModuleCount(user);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-[#5D4A3A]">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {roleNames.length > 0 ? (
                          roleNames.slice(0, 2).map(name => (
                            <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">No roles</span>
                        )}
                        {roleNames.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{roleNames.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{moduleCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPermDialog(user)}
                        className="border-[#E8D5C4]"
                      >
                        <Edit className="h-4 w-4 mr-1" /> Permissions
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permission Dialog */}
      <Dialog open={permDialog.open} onOpenChange={(open) => !open && setPermDialog({ open: false, user: null })}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Edit Permissions: {permDialog.user?.name}
            </DialogTitle>
            <DialogDescription>
              Assign roles, modules, and sub-modules to this user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Roles Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" /> Roles ({permForm.role_ids.length} assigned)
              </Label>
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                {roles.map(role => (
                  <label key={role.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                    <Checkbox
                      checked={permForm.role_ids.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <span className="text-sm">{role.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{role.module_access?.length || 0}</Badge>
                  </label>
                ))}
              </div>
            </div>

            {/* Modules & Sub-Modules Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Modules & Sub-Modules ({permForm.module_access.length} modules)
              </Label>
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {categories.map(cat => {
                  const catModules = modules.filter(m => m.category === cat.code);
                  if (catModules.length === 0) return null;
                  
                  return (
                    <div key={cat.code} className="border-b last:border-0">
                      <div className="px-3 py-2 bg-gray-100 text-xs font-semibold text-gray-600">
                        {cat.name}
                      </div>
                      {catModules.map(mod => {
                        const isModuleSelected = permForm.module_access.includes(mod.code);
                        const isExpanded = expandedModules.includes(mod.code);
                        const subModules = mod.sub_modules || [];
                        const selectedSubCount = (permForm.sub_module_access[mod.code] || []).length;
                        
                        return (
                          <Collapsible key={mod.code} open={isExpanded}>
                            <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b last:border-0">
                              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                <Checkbox
                                  checked={isModuleSelected}
                                  onCheckedChange={() => toggleModule(mod.code)}
                                />
                                <span className="font-medium text-sm">{mod.name}</span>
                                {mod.is_default && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Default</Badge>
                                )}
                              </label>
                              {subModules.length > 0 && (
                                <div className="flex items-center gap-2">
                                  {isModuleSelected && (
                                    <span className="text-xs text-gray-500">
                                      {selectedSubCount}/{subModules.length} sub-modules
                                    </span>
                                  )}
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => setExpandedModules(prev =>
                                        prev.includes(mod.code) 
                                          ? prev.filter(c => c !== mod.code)
                                          : [...prev, mod.code]
                                      )}
                                    >
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                              )}
                            </div>
                            {subModules.length > 0 && (
                              <CollapsibleContent>
                                <div className="pl-8 pr-3 py-2 bg-gray-50 space-y-1">
                                  {subModules.map(sub => {
                                    const isSubSelected = (permForm.sub_module_access[mod.code] || []).includes(sub.code);
                                    return (
                                      <label key={sub.code} className="flex items-center gap-2 py-1 cursor-pointer">
                                        <Checkbox
                                          checked={isSubSelected}
                                          onCheckedChange={() => toggleSubModule(mod.code, sub.code)}
                                          disabled={!isModuleSelected}
                                        />
                                        <span className={`text-sm ${!isModuleSelected ? 'text-gray-400' : ''}`}>
                                          {sub.name}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-auto">{sub.path}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            )}
                          </Collapsible>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialog({ open: false, user: null })} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button onClick={savePermissions} disabled={saving} className="bg-[#8B7355] hover:bg-[#6B5344]">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessControlPage;
