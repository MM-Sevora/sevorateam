import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Slider } from '../../components/ui/slider';
import { toast } from 'sonner';
import {
  Mail, Settings, Shield, Clock, Bell, Send, Eye, 
  Loader2, Save, RefreshCw, AlertTriangle, Check,
  FileText, Users, Lock, Zap, Timer, Archive
} from 'lucide-react';
import api from '../../lib/api';

export default function MailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    default_undo_send_delay: 5,
    max_attachment_size_mb: 25,
    allowed_attachment_types: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip',
    enable_read_receipts: true,
    enable_email_tracking: true,
    default_signature_position: 'bottom',
    auto_save_drafts_interval: 30,
    max_recipients_per_email: 100
  });
  
  // Tracking Settings
  const [trackingSettings, setTrackingSettings] = useState({
    track_opens: true,
    track_clicks: true,
    track_link_clicks: true,
    tracking_pixel_enabled: true,
    notify_on_first_open: true,
    aggregate_tracking_data: true,
    retention_days: 90
  });
  
  // Auto-Reply Settings
  const [autoReplySettings, setAutoReplySettings] = useState({
    enable_ooo_for_all: true,
    allow_custom_ooo_messages: true,
    default_ooo_internal_message: '',
    default_ooo_external_message: '',
    ooo_excludes_internal: false
  });
  
  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    block_external_images: false,
    warn_external_recipients: true,
    require_tls: true,
    enable_spam_filter: true,
    spam_sensitivity: 'medium',
    blocked_domains: '',
    blocked_file_types: '.exe,.bat,.cmd,.scr,.js,.vbs',
    enable_attachment_scanning: true
  });
  
  // Scheduled Send Settings
  const [scheduledSettings, setScheduledSettings] = useState({
    enable_scheduled_send: true,
    max_scheduled_emails_per_user: 50,
    max_schedule_days_ahead: 30,
    send_time_optimization: false,
    default_send_window_start: '09:00',
    default_send_window_end: '17:00'
  });

  // Stats
  const [stats, setStats] = useState({
    total_templates: 0,
    total_signatures: 0,
    scheduled_emails_pending: 0,
    tracked_emails_total: 0,
    active_follow_ups: 0
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/email-features/admin/settings');
      if (response.data) {
        if (response.data.general) setGeneralSettings(response.data.general);
        if (response.data.tracking) setTrackingSettings(response.data.tracking);
        if (response.data.auto_reply) setAutoReplySettings(response.data.auto_reply);
        if (response.data.security) setSecuritySettings(response.data.security);
        if (response.data.scheduled) setScheduledSettings(response.data.scheduled);
      }
    } catch (error) {
      // Settings might not exist yet, use defaults
      console.log('Using default settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/email-features/admin/stats');
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, [fetchSettings, fetchStats]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/email-features/admin/settings', {
        general: generalSettings,
        tracking: trackingSettings,
        auto_reply: autoReplySettings,
        security: securitySettings,
        scheduled: scheduledSettings
      });
      toast.success('Mail settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-[#FAF7F5] to-[#F5EBE0] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Mail Settings</h1>
          <p className="text-[#6B5D52] mt-1">Configure organization-wide email settings</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => { fetchSettings(); fetchStats(); }}
            className="border-[#D4BBA6]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="bg-[#8B7355] hover:bg-[#6B5344]"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-[#E8DED5]">
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{stats.total_templates}</p>
            <p className="text-sm text-[#6B5D52]">Templates</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8DED5]">
          <CardContent className="p-4 text-center">
            <Mail className="w-6 h-6 mx-auto text-violet-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{stats.total_signatures}</p>
            <p className="text-sm text-[#6B5D52]">Signatures</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8DED5]">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{stats.scheduled_emails_pending}</p>
            <p className="text-sm text-[#6B5D52]">Scheduled</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8DED5]">
          <CardContent className="p-4 text-center">
            <Eye className="w-6 h-6 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{stats.tracked_emails_total}</p>
            <p className="text-sm text-[#6B5D52]">Tracked</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8DED5]">
          <CardContent className="p-4 text-center">
            <Bell className="w-6 h-6 mx-auto text-rose-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{stats.active_follow_ups}</p>
            <p className="text-sm text-[#6B5D52]">Follow-ups</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#F5EBE0] border border-[#E8DED5] p-1 mb-6">
          <TabsTrigger value="general" className="data-[state=active]:bg-white px-4">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="tracking" className="data-[state=active]:bg-white px-4">
            <Eye className="w-4 h-4 mr-2" />
            Tracking
          </TabsTrigger>
          <TabsTrigger value="auto-reply" className="data-[state=active]:bg-white px-4">
            <Send className="w-4 h-4 mr-2" />
            Auto-Reply
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white px-4">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="data-[state=active]:bg-white px-4">
            <Timer className="w-4 h-4 mr-2" />
            Scheduled Send
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="border-[#E8DED5]">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Settings className="w-5 h-5" />
                General Email Settings
              </CardTitle>
              <CardDescription>Configure default email behavior for all users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Undo Send Delay */}
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Undo Send Delay (seconds)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[generalSettings.default_undo_send_delay]}
                    onValueChange={([v]) => setGeneralSettings({ ...generalSettings, default_undo_send_delay: v })}
                    min={0}
                    max={30}
                    step={5}
                    className="flex-1"
                  />
                  <Badge variant="secondary" className="w-16 justify-center">
                    {generalSettings.default_undo_send_delay}s
                  </Badge>
                </div>
                <p className="text-xs text-[#6B5D52]">Time users have to undo a sent email</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Max Attachment Size */}
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Max Attachment Size (MB)</Label>
                  <Input
                    type="number"
                    value={generalSettings.max_attachment_size_mb}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, max_attachment_size_mb: parseInt(e.target.value) })}
                    className="border-[#D4BBA6]"
                  />
                </div>

                {/* Max Recipients */}
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Max Recipients Per Email</Label>
                  <Input
                    type="number"
                    value={generalSettings.max_recipients_per_email}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, max_recipients_per_email: parseInt(e.target.value) })}
                    className="border-[#D4BBA6]"
                  />
                </div>
              </div>

              {/* Allowed Attachment Types */}
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Allowed Attachment Types</Label>
                <Input
                  value={generalSettings.allowed_attachment_types}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, allowed_attachment_types: e.target.value })}
                  placeholder=".pdf,.doc,.docx,.xls,.xlsx"
                  className="border-[#D4BBA6]"
                />
                <p className="text-xs text-[#6B5D52]">Comma-separated list of allowed file extensions</p>
              </div>

              {/* Auto Save Interval */}
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Auto-save Drafts Interval (seconds)</Label>
                <Select 
                  value={String(generalSettings.auto_save_drafts_interval)}
                  onValueChange={(v) => setGeneralSettings({ ...generalSettings, auto_save_drafts_interval: parseInt(v) })}
                >
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Options */}
              <div className="space-y-4 pt-4 border-t border-[#E8DED5]">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[#4A3728]">Enable Read Receipts</Label>
                    <p className="text-xs text-[#6B5D52]">Allow users to request read receipts</p>
                  </div>
                  <Switch
                    checked={generalSettings.enable_read_receipts}
                    onCheckedChange={(v) => setGeneralSettings({ ...generalSettings, enable_read_receipts: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[#4A3728]">Enable Email Tracking</Label>
                    <p className="text-xs text-[#6B5D52]">Allow users to track email opens and clicks</p>
                  </div>
                  <Switch
                    checked={generalSettings.enable_email_tracking}
                    onCheckedChange={(v) => setGeneralSettings({ ...generalSettings, enable_email_tracking: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Settings */}
        <TabsContent value="tracking">
          <Card className="border-[#E8DED5]">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Email Tracking Settings
              </CardTitle>
              <CardDescription>Configure how email opens and clicks are tracked</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Track Email Opens</Label>
                      <p className="text-xs text-[#6B5D52]">Track when recipients open emails</p>
                    </div>
                    <Switch
                      checked={trackingSettings.track_opens}
                      onCheckedChange={(v) => setTrackingSettings({ ...trackingSettings, track_opens: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Track Link Clicks</Label>
                      <p className="text-xs text-[#6B5D52]">Track when recipients click links</p>
                    </div>
                    <Switch
                      checked={trackingSettings.track_link_clicks}
                      onCheckedChange={(v) => setTrackingSettings({ ...trackingSettings, track_link_clicks: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Enable Tracking Pixel</Label>
                      <p className="text-xs text-[#6B5D52]">Use invisible pixel for open tracking</p>
                    </div>
                    <Switch
                      checked={trackingSettings.tracking_pixel_enabled}
                      onCheckedChange={(v) => setTrackingSettings({ ...trackingSettings, tracking_pixel_enabled: v })}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Notify on First Open</Label>
                      <p className="text-xs text-[#6B5D52]">Send notification when email is first opened</p>
                    </div>
                    <Switch
                      checked={trackingSettings.notify_on_first_open}
                      onCheckedChange={(v) => setTrackingSettings({ ...trackingSettings, notify_on_first_open: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Aggregate Tracking Data</Label>
                      <p className="text-xs text-[#6B5D52]">Combine duplicate open events</p>
                    </div>
                    <Switch
                      checked={trackingSettings.aggregate_tracking_data}
                      onCheckedChange={(v) => setTrackingSettings({ ...trackingSettings, aggregate_tracking_data: v })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#E8DED5]">
                <Label className="text-[#4A3728]">Data Retention (days)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[trackingSettings.retention_days]}
                    onValueChange={([v]) => setTrackingSettings({ ...trackingSettings, retention_days: v })}
                    min={30}
                    max={365}
                    step={30}
                    className="flex-1"
                  />
                  <Badge variant="secondary" className="w-20 justify-center">
                    {trackingSettings.retention_days} days
                  </Badge>
                </div>
                <p className="text-xs text-[#6B5D52]">How long to keep tracking data before automatic deletion</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto-Reply Settings */}
        <TabsContent value="auto-reply">
          <Card className="border-[#E8DED5]">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Send className="w-5 h-5" />
                Auto-Reply & Out of Office Settings
              </CardTitle>
              <CardDescription>Configure automatic response settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">Enable Out of Office for All Users</Label>
                    <p className="text-xs text-[#6B5D52]">Allow users to set out of office auto-replies</p>
                  </div>
                  <Switch
                    checked={autoReplySettings.enable_ooo_for_all}
                    onCheckedChange={(v) => setAutoReplySettings({ ...autoReplySettings, enable_ooo_for_all: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">Allow Custom OOO Messages</Label>
                    <p className="text-xs text-[#6B5D52]">Let users write their own out of office messages</p>
                  </div>
                  <Switch
                    checked={autoReplySettings.allow_custom_ooo_messages}
                    onCheckedChange={(v) => setAutoReplySettings({ ...autoReplySettings, allow_custom_ooo_messages: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">OOO Excludes Internal Emails</Label>
                    <p className="text-xs text-[#6B5D52]">Don't send OOO replies to internal colleagues</p>
                  </div>
                  <Switch
                    checked={autoReplySettings.ooo_excludes_internal}
                    onCheckedChange={(v) => setAutoReplySettings({ ...autoReplySettings, ooo_excludes_internal: v })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#E8DED5]">
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Default Internal OOO Message Template</Label>
                  <Textarea
                    value={autoReplySettings.default_ooo_internal_message}
                    onChange={(e) => setAutoReplySettings({ ...autoReplySettings, default_ooo_internal_message: e.target.value })}
                    placeholder="Hi, I'm currently out of the office..."
                    className="border-[#D4BBA6] min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Default External OOO Message Template</Label>
                  <Textarea
                    value={autoReplySettings.default_ooo_external_message}
                    onChange={(e) => setAutoReplySettings({ ...autoReplySettings, default_ooo_external_message: e.target.value })}
                    placeholder="Thank you for your email. I'm currently out of the office..."
                    className="border-[#D4BBA6] min-h-[100px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card className="border-[#E8DED5]">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Email Security Settings
              </CardTitle>
              <CardDescription>Configure security and spam protection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Block External Images</Label>
                      <p className="text-xs text-[#6B5D52]">Don't load images from external sources</p>
                    </div>
                    <Switch
                      checked={securitySettings.block_external_images}
                      onCheckedChange={(v) => setSecuritySettings({ ...securitySettings, block_external_images: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Warn External Recipients</Label>
                      <p className="text-xs text-[#6B5D52]">Show warning when emailing external addresses</p>
                    </div>
                    <Switch
                      checked={securitySettings.warn_external_recipients}
                      onCheckedChange={(v) => setSecuritySettings({ ...securitySettings, warn_external_recipients: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Require TLS</Label>
                      <p className="text-xs text-[#6B5D52]">Only send emails over secure connections</p>
                    </div>
                    <Switch
                      checked={securitySettings.require_tls}
                      onCheckedChange={(v) => setSecuritySettings({ ...securitySettings, require_tls: v })}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Enable Spam Filter</Label>
                      <p className="text-xs text-[#6B5D52]">Automatically filter spam emails</p>
                    </div>
                    <Switch
                      checked={securitySettings.enable_spam_filter}
                      onCheckedChange={(v) => setSecuritySettings({ ...securitySettings, enable_spam_filter: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Attachment Scanning</Label>
                      <p className="text-xs text-[#6B5D52]">Scan attachments for malware</p>
                    </div>
                    <Switch
                      checked={securitySettings.enable_attachment_scanning}
                      onCheckedChange={(v) => setSecuritySettings({ ...securitySettings, enable_attachment_scanning: v })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#4A3728]">Spam Filter Sensitivity</Label>
                <Select 
                  value={securitySettings.spam_sensitivity}
                  onValueChange={(v) => setSecuritySettings({ ...securitySettings, spam_sensitivity: v })}
                >
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Only obvious spam</SelectItem>
                    <SelectItem value="medium">Medium - Balanced protection</SelectItem>
                    <SelectItem value="high">High - Aggressive filtering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#4A3728]">Blocked Domains</Label>
                <Textarea
                  value={securitySettings.blocked_domains}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, blocked_domains: e.target.value })}
                  placeholder="spam.com, malware.org (one per line or comma-separated)"
                  className="border-[#D4BBA6]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#4A3728]">Blocked File Types</Label>
                <Input
                  value={securitySettings.blocked_file_types}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, blocked_file_types: e.target.value })}
                  placeholder=".exe,.bat,.cmd,.scr"
                  className="border-[#D4BBA6]"
                />
                <p className="text-xs text-[#6B5D52]">File types that will be blocked from attachments</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Send Settings */}
        <TabsContent value="scheduled">
          <Card className="border-[#E8DED5]">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Scheduled Send Settings
              </CardTitle>
              <CardDescription>Configure scheduled email delivery options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                <div>
                  <Label className="text-[#4A3728]">Enable Scheduled Send</Label>
                  <p className="text-xs text-[#6B5D52]">Allow users to schedule emails for later delivery</p>
                </div>
                <Switch
                  checked={scheduledSettings.enable_scheduled_send}
                  onCheckedChange={(v) => setScheduledSettings({ ...scheduledSettings, enable_scheduled_send: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Max Scheduled Emails Per User</Label>
                  <Input
                    type="number"
                    value={scheduledSettings.max_scheduled_emails_per_user}
                    onChange={(e) => setScheduledSettings({ ...scheduledSettings, max_scheduled_emails_per_user: parseInt(e.target.value) })}
                    className="border-[#D4BBA6]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Max Days to Schedule Ahead</Label>
                  <Input
                    type="number"
                    value={scheduledSettings.max_schedule_days_ahead}
                    onChange={(e) => setScheduledSettings({ ...scheduledSettings, max_schedule_days_ahead: parseInt(e.target.value) })}
                    className="border-[#D4BBA6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <Label className="text-[#4A3728] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    Send Time Optimization
                  </Label>
                  <p className="text-xs text-[#6B5D52]">Automatically adjust send times for better open rates</p>
                </div>
                <Switch
                  checked={scheduledSettings.send_time_optimization}
                  onCheckedChange={(v) => setScheduledSettings({ ...scheduledSettings, send_time_optimization: v })}
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-[#E8DED5]">
                <Label className="text-[#4A3728]">Default Send Window</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-[#6B5D52]">Start Time</Label>
                    <Input
                      type="time"
                      value={scheduledSettings.default_send_window_start}
                      onChange={(e) => setScheduledSettings({ ...scheduledSettings, default_send_window_start: e.target.value })}
                      className="border-[#D4BBA6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#6B5D52]">End Time</Label>
                    <Input
                      type="time"
                      value={scheduledSettings.default_send_window_end}
                      onChange={(e) => setScheduledSettings({ ...scheduledSettings, default_send_window_end: e.target.value })}
                      className="border-[#D4BBA6]"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#6B5D52]">Suggested time window for scheduled emails</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
