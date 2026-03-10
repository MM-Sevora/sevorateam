import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Settings, Bell, Mail, Share2, GitBranch, Clock, AlertTriangle, 
  CheckCircle, XCircle, Loader2, Save, RefreshCw, History,
  Zap, Target, MessageSquare, Calendar, ChevronRight, Info,
  FolderKanban, ListTodo, CalendarClock, Users, CheckSquare, ArrowRight
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

          {/* Goals & Projects Automations */}
          {settings.goals_projects && (
          <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden" data-testid="goals-projects-automations">
            <div className="px-6 py-4 border-b border-[#E8D5C4] bg-gradient-to-r from-[#F5EDE4] to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <FolderKanban className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#3D2E22]">Goals & Projects Automations</h2>
                  <p className="text-sm text-[#8B7355]">Automate progress tracking and task alerts</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-[#E8D5C4]">
              {/* Progress Cascade */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-[#3D2E22]">Progress Cascade</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.goals_projects.progress_cascade?.description || 'Auto-update project, objective, and goal progress when tasks are completed'}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
                    <CheckSquare className="w-3 h-3" />
                    <span>Task</span>
                    <ArrowRight className="w-3 h-3" />
                    <FolderKanban className="w-3 h-3" />
                    <span>Project</span>
                    <ArrowRight className="w-3 h-3" />
                    <Target className="w-3 h-3" />
                    <span>Goal</span>
                  </div>
                </div>
                <Switch
                  checked={settings.goals_projects.progress_cascade?.enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('goals_projects', 'progress_cascade', 'enabled', checked)}
                  data-testid="toggle-progress-cascade"
                />
              </div>
              
              {/* Overdue Task Alerts */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-[#3D2E22]">Overdue Task Alerts</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.goals_projects.overdue_task_alert?.description || 'Send notifications for overdue tasks'}</p>
                  {settings.goals_projects.overdue_task_alert?.enabled && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={settings.goals_projects.overdue_task_alert?.notify_assignee ?? true}
                            onChange={(e) => updateSetting('goals_projects', 'overdue_task_alert', 'notify_assignee', e.target.checked)}
                            className="rounded border-[#E8D5C4]"
                          />
                          <span className="text-[#5D4A3A]">Notify Assignee</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={settings.goals_projects.overdue_task_alert?.notify_manager ?? true}
                            onChange={(e) => updateSetting('goals_projects', 'overdue_task_alert', 'notify_manager', e.target.checked)}
                            className="rounded border-[#E8D5C4]"
                          />
                          <span className="text-[#5D4A3A]">Notify Manager</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[#5D4A3A]">Channels:</span>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={settings.goals_projects.overdue_task_alert?.channels?.in_app ?? true}
                            onChange={(e) => {
                              const newChannels = {...(settings.goals_projects.overdue_task_alert?.channels || {}), in_app: e.target.checked};
                              updateSetting('goals_projects', 'overdue_task_alert', 'channels', newChannels);
                            }}
                            className="rounded border-[#E8D5C4]"
                          />
                          <Bell className="w-3 h-3 text-[#8B7355]" />
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={settings.goals_projects.overdue_task_alert?.channels?.email ?? true}
                            onChange={(e) => {
                              const newChannels = {...(settings.goals_projects.overdue_task_alert?.channels || {}), email: e.target.checked};
                              updateSetting('goals_projects', 'overdue_task_alert', 'channels', newChannels);
                            }}
                            className="rounded border-[#E8D5C4]"
                          />
                          <Mail className="w-3 h-3 text-[#8B7355]" />
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={settings.goals_projects.overdue_task_alert?.channels?.teams ?? false}
                            onChange={(e) => {
                              const newChannels = {...(settings.goals_projects.overdue_task_alert?.channels || {}), teams: e.target.checked};
                              updateSetting('goals_projects', 'overdue_task_alert', 'channels', newChannels);
                            }}
                            className="rounded border-[#E8D5C4]"
                          />
                          <Users className="w-3 h-3 text-[#8B7355]" />
                          <span className="text-xs text-[#8B7355]">Teams</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.goals_projects.overdue_task_alert?.enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('goals_projects', 'overdue_task_alert', 'enabled', checked)}
                  data-testid="toggle-overdue-alert"
                />
              </div>
              
              {/* Task Deadline Reminder */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-[#3D2E22]">Task Deadline Reminders</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.goals_projects.task_deadline_reminder?.description || 'Remind users about upcoming task deadlines'}</p>
                </div>
                <Switch
                  checked={settings.goals_projects.task_deadline_reminder?.enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('goals_projects', 'task_deadline_reminder', 'enabled', checked)}
                  data-testid="toggle-deadline-reminder"
                />
              </div>
              
              {/* Phase 2: Goal At-Risk Alert */}
              <div className="px-6 py-4 flex items-center justify-between border-t-2 border-dashed border-[#E8D5C4]">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-rose-500" />
                    <span className="font-medium text-[#3D2E22]">Goal At-Risk Alerts</span>
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-xs rounded">Phase 2</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.goals_projects.goal_at_risk_alert?.description || 'Alert when goals are behind schedule'}</p>
                  {settings.goals_projects.goal_at_risk_alert?.enabled && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[#5D4A3A]">Alert when progress &lt;</span>
                          <input
                            type="number"
                            value={settings.goals_projects.goal_at_risk_alert?.progress_threshold ?? 50}
                            onChange={(e) => updateSetting('goals_projects', 'goal_at_risk_alert', 'progress_threshold', parseInt(e.target.value))}
                            className="w-16 px-2 py-1 text-sm border border-[#E8D5C4] rounded-md text-center"
                            min="10"
                            max="90"
                          />
                          <span className="text-[#5D4A3A]">%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#5D4A3A]">within</span>
                          <input
                            type="number"
                            value={settings.goals_projects.goal_at_risk_alert?.days_before_deadline ?? 30}
                            onChange={(e) => updateSetting('goals_projects', 'goal_at_risk_alert', 'days_before_deadline', parseInt(e.target.value))}
                            className="w-16 px-2 py-1 text-sm border border-[#E8D5C4] rounded-md text-center"
                            min="7"
                            max="90"
                          />
                          <span className="text-[#5D4A3A]">days of deadline</span>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={settings.goals_projects.goal_at_risk_alert?.auto_schedule_review ?? true}
                          onChange={(e) => updateSetting('goals_projects', 'goal_at_risk_alert', 'auto_schedule_review', e.target.checked)}
                          className="rounded border-[#E8D5C4]"
                        />
                        <span className="text-[#5D4A3A]">Auto-schedule review meeting</span>
                      </label>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.goals_projects.goal_at_risk_alert?.enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('goals_projects', 'goal_at_risk_alert', 'enabled', checked)}
                  data-testid="toggle-goal-at-risk"
                />
              </div>
              
              {/* Phase 2: Blocked Task Escalation */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="font-medium text-[#3D2E22]">Blocked Task Escalation</span>
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">Phase 2</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.goals_projects.blocked_task_escalation?.description || 'Escalate tasks blocked for too long'}</p>
                  {settings.goals_projects.blocked_task_escalation?.enabled && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#5D4A3A]">Escalate after</span>
                        <input
                          type="number"
                          value={settings.goals_projects.blocked_task_escalation?.blocked_days_threshold ?? 2}
                          onChange={(e) => updateSetting('goals_projects', 'blocked_task_escalation', 'blocked_days_threshold', parseInt(e.target.value))}
                          className="w-16 px-2 py-1 text-sm border border-[#E8D5C4] rounded-md text-center"
                          min="1"
                          max="14"
                        />
                        <span className="text-[#5D4A3A]">days blocked</span>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={settings.goals_projects.blocked_task_escalation?.auto_schedule_meeting ?? false}
                          onChange={(e) => updateSetting('goals_projects', 'blocked_task_escalation', 'auto_schedule_meeting', e.target.checked)}
                          className="rounded border-[#E8D5C4]"
                        />
                        <span className="text-[#5D4A3A]">Auto-schedule resolution meeting</span>
                      </label>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.goals_projects.blocked_task_escalation?.enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('goals_projects', 'blocked_task_escalation', 'enabled', checked)}
                  data-testid="toggle-blocked-escalation"
                />
              </div>
              
              {/* Phase 2: Weekly Progress Report */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-[#3D2E22]">Weekly Progress Report</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">Phase 2</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.goals_projects.weekly_progress_report?.description || 'Send weekly progress summary every Monday'}</p>
                  {settings.goals_projects.weekly_progress_report?.enabled && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.goals_projects.weekly_progress_report?.include_goals ?? true}
                            onChange={(e) => updateSetting('goals_projects', 'weekly_progress_report', 'include_goals', e.target.checked)}
                            className="rounded border-[#E8D5C4]"
                          />
                          <span className="text-[#5D4A3A]">Include Goals</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.goals_projects.weekly_progress_report?.include_projects ?? true}
                            onChange={(e) => updateSetting('goals_projects', 'weekly_progress_report', 'include_projects', e.target.checked)}
                            className="rounded border-[#E8D5C4]"
                          />
                          <span className="text-[#5D4A3A]">Include Projects</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.goals_projects.weekly_progress_report?.include_tasks ?? true}
                            onChange={(e) => updateSetting('goals_projects', 'weekly_progress_report', 'include_tasks', e.target.checked)}
                            className="rounded border-[#E8D5C4]"
                          />
                          <span className="text-[#5D4A3A]">Include Tasks</span>
                        </label>
                      </div>
                      <p className="text-xs text-[#8B7355]">Reports are sent every Monday at 9:00 AM to managers and above</p>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.goals_projects.weekly_progress_report?.enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('goals_projects', 'weekly_progress_report', 'enabled', checked)}
                  data-testid="toggle-weekly-report"
                />
              </div>
            </div>
          </div>
          )}

          {/* Communication Hub Automations */}
          {settings.communication && (
          <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden" data-testid="communication-automations">
            <div className="px-6 py-4 border-b border-[#E8D5C4] bg-gradient-to-r from-[#F5EDE4] to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <CalendarClock className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#3D2E22]">Communication Hub Automations</h2>
                  <p className="text-sm text-[#8B7355]">Automate meeting reminders and action items</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-[#E8D5C4]">
              {/* Meeting Reminders */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-[#3D2E22]">Meeting Reminders</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.communication.meeting_reminder?.description || 'Send reminders before meetings'}</p>
                  {settings.communication.meeting_reminder?.enabled && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#5D4A3A]">Remind at:</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">24h before</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">1h before</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">15min before</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[#5D4A3A]">Channels:</span>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={settings.communication.meeting_reminder?.channels?.in_app ?? true}
                            onChange={(e) => {
                              const newChannels = {...(settings.communication.meeting_reminder?.channels || {}), in_app: e.target.checked};
                              updateSetting('communication', 'meeting_reminder', 'channels', newChannels);
                            }}
                            className="rounded border-[#E8D5C4]"
                          />
                          <Bell className="w-3 h-3 text-[#8B7355]" />
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={settings.communication.meeting_reminder?.channels?.email ?? true}
                            onChange={(e) => {
                              const newChannels = {...(settings.communication.meeting_reminder?.channels || {}), email: e.target.checked};
                              updateSetting('communication', 'meeting_reminder', 'channels', newChannels);
                            }}
                            className="rounded border-[#E8D5C4]"
                          />
                          <Mail className="w-3 h-3 text-[#8B7355]" />
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={settings.communication.meeting_reminder?.channels?.teams ?? false}
                            onChange={(e) => {
                              const newChannels = {...(settings.communication.meeting_reminder?.channels || {}), teams: e.target.checked};
                              updateSetting('communication', 'meeting_reminder', 'channels', newChannels);
                            }}
                            className="rounded border-[#E8D5C4]"
                          />
                          <Users className="w-3 h-3 text-[#8B7355]" />
                          <span className="text-xs text-[#8B7355]">Teams</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.communication.meeting_reminder?.enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('communication', 'meeting_reminder', 'enabled', checked)}
                  data-testid="toggle-meeting-reminder"
                />
              </div>
              
              {/* Action Item to Task */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-[#3D2E22]">Action Item → Task</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.communication.action_item_to_task?.description || 'Automatically create tasks from meeting action items'}</p>
                  {settings.communication.action_item_to_task?.enabled && (
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.communication.action_item_to_task?.auto_assign ?? true}
                          onChange={(e) => updateSetting('communication', 'action_item_to_task', 'auto_assign', e.target.checked)}
                          className="rounded border-[#E8D5C4]"
                        />
                        <span className="text-[#5D4A3A]">Auto-assign to action owner</span>
                      </label>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.communication.action_item_to_task?.enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('communication', 'action_item_to_task', 'enabled', checked)}
                  data-testid="toggle-action-to-task"
                />
              </div>
              
              {/* Overdue Action Items */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="font-medium text-[#3D2E22]">Overdue Action Item Alerts</span>
                  </div>
                  <p className="text-sm text-[#8B7355] mt-1">{settings.communication.overdue_action_item?.description || 'Alert when action items are overdue'}</p>
                  {settings.communication.overdue_action_item?.enabled && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-[#5D4A3A]">Escalate after</span>
                      <input
                        type="number"
                        value={settings.communication.overdue_action_item?.escalate_after_days ?? 3}
                        onChange={(e) => updateSetting('communication', 'overdue_action_item', 'escalate_after_days', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 text-sm border border-[#E8D5C4] rounded-md text-center"
                        min="1"
                        max="14"
                      />
                      <span className="text-[#5D4A3A]">days</span>
                    </div>
                  )}
                </div>
                <Switch
                  checked={settings.communication.overdue_action_item?.enabled ?? true}
                  onCheckedChange={(checked) => updateSetting('communication', 'overdue_action_item', 'enabled', checked)}
                  data-testid="toggle-overdue-action"
                />
              </div>
            </div>
          </div>
          )}

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
