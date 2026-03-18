import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Zap, Plus, Trash2, Play, Pause, History, RefreshCw, 
  ArrowRight, Settings, CheckCircle, Bell, MessageSquare, UserPlus,
  Clock, AlertTriangle, GitBranch
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Trigger types configuration
const TRIGGER_TYPES = [
  { value: 'status_changed', label: 'Status Changed', icon: RefreshCw, description: 'When a task status is updated' },
  { value: 'task_created', label: 'Task Created', icon: Plus, description: 'When a new task is created' },
  { value: 'due_date_approaching', label: 'Due Date Approaching', icon: Clock, description: 'When task is near due date' },
  { value: 'blocked_days', label: 'Task Blocked', icon: AlertTriangle, description: 'When task is blocked for X days' }
];

// Action types configuration
const ACTION_TYPES = [
  { value: 'update_status', label: 'Update Status', icon: RefreshCw, description: 'Change the task status' },
  { value: 'close_subtasks', label: 'Close Subtasks', icon: CheckCircle, description: 'Mark all subtasks as completed' },
  { value: 'send_notification', label: 'Send Notification', icon: Bell, description: 'Notify users' },
  { value: 'add_comment', label: 'Add Comment', icon: MessageSquare, description: 'Add an automated comment' },
  { value: 'assign_user', label: 'Assign User', icon: UserPlus, description: 'Assign task to a user' }
];

// Status options
const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' }
];

