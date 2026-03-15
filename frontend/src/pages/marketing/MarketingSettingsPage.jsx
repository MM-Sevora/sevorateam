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
  Layers, FolderTree, Monitor, ChevronRight, AlertCircle, Eye, EyeOff,
  CheckCircle, XCircle, Target
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

// Ad Platforms Settings Tab Component
function AdPlatformsSettingsTab() {
  const [settings, setSettings] = useState({
    meta: {
      app_id: '',
      app_secret: '',
      access_token: '',
      ad_account_id: '',
      pixel_id: '',
      enabled: false
    },
    google: {
      client_id: '',
      client_secret: '',
      developer_token: '',
      customer_id: '',
      enabled: false
    }
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState({ meta: false, google: false });
  const [testStatus, setTestStatus] = useState({ meta: null, google: null });

  useEffect(() => {
    fetchAdSettings();
  }, []);

  const fetchAdSettings = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API_URL}/api/marketing/v2/settings/ad-platforms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(prev => ({
            meta: { ...prev.meta, ...data.settings.meta },
            google: { ...prev.google, ...data.settings.google }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch ad settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAdSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API_URL}/api/marketing/v2/settings/ad-platforms`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      });
      if (res.ok) {
        toast.success('Ad platform settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (platform) => {
    setTestStatus(prev => ({ ...prev, [platform]: 'testing' }));
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API_URL}/api/marketing/v2/settings/ad-platforms/test/${platform}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: settings[platform] })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus(prev => ({ ...prev, [platform]: 'success' }));
        toast.success(`${platform === 'meta' ? 'Meta' : 'Google'} connection successful!`);
      } else {
        setTestStatus(prev => ({ ...prev, [platform]: 'error' }));
        toast.error(data.error || 'Connection test failed');
      }
    } catch (error) {
      setTestStatus(prev => ({ ...prev, [platform]: 'error' }));
      toast.error('Connection test failed');
    }
  };

  const maskValue = (value) => {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Meta (Facebook/Instagram) Ads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-600" fill="currentColor">
                <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/>
              </svg>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Meta Ads (Facebook/Instagram)
                {settings.meta.enabled && <Badge className="bg-green-100 text-green-700">Enabled</Badge>}
              </CardTitle>
              <CardDescription>Connect your Meta Business account for ad campaign management</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {testStatus.meta === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {testStatus.meta === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
            <Button variant="outline" size="sm" onClick={() => testConnection('meta')} disabled={testStatus.meta === 'testing'}>
              {testStatus.meta === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Test Connection'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-2">
              <Label>Enable Meta Ads Integration</Label>
            </div>
            <Switch 
              checked={settings.meta.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, meta: { ...prev.meta, enabled: checked } }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>App ID</Label>
              <Input
                value={settings.meta.app_id}
                onChange={(e) => setSettings(prev => ({ ...prev, meta: { ...prev.meta, app_id: e.target.value } }))}
                placeholder="Your Meta App ID"
              />
            </div>
            <div className="space-y-2">
              <Label>App Secret</Label>
              <div className="relative">
                <Input
                  type={showSecrets.meta ? 'text' : 'password'}
                  value={settings.meta.app_secret}
                  onChange={(e) => setSettings(prev => ({ ...prev, meta: { ...prev.meta, app_secret: e.target.value } }))}
                  placeholder="Your Meta App Secret"
                />
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowSecrets(prev => ({ ...prev, meta: !prev.meta }))}
                >
                  {showSecrets.meta ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Access Token (Long-lived)</Label>
            <div className="relative">
              <Input
                type={showSecrets.meta ? 'text' : 'password'}
                value={settings.meta.access_token}
                onChange={(e) => setSettings(prev => ({ ...prev, meta: { ...prev.meta, access_token: e.target.value } }))}
                placeholder="Your long-lived access token"
              />
            </div>
            <p className="text-xs text-gray-500">Get this from the Meta Business Suite → Business Settings → System Users</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ad Account ID</Label>
              <Input
                value={settings.meta.ad_account_id}
                onChange={(e) => setSettings(prev => ({ ...prev, meta: { ...prev.meta, ad_account_id: e.target.value } }))}
                placeholder="act_1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Pixel ID (optional)</Label>
              <Input
                value={settings.meta.pixel_id}
                onChange={(e) => setSettings(prev => ({ ...prev, meta: { ...prev.meta, pixel_id: e.target.value } }))}
                placeholder="1234567890"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Setup Guide:</strong> Go to{' '}
              <a href="https://business.facebook.com/settings" target="_blank" rel="noopener noreferrer" className="underline">
                Meta Business Settings
              </a>
              {' '}→ System Users → Generate Token with ads_management, ads_read permissions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Ads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-600" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Google Ads
                {settings.google.enabled && <Badge className="bg-green-100 text-green-700">Enabled</Badge>}
              </CardTitle>
              <CardDescription>Connect your Google Ads account for campaign management</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {testStatus.google === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {testStatus.google === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
            <Button variant="outline" size="sm" onClick={() => testConnection('google')} disabled={testStatus.google === 'testing'}>
              {testStatus.google === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Test Connection'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-2">
              <Label>Enable Google Ads Integration</Label>
            </div>
            <Switch 
              checked={settings.google.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, google: { ...prev.google, enabled: checked } }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OAuth Client ID</Label>
              <Input
                value={settings.google.client_id}
                onChange={(e) => setSettings(prev => ({ ...prev, google: { ...prev.google, client_id: e.target.value } }))}
                placeholder="Your OAuth Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label>OAuth Client Secret</Label>
              <div className="relative">
                <Input
                  type={showSecrets.google ? 'text' : 'password'}
                  value={settings.google.client_secret}
                  onChange={(e) => setSettings(prev => ({ ...prev, google: { ...prev.google, client_secret: e.target.value } }))}
                  placeholder="Your OAuth Client Secret"
                />
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowSecrets(prev => ({ ...prev, google: !prev.google }))}
                >
                  {showSecrets.google ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Developer Token</Label>
              <div className="relative">
                <Input
                  type={showSecrets.google ? 'text' : 'password'}
                  value={settings.google.developer_token}
                  onChange={(e) => setSettings(prev => ({ ...prev, google: { ...prev.google, developer_token: e.target.value } }))}
                  placeholder="Your Developer Token"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Customer ID (MCC or Account)</Label>
              <Input
                value={settings.google.customer_id}
                onChange={(e) => setSettings(prev => ({ ...prev, google: { ...prev.google, customer_id: e.target.value } }))}
                placeholder="123-456-7890"
              />
            </div>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Setup Guide:</strong> Go to{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">
                Google Cloud Console
              </a>
              {' '}→ Create OAuth 2.0 credentials. Apply for Google Ads API access at{' '}
              <a href="https://ads.google.com/aw/apicenter" target="_blank" rel="noopener noreferrer" className="underline">
                API Center
              </a>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveAdSettings} disabled={saving} size="lg">
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save All Ad Platform Settings
        </Button>
      </div>
    </div>
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
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
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
          <TabsTrigger value="ad-platforms" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Ad Platforms
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

        {/* Ad Platforms Settings Tab */}
        <TabsContent value="ad-platforms" className="space-y-4">
          <AdPlatformsSettingsTab />
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
