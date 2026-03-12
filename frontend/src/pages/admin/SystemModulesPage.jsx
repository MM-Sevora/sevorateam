import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Package, Settings, Shield, Users, Target, Briefcase, 
  Activity, TrendingUp, Flag, CalendarDays, FolderKanban, ClipboardList,
  ShoppingBag, PenTool, Bell, HelpCircle, Zap, ChevronDown, ChevronRight,
  Edit, Save, X, Tag, Building2, UsersRound, RefreshCw, Check, Plus, Trash2,
  Folder, Palette, GripVertical
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

// Icon mapping
const ICON_MAP = {
  Activity, TrendingUp, Flag, CalendarDays, FolderKanban, ClipboardList,
  Target, ShoppingBag, PenTool, Package, Settings, Server, Zap, Bell, HelpCircle,
  Folder, Shield, Users, Briefcase
};

const COLOR_OPTIONS = [
  { value: 'green', label: 'Green', bg: 'bg-green-500', badge: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'red', label: 'Red', bg: 'bg-red-500', badge: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-500', badge: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'cyan', label: 'Cyan', bg: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-500', badge: 'bg-teal-100 text-teal-800 border-teal-300' },
];

const ACCESS_TYPE_OPTIONS = [
  { value: 'everyone', label: 'Everyone', description: 'All users get access' },
  { value: 'team', label: 'Team-based', description: 'Access based on team assignment' },
  { value: 'department', label: 'Department-based', description: 'Access based on department' },
  { value: 'admin', label: 'Admin-only', description: 'Only administrators' },
];

