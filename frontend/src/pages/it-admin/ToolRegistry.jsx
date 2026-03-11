import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { 
  Plus, Search, ExternalLink, Edit, Trash2, Users, AlertTriangle,
  Package, DollarSign, Filter
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'communication', label: 'Communication' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' }
];

const LOGIN_TYPES = [
  { value: 'individual', label: 'Individual Account' },
  { value: 'shared', label: 'Shared Account' },
  { value: 'sso', label: 'SSO / Single Sign-On' },
  { value: 'api_key', label: 'API Key' }
];

const CRITICALITY = [
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' }
];

const ToolRegistry = () => {
  const { api } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    category: 'other',
    department: '',
    login_type: 'individual',
    criticality: 'medium',
    monthly_cost: ''
  });

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowDialog(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTools();
  }, [categoryFilter, criticalityFilter]);

  const fetchTools = async () => {
    try {
      let url = '/acms/tools?limit=100';
      if (categoryFilter) url += `&category=${categoryFilter}`;
      if (criticalityFilter) url += `&criticality=${criticalityFilter}`;
      
      const response = await api.get(url);
      setTools(response.data.tools || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      toast.error('Failed to fetch tools');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        monthly_cost: formData.monthly_cost ? parseFloat(formData.monthly_cost) : null
      };
      
      if (editingTool) {
        await api.put(`/acms/tools/${editingTool.id}`, payload);
        toast.success('Tool updated successfully');
      } else {
        await api.post('/acms/tools', payload);
        toast.success('Tool created successfully');
      }
      
      setShowDialog(false);
      resetForm();
      fetchTools();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save tool');
    }
  };

  const handleEdit = (tool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name || '',
      url: tool.url || '',
      description: tool.description || '',
      category: tool.category || 'other',
      department: tool.department || '',
      login_type: tool.login_type || 'individual',
      criticality: tool.criticality || 'medium',
      monthly_cost: tool.monthly_cost?.toString() || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (tool) => {
    if (!confirm(`Are you sure you want to delete "${tool.name}"?`)) return;
    
    try {
      await api.delete(`/acms/tools/${tool.id}`);
      toast.success('Tool deleted');
      fetchTools();
    } catch (error) {
      toast.error('Failed to delete tool');
    }
  };

  const resetForm = () => {
    setEditingTool(null);
    setFormData({
      name: '',
      url: '',
      description: '',
      category: 'other',
      department: '',
      login_type: 'individual',
      criticality: 'medium',
      monthly_cost: ''
    });
  };

  const filteredTools = tools.filter(tool =>
    tool.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCriticalityBadge = (level) => {
    const crit = CRITICALITY.find(c => c.value === level);
    return crit ? <Badge className={crit.color}>{crit.label}</Badge> : null;
  };

  return (
    <div className="space-y-4 md:space-y-6" data-testid="tool-registry">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tool Registry</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Manage all tools and platforms used in the organization</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} data-testid="add-tool-btn" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Tool
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-tools"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={criticalityFilter || "all"} onValueChange={(v) => setCriticalityFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {CRITICALITY.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredTools.map(tool => (
            <Card key={tool.id} className="hover:shadow-md transition-shadow" data-testid={`tool-card-${tool.id}`}>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">{tool.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{tool.category}</p>
                    </div>
                  </div>
                  {getCriticalityBadge(tool.criticality)}
                </div>
                
                {tool.description && (
                  <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 line-clamp-2">{tool.description}</p>
                )}
                
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3">
                  <Badge variant="outline" className="text-xs">
                    {LOGIN_TYPES.find(t => t.value === tool.login_type)?.label || tool.login_type}
                  </Badge>
                  {tool.monthly_cost > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <DollarSign className="w-3 h-3 mr-0.5" />
                      {tool.monthly_cost}/mo
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-0.5" />
                    {tool.user_count || 0}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between pt-2 md:pt-3 border-t">
                  {tool.url && (
                    <a 
                      href={tool.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                  )}
                  <div className="flex gap-1 md:gap-2 ml-auto">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(tool)} className="h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(tool)} className="h-8 w-8 p-0">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredTools.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No tools found. Add your first tool to get started.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTool ? 'Edit Tool' : 'Add New Tool'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Tool Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="e.g., Figma, Slack"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="login_type">Login Type</Label>
                <Select value={formData.login_type} onValueChange={(v) => setFormData({...formData, login_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOGIN_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="criticality">Criticality</Label>
                <Select value={formData.criticality} onValueChange={(v) => setFormData({...formData, criticality: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITICALITY.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="monthly_cost">Monthly Cost ($)</Label>
                <Input
                  id="monthly_cost"
                  type="number"
                  step="0.01"
                  value={formData.monthly_cost}
                  onChange={(e) => setFormData({...formData, monthly_cost: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the tool..."
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTool ? 'Update Tool' : 'Add Tool'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToolRegistry;
