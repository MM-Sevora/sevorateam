import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  Bell, Settings, Mail, MessageSquare, Calendar, Users, 
  Loader2, Save, RefreshCw, Clock, Volume2, VolumeX,
  Smartphone, Monitor, BellRing, BellOff, Send, AlertTriangle,
  CheckCircle, Info, Zap, Target, ShoppingBag, TrendingUp
} from 'lucide-react';
import api from '../../lib/api';

// Notification categories with their settings
const NOTIFICATION_CATEGORIES = {
  meetings: {
    name: 'Meetings & Calendar',
    icon: Calendar,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    notifications: [
      { key: 'meeting_reminder', label: 'Meeting reminders', description: 'Reminders before scheduled meetings' },
      { key: 'meeting_invite', label: 'Meeting invitations', description: 'When someone invites you to a meeting' },
      { key: 'meeting_update', label: 'Meeting updates', description: 'When a meeting is rescheduled or cancelled' },
      { key: 'meeting_notes', label: 'Meeting notes shared', description: 'When meeting notes are shared with you' },
    ]
  },
  tasks: {
    name: 'Tasks & Assignments',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    notifications: [
      { key: 'task_assigned', label: 'Task assigned to you', description: 'When a new task is assigned to you' },
      { key: 'task_due_soon', label: 'Task due soon', description: 'Reminders for upcoming task deadlines' },
      { key: 'task_overdue', label: 'Task overdue', description: 'When a task passes its due date' },
      { key: 'task_completed', label: 'Task completed', description: 'When someone completes a task you created' },
    ]
  },
  marketing: {
    name: 'Marketing & Campaigns',
    icon: Target,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    notifications: [
      { key: 'campaign_status', label: 'Campaign status changes', description: 'When a campaign starts, ends, or changes status' },
      { key: 'influencer_response', label: 'Influencer responses', description: 'When an influencer responds to outreach' },
      { key: 'content_approval', label: 'Content approval requests', description: 'When content needs your approval' },
      { key: 'performance_alert', label: 'Performance alerts', description: 'When campaigns hit milestones or underperform' },
    ]
  },
  sourcing: {
    name: 'Sourcing & Suppliers',
    icon: ShoppingBag,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    notifications: [
      { key: 'supplier_update', label: 'Supplier updates', description: 'When supplier information changes' },
      { key: 'quote_received', label: 'Quotes received', description: 'When a supplier submits a quote' },
      { key: 'order_status', label: 'Order status changes', description: 'When order status is updated' },
      { key: 'followup_due', label: 'Follow-up reminders', description: 'Reminders for scheduled follow-ups' },
    ]
  },
  sales: {
    name: 'Sales & Leads',
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    notifications: [
      { key: 'new_lead', label: 'New leads', description: 'When a new lead is assigned to you' },
      { key: 'lead_activity', label: 'Lead activity', description: 'When a lead takes an action' },
      { key: 'deal_update', label: 'Deal updates', description: 'When deal status changes' },
      { key: 'conversion', label: 'Conversions', description: 'When a lead converts to customer' },
    ]
  },
  system: {
    name: 'System & Security',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    notifications: [
      { key: 'security_alert', label: 'Security alerts', description: 'Important security notifications' },
      { key: 'system_update', label: 'System updates', description: 'Platform updates and maintenance' },
      { key: 'integration_error', label: 'Integration errors', description: 'When an integration fails' },
      { key: 'data_export', label: 'Data exports ready', description: 'When requested exports are ready' },
    ]
  }
};

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('channels');
  
  // Channel Settings
  const [channelSettings, setChannelSettings] = useState({
    email_enabled: true,
    in_app_enabled: true,
    push_enabled: false,
    sms_enabled: false,
    slack_enabled: false
  });
  
  // Delivery Settings
  const [deliverySettings, setDeliverySettings] = useState({
    digest_enabled: true,
    digest_frequency: 'daily',
    digest_time: '09:00',
    instant_for_urgent: true,
    batch_delay_minutes: 5,
    max_emails_per_day: 50
  });
  
  // Quiet Hours Settings
  const [quietHoursSettings, setQuietHoursSettings] = useState({
    enabled: false,
    start_time: '22:00',
    end_time: '08:00',
    weekend_quiet: false,
    allow_urgent: true
  });
  
  // Category Defaults (which categories are enabled by default for new users)
  const [categoryDefaults, setCategoryDefaults] = useState(() => {
    const defaults = {};
    Object.keys(NOTIFICATION_CATEGORIES).forEach(catKey => {
      defaults[catKey] = {
        email: true,
        in_app: true,
        push: false
      };
      NOTIFICATION_CATEGORIES[catKey].notifications.forEach(notif => {
        defaults[`${catKey}_${notif.key}`] = {
          email: true,
          in_app: true,
          push: false
        };
      });
    });
    return defaults;
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/admin/settings');
      if (response.data) {
        if (response.data.channels) setChannelSettings(response.data.channels);
        if (response.data.delivery) setDeliverySettings(response.data.delivery);
        if (response.data.quiet_hours) setQuietHoursSettings(response.data.quiet_hours);
        if (response.data.category_defaults) setCategoryDefaults(response.data.category_defaults);
      }
    } catch (error) {
      console.log('Using default notification settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/admin/settings', {
        channels: channelSettings,
        delivery: deliverySettings,
        quiet_hours: quietHoursSettings,
        category_defaults: categoryDefaults
      });
      toast.success('Notification settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategoryChannel = (categoryKey, channel) => {
    setCategoryDefaults(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [channel]: !prev[categoryKey]?.[channel]
      }
    }));
  };

  const toggleAllInCategory = (categoryKey, channel, enabled) => {
    setCategoryDefaults(prev => {
      const updated = { ...prev };
      // Update category level
      updated[categoryKey] = { ...updated[categoryKey], [channel]: enabled };
      // Update all notifications in category
      NOTIFICATION_CATEGORIES[categoryKey].notifications.forEach(notif => {
        const key = `${categoryKey}_${notif.key}`;
        updated[key] = { ...updated[key], [channel]: enabled };
      });
      return updated;
    });
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
          <h1 className="text-2xl font-bold text-[#4A3728]">Notification Settings</h1>
          <p className="text-[#6B5D52] mt-1">Configure global notification defaults for all users</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={fetchSettings}
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

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#F5EBE0] border border-[#E8DED5] p-1 mb-6">
          <TabsTrigger value="channels" className="data-[state=active]:bg-white px-4">
            <Send className="w-4 h-4 mr-2" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="delivery" className="data-[state=active]:bg-white px-4">
            <Clock className="w-4 h-4 mr-2" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="quiet-hours" className="data-[state=active]:bg-white px-4">
            <VolumeX className="w-4 h-4 mr-2" />
            Quiet Hours
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-white px-4">
            <Bell className="w-4 h-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels">
          <Card className="border-[#E8DED5]">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Send className="w-5 h-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>Enable or disable notification delivery channels globally</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <div className="flex items-center justify-between p-4 bg-[#F5EBE0] rounded-lg border border-[#E8DED5]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-[#4A3728] font-medium">Email Notifications</Label>
                      <p className="text-xs text-[#6B5D52]">Send notifications via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={channelSettings.email_enabled}
                    onCheckedChange={(v) => setChannelSettings({ ...channelSettings, email_enabled: v })}
                  />
                </div>

                {/* In-App */}
                <div className="flex items-center justify-between p-4 bg-[#F5EBE0] rounded-lg border border-[#E8DED5]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                      <BellRing className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <Label className="text-[#4A3728] font-medium">In-App Notifications</Label>
                      <p className="text-xs text-[#6B5D52]">Show notifications in the app</p>
                    </div>
                  </div>
                  <Switch
                    checked={channelSettings.in_app_enabled}
                    onCheckedChange={(v) => setChannelSettings({ ...channelSettings, in_app_enabled: v })}
                  />
                </div>

                {/* Push */}
                <div className="flex items-center justify-between p-4 bg-[#F5EBE0] rounded-lg border border-[#E8DED5]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <Label className="text-[#4A3728] font-medium">Push Notifications</Label>
                      <p className="text-xs text-[#6B5D52]">Browser & mobile push notifications</p>
                    </div>
                  </div>
                  <Switch
                    checked={channelSettings.push_enabled}
                    onCheckedChange={(v) => setChannelSettings({ ...channelSettings, push_enabled: v })}
                  />
                </div>

                {/* SMS */}
                <div className="flex items-center justify-between p-4 bg-[#F5EBE0] rounded-lg border border-[#E8DED5]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <Label className="text-[#4A3728] font-medium">SMS Notifications</Label>
                      <p className="text-xs text-[#6B5D52]">Send critical alerts via SMS</p>
                    </div>
                  </div>
                  <Switch
                    checked={channelSettings.sms_enabled}
                    onCheckedChange={(v) => setChannelSettings({ ...channelSettings, sms_enabled: v })}
                  />
                </div>

                {/* Slack */}
                <div className="flex items-center justify-between p-4 bg-[#F5EBE0] rounded-lg border border-[#E8DED5] col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <Label className="text-[#4A3728] font-medium">Slack Integration</Label>
                      <p className="text-xs text-[#6B5D52]">Send notifications to Slack channels</p>
                    </div>
                  </div>
                  <Switch
                    checked={channelSettings.slack_enabled}
                    onCheckedChange={(v) => setChannelSettings({ ...channelSettings, slack_enabled: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery">
          <Card className="border-[#E8DED5]">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Delivery Settings
              </CardTitle>
              <CardDescription>Configure how and when notifications are delivered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Digest */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <Label className="text-[#4A3728] font-medium">Email Digest</Label>
                      <p className="text-xs text-[#6B5D52]">Bundle notifications into periodic digests</p>
                    </div>
                  </div>
                  <Switch
                    checked={deliverySettings.digest_enabled}
                    onCheckedChange={(v) => setDeliverySettings({ ...deliverySettings, digest_enabled: v })}
                  />
                </div>
                
                {deliverySettings.digest_enabled && (
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-200">
                    <div className="space-y-2">
                      <Label className="text-[#4A3728]">Digest Frequency</Label>
                      <Select 
                        value={deliverySettings.digest_frequency}
                        onValueChange={(v) => setDeliverySettings({ ...deliverySettings, digest_frequency: v })}
                      >
                        <SelectTrigger className="border-[#D4BBA6] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#4A3728]">Digest Send Time</Label>
                      <Input
                        type="time"
                        value={deliverySettings.digest_time}
                        onChange={(e) => setDeliverySettings({ ...deliverySettings, digest_time: e.target.value })}
                        className="border-[#D4BBA6] bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Instant Delivery */}
              <div className="flex items-center justify-between p-4 bg-[#F5EBE0] rounded-lg">
                <div>
                  <Label className="text-[#4A3728] font-medium">Instant Delivery for Urgent</Label>
                  <p className="text-xs text-[#6B5D52]">Always send urgent notifications immediately</p>
                </div>
                <Switch
                  checked={deliverySettings.instant_for_urgent}
                  onCheckedChange={(v) => setDeliverySettings({ ...deliverySettings, instant_for_urgent: v })}
                />
              </div>

              {/* Batch Delay */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Batch Delay (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={deliverySettings.batch_delay_minutes}
                    onChange={(e) => setDeliverySettings({ ...deliverySettings, batch_delay_minutes: parseInt(e.target.value) })}
                    className="border-[#D4BBA6]"
                  />
                  <p className="text-xs text-[#6B5D52]">Wait time before sending batched notifications</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Max Emails Per Day</Label>
                  <Input
                    type="number"
                    min="1"
                    max="200"
                    value={deliverySettings.max_emails_per_day}
                    onChange={(e) => setDeliverySettings({ ...deliverySettings, max_emails_per_day: parseInt(e.target.value) })}
                    className="border-[#D4BBA6]"
                  />
                  <p className="text-xs text-[#6B5D52]">Maximum notification emails per user per day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiet Hours Tab */}
        <TabsContent value="quiet-hours">
          <Card className="border-[#E8DED5]">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <VolumeX className="w-5 h-5" />
                Quiet Hours (Do Not Disturb)
              </CardTitle>
              <CardDescription>Set default quiet hours when notifications are silenced</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Quiet Hours */}
              <div className="flex items-center justify-between p-4 bg-[#F5EBE0] rounded-lg">
                <div className="flex items-center gap-3">
                  {quietHoursSettings.enabled ? (
                    <VolumeX className="w-6 h-6 text-amber-600" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-green-600" />
                  )}
                  <div>
                    <Label className="text-[#4A3728] font-medium">Enable Quiet Hours</Label>
                    <p className="text-xs text-[#6B5D52]">Silence non-urgent notifications during set hours</p>
                  </div>
                </div>
                <Switch
                  checked={quietHoursSettings.enabled}
                  onCheckedChange={(v) => setQuietHoursSettings({ ...quietHoursSettings, enabled: v })}
                />
              </div>

              {quietHoursSettings.enabled && (
                <>
                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[#4A3728]">Start Time</Label>
                      <Input
                        type="time"
                        value={quietHoursSettings.start_time}
                        onChange={(e) => setQuietHoursSettings({ ...quietHoursSettings, start_time: e.target.value })}
                        className="border-[#D4BBA6]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#4A3728]">End Time</Label>
                      <Input
                        type="time"
                        value={quietHoursSettings.end_time}
                        onChange={(e) => setQuietHoursSettings({ ...quietHoursSettings, end_time: e.target.value })}
                        className="border-[#D4BBA6]"
                      />
                    </div>
                  </div>

                  {/* Additional Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                      <div>
                        <Label className="text-[#4A3728]">Weekend Quiet Mode</Label>
                        <p className="text-xs text-[#6B5D52]">Extend quiet hours for entire weekends</p>
                      </div>
                      <Switch
                        checked={quietHoursSettings.weekend_quiet}
                        onCheckedChange={(v) => setQuietHoursSettings({ ...quietHoursSettings, weekend_quiet: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                      <div>
                        <Label className="text-[#4A3728]">Allow Urgent Notifications</Label>
                        <p className="text-xs text-[#6B5D52]">Still send urgent/critical notifications during quiet hours</p>
                      </div>
                      <Switch
                        checked={quietHoursSettings.allow_urgent}
                        onCheckedChange={(v) => setQuietHoursSettings({ ...quietHoursSettings, allow_urgent: v })}
                      />
                    </div>
                  </div>
                </>
              )}

              {!quietHoursSettings.enabled && (
                <div className="text-center py-8 text-[#6B5D52]">
                  <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Quiet hours are disabled. Users will receive notifications at all times.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card className="border-[#E8DED5]">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Categories
              </CardTitle>
              <CardDescription>Set default notification preferences for each category (applies to new users)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(NOTIFICATION_CATEGORIES).map(([catKey, category]) => {
                const CategoryIcon = category.icon;
                const catDefaults = categoryDefaults[catKey] || { email: true, in_app: true, push: false };
                
                return (
                  <div key={catKey} className={`p-4 rounded-lg border ${category.bgColor} border-opacity-50`}>
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <CategoryIcon className={`w-5 h-5 ${category.color}`} />
                        <span className="font-medium text-[#4A3728]">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#6B5D52]" />
                          <Switch
                            checked={catDefaults.email}
                            onCheckedChange={(v) => toggleAllInCategory(catKey, 'email', v)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <BellRing className="w-4 h-4 text-[#6B5D52]" />
                          <Switch
                            checked={catDefaults.in_app}
                            onCheckedChange={(v) => toggleAllInCategory(catKey, 'in_app', v)}
                          />
                        </div>
                        {channelSettings.push_enabled && (
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-[#6B5D52]" />
                            <Switch
                              checked={catDefaults.push}
                              onCheckedChange={(v) => toggleAllInCategory(catKey, 'push', v)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Individual Notifications */}
                    <div className="space-y-2 pl-8 border-l-2 border-[#D4BBA6]/30">
                      {category.notifications.map(notif => {
                        const notifKey = `${catKey}_${notif.key}`;
                        const notifDefaults = categoryDefaults[notifKey] || { email: true, in_app: true, push: false };
                        
                        return (
                          <div key={notifKey} className="flex items-center justify-between py-2">
                            <div>
                              <span className="text-sm text-[#4A3728]">{notif.label}</span>
                              <p className="text-xs text-[#6B5D52]">{notif.description}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <Switch
                                checked={notifDefaults.email}
                                onCheckedChange={() => {
                                  setCategoryDefaults(prev => ({
                                    ...prev,
                                    [notifKey]: { ...prev[notifKey], email: !notifDefaults.email }
                                  }));
                                }}
                              />
                              <Switch
                                checked={notifDefaults.in_app}
                                onCheckedChange={() => {
                                  setCategoryDefaults(prev => ({
                                    ...prev,
                                    [notifKey]: { ...prev[notifKey], in_app: !notifDefaults.in_app }
                                  }));
                                }}
                              />
                              {channelSettings.push_enabled && (
                                <Switch
                                  checked={notifDefaults.push}
                                  onCheckedChange={() => {
                                    setCategoryDefaults(prev => ({
                                      ...prev,
                                      [notifKey]: { ...prev[notifKey], push: !notifDefaults.push }
                                    }));
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex items-center gap-6 pt-4 border-t border-[#E8DED5] text-sm text-[#6B5D52]">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </div>
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4" />
                  <span>In-App</span>
                </div>
                {channelSettings.push_enabled && (
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    <span>Push</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