const SystemModulesPage = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('modules');
  const [modules, setModules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState([]);
  
  // Edit module dialog state
  const [editDialog, setEditDialog] = useState({ open: false, module: null });
  const [editForm, setEditForm] = useState({ department: '', team: '', tags: [], is_active: true, category: 'general', is_default: false });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Category dialog state
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null, mode: 'create' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: 'blue', access_type: 'department' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [modulesRes, categoriesRes, deptsRes, teamsRes] = await Promise.all([
        api.get('/system-modules/'),
        api.get('/module-categories/'),
        api.get('/system-modules/config/departments'),
        api.get('/system-modules/config/teams'),
      ]);
      setModules(modulesRes.data || []);
      setCategories(categoriesRes.data || []);
      setDepartments(deptsRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleModule = (code) => {
    setExpandedModules(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const openEditDialog = (module) => {
    setEditForm({
      department: module.department || '',
      team: module.team || '',
      tags: module.tags || [],
      is_active: module.is_active !== false,
      category: module.category || 'general',
      is_default: module.is_default || false
    });
    setTagInput('');
    setEditDialog({ open: true, module });
  };

  const addTag = () => {
    if (tagInput.trim() && !editForm.tags.includes(tagInput.trim())) {
      setEditForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setEditForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const saveModuleMetadata = async () => {
    if (!editDialog.module) return;
    setSaving(true);
    try {
      await api.put(`/system-modules/${editDialog.module.code}/metadata`, {
        department: editForm.department || null,
        team: editForm.team || null,
        tags: editForm.tags,
        is_active: editForm.is_active,
        category: editForm.category,
        is_default: editForm.is_default
      });
      toast.success(`Module "${editDialog.module.name}" updated`);
      setEditDialog({ open: false, module: null });
      fetchData();
    } catch (error) {
      toast.error('Failed to update module');
    } finally {
      setSaving(false);
    }
  };

  // Category CRUD functions
  const openCreateCategoryDialog = () => {
    setCategoryForm({ name: '', description: '', color: 'blue', access_type: 'department' });
    setCategoryDialog({ open: true, category: null, mode: 'create' });
  };

  const openEditCategoryDialog = (category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color,
      access_type: category.access_type
    });
    setCategoryDialog({ open: true, category, mode: 'edit' });
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);
    try {
      if (categoryDialog.mode === 'create') {
        await api.post('/module-categories/', categoryForm);
        toast.success('Category created');
      } else {
        await api.put(`/module-categories/${categoryDialog.category.id}`, categoryForm);
        toast.success('Category updated');
      }
      setCategoryDialog({ open: false, category: null, mode: 'create' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category) => {
    if (category.is_system) {
      toast.error('System categories cannot be deleted');
      return;
    }
    if (!window.confirm(`Delete category "${category.name}"? This cannot be undone.`)) return;
    
    try {
      await api.delete(`/module-categories/${category.id}`);
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  // Helper to get category config from dynamic categories
  const getCategoryConfig = (code) => {
    const cat = categories.find(c => c.code === code);
    if (cat) {
      const colorOpt = COLOR_OPTIONS.find(c => c.value === cat.color) || COLOR_OPTIONS[0];
      return { name: cat.name, color: colorOpt.badge, description: cat.description };
    }
    return { name: code, color: 'bg-gray-100 text-gray-800 border-gray-300', description: '' };
  };

  // Group modules by category
  const groupedModules = {};
  modules.forEach(mod => {
    const cat = mod.category || 'general';
    if (!groupedModules[cat]) groupedModules[cat] = [];
    groupedModules[cat].push(mod);
  });

  const getIcon = (iconName) => {
    const IconComponent = ICON_MAP[iconName] || Server;
    return <IconComponent className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="system-modules-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Administration</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Server className="h-8 w-8" /> System Modules
          </h1>
          <p className="text-gray-500 mt-1">Manage sidebar modules and their access configuration</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Check className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{modules.filter(m => m.is_default).length}</p>
                <p className="text-sm text-gray-500">Default Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Package className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{modules.length}</p>
                <p className="text-sm text-gray-500">Total Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg"><Folder className="h-5 w-5 text-indigo-600" /></div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-gray-500">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Building2 className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{modules.filter(m => m.department).length}</p>
                <p className="text-sm text-gray-500">With Department</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><Tag className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{modules.filter(m => m.tags?.length > 0).length}</p>
                <p className="text-sm text-gray-500">With Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Modules and Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Modules ({modules.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Folder className="h-4 w-4" /> Categories ({categories.length})
          </TabsTrigger>
        </TabsList>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4 mt-4">
          {categories.map(cat => {
            const catModules = groupedModules[cat.code] || [];
            const colorOpt = COLOR_OPTIONS.find(c => c.value === cat.color) || COLOR_OPTIONS[0];

            return (
              <Card key={cat.code}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={colorOpt.badge}>{cat.name}</Badge>
                      <span className="text-sm text-gray-500">{cat.description}</span>
                    </div>
                    <span className="text-sm text-gray-400">{catModules.length} modules</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {catModules.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No modules in this category</p>
                  ) : (
                    <div className="space-y-2">
                      {catModules.map(mod => (
                  <Collapsible 
                    key={mod.code} 
                    open={expandedModules.includes(mod.code)}
                    onOpenChange={() => toggleModule(mod.code)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            {expandedModules.includes(mod.code) ? 
                              <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            }
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {getIcon(mod.icon)}
                            </div>
                            <div className="text-left">
                              <div className="font-medium flex items-center gap-2">
                                {mod.name}
                                {mod.is_default && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                    Default
                                  </Badge>
                                )}
                                {!mod.is_active && (
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{mod.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {mod.department && (
                              <div className="flex items-center gap-1 text-sm text-purple-600">
                                <Building2 className="h-4 w-4" />
                                {mod.department}
                              </div>
                            )}
                            {mod.team && (
                              <div className="flex items-center gap-1 text-sm text-blue-600">
                                <UsersRound className="h-4 w-4" />
                                {mod.team}
                              </div>
                            )}
                            {mod.tags?.length > 0 && (
                              <div className="flex items-center gap-1">
                                {mod.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                                {mod.tags.length > 2 && (
                                  <span className="text-xs text-gray-400">+{mod.tags.length - 2}</span>
                                )}
                              </div>
                            )}
                            <Badge variant="outline">{mod.sub_modules?.length || 0} sub-modules</Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); openEditDialog(mod); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t bg-gray-50 p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Sub-Modules:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {mod.sub_modules?.map(sub => (
                              <div key={sub.code} className="flex items-center gap-2 text-sm p-2 bg-white rounded border">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span>{sub.name}</span>
                                <span className="text-xs text-gray-400 ml-auto">{sub.path}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openCreateCategoryDialog} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Create Category
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Access Type</TableHead>
                    <TableHead className="text-center">Modules</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(cat => {
                    const colorOpt = COLOR_OPTIONS.find(c => c.value === cat.color) || COLOR_OPTIONS[0];
                    const accessOpt = ACCESS_TYPE_OPTIONS.find(a => a.value === cat.access_type);
                    return (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <div className={`w-4 h-4 rounded ${colorOpt.bg}`}></div>
                        </TableCell>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-gray-500">{cat.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{accessOpt?.label || cat.access_type}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{cat.module_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          {cat.is_system ? (
                            <Badge className="bg-blue-100 text-blue-800">System</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Custom</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditCategoryDialog(cat)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!cat.is_system && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteCategory(cat)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Module Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, module: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configure Module: {editDialog.module?.name}
            </DialogTitle>
            <DialogDescription>
              Assign department, team, and tags to this module
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <Label>Module Active</Label>
              <Switch 
                checked={editForm.is_active} 
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            {/* Default Module Toggle */}
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <Label className="text-green-800">Default Module</Label>
                <p className="text-xs text-green-600">Everyone gets access automatically</p>
              </div>
              <Switch 
                checked={editForm.is_default} 
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_default: checked }))}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={editForm.category} 
                onValueChange={(val) => setEditForm(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => {
                    const colorOpt = COLOR_OPTIONS.find(c => c.value === cat.color) || COLOR_OPTIONS[0];
                    return (
                      <SelectItem key={cat.code} value={cat.code}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${colorOpt.bg}`}></span>
                          {cat.name} - {cat.description}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select 
                value={editForm.department || "_none"} 
                onValueChange={(val) => setEditForm(prev => ({ ...prev, department: val === "_none" ? '' : val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team */}
            <div className="space-y-2">
              <Label>Team</Label>
              <Select 
                value={editForm.team || "_none"} 
                onValueChange={(val) => setEditForm(prev => ({ ...prev, team: val === "_none" ? '' : val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Add a tag..." 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
              </div>
              {editForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editForm.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, module: null })}>
              Cancel
            </Button>
            <Button onClick={saveModuleMetadata} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => !open && setCategoryDialog({ open: false, category: null, mode: 'create' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              {categoryDialog.mode === 'create' ? 'Create Category' : 'Edit Category'}
            </DialogTitle>
            <DialogDescription>
              {categoryDialog.mode === 'create' 
                ? 'Create a new category to organize modules'
                : `Edit ${categoryDialog.category?.name} category`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input 
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Finance, HR, Engineering"
                disabled={categoryDialog.category?.is_system}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category"
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full ${color.bg} ${categoryForm.color === color.value ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`}
                    onClick={() => setCategoryForm(prev => ({ ...prev, color: color.value }))}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Access Type */}
            <div className="space-y-2">
              <Label>Access Type</Label>
              <Select 
                value={categoryForm.access_type}
                onValueChange={(val) => setCategoryForm(prev => ({ ...prev, access_type: val }))}
                disabled={categoryDialog.category?.is_system}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-gray-500">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, category: null, mode: 'create' })}>
              Cancel
            </Button>
            <Button onClick={saveCategory} disabled={saving || !categoryForm.name.trim()}>
              {saving ? 'Saving...' : categoryDialog.mode === 'create' ? 'Create Category' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemModulesPage;
