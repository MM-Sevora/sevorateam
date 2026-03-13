import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus, Search, Package, Users, Key, ExternalLink, Edit, Trash2,
  UserPlus, X, ChevronDown, ChevronUp
} from 'lucide-react';

const CATEGORIES = [
  'Marketing', 'Design', 'Development', 'Finance', 'HR', 'Sales', 
  'Operations', 'Communication', 'Analytics', 'Security', 'Other'
];

const ACCESS_LEVELS = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-700' },
  { value: 'editor', label: 'Editor', color: 'bg-blue-100 text-blue-700' },
  { value: 'viewer', label: 'Viewer', color: 'bg-green-100 text-green-700' }
];

const ToolsAndAccess = () => {
  const { api } = useAuth();
  const [tools, setTools] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTool, setExpandedTool] = useState(null);
  
  // Tool Dialog
  const [showToolDialog, setShowToolDialog] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [toolForm, setToolForm] = useState({ name: '', url: '', category: 'Other', description: '' });
  
  // Access Dialog
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [accessToolId, setAccessToolId] = useState(null);
  const [accessForm, setAccessForm] = useState({ user_id: '', access_level: 'viewer' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [toolsRes, usersRes] = await Promise.all([
        api.get('/acms/tools?limit=100'),
        api.get('/admin/users?limit=200')
      ]);
      setTools(toolsRes.data.tools || []);
      const allUsers = usersRes.data.users || [];
      setUsers(allUsers.filter(u => u.status === 'active'));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchToolAccess = async (toolId) => {
    try {
      const res = await api.get(`/acms/access?tool_id=${toolId}&limit=100`);
      return res.data.access_records || [];
    } catch (error) {
      return [];
    }
  };

  const handleToolSubmit = async () => {
    if (!toolForm.name) { toast.error('Name is required'); return; }
    try {
      if (editingTool) {
        await api.put(`/acms/tools/${editingTool.id}`, toolForm);
        toast.success('Tool updated');
      } else {
        await api.post('/acms/tools', toolForm);
        toast.success('Tool added');
      }
      setShowToolDialog(false);
      setToolForm({ name: '', url: '', category: 'Other', description: '' });
      setEditingTool(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save tool');
    }
  };

  const handleDeleteTool = async (tool) => {
    if (!confirm(`Delete "${tool.name}"?`)) return;
    try {
      await api.delete(`/acms/tools/${tool.id}`);
      toast.success('Tool deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleGrantAccess = async () => {
    if (!accessForm.user_id) { toast.error('Select a user'); return; }
    try {
      await api.post('/acms/access', {
        tool_id: accessToolId,
        user_id: accessForm.user_id,
        access_level: accessForm.access_level
      });
      toast.success('Access granted');
      setShowAccessDialog(false);
      setAccessForm({ user_id: '', access_level: 'viewer' });
      // Refresh expanded tool's access
      if (expandedTool === accessToolId) {
        const access = await fetchToolAccess(accessToolId);
        setTools(prev => prev.map(t => t.id === accessToolId ? { ...t, _access: access } : t));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to grant access');
    }
  };

  const handleRevokeAccess = async (accessId, userName) => {
    if (!confirm(`Revoke access for ${userName}?`)) return;
    try {
      await api.delete(`/acms/access/${accessId}`);
      toast.success('Access revoked');
      if (expandedTool) {
        const access = await fetchToolAccess(expandedTool);
        setTools(prev => prev.map(t => t.id === expandedTool ? { ...t, _access: access } : t));
      }
    } catch (error) {
      toast.error('Failed to revoke access');
    }
  };

  const toggleExpand = async (toolId) => {
    if (expandedTool === toolId) {
      setExpandedTool(null);
    } else {
      const access = await fetchToolAccess(toolId);
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, _access: access } : t));
      setExpandedTool(toolId);
    }
  };

  const filteredTools = tools.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditTool = (tool) => {
    setEditingTool(tool);
    setToolForm({ name: tool.name, url: tool.url || '', category: tool.category || 'Other', description: tool.description || '' });
    setShowToolDialog(true);
  };

  const openGrantAccess = (toolId) => {
    setAccessToolId(toolId);
    setAccessForm({ user_id: '', access_level: 'viewer' });
    setShowAccessDialog(true);
  };

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="tools-and-access">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Tools & Access</h1>
          <p className="text-[#8B7355]">Manage organization tools and user access</p>
        </div>
        <Button onClick={() => { setEditingTool(null); setToolForm({ name: '', url: '', category: 'Other', description: '' }); setShowToolDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Tool
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{tools.length}</p>
            <p className="text-xs text-[#8B7355]">Total Tools</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-600">{users.length}</p>
            <p className="text-xs text-[#8B7355]">Users</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Key className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{tools.reduce((sum, t) => sum + (t.user_count || 0), 0)}</p>
            <p className="text-xs text-[#8B7355]">Access Grants</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
            <Input 
              placeholder="Search tools..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 bg-white border-[#D4BBA6]" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Tools List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-[#8B7355]">Loading...</div>
        ) : filteredTools.length === 0 ? (
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-8 text-center text-[#8B7355]">
              <Package className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
              <p>No tools found. Add your first tool to get started.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTools.map(tool => (
            <Card key={tool.id} className="bg-white border-[#E8D5C4]">
              <CardContent className="p-4">
                {/* Tool Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleExpand(tool.id)}>
                    <div className="w-10 h-10 bg-[#F5EDE5] rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#4A3728]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#4A3728]">{tool.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-[#8B7355]">
                        <Badge variant="outline" className="text-xs">{tool.category || 'Other'}</Badge>
                        <span><Users className="w-3 h-3 inline mr-1" />{tool.user_count || 0} users</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tool.url && (
                      <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openGrantAccess(tool.id)} title="Grant Access">
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditTool(tool)}>
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteTool(tool)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(tool.id)}>
                      {expandedTool === tool.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Access List */}
                {expandedTool === tool.id && (
                  <div className="mt-4 pt-4 border-t border-[#E8D5C4]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-[#4A3728]">User Access</h4>
                      <Button size="sm" variant="outline" onClick={() => openGrantAccess(tool.id)} className="text-xs border-[#D4BBA6]">
                        <UserPlus className="w-3 h-3 mr-1" /> Add User
                      </Button>
                    </div>
                    {tool._access?.length > 0 ? (
                      <div className="space-y-2">
                        {tool._access.map(access => (
                          <div key={access.id} className="flex items-center justify-between p-2 bg-[#F5EDE5] rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-[#D4BBA6] rounded-full flex items-center justify-center text-white text-xs">
                                {access.user_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#4A3728]">{access.user_name}</p>
                                <Badge className={ACCESS_LEVELS.find(l => l.value === access.access_level)?.color || 'bg-gray-100'}>
                                  {access.access_level}
                                </Badge>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleRevokeAccess(access.id, access.user_name)}>
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#8B7355] text-center py-4">No users have access to this tool</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Tool Dialog */}
      <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">{editingTool ? 'Edit Tool' : 'Add Tool'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Name *</Label>
              <Input value={toolForm.name} onChange={(e) => setToolForm(f => ({ ...f, name: e.target.value }))} className="bg-white border-[#D4BBA6]" placeholder="e.g., Figma, Slack" />
            </div>
            <div>
              <Label className="text-[#4A3728]">URL</Label>
              <Input value={toolForm.url} onChange={(e) => setToolForm(f => ({ ...f, url: e.target.value }))} className="bg-white border-[#D4BBA6]" placeholder="https://..." />
            </div>
            <div>
              <Label className="text-[#4A3728]">Category</Label>
              <Select value={toolForm.category} onValueChange={(v) => setToolForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea value={toolForm.description} onChange={(e) => setToolForm(f => ({ ...f, description: e.target.value }))} className="bg-white border-[#D4BBA6]" placeholder="Brief description..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowToolDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleToolSubmit} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">{editingTool ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Grant Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">User *</Label>
              <Select value={accessForm.user_id || "placeholder"} onValueChange={(v) => setAccessForm(f => ({ ...f, user_id: v === "placeholder" ? "" : v }))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select user</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#4A3728]">Access Level</Label>
              <Select value={accessForm.access_level} onValueChange={(v) => setAccessForm(f => ({ ...f, access_level: v }))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccessDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleGrantAccess} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              <Key className="w-4 h-4 mr-2" /> Grant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToolsAndAccess;
