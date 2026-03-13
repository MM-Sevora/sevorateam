import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Globe, Settings, Search, Shield, Bell, Mail, 
  Palette, Clock, Save, RefreshCw, ExternalLink,
  FileText, Image, Lock, Eye, Database, Zap, Plug
} from 'lucide-react';
import TokenStatusPanel from '../../components/TokenStatusPanel';

const WebsiteSettings = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // General Settings
    site_name: 'Sevora Team',
    site_tagline: 'Unified Operations Platform',
    site_description: 'A comprehensive platform for team collaboration and project management.',
    site_url: '',
    admin_email: '',
    support_email: '',
    timezone: 'UTC',
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
    language: 'en',
    
    // SEO Settings
    seo_enabled: true,
    google_crawl_enabled: true,
    robots_txt: 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/',
    meta_keywords: '',
    google_analytics_id: '',
    google_search_console_id: '',
    sitemap_enabled: true,
    canonical_urls: true,
    
    // Security Settings
    two_factor_enabled: false,
    session_timeout: 30,
    password_min_length: 8,
    password_require_special: true,
    password_require_numbers: true,
    login_attempts_limit: 5,
    lockout_duration: 15,
    ip_whitelist_enabled: false,
    ip_whitelist: '',
    
    // Email Settings
    email_notifications_enabled: true,
    email_from_name: 'Sevora Team',
    email_from_address: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: true,
    
    // Appearance Settings
    primary_color: '#4A3728',
    secondary_color: '#8B7355',
    accent_color: '#E8D5C4',
    logo_url: '',
    favicon_url: '',
    dark_mode_enabled: false,
    
    // Performance Settings
    cache_enabled: true,
    cache_duration: 3600,
    compression_enabled: true,
    lazy_loading_enabled: true,
    
    // Maintenance Settings
    maintenance_mode: false,
    maintenance_message: 'We are currently performing scheduled maintenance. Please check back soon.',
    maintenance_end_time: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings/website');
      if (response.data?.settings) {
        setSettings(prev => ({ ...prev, ...response.data.settings }));
      }
    } catch (error) {
      // Use defaults if no settings exist
      console.log('Using default settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/website', { settings });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" data-testid="website-settings-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Website Settings</h1>
          <p className="text-[#5D4A3A] mt-1">Configure your website's general settings, SEO, security, and more.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
          data-testid="save-settings-btn"
        >
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-[#F5EDE5] p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-white">
            <Globe className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-white">
            <Plug className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-white">
            <Search className="w-4 h-4 mr-2" />
            SEO & Crawl
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-white">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-white">
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-white">
            <Zap className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Integrations - Token Status */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[#4A3728] mb-2">Social Media Token Status</h3>
              <p className="text-sm text-gray-600 mb-4">
                Monitor and manage your social media API tokens. Refresh tokens before they expire to maintain service continuity.
              </p>
              <TokenStatusPanel />
            </div>
          </div>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Site Information
                </CardTitle>
                <CardDescription>Basic information about your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#4A3728]">Site Name</Label>
                    <Input
                      value={settings.site_name}
                      onChange={(e) => updateSetting('site_name', e.target.value)}
                      placeholder="My Website"
                      className="mt-1"
                      data-testid="site-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">Tagline</Label>
                    <Input
                      value={settings.site_tagline}
                      onChange={(e) => updateSetting('site_tagline', e.target.value)}
                      placeholder="A brief description"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Site Description</Label>
                  <Textarea
                    value={settings.site_description}
                    onChange={(e) => updateSetting('site_description', e.target.value)}
                    placeholder="Describe your website..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#4A3728]">Site URL</Label>
                    <Input
                      value={settings.site_url}
                      onChange={(e) => updateSetting('site_url', e.target.value)}
                      placeholder="https://example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">Admin Email</Label>
                    <Input
                      type="email"
                      value={settings.admin_email}
                      onChange={(e) => updateSetting('admin_email', e.target.value)}
                      placeholder="admin@example.com"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Regional Settings
                </CardTitle>
                <CardDescription>Timezone and format preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-[#4A3728]">Timezone</Label>
                    <Select value={settings.timezone} onValueChange={(v) => updateSetting('timezone', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time (US)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (US)</SelectItem>
                        <SelectItem value="Europe/London">London (UK)</SelectItem>
                        <SelectItem value="Europe/Paris">Paris (EU)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo (Japan)</SelectItem>
                        <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                        <SelectItem value="Australia/Sydney">Sydney (Australia)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">Date Format</Label>
                    <Select value={settings.date_format} onValueChange={(v) => updateSetting('date_format', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YYYY-MM-DD">2024-12-31</SelectItem>
                        <SelectItem value="DD/MM/YYYY">31/12/2024</SelectItem>
                        <SelectItem value="MM/DD/YYYY">12/31/2024</SelectItem>
                        <SelectItem value="DD-MM-YYYY">31-12-2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">Time Format</Label>
                    <Select value={settings.time_format} onValueChange={(v) => updateSetting('time_format', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24-hour (14:30)</SelectItem>
                        <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Maintenance Mode
                </CardTitle>
                <CardDescription>Take your site offline for maintenance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <p className="font-medium text-amber-800">Maintenance Mode</p>
                    <p className="text-sm text-amber-600">When enabled, visitors will see a maintenance message</p>
                  </div>
                  <Switch
                    checked={settings.maintenance_mode}
                    onCheckedChange={(v) => updateSetting('maintenance_mode', v)}
                  />
                </div>
                {settings.maintenance_mode && (
                  <div>
                    <Label className="text-[#4A3728]">Maintenance Message</Label>
                    <Textarea
                      value={settings.maintenance_message}
                      onChange={(e) => updateSetting('maintenance_message', e.target.value)}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SEO & Crawl Settings */}
        <TabsContent value="seo">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search Engine Optimization
                </CardTitle>
                <CardDescription>Control how search engines index your site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-green-800">Enable SEO Features</p>
                    <p className="text-sm text-green-600">Meta tags, sitemaps, and structured data</p>
                  </div>
                  <Switch
                    checked={settings.seo_enabled}
                    onCheckedChange={(v) => updateSetting('seo_enabled', v)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="font-medium text-blue-800">Allow Google Crawl</p>
                    <p className="text-sm text-blue-600">Let Google bots index your public pages</p>
                  </div>
                  <Switch
                    checked={settings.google_crawl_enabled}
                    onCheckedChange={(v) => updateSetting('google_crawl_enabled', v)}
                    data-testid="google-crawl-toggle"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div>
                    <p className="font-medium text-purple-800">Generate Sitemap</p>
                    <p className="text-sm text-purple-600">Auto-generate XML sitemap for search engines</p>
                  </div>
                  <Switch
                    checked={settings.sitemap_enabled}
                    onCheckedChange={(v) => updateSetting('sitemap_enabled', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-orange-800">Canonical URLs</p>
                    <p className="text-sm text-orange-600">Prevent duplicate content issues</p>
                  </div>
                  <Switch
                    checked={settings.canonical_urls}
                    onCheckedChange={(v) => updateSetting('canonical_urls', v)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  robots.txt Configuration
                </CardTitle>
                <CardDescription>Control which pages search engines can access</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.robots_txt}
                  onChange={(e) => updateSetting('robots_txt', e.target.value)}
                  className="font-mono text-sm"
                  rows={8}
                  placeholder="User-agent: *&#10;Allow: /"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This controls which parts of your site search engines can crawl.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Analytics & Tracking
                </CardTitle>
                <CardDescription>Connect Google Analytics and Search Console</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[#4A3728]">Google Analytics ID</Label>
                  <Input
                    value={settings.google_analytics_id}
                    onChange={(e) => updateSetting('google_analytics_id', e.target.value)}
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[#4A3728]">Google Search Console ID</Label>
                  <Input
                    value={settings.google_search_console_id}
                    onChange={(e) => updateSetting('google_search_console_id', e.target.value)}
                    placeholder="Verification code"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[#4A3728]">Meta Keywords</Label>
                  <Input
                    value={settings.meta_keywords}
                    onChange={(e) => updateSetting('meta_keywords', e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated keywords for SEO</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Authentication Settings
                </CardTitle>
                <CardDescription>Configure login and security options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="font-medium text-blue-800">Two-Factor Authentication</p>
                    <p className="text-sm text-blue-600">Require 2FA for all admin users</p>
                  </div>
                  <Switch
                    checked={settings.two_factor_enabled}
                    onCheckedChange={(v) => updateSetting('two_factor_enabled', v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#4A3728]">Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.session_timeout}
                      onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value) || 30)}
                      className="mt-1"
                      min={5}
                      max={1440}
                    />
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">Max Login Attempts</Label>
                    <Input
                      type="number"
                      value={settings.login_attempts_limit}
                      onChange={(e) => updateSetting('login_attempts_limit', parseInt(e.target.value) || 5)}
                      className="mt-1"
                      min={3}
                      max={10}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#4A3728]">Lockout Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.lockout_duration}
                    onChange={(e) => updateSetting('lockout_duration', parseInt(e.target.value) || 15)}
                    className="mt-1"
                    min={5}
                    max={60}
                  />
                  <p className="text-xs text-gray-500 mt-1">Time to wait after max failed login attempts</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Password Policy
                </CardTitle>
                <CardDescription>Set password requirements for users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[#4A3728]">Minimum Password Length</Label>
                  <Input
                    type="number"
                    value={settings.password_min_length}
                    onChange={(e) => updateSetting('password_min_length', parseInt(e.target.value) || 8)}
                    className="mt-1"
                    min={6}
                    max={32}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-[#4A3728]">Require Special Characters (!@#$%)</span>
                  <Switch
                    checked={settings.password_require_special}
                    onCheckedChange={(v) => updateSetting('password_require_special', v)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-[#4A3728]">Require Numbers</span>
                  <Switch
                    checked={settings.password_require_numbers}
                    onCheckedChange={(v) => updateSetting('password_require_numbers', v)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  IP Whitelist
                </CardTitle>
                <CardDescription>Restrict admin access to specific IP addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-red-800">Enable IP Whitelist</p>
                    <p className="text-sm text-red-600">Only allow admin access from listed IPs</p>
                  </div>
                  <Switch
                    checked={settings.ip_whitelist_enabled}
                    onCheckedChange={(v) => updateSetting('ip_whitelist_enabled', v)}
                  />
                </div>
                
                {settings.ip_whitelist_enabled && (
                  <div>
                    <Label className="text-[#4A3728]">Allowed IP Addresses</Label>
                    <Textarea
                      value={settings.ip_whitelist}
                      onChange={(e) => updateSetting('ip_whitelist', e.target.value)}
                      placeholder="192.168.1.1&#10;10.0.0.0/24"
                      className="mt-1 font-mono text-sm"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">One IP per line. CIDR notation supported.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>Configure email delivery settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-green-800">Enable Email Notifications</p>
                    <p className="text-sm text-green-600">Send email alerts for important events</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications_enabled}
                    onCheckedChange={(v) => updateSetting('email_notifications_enabled', v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#4A3728]">From Name</Label>
                    <Input
                      value={settings.email_from_name}
                      onChange={(e) => updateSetting('email_from_name', e.target.value)}
                      placeholder="Your Company"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">From Email Address</Label>
                    <Input
                      type="email"
                      value={settings.email_from_address}
                      onChange={(e) => updateSetting('email_from_address', e.target.value)}
                      placeholder="noreply@example.com"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  SMTP Configuration
                </CardTitle>
                <CardDescription>Configure your email server settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#4A3728]">SMTP Host</Label>
                    <Input
                      value={settings.smtp_host}
                      onChange={(e) => updateSetting('smtp_host', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">SMTP Port</Label>
                    <Input
                      type="number"
                      value={settings.smtp_port}
                      onChange={(e) => updateSetting('smtp_port', parseInt(e.target.value) || 587)}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-[#4A3728]">Use TLS/SSL Encryption</span>
                  <Switch
                    checked={settings.smtp_secure}
                    onCheckedChange={(v) => updateSetting('smtp_secure', v)}
                  />
                </div>
                
                <Button variant="outline" className="w-full border-[#E8D5C4]">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Test Email
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Brand Colors
                </CardTitle>
                <CardDescription>Customize your site's color scheme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-[#4A3728]">Primary Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={settings.primary_color}
                        onChange={(e) => updateSetting('primary_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={settings.primary_color}
                        onChange={(e) => updateSetting('primary_color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">Secondary Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={settings.secondary_color}
                        onChange={(e) => updateSetting('secondary_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={settings.secondary_color}
                        onChange={(e) => updateSetting('secondary_color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">Accent Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={settings.accent_color}
                        onChange={(e) => updateSetting('accent_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={settings.accent_color}
                        onChange={(e) => updateSetting('accent_color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border border-[#E8D5C4]">
                  <p className="text-sm font-medium text-[#4A3728] mb-2">Color Preview</p>
                  <div className="flex gap-2">
                    <div 
                      className="w-16 h-16 rounded-lg" 
                      style={{ backgroundColor: settings.primary_color }}
                    />
                    <div 
                      className="w-16 h-16 rounded-lg" 
                      style={{ backgroundColor: settings.secondary_color }}
                    />
                    <div 
                      className="w-16 h-16 rounded-lg" 
                      style={{ backgroundColor: settings.accent_color }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Logo & Favicon
                </CardTitle>
                <CardDescription>Upload your brand assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[#4A3728]">Logo URL</Label>
                  <Input
                    value={settings.logo_url}
                    onChange={(e) => updateSetting('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[#4A3728]">Favicon URL</Label>
                  <Input
                    value={settings.favicon_url}
                    onChange={(e) => updateSetting('favicon_url', e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-[#4A3728]">Enable Dark Mode Option</span>
                  <Switch
                    checked={settings.dark_mode_enabled}
                    onCheckedChange={(v) => updateSetting('dark_mode_enabled', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Settings */}
        <TabsContent value="performance">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Caching
                </CardTitle>
                <CardDescription>Optimize site performance with caching</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-green-800">Enable Caching</p>
                    <p className="text-sm text-green-600">Cache static content for faster load times</p>
                  </div>
                  <Switch
                    checked={settings.cache_enabled}
                    onCheckedChange={(v) => updateSetting('cache_enabled', v)}
                  />
                </div>
                
                {settings.cache_enabled && (
                  <div>
                    <Label className="text-[#4A3728]">Cache Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={settings.cache_duration}
                      onChange={(e) => updateSetting('cache_duration', parseInt(e.target.value) || 3600)}
                      className="mt-1"
                      min={60}
                      max={86400}
                    />
                    <p className="text-xs text-gray-500 mt-1">3600 = 1 hour, 86400 = 24 hours</p>
                  </div>
                )}

                <Button variant="outline" className="w-full border-[#E8D5C4]">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear Cache
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Optimization
                </CardTitle>
                <CardDescription>Additional performance optimizations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm text-[#4A3728] font-medium">Enable Compression</span>
                    <p className="text-xs text-gray-500">Compress responses with gzip</p>
                  </div>
                  <Switch
                    checked={settings.compression_enabled}
                    onCheckedChange={(v) => updateSetting('compression_enabled', v)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm text-[#4A3728] font-medium">Lazy Loading</span>
                    <p className="text-xs text-gray-500">Load images only when visible</p>
                  </div>
                  <Switch
                    checked={settings.lazy_loading_enabled}
                    onCheckedChange={(v) => updateSetting('lazy_loading_enabled', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebsiteSettings;
