import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import {
  Settings, Plus, Edit2, Trash2, RefreshCw, Save, GripVertical,
  FileText, Package, Share2, Video, Megaphone, Globe, Mail, Printer,
  Layers, FolderTree, Monitor, ChevronRight, AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ICON_MAP = {
  FileText, Package, Share2, Video, Megaphone, Globe, Mail, Printer
};

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-700' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-700' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-100 text-pink-700' },
  { value: 'red', label: 'Red', class: 'bg-red-100 text-red-700' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-700' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-700' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-100 text-teal-700' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-100 text-gray-700' },
];

const PLATFORM_TYPES = [
  { value: 'website', label: 'Website' },
  { value: 'social', label: 'Social Media' },
  { value: 'email', label: 'Email' },
  { value: 'ads', label: 'Advertising' },
  { value: 'print', label: 'Print / Offline' },
];

// Email Settings Tab Component
function EmailSettingsTab() {
  const [emailSettings, setEmailSettings] = useState({
    fromName: 'Sevora Marketing Team',
    fromEmail: 'marketing@sevora.com',
    replyTo: 'marketing@sevora.com',
    subjectPrefix: '[Sevora] ',
    signature: 'Best regards,\nSevora Marketing Team'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmailSettings();
  }, []);

  const fetchEmailSettings = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API_URL}/api/marketing/v2/settings/email`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.email) {
          setEmailSettings(data.email);
        }
      }
    } catch (error) {
      console.error('Failed to fetch email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEmailSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API_URL}/api/marketing/v2/settings/email`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: emailSettings })
      });
      if (res.ok) {
        toast.success('Email settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>Default settings for influencer and publication outreach emails</CardDescription>
        </div>
        <Button onClick={saveEmailSettings} disabled={saving}>
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>From Name</Label>
            <Input
              value={emailSettings.fromName}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
              placeholder="Sevora Marketing Team"
            />
          </div>
          <div className="space-y-2">
            <Label>From Email</Label>
            <Input
              type="email"
              value={emailSettings.fromEmail}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
              placeholder="marketing@sevora.com"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Reply-To Email</Label>
            <Input
              type="email"
              value={emailSettings.replyTo}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, replyTo: e.target.value }))}
              placeholder="marketing@sevora.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Subject Prefix</Label>
            <Input
              value={emailSettings.subjectPrefix}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, subjectPrefix: e.target.value }))}
              placeholder="[Sevora] "
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Default Email Signature</Label>
          <textarea
            className="w-full h-24 p-3 border rounded-md text-sm"
            value={emailSettings.signature}
            onChange={(e) => setEmailSettings(prev => ({ ...prev, signature: e.target.value }))}
            placeholder="Best regards,&#10;Sevora Marketing Team"
          />
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> These settings apply to outreach emails sent to influencers and publications. 
            Make sure your email domain is verified with SendGrid for successful delivery.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    project_types: [],
    content_categories: [],
    content_subtypes: [],
    mediums: []
  });
  const [activeTab, setActiveTab] = useState('project-types');

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState(''); // project-type, category, subtype, medium
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/config/all?include_inactive=true`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const openAddDialog = (type) => {
    setDialogType(type);
    setEditingItem(null);
    setFormData(getDefaultFormData(type));
    setShowDialog(true);
  };

  const openEditDialog = (type, item) => {
    setDialogType(type);
    setEditingItem(item);
    setFormData({ ...item });
    setShowDialog(true);
  };

  const getDefaultFormData = (type) => {
    switch (type) {
      case 'project-type':
        return { name: '', slug: '', description: '', sort_order: 0 };
      case 'category':
        return { name: '', slug: '', description: '', icon: 'FileText', color: 'blue', sort_order: 0 };
      case 'subtype':
        return { name: '', slug: '', category_id: '', description: '', sort_order: 0 };
      case 'medium':
        return { name: '', slug: '', description: '', platform_type: 'social', sort_order: 0 };
      default:
        return {};
    }
  };

  const getEndpoint = (type) => {
    switch (type) {
      case 'project-type': return 'project-types';
      case 'category': return 'content-categories';
      case 'subtype': return 'content-subtypes';
      case 'medium': return 'mediums';
      default: return '';
    }
  };

  const handleSave = async () => {
    const endpoint = getEndpoint(dialogType);
    const url = editingItem 
      ? `${API_URL}/api/marketing/v3/config/${endpoint}/${editingItem.id}`
      : `${API_URL}/api/marketing/v3/config/${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingItem ? 'Updated successfully' : 'Created successfully');
        setShowDialog(false);
        fetchConfig();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (type, item) => {
    if (!window.confirm(`Deactivate "${item.name}"?`)) return;

    const endpoint = getEndpoint(type);
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/config/${endpoint}/${item.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Deactivated');
        fetchConfig();
      }
    } catch (error) {
      toast.error('Failed to deactivate');
    }
  };

  const handleToggleActive = async (type, item) => {
    const endpoint = getEndpoint(type);
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/config/${endpoint}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active })
      });

      if (response.ok) {
        toast.success(item.is_active ? 'Deactivated' : 'Activated');
        fetchConfig();
      }
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  };

  return (
    <div className="p-6 space-y-6" data-testid="marketing-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Marketing Settings
          </h1>
          <p className="text-gray-500">Configure dropdown options for Content Production</p>
        </div>
        <Button variant="outline" onClick={fetchConfig} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Configuration Guide</p>
              <p className="text-sm text-blue-700 mt-1">
                These settings define the dropdown options available in Content Production:
              </p>
              <ul className="text-sm text-blue-600 mt-2 space-y-1">
                <li><strong>Project Types (HOW)</strong> - Production workflow type (e.g., Original Production, Editing)</li>
                <li><strong>Content Categories (WHAT)</strong> - Type of content being created (e.g., Written, Product, Social)</li>
                <li><strong>Content Sub-Types</strong> - Specific content format within a category (e.g., Blog Article, Product Video)</li>
                <li><strong>Mediums (WHERE)</strong> - Publishing channel (e.g., Website, Instagram, Email)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="project-types" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Project Types
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="subtypes" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Sub-Types
          </TabsTrigger>
          <TabsTrigger value="mediums" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Mediums
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
        </TabsList>

        {/* Project Types Tab */}
        <TabsContent value="project-types" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project Types (HOW)</CardTitle>
                <CardDescription>Define how content is produced</CardDescription>
              </div>
              <Button onClick={() => openAddDialog('project-type')} data-testid="add-project-type">
                <Plus className="w-4 h-4 mr-2" />
                Add Type
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {config.project_types.map((type, idx) => (
                  <div 
                    key={type.id} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${!type.is_active ? 'opacity-50 bg-gray-50' : 'bg-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-gray-500">{type.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog('project-type', type)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive('project-type', type)}>
                        <Switch checked={type.is_active} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Content Categories (WHAT)</CardTitle>
                <CardDescription>Define types of content</CardDescription>
              </div>
              <Button onClick={() => openAddDialog('category')} data-testid="add-category">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {config.content_categories.map((cat) => {
                  const subtypeCount = config.content_subtypes.filter(s => s.category_id === cat.id).length;
                  const IconComponent = ICON_MAP[cat.icon] || FileText;
                  const colorClass = COLOR_OPTIONS.find(c => c.value === cat.color)?.class || 'bg-gray-100 text-gray-700';
                  
                  return (
                    <div 
                      key={cat.id} 
                      className={`flex items-center justify-between p-3 border rounded-lg ${!cat.is_active ? 'opacity-50 bg-gray-50' : 'bg-white'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${colorClass}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          <p className="text-sm text-gray-500">{subtypeCount} sub-types</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={cat.is_active ? "default" : "secondary"}>
                          {cat.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog('category', cat)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive('category', cat)}>
                          <Switch checked={cat.is_active} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sub-Types Tab */}
        <TabsContent value="subtypes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Content Sub-Types</CardTitle>
                <CardDescription>Specific content formats within categories</CardDescription>
              </div>
              <Button onClick={() => openAddDialog('subtype')} data-testid="add-subtype">
                <Plus className="w-4 h-4 mr-2" />
                Add Sub-Type
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.content_categories.filter(c => c.is_active).map((cat) => {
                  const subtypes = config.content_subtypes.filter(s => s.category_id === cat.id);
                  if (subtypes.length === 0) return null;
                  
                  return (
                    <div key={cat.id}>
                      <h4 className="font-medium text-sm text-gray-500 mb-2 flex items-center gap-2">
                        <ChevronRight className="w-4 h-4" />
                        {cat.name}
                      </h4>
                      <div className="space-y-1 ml-6">
                        {subtypes.map((sub) => (
                          <div 
                            key={sub.id} 
                            className={`flex items-center justify-between p-2 border rounded ${!sub.is_active ? 'opacity-50 bg-gray-50' : 'bg-white'}`}
                          >
                            <div>
                              <p className="text-sm font-medium">{sub.name}</p>
                              <p className="text-xs text-gray-400">{sub.slug}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog('subtype', sub)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleActive('subtype', sub)}>
                                <Switch checked={sub.is_active} className="scale-75" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mediums Tab */}
        <TabsContent value="mediums" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mediums (WHERE)</CardTitle>
                <CardDescription>Publishing channels and platforms</CardDescription>
              </div>
              <Button onClick={() => openAddDialog('medium')} data-testid="add-medium">
                <Plus className="w-4 h-4 mr-2" />
                Add Medium
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {config.mediums.map((med) => (
                  <div 
                    key={med.id} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${!med.is_active ? 'opacity-50 bg-gray-50' : 'bg-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-sm text-gray-500">{med.platform_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{med.platform_type}</Badge>
                      <Badge variant={med.is_active ? "default" : "secondary"}>
                        {med.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog('medium', med)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive('medium', med)}>
                        <Switch checked={med.is_active} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings Tab */}
        <TabsContent value="email" className="space-y-4">
          <EmailSettingsTab />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'} {dialogType.replace('-', ' ')}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the details below' : 'Fill in the details to create a new option'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    ...formData, 
                    name,
                    slug: editingItem ? formData.slug : generateSlug(name)
                  });
                }}
                placeholder="e.g., Blog Article"
                data-testid="config-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug (auto-generated)</Label>
              <Input
                value={formData.slug || ''}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                placeholder="blog_article"
                className="font-mono text-sm"
              />
            </div>

            {dialogType === 'subtype' && (
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select 
                  value={formData.category_id || ''} 
                  onValueChange={(v) => setFormData({...formData, category_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.content_categories.filter(c => c.is_active).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialogType === 'category' && (
              <div className="space-y-2">
                <Label>Color</Label>
                <Select 
                  value={formData.color || 'blue'} 
                  onValueChange={(v) => setFormData({...formData, color: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialogType === 'medium' && (
              <div className="space-y-2">
                <Label>Platform Type</Label>
                <Select 
                  value={formData.platform_type || 'social'} 
                  onValueChange={(v) => setFormData({...formData, platform_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_TYPES.map(pt => (
                      <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description..."
              />
            </div>

            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formData.sort_order || 0}
                onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-config-btn">
              <Save className="w-4 h-4 mr-2" />
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
