import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, ChevronLeft, Save, Globe, Bell, Shield, Clock,
  Database, Mail, Users, Palette, FileText, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';

const SystemConfigPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    general: {
      appName: 'Sevora Team Platform',
      companyName: 'Sevora',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      language: 'en'
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      digestFrequency: 'daily'
    },
    security: {
      sessionTimeout: 60,
      mfaEnabled: false,
      passwordExpiry: 90,
      loginAttempts: 5
    },
    email: {
      fromName: 'Sevora Team',
      fromEmail: 'noreply@sevora.com',
      replyTo: 'support@sevora.com'
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Configuration saved successfully');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="system-config-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/systems')}
            className="text-[#4A3728] hover:bg-[#E8D5C4]/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Systems</p>
            <h1 className="text-3xl font-bold text-[#4A3728] flex items-center gap-2">
              <Settings className="h-8 w-8 text-[#8B7355]" /> System Configuration
            </h1>
            <p className="text-[#6B5D52] mt-1">General system settings and preferences</p>
          </div>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-[#4A3728] hover:bg-[#3A2A1E]"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-[#E8D5C4]/50">
          <TabsTrigger value="general" className="data-[state=active]:bg-white">
            <Globe className="w-4 h-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white">
            <Bell className="w-4 h-4 mr-2" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white">
            <Shield className="w-4 h-4 mr-2" /> Security
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-white">
            <Mail className="w-4 h-4 mr-2" /> Email
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">General Settings</CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Basic application configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Application Name</Label>
                  <Input 
                    value={config.general.appName}
                    onChange={(e) => setConfig({...config, general: {...config.general, appName: e.target.value}})}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Company Name</Label>
                  <Input 
                    value={config.general.companyName}
                    onChange={(e) => setConfig({...config, general: {...config.general, companyName: e.target.value}})}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Timezone</Label>
                  <Select 
                    value={config.general.timezone}
                    onValueChange={(v) => setConfig({...config, general: {...config.general, timezone: v}})}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Date Format</Label>
                  <Select 
                    value={config.general.dateFormat}
                    onValueChange={(v) => setConfig({...config, general: {...config.general, dateFormat: v}})}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">Notification Settings</CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Configure how users receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">Email Notifications</Label>
                    <p className="text-sm text-[#6B5D52]">Send notifications via email</p>
                  </div>
                  <Switch 
                    checked={config.notifications.emailEnabled}
                    onCheckedChange={(checked) => setConfig({
                      ...config, 
                      notifications: {...config.notifications, emailEnabled: checked}
                    })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">SMS Notifications</Label>
                    <p className="text-sm text-[#6B5D52]">Send notifications via SMS</p>
                  </div>
                  <Switch 
                    checked={config.notifications.smsEnabled}
                    onCheckedChange={(checked) => setConfig({
                      ...config, 
                      notifications: {...config.notifications, smsEnabled: checked}
                    })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">Push Notifications</Label>
                    <p className="text-sm text-[#6B5D52]">Send browser push notifications</p>
                  </div>
                  <Switch 
                    checked={config.notifications.pushEnabled}
                    onCheckedChange={(checked) => setConfig({
                      ...config, 
                      notifications: {...config.notifications, pushEnabled: checked}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Digest Frequency</Label>
                  <Select 
                    value={config.notifications.digestFrequency}
                    onValueChange={(v) => setConfig({
                      ...config, 
                      notifications: {...config.notifications, digestFrequency: v}
                    })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">Security Settings</CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Authentication and access control settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Session Timeout (minutes)</Label>
                  <Input 
                    type="number"
                    value={config.security.sessionTimeout}
                    onChange={(e) => setConfig({
                      ...config, 
                      security: {...config.security, sessionTimeout: parseInt(e.target.value)}
                    })}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Password Expiry (days)</Label>
                  <Input 
                    type="number"
                    value={config.security.passwordExpiry}
                    onChange={(e) => setConfig({
                      ...config, 
                      security: {...config.security, passwordExpiry: parseInt(e.target.value)}
                    })}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Max Login Attempts</Label>
                  <Input 
                    type="number"
                    value={config.security.loginAttempts}
                    onChange={(e) => setConfig({
                      ...config, 
                      security: {...config.security, loginAttempts: parseInt(e.target.value)}
                    })}
                    className="border-[#E8D5C4]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                <div>
                  <Label className="text-[#4A3728]">Multi-Factor Authentication</Label>
                  <p className="text-sm text-[#6B5D52]">Require MFA for all users</p>
                </div>
                <Switch 
                  checked={config.security.mfaEnabled}
                  onCheckedChange={(checked) => setConfig({
                    ...config, 
                    security: {...config.security, mfaEnabled: checked}
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">Email Settings</CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Configure outgoing email settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">From Name</Label>
                  <Input 
                    value={config.email.fromName}
                    onChange={(e) => setConfig({
                      ...config, 
                      email: {...config.email, fromName: e.target.value}
                    })}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">From Email</Label>
                  <Input 
                    type="email"
                    value={config.email.fromEmail}
                    onChange={(e) => setConfig({
                      ...config, 
                      email: {...config.email, fromEmail: e.target.value}
                    })}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[#4A3728]">Reply-To Email</Label>
                  <Input 
                    type="email"
                    value={config.email.replyTo}
                    onChange={(e) => setConfig({
                      ...config, 
                      email: {...config.email, replyTo: e.target.value}
                    })}
                    className="border-[#E8D5C4]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemConfigPage;