const AutomationsPage = () => {
  const { api } = useAuth();
  
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rules');
  
  // Create rule modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: '',
    trigger_conditions: {},
    actions: []
  });
  const [currentAction, setCurrentAction] = useState({ type: '', config: {} });

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/engineering/automations/rules');
      setRules(response.data || []);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get('/engineering/automations/logs');
      setLogs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchRules();
    fetchLogs();
  }, [fetchRules, fetchLogs]);

  const seedDefaults = async () => {
    try {
      const response = await api.post('/engineering/automations/seed-defaults');
      toast.success(response.data.message);
      fetchRules();
    } catch (error) {
      toast.error('Failed to seed defaults');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Delete this automation rule?')) return;
    
    try {
      await api.delete(`/engineering/automations/rules/${ruleId}`);
      toast.success('Rule deleted');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleToggleRule = async (rule) => {
    // For now just show toast - would need backend endpoint to toggle
    toast.info(`Rule ${rule.is_active ? 'disabled' : 'enabled'} (UI only)`);
  };

  const handleAddAction = () => {
    if (!currentAction.type) {
      toast.error('Select an action type');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { ...currentAction }]
    }));
    setCurrentAction({ type: '', config: {} });
  };

  const handleRemoveAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const handleCreateRule = async () => {
    if (!formData.name || !formData.trigger_type || formData.actions.length === 0) {
      toast.error('Name, trigger, and at least one action are required');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/engineering/automations/rules', {
        name: formData.name,
        description: formData.description,
        trigger: {
          type: formData.trigger_type,
          conditions: formData.trigger_conditions
        },
        actions: formData.actions.map(a => ({
          type: a.type,
          config: a.config
        }))
      });
      
      toast.success('Automation rule created!');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', trigger_type: '', trigger_conditions: {}, actions: [] });
      fetchRules();
    } catch (error) {
      toast.error('Failed to create rule');
    } finally {
      setSaving(false);
    }
  };

  const getTriggerIcon = (type) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === type);
    return trigger ? trigger.icon : Zap;
  };

  const getActionIcon = (type) => {
    const action = ACTION_TYPES.find(a => a.value === type);
    return action ? action.icon : Settings;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="automations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Workflow Automations
          </h1>
          <p className="text-gray-500 mt-1">Automate repetitive tasks with triggers and actions</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={seedDefaults}>
            <GitBranch className="w-4 h-4 mr-1" /> Seed Defaults
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="w-4 h-4 mr-1" /> Create Rule
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-1">
            <Settings className="w-4 h-4" /> Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1">
            <History className="w-4 h-4" /> Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Automation Rules</h3>
                <p className="text-gray-500 mt-1 mb-4">Create rules to automate your workflow</p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={seedDefaults}>
                    Use Default Rules
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create Custom Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rules.map(rule => {
                const TriggerIcon = getTriggerIcon(rule.trigger?.type);
                return (
                  <Card key={rule.id} className={`${rule.is_active ? '' : 'opacity-60'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={rule.is_active ? 'default' : 'outline'} className={rule.is_active ? 'bg-green-100 text-green-700' : ''}>
                              {rule.is_active ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-gray-500 mb-3">{rule.description}</p>
                          )}
                          
                          {/* Trigger & Actions Flow */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
                              <TriggerIcon className="w-4 h-4" />
                              <span className="font-medium">When:</span>
                              <span>{TRIGGER_TYPES.find(t => t.value === rule.trigger?.type)?.label || rule.trigger?.type}</span>
                              {rule.trigger?.conditions?.new_status && (
                                <Badge variant="outline" className="ml-1">{rule.trigger.conditions.new_status}</Badge>
                              )}
                            </div>
                            
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            
                            {rule.actions?.map((action, idx) => {
                              const ActionIcon = getActionIcon(action.type);
                              return (
                                <div key={idx} className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm">
                                  <ActionIcon className="w-4 h-4" />
                                  <span>{ACTION_TYPES.find(a => a.value === action.type)?.label || action.type}</span>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="text-xs text-gray-400 mt-2">
                            Executed {rule.execution_count || 0} times • Created by {rule.created_by_name}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={() => handleToggleRule(rule)}
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {logs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Activity Yet</h3>
                <p className="text-gray-500 mt-1">Automation executions will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map(log => (
                <Card key={log.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          log.type === 'sprint_carry_forward' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {log.type === 'sprint_carry_forward' 
                              ? `Sprint "${log.sprint_name}" completed - ${log.tasks_carried} tasks moved to ${log.target_name}`
                              : `Workflow triggered: ${log.trigger_type}`
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.created_at && format(parseISO(log.created_at), 'MMM d, yyyy h:mm a')}
                            {log.triggered_by_name && ` • by ${log.triggered_by_name}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" /> Success
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Rule Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Create Automation Rule
            </DialogTitle>
            <DialogDescription>
              Define a trigger and actions to automate your workflow
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Auto-close subtasks on completion"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this automation do?"
                  rows={2}
                />
              </div>
            </div>

            {/* Trigger */}
            <div className="space-y-3">
              <Label className="text-blue-600 font-semibold">When this happens (Trigger)</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger..." />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(trigger => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div className="flex items-center gap-2">
                        <trigger.icon className="w-4 h-4" />
                        {trigger.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Trigger conditions based on type */}
              {formData.trigger_type === 'status_changed' && (
                <div className="pl-4 border-l-2 border-blue-200">
                  <Label className="text-sm">New Status</Label>
                  <Select
                    value={formData.trigger_conditions.new_status || ''}
                    onValueChange={(v) => setFormData({
                      ...formData,
                      trigger_conditions: { ...formData.trigger_conditions, new_status: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Label className="text-amber-600 font-semibold">Do this (Actions)</Label>
              
              {/* Existing actions */}
              {formData.actions.length > 0 && (
                <div className="space-y-2">
                  {formData.actions.map((action, idx) => {
                    const ActionIcon = getActionIcon(action.type);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-amber-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <ActionIcon className="w-4 h-4 text-amber-600" />
                          <span className="font-medium">{ACTION_TYPES.find(a => a.value === action.type)?.label}</span>
                          {action.config?.status && <Badge variant="outline">{action.config.status}</Badge>}
                          {action.config?.comment && <span className="text-sm text-gray-500">"{action.config.comment}"</span>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAction(idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Add new action */}
              <div className="flex gap-2">
                <Select
                  value={currentAction.type}
                  onValueChange={(v) => setCurrentAction({ type: v, config: {} })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select action type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(action => (
                      <SelectItem key={action.value} value={action.value}>
                        <div className="flex items-center gap-2">
                          <action.icon className="w-4 h-4" />
                          {action.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleAddAction}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Action config based on type */}
              {currentAction.type === 'update_status' && (
                <div className="pl-4 border-l-2 border-amber-200">
                  <Label className="text-sm">Set Status To</Label>
                  <Select
                    value={currentAction.config.status || ''}
                    onValueChange={(v) => setCurrentAction({
                      ...currentAction,
                      config: { ...currentAction.config, status: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {currentAction.type === 'add_comment' && (
                <div className="pl-4 border-l-2 border-amber-200">
                  <Label className="text-sm">Comment Text</Label>
                  <Input
                    value={currentAction.config.comment || ''}
                    onChange={(e) => setCurrentAction({
                      ...currentAction,
                      config: { ...currentAction.config, comment: e.target.value }
                    })}
                    placeholder="Enter comment text..."
                  />
                </div>
              )}
              
              {currentAction.type === 'send_notification' && (
                <div className="pl-4 border-l-2 border-amber-200 space-y-2">
                  <div>
                    <Label className="text-sm">Notification Title</Label>
                    <Input
                      value={currentAction.config.title || ''}
                      onChange={(e) => setCurrentAction({
                        ...currentAction,
                        config: { ...currentAction.config, title: e.target.value }
                      })}
                      placeholder="Notification title..."
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Message Body</Label>
                    <Input
                      value={currentAction.config.body || ''}
                      onChange={(e) => setCurrentAction({
                        ...currentAction,
                        config: { ...currentAction.config, body: e.target.value }
                      })}
                      placeholder="Notification message..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateRule} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
              {saving ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutomationsPage;
