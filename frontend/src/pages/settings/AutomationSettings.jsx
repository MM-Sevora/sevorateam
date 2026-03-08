import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Settings, Bell, Mail, Share2, GitBranch, Clock, AlertTriangle, 
  CheckCircle, XCircle, Loader2, Save, RefreshCw, History,
  Zap, Target, MessageSquare, Calendar, ChevronRight, Info
} from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';

const AutomationSettings = () => {
  const [settings, setSettings] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, actionsRes, logsRes] = await Promise.all([
        api.get('/automations/settings'),
        api.get('/automations/pending-actions'),
        api.get('/automations/logs?limit=20')
      ]);
      setSettings(settingsRes.data.settings);
      setPendingActions(actionsRes.data.pending_actions || []);
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to load automation data:', err);
      toast.error('Failed to load automation settings');
    }
    setLoading(false);
  };

  const updateSetting = (module, key, field, value) => {
    setSettings(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [key]: {
          ...prev[module][key],
          [field]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/automations/settings', { settings });
      toast.success('Automation settings saved');
      setHasChanges(false);
    } catch (err) {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  const executeAction = async (actionType, data) => {
    try {
      await api.post(`/automations/execute/${actionType}`, data);
      toast.success('Action executed');
      fetchData(); // Refresh data
    } catch (err) {
      toast.error('Failed to execute action');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'stuck_deal': return <AlertTriangle className="w-4 h-4" />;
      case 'follow_up_reminder': return <Mail className="w-4 h-4" />;
      case 'scheduled_post': return <Share2 className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
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
    <div className="p-6 max-w-6xl mx-auto" data-testid="automation-settings-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
          <ChevronRight className="w-4 h-4" />
          <span>Automations</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3D2E22]">Automation Settings</h1>
            <p className="text-[#8B7355] mt-1">Configure automated workflows across your marketing operations</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 rounded-lg border border-[#E8D5C4] hover:bg-[#F5EDE4] transition-colors"
              data-testid="refresh-automations-btn"
            >
              <RefreshCw className="w-5 h-5 text-[#5D4A3A]" />
            </button>
            {hasChanges && (
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors disabled:opacity-50"
                data-testid="save-settings-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F5EDE4] p-1 rounded-lg w-fit">
        {[
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'actions', label: 'Pending Actions', icon: Bell, count: pendingActions.length },
          { id: 'logs', label: 'Activity Log', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-white text-[#3D2E22] shadow-sm' 
                : 'text-[#8B7355] hover:text-[#5D4A3A]'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-6">
          {/* Pipeline Automations */}
          <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden" data-testid="pipeline-automations">
            <div className="px-6 py-4 border-b border-[#E8D5C4] bg-gradient-to-r from-[#F5EDE4] to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#8B7355]/10 rounded-lg">
                  <GitBranch className="w-5 h-5 text-[#8B7355]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#3D2E22]">Pipeline Automations</h2>
                  <p className="text-sm text-[#8B7355]">Automate contact stage transitions and deal tracking</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-[#E8D5C4]">
              {/* Auto-advance on contact */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-[#3D2E22]">Auto-advance on First Contact</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.pipeline.auto_advance_on_contact.description}</p>
                </div>
                <Switch
                  checked={settings.pipeline.auto_advance_on_contact.enabled}
                  onCheckedChange={(checked) => updateSetting('pipeline', 'auto_advance_on_contact', 'enabled', checked)}
                  data-testid="toggle-auto-advance"
                />
              </div>
              
              {/* Stuck deal alert */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-[#3D2E22]">Stuck Deal Alerts</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.pipeline.stuck_deal_alert.description}</p>
                  {settings.pipeline.stuck_deal_alert.enabled && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-[#5D4A3A]">Alert after</span>
                      <input
                        type="number"
                        value={settings.pipeline.stuck_deal_alert.days}
                        onChange={(e) => updateSetting('pipeline', 'stuck_deal_alert', 'days', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 text-sm border border-[#E8D5C4] rounded-md text-center"
                        min="1"
                        max="30"
                      />
                      <span className="text-sm text-[#5D4A3A]">days</span>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.pipeline.stuck_deal_alert.enabled}
                  onCheckedChange={(checked) => updateSetting('pipeline', 'stuck_deal_alert', 'enabled', checked)}
                  data-testid="toggle-stuck-alert"
                />
              </div>
              
              {/* Auto-archive lost */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-stone-400" />
                    <span className="font-medium text-[#3D2E22]">Auto-archive Lost Deals</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.pipeline.auto_archive_lost.description}</p>
                  {settings.pipeline.auto_archive_lost.enabled && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-[#5D4A3A]">Archive after</span>
                      <input
                        type="number"
                        value={settings.pipeline.auto_archive_lost.days}
                        onChange={(e) => updateSetting('pipeline', 'auto_archive_lost', 'days', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 text-sm border border-[#E8D5C4] rounded-md text-center"
                        min="1"
                        max="90"
                      />
                      <span className="text-sm text-[#5D4A3A]">days</span>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.pipeline.auto_archive_lost.enabled}
                  onCheckedChange={(checked) => updateSetting('pipeline', 'auto_archive_lost', 'enabled', checked)}
                  data-testid="toggle-auto-archive"
                />
              </div>
            </div>
          </div>

          {/* Email Automations */}
          <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden" data-testid="email-automations">
            <div className="px-6 py-4 border-b border-[#E8D5C4] bg-gradient-to-r from-[#F5EDE4] to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#3D2E22]">Email Automations</h2>
                  <p className="text-sm text-[#8B7355]">Automate follow-ups and email sequences</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-[#E8D5C4]">
              {/* Follow-up reminder */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-[#3D2E22]">Follow-up Reminders</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.email.follow_up_reminder.description}</p>
                  {settings.email.follow_up_reminder.enabled && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-[#5D4A3A]">Remind after</span>
                      <input
                        type="number"
                        value={settings.email.follow_up_reminder.days}
                        onChange={(e) => updateSetting('email', 'follow_up_reminder', 'days', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 text-sm border border-[#E8D5C4] rounded-md text-center"
                        min="1"
                        max="14"
                      />
                      <span className="text-sm text-[#5D4A3A]">days of no reply</span>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.email.follow_up_reminder.enabled}
                  onCheckedChange={(checked) => updateSetting('email', 'follow_up_reminder', 'enabled', checked)}
                  data-testid="toggle-follow-up"
                />
              </div>
              
              {/* Auto sequence */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-[#3D2E22]">Email Sequences</span>
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-600 rounded-full">Coming Soon</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.email.auto_sequence.description}</p>
                </div>
                <Switch
                  checked={settings.email.auto_sequence.enabled}
                  onCheckedChange={(checked) => updateSetting('email', 'auto_sequence', 'enabled', checked)}
                  disabled
                  data-testid="toggle-sequence"
                />
              </div>
            </div>
          </div>

          {/* Social Media Automations */}
          <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden" data-testid="social-automations">
            <div className="px-6 py-4 border-b border-[#E8D5C4] bg-gradient-to-r from-[#F5EDE4] to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 rounded-lg">
                  <Share2 className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#3D2E22]">Social Media Automations</h2>
                  <p className="text-sm text-[#8B7355]">Automate social media posting and scheduling</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-[#E8D5C4]">
              {/* Auto-publish */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-[#3D2E22]">Auto-publish Scheduled Posts</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.social.auto_publish.description}</p>
                </div>
                <Switch
                  checked={settings.social.auto_publish.enabled}
                  onCheckedChange={(checked) => updateSetting('social', 'auto_publish', 'enabled', checked)}
                  data-testid="toggle-auto-publish"
                />
              </div>
              
              {/* Daily limit */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-500" />
                    <span className="font-medium text-[#3D2E22]">Daily Posting Limit</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.social.daily_limit.description}</p>
                  {settings.social.daily_limit.enabled && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-[#5D4A3A]">Max</span>
                      <input
                        type="number"
                        value={settings.social.daily_limit.limit}
                        onChange={(e) => updateSetting('social', 'daily_limit', 'limit', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 text-sm border border-[#E8D5C4] rounded-md text-center"
                        min="1"
                        max="50"
                      />
                      <span className="text-sm text-[#5D4A3A]">posts per platform per day</span>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.social.daily_limit.enabled}
                  onCheckedChange={(checked) => updateSetting('social', 'daily_limit', 'enabled', checked)}
                  data-testid="toggle-daily-limit"
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">How automations work</p>
              <p className="text-sm text-blue-600 mt-1">
                Automations run in the background every 5 minutes. Pipeline and email automations create 
                pending actions for you to review. Social posts are published automatically when their 
                scheduled time arrives.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Actions Tab */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          {pendingActions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-[#E8D5C4]">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#3D2E22]">All caught up!</h3>
              <p className="text-[#8B7355] mt-1">No pending automation actions at the moment</p>
            </div>
          ) : (
            pendingActions.map((action, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${getPriorityColor(action.priority)} flex items-center justify-between`}
                data-testid={`pending-action-${idx}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/50 rounded-lg">
                    {getActionIcon(action.type)}
                  </div>
                  <div>
                    <p className="font-medium">{action.message}</p>
                    <p className="text-sm opacity-75 capitalize">{action.type.replace('_', ' ')} • {action.priority} priority</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {action.type === 'stuck_deal' && (
                    <button
                      onClick={() => executeAction('advance_stage', { contact_id: action.contact_id, new_stage: 'contacted' })}
                      className="px-3 py-1.5 text-sm bg-white rounded-md hover:bg-white/80 transition-colors"
                    >
                      Move Stage
                    </button>
                  )}
                  {action.type === 'follow_up_reminder' && (
                    <button
                      onClick={() => window.location.href = `/email?compose=true&to=${action.email}`}
                      className="px-3 py-1.5 text-sm bg-white rounded-md hover:bg-white/80 transition-colors"
                    >
                      Send Email
                    </button>
                  )}
                  {action.type === 'scheduled_post' && (
                    <button
                      onClick={() => executeAction('publish_post', { post_id: action.post_id })}
                      className="px-3 py-1.5 text-sm bg-white rounded-md hover:bg-white/80 transition-colors"
                    >
                      Publish Now
                    </button>
                  )}
                  <button
                    onClick={() => executeAction('dismiss', action)}
                    className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-800 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#3D2E22]">No activity yet</h3>
              <p className="text-[#8B7355] mt-1">Automation actions will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E8D5C4]">
              {logs.map((log, idx) => (
                <div key={idx} className="px-6 py-4 flex items-center justify-between" data-testid={`log-${idx}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#F5EDE4] rounded-lg">
                      <Zap className="w-4 h-4 text-[#8B7355]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#3D2E22] capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-[#8B7355]">
                        {log.user_name ? `By ${log.user_name}` : 'System'} • {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {log.result?.success !== undefined && (
                    <span className={`px-2 py-1 text-xs rounded-full ${log.result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {log.result.success ? 'Success' : 'Failed'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutomationSettings;
