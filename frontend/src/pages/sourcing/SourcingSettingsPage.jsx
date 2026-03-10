import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Save, RefreshCw, Building2, Package, Factory, Mail, Bell,
  Sparkles, Target, Clock, ChevronDown, Plus, Trash2, GripVertical,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const SourcingSettingsPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    pipeline: {
      brandStages: ['Discovery', 'Contacted', 'Qualified', 'Interested', 'Negotiation', 'Onboarded', 'Lost'],
      supplierStages: ['Discovery', 'Contacted', 'Sampling', 'Evaluation', 'Negotiation', 'Active', 'Inactive'],
      manufacturerStages: ['Discovery', 'Contacted', 'Sampling', 'Evaluation', 'Negotiation', 'Active', 'Inactive'],
      defaultBrandStage: 'Discovery',
      defaultSupplierStage: 'Discovery',
      defaultManufacturerStage: 'Discovery'
    },
    email: {
      fromName: 'Sevora Sourcing Team',
      fromEmail: 'sourcing@sevora.com',
      replyTo: 'sourcing@sevora.com',
      signature: 'Best regards,\nSevora Sourcing Team',
      defaultSubjectPrefix: '[Sevora] '
    },
    notifications: {
      followUpReminders: true,
      reminderDaysBefore: 1,
      dailyDigest: true,
      digestTime: '09:00',
      newBrandAlerts: true,
      stageChangeAlerts: true,
      emailOnNewDiscovery: false
    },
    aiDiscovery: {
      enabled: true,
      autoDiscoveryEnabled: false,
      autoDiscoverySchedule: 'weekly',
      defaultSearchKeywords: 'Indian fashion brands, ethnic wear, sustainable fashion',
      minFitScore: 60,
      maxResultsPerSearch: 20,
      autoAddToDatabase: false,
      preferredCategories: ['Womenswear', 'Ethnic Wear', 'Accessories']
    },
    scoring: {
      fitScoreEnabled: true,
      priorityThresholds: {
        high: 80,
        medium: 50,
        low: 0
      },
      autoCalculateFitScore: true
    }
  });

  useEffect(() => {
    // Load settings from backend (simulated)
    const loadSettings = async () => {
      try {
        // In a real implementation, fetch from API
        // const response = await api.get('/sourcing/settings');
        // setSettings(response.data);
        setTimeout(() => setLoading(false), 500);
      } catch (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, save to API
      // await api.put('/sourcing/settings', settings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addStage = (type) => {
    const key = `${type}Stages`;
    const newStage = `New Stage ${settings.pipeline[key].length + 1}`;
    setSettings({
      ...settings,
      pipeline: {
        ...settings.pipeline,
        [key]: [...settings.pipeline[key], newStage]
      }
    });
  };

  const removeStage = (type, index) => {
    const key = `${type}Stages`;
    const newStages = settings.pipeline[key].filter((_, i) => i !== index);
    setSettings({
      ...settings,
      pipeline: {
        ...settings.pipeline,
        [key]: newStages
      }
    });
  };

  const updateStage = (type, index, value) => {
    const key = `${type}Stages`;
    const newStages = [...settings.pipeline[key]];
    newStages[index] = value;
    setSettings({
      ...settings,
      pipeline: {
        ...settings.pipeline,
        [key]: newStages
      }
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="sourcing-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-[#4A3728] flex items-center gap-2">
            <Settings className="h-8 w-8 text-orange-500" /> Settings
          </h1>
          <p className="text-[#6B5D52] mt-1">Configure sourcing module preferences and defaults</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="bg-[#E8D5C4]/50">
          <TabsTrigger value="pipeline" className="data-[state=active]:bg-white">
            <Target className="w-4 h-4 mr-2" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-white">
            <Mail className="w-4 h-4 mr-2" /> Email
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white">
            <Bell className="w-4 h-4 mr-2" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-white">
            <Sparkles className="w-4 h-4 mr-2" /> AI Discovery
          </TabsTrigger>
        </TabsList>

        {/* Pipeline Settings */}
        <TabsContent value="pipeline" className="space-y-6">
          {/* Brand Pipeline */}
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-500" /> Brand Pipeline Stages
              </CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Customize the stages brands go through in your pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {settings.pipeline.brandStages.map((stage, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-[#9C8C74] cursor-move" />
                    <Input
                      value={stage}
                      onChange={(e) => updateStage('brand', index, e.target.value)}
                      className="flex-1 border-[#E8D5C4]"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStage('brand', index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={settings.pipeline.brandStages.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStage('brand')}
                className="border-[#E8D5C4] text-[#4A3728]"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Stage
              </Button>
              <div className="pt-4 border-t border-[#E8D5C4]">
                <Label className="text-[#4A3728]">Default Stage for New Brands</Label>
                <Select
                  value={settings.pipeline.defaultBrandStage}
                  onValueChange={(v) => setSettings({
                    ...settings,
                    pipeline: { ...settings.pipeline, defaultBrandStage: v }
                  })}
                >
                  <SelectTrigger className="w-[200px] mt-2 border-[#E8D5C4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.pipeline.brandStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Pipeline */}
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" /> Supplier Pipeline Stages
              </CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Customize the stages suppliers go through
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {settings.pipeline.supplierStages.map((stage, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-[#9C8C74] cursor-move" />
                    <Input
                      value={stage}
                      onChange={(e) => updateStage('supplier', index, e.target.value)}
                      className="flex-1 border-[#E8D5C4]"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStage('supplier', index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={settings.pipeline.supplierStages.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStage('supplier')}
                className="border-[#E8D5C4] text-[#4A3728]"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Stage
              </Button>
              <div className="pt-4 border-t border-[#E8D5C4]">
                <Label className="text-[#4A3728]">Default Stage for New Suppliers</Label>
                <Select
                  value={settings.pipeline.defaultSupplierStage}
                  onValueChange={(v) => setSettings({
                    ...settings,
                    pipeline: { ...settings.pipeline, defaultSupplierStage: v }
                  })}
                >
                  <SelectTrigger className="w-[200px] mt-2 border-[#E8D5C4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.pipeline.supplierStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Manufacturer Pipeline */}
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Factory className="h-5 w-5 text-purple-500" /> Manufacturer Pipeline Stages
              </CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Customize the stages manufacturers go through
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {settings.pipeline.manufacturerStages.map((stage, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-[#9C8C74] cursor-move" />
                    <Input
                      value={stage}
                      onChange={(e) => updateStage('manufacturer', index, e.target.value)}
                      className="flex-1 border-[#E8D5C4]"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStage('manufacturer', index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={settings.pipeline.manufacturerStages.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStage('manufacturer')}
                className="border-[#E8D5C4] text-[#4A3728]"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Stage
              </Button>
              <div className="pt-4 border-t border-[#E8D5C4]">
                <Label className="text-[#4A3728]">Default Stage for New Manufacturers</Label>
                <Select
                  value={settings.pipeline.defaultManufacturerStage}
                  onValueChange={(v) => setSettings({
                    ...settings,
                    pipeline: { ...settings.pipeline, defaultManufacturerStage: v }
                  })}
                >
                  <SelectTrigger className="w-[200px] mt-2 border-[#E8D5C4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.pipeline.manufacturerStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">Email Configuration</CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Default settings for outreach emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">From Name</Label>
                  <Input
                    value={settings.email.fromName}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, fromName: e.target.value }
                    })}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">From Email</Label>
                  <Input
                    type="email"
                    value={settings.email.fromEmail}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, fromEmail: e.target.value }
                    })}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Reply-To Email</Label>
                  <Input
                    type="email"
                    value={settings.email.replyTo}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, replyTo: e.target.value }
                    })}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Subject Prefix</Label>
                  <Input
                    value={settings.email.defaultSubjectPrefix}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, defaultSubjectPrefix: e.target.value }
                    })}
                    className="border-[#E8D5C4]"
                    placeholder="[Sevora] "
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Default Email Signature</Label>
                <Textarea
                  value={settings.email.signature}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, signature: e.target.value }
                  })}
                  className="border-[#E8D5C4] min-h-[100px]"
                  placeholder="Best regards,&#10;Your Name"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">Notification Preferences</CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Configure how and when you receive sourcing notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">Follow-up Reminders</Label>
                    <p className="text-sm text-[#6B5D52]">Get reminded about upcoming follow-ups</p>
                  </div>
                  <Switch
                    checked={settings.notifications.followUpReminders}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, followUpReminders: checked }
                    })}
                  />
                </div>
                
                {settings.notifications.followUpReminders && (
                  <div className="ml-4 p-4 border-l-2 border-orange-300 bg-orange-50/50 rounded-r-lg">
                    <Label className="text-[#4A3728]">Remind me</Label>
                    <Select
                      value={settings.notifications.reminderDaysBefore.toString()}
                      onValueChange={(v) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, reminderDaysBefore: parseInt(v) }
                      })}
                    >
                      <SelectTrigger className="w-[200px] mt-2 border-[#E8D5C4]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">On the day</SelectItem>
                        <SelectItem value="1">1 day before</SelectItem>
                        <SelectItem value="2">2 days before</SelectItem>
                        <SelectItem value="3">3 days before</SelectItem>
                        <SelectItem value="7">1 week before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">Daily Digest</Label>
                    <p className="text-sm text-[#6B5D52]">Receive a daily summary of sourcing activities</p>
                  </div>
                  <Switch
                    checked={settings.notifications.dailyDigest}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, dailyDigest: checked }
                    })}
                  />
                </div>

                {settings.notifications.dailyDigest && (
                  <div className="ml-4 p-4 border-l-2 border-orange-300 bg-orange-50/50 rounded-r-lg">
                    <Label className="text-[#4A3728]">Send digest at</Label>
                    <Input
                      type="time"
                      value={settings.notifications.digestTime}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, digestTime: e.target.value }
                      })}
                      className="w-[150px] mt-2 border-[#E8D5C4]"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">New Brand Alerts</Label>
                    <p className="text-sm text-[#6B5D52]">Get notified when new brands are discovered or added</p>
                  </div>
                  <Switch
                    checked={settings.notifications.newBrandAlerts}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, newBrandAlerts: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                  <div>
                    <Label className="text-[#4A3728]">Stage Change Alerts</Label>
                    <p className="text-sm text-[#6B5D52]">Get notified when entities move through pipeline stages</p>
                  </div>
                  <Switch
                    checked={settings.notifications.stageChangeAlerts}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, stageChangeAlerts: checked }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Discovery Settings */}
        <TabsContent value="ai">
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" /> AI Discovery Configuration
              </CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Configure AI-powered brand discovery settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                <div>
                  <Label className="text-[#4A3728]">Enable AI Discovery</Label>
                  <p className="text-sm text-[#6B5D52]">Use AI to discover and analyze potential brands</p>
                </div>
                <Switch
                  checked={settings.aiDiscovery.enabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    aiDiscovery: { ...settings.aiDiscovery, enabled: checked }
                  })}
                />
              </div>

              {settings.aiDiscovery.enabled && (
                <>
                  <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Auto-Discovery</Label>
                      <p className="text-sm text-[#6B5D52]">Automatically run discovery on a schedule</p>
                    </div>
                    <Switch
                      checked={settings.aiDiscovery.autoDiscoveryEnabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        aiDiscovery: { ...settings.aiDiscovery, autoDiscoveryEnabled: checked }
                      })}
                    />
                  </div>

                  {settings.aiDiscovery.autoDiscoveryEnabled && (
                    <div className="ml-4 p-4 border-l-2 border-orange-300 bg-orange-50/50 rounded-r-lg">
                      <Label className="text-[#4A3728]">Discovery Schedule</Label>
                      <Select
                        value={settings.aiDiscovery.autoDiscoverySchedule}
                        onValueChange={(v) => setSettings({
                          ...settings,
                          aiDiscovery: { ...settings.aiDiscovery, autoDiscoverySchedule: v }
                        })}
                      >
                        <SelectTrigger className="w-[200px] mt-2 border-[#E8D5C4]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[#4A3728]">Default Search Keywords</Label>
                    <Textarea
                      value={settings.aiDiscovery.defaultSearchKeywords}
                      onChange={(e) => setSettings({
                        ...settings,
                        aiDiscovery: { ...settings.aiDiscovery, defaultSearchKeywords: e.target.value }
                      })}
                      className="border-[#E8D5C4]"
                      placeholder="Indian fashion brands, ethnic wear, sustainable fashion"
                    />
                    <p className="text-xs text-[#9C8C74]">Comma-separated keywords for AI search</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[#4A3728]">Minimum Fit Score</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.aiDiscovery.minFitScore}
                        onChange={(e) => setSettings({
                          ...settings,
                          aiDiscovery: { ...settings.aiDiscovery, minFitScore: parseInt(e.target.value) || 0 }
                        })}
                        className="border-[#E8D5C4]"
                      />
                      <p className="text-xs text-[#9C8C74]">Only show brands with fit score above this value</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#4A3728]">Max Results Per Search</Label>
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={settings.aiDiscovery.maxResultsPerSearch}
                        onChange={(e) => setSettings({
                          ...settings,
                          aiDiscovery: { ...settings.aiDiscovery, maxResultsPerSearch: parseInt(e.target.value) || 20 }
                        })}
                        className="border-[#E8D5C4]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Auto-Add to Database</Label>
                      <p className="text-sm text-[#6B5D52]">Automatically add discovered brands to your database</p>
                    </div>
                    <Switch
                      checked={settings.aiDiscovery.autoAddToDatabase}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        aiDiscovery: { ...settings.aiDiscovery, autoAddToDatabase: checked }
                      })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Scoring Settings */}
          <Card className="border-[#E8D5C4] bg-white/80 mt-6">
            <CardHeader>
              <CardTitle className="text-[#4A3728] flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" /> Scoring Configuration
              </CardTitle>
              <CardDescription className="text-[#6B5D52]">
                Configure how fit scores and priorities are calculated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                <div>
                  <Label className="text-[#4A3728]">Enable Fit Scoring</Label>
                  <p className="text-sm text-[#6B5D52]">Calculate and display fit scores for brands</p>
                </div>
                <Switch
                  checked={settings.scoring.fitScoreEnabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    scoring: { ...settings.scoring, fitScoreEnabled: checked }
                  })}
                />
              </div>

              {settings.scoring.fitScoreEnabled && (
                <>
                  <div className="space-y-4">
                    <Label className="text-[#4A3728]">Priority Thresholds</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800">High</Badge>
                          <span className="text-sm text-[#6B5D52]">≥</span>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={settings.scoring.priorityThresholds.high}
                          onChange={(e) => setSettings({
                            ...settings,
                            scoring: {
                              ...settings.scoring,
                              priorityThresholds: {
                                ...settings.scoring.priorityThresholds,
                                high: parseInt(e.target.value) || 0
                              }
                            }
                          })}
                          className="border-[#E8D5C4]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                          <span className="text-sm text-[#6B5D52]">≥</span>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={settings.scoring.priorityThresholds.medium}
                          onChange={(e) => setSettings({
                            ...settings,
                            scoring: {
                              ...settings.scoring,
                              priorityThresholds: {
                                ...settings.scoring.priorityThresholds,
                                medium: parseInt(e.target.value) || 0
                              }
                            }
                          })}
                          className="border-[#E8D5C4]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-100 text-gray-800">Low</Badge>
                          <span className="text-sm text-[#6B5D52]">≥</span>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={settings.scoring.priorityThresholds.low}
                          onChange={(e) => setSettings({
                            ...settings,
                            scoring: {
                              ...settings.scoring,
                              priorityThresholds: {
                                ...settings.scoring.priorityThresholds,
                                low: parseInt(e.target.value) || 0
                              }
                            }
                          })}
                          className="border-[#E8D5C4]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                    <div>
                      <Label className="text-[#4A3728]">Auto-Calculate Fit Score</Label>
                      <p className="text-sm text-[#6B5D52]">Automatically calculate fit scores based on criteria</p>
                    </div>
                    <Switch
                      checked={settings.scoring.autoCalculateFitScore}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        scoring: { ...settings.scoring, autoCalculateFitScore: checked }
                      })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SourcingSettingsPage;
