import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Package, Settings, Shield, Users, Target, Briefcase, 
  Activity, TrendingUp, Flag, CalendarDays, FolderKanban, ClipboardList,
  ShoppingBag, PenTool, Bell, HelpCircle, Zap, ChevronDown, ChevronRight,
  Edit, Save, X, Tag, Building2, UsersRound, RefreshCw, Check
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
  Target, ShoppingBag, PenTool, Package, Settings, Server, Zap, Bell, HelpCircle
};

const CATEGORY_CONFIG = {
  general: { name: 'General', color: 'bg-green-100 text-green-800 border-green-300', description: 'Everyone gets access' },
  operations: { name: 'Operations', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', description: 'Team-based access' },
  business: { name: 'Business', color: 'bg-orange-100 text-orange-800 border-orange-300', description: 'Department-based access' },
  admin: { name: 'Administration', color: 'bg-red-100 text-red-800 border-red-300', description: 'Admin-only access' },
};

const SystemModulesPage = () => {
  const { api } = useAuth();
  const [modules, setModules] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState([]);
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState({ open: false, module: null });
  const [editForm, setEditForm] = useState({ department: '', team: '', tags: [], is_active: true });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [modulesRes, deptsRes, teamsRes] = await Promise.all([
        api.get('/system-modules/'),
        api.get('/system-modules/config/departments'),
        api.get('/system-modules/config/teams'),
      ]);
      setModules(modulesRes.data || []);
      setDepartments(deptsRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to fetch system modules');
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
      is_active: module.is_active !== false
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
        is_active: editForm.is_active
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
      <div className="grid grid-cols-4 gap-4">
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

      {/* Modules by Category */}
      {Object.entries(CATEGORY_CONFIG).map(([catKey, catConfig]) => {
        const catModules = groupedModules[catKey] || [];
        if (catModules.length === 0) return null;

        return (
          <Card key={catKey}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={catConfig.color}>{catConfig.name}</Badge>
                  <span className="text-sm text-gray-500">{catConfig.description}</span>
                </div>
                <span className="text-sm text-gray-400">{catModules.length} modules</span>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        );
      })}

      {/* Edit Dialog */}
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
    </div>
  );
};

export default SystemModulesPage;
