import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  Plus, Trash2, Save, X, Loader2, CheckCircle, AlertTriangle,
  Settings, Zap, MessageSquare, Tag, UserPlus, Archive, AlertCircle,
  ChevronDown, ChevronRight, Play, Pause, BarChart3
} from 'lucide-react';

const OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'exact_match', label: 'Exact match' },
  { value: 'regex', label: 'Regex pattern' },
];

const ACTIONS = [
  { value: 'reply', label: 'Auto Reply', icon: MessageSquare, color: 'text-blue-500' },
  { value: 'tag', label: 'Add Tags', icon: Tag, color: 'text-purple-500' },
  { value: 'assign', label: 'Assign To', icon: UserPlus, color: 'text-green-500' },
  { value: 'archive', label: 'Archive', icon: Archive, color: 'text-gray-500' },
  { value: 'escalate', label: 'Escalate', icon: AlertCircle, color: 'text-red-500' },
];

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
];

const MESSAGE_TYPES = [
  { value: 'comment', label: 'Comments' },
  { value: 'direct_message', label: 'DMs' },
  { value: 'mention', label: 'Mentions' },
  { value: 'review', label: 'Reviews' },
];

export default function AutoReplyRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/social/auto-reply/rules');
      setRules(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const createNewRule = () => {
    setEditingRule({
      name: '',
      description: '',
      is_active: true,
      priority: 10,
      platforms: [],
      message_types: [],
      conditions: [{ field: 'content', operator: 'contains', value: '' }],
      action: 'reply',
      reply_template: '',
      tags: [],
      assign_to: ''
    });
  };

  const addCondition = () => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      conditions: [...editingRule.conditions, { field: 'content', operator: 'contains', value: '' }]
    });
  };

  const removeCondition = (index) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      conditions: editingRule.conditions.filter((_, i) => i !== index)
    });
  };

  const updateCondition = (index, field, value) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      conditions: editingRule.conditions.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      )
    });
  };

  const togglePlatform = (platform) => {
    if (!editingRule) return;
    const current = editingRule.platforms || [];
    setEditingRule({
      ...editingRule,
      platforms: current.includes(platform)
        ? current.filter(p => p !== platform)
        : [...current, platform]
    });
  };

  const toggleMessageType = (type) => {
    if (!editingRule) return;
    const current = editingRule.message_types || [];
    setEditingRule({
      ...editingRule,
      message_types: current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type]
    });
  };

  const saveRule = async () => {
    if (!editingRule) return;
    if (!editingRule.name.trim()) {
      setError('Rule name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingRule.rule_id) {
        await api.put(`/social/auto-reply/rules/${editingRule.rule_id}`, editingRule);
      } else {
        await api.post('/social/auto-reply/rules', editingRule);
      }
      setSuccess('Rule saved successfully');
      setEditingRule(null);
      fetchRules();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (ruleId) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await api.delete(`/social/auto-reply/rules/${ruleId}`);
      fetchRules();
    } catch (err) {
      setError('Failed to delete rule');
    }
  };

  const toggleRule = async (rule) => {
    try {
      await api.put(`/social/auto-reply/rules/${rule.rule_id}/toggle`);
      fetchRules();
    } catch (err) {
      setError('Failed to toggle rule');
    }
  };

  const seedDefaults = async () => {
    try {
      await api.post('/social/auto-reply/seed-defaults');
      fetchRules();
      setSuccess('Default rules created');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create defaults');
    }
  };

  return (
    <div className="space-y-5 p-8 animate-fade-in" data-testid="auto-reply-rules-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#5D4A3A] mb-1">SOCIAL MEDIA</p>
          <h1 className="text-2xl font-bold text-[#4A3728] tracking-tight">Auto-Reply Rules</h1>
          <p className="text-sm text-[#5D4A3A] mt-1">Configure automated responses for incoming messages</p>
        </div>
        <div className="flex items-center gap-2">
          {rules.length === 0 && (
            <button
              onClick={seedDefaults}
              className="px-4 py-2 border border-[#E8D5C4] rounded-lg text-sm text-[#5D4A3A] hover:bg-[#F5EDE5] transition-colors"
            >
              Create Defaults
            </button>
          )}
          <button
            onClick={createNewRule}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2.5 flex items-center gap-2"
            data-testid="new-rule-btn"
          >
            <Plus className="w-4 h-4" /> New Rule
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
        </div>
      ) : editingRule ? (
        /* Rule Editor */
        <div className="bg-white border border-[#E8D5C4] rounded-xl p-6" data-testid="rule-editor">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#4A3728]">
              {editingRule.rule_id ? 'Edit Rule' : 'New Rule'}
            </h2>
            <button onClick={() => setEditingRule(null)} className="p-2 hover:bg-[#F5EDE5] rounded-lg text-[#5D4A3A]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Rule Name *</label>
              <input
                type="text"
                value={editingRule.name}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
                placeholder="e.g., Thank You Response"
              />
            </div>
            <div>
              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Priority</label>
              <input
                type="number"
                value={editingRule.priority}
                onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
              />
              <p className="text-[10px] text-[#9ca3af] mt-1">Higher = processed first</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Description</label>
            <input
              type="text"
              value={editingRule.description || ''}
              onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
              className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
              placeholder="What does this rule do?"
            />
          </div>

          {/* Platform & Type Filters */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-xs text-[#5D4A3A] font-medium mb-2 block">Platforms (empty = all)</label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => togglePlatform(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      (editingRule.platforms || []).includes(p.value)
                        ? 'bg-rose-500 text-white'
                        : 'bg-[#F5EDE5] text-[#5D4A3A] hover:bg-[#E8D5C4]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#5D4A3A] font-medium mb-2 block">Message Types (empty = all)</label>
              <div className="flex flex-wrap gap-1.5">
                {MESSAGE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => toggleMessageType(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      (editingRule.message_types || []).includes(t.value)
                        ? 'bg-rose-500 text-white'
                        : 'bg-[#F5EDE5] text-[#5D4A3A] hover:bg-[#E8D5C4]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-[#5D4A3A] font-medium">Trigger Conditions (match ANY)</label>
              <button
                onClick={addCondition}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Condition
              </button>
            </div>
            <div className="space-y-2">
              {editingRule.conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-[#F5EDE5] rounded-lg">
                  <span className="text-xs text-[#5D4A3A] w-16">Message</span>
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                    className="bg-white border border-[#D4BBA6] rounded-lg px-2 py-1.5 text-xs text-[#4A3728]"
                  >
                    {OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) => updateCondition(i, 'value', e.target.value)}
                    placeholder="keyword or pattern"
                    className="flex-1 bg-white border border-[#D4BBA6] rounded-lg px-3 py-1.5 text-xs text-[#4A3728]"
                  />
                  {editingRule.conditions.length > 1 && (
                    <button
                      onClick={() => removeCondition(i)}
                      className="p-1 hover:bg-red-100 rounded text-[#5D4A3A] hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="mb-6">
            <label className="text-xs text-[#5D4A3A] font-medium mb-2 block">Action</label>
            <div className="flex gap-2 mb-4">
              {ACTIONS.map(a => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.value}
                    onClick={() => setEditingRule({ ...editingRule, action: a.value })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      editingRule.action === a.value
                        ? 'bg-rose-500 text-white'
                        : 'bg-[#F5EDE5] text-[#5D4A3A] hover:bg-[#E8D5C4]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${editingRule.action === a.value ? '' : a.color}`} />
                    {a.label}
                  </button>
                );
              })}
            </div>

            {/* Action-specific fields */}
            {editingRule.action === 'reply' && (
              <div>
                <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Reply Template</label>
                <textarea
                  value={editingRule.reply_template || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, reply_template: e.target.value })}
                  rows={3}
                  className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
                  placeholder="Thank you for your message, {author_name}!"
                />
                <p className="text-[10px] text-[#9ca3af] mt-1">Variables: {'{author_name}'}, {'{platform}'}</p>
              </div>
            )}

            {editingRule.action === 'tag' && (
              <div>
                <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={(editingRule.tags || []).join(', ')}
                  onChange={(e) => setEditingRule({ 
                    ...editingRule, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                  className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
                  placeholder="vip, urgent, follow-up"
                />
              </div>
            )}

            {editingRule.action === 'assign' && (
              <div>
                <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Assign To (user ID or email)</label>
                <input
                  type="text"
                  value={editingRule.assign_to || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, assign_to: e.target.value })}
                  className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
                  placeholder="user@company.com"
                />
              </div>
            )}
          </div>

          {/* Active Toggle */}
          <label className="flex items-center gap-2 text-sm text-[#5D4A3A] mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={editingRule.is_active}
              onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
              className="rounded bg-white border-[#D4BBA6] text-rose-500"
            />
            Rule is active
          </label>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditingRule(null)}
              className="px-4 py-2 border border-[#D4BBA6] rounded-lg text-sm text-[#5D4A3A] hover:bg-[#F5EDE5]"
            >
              Cancel
            </button>
            <button
              onClick={saveRule}
              disabled={saving}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Rule
            </button>
          </div>
        </div>
      ) : (
        /* Rule List */
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#E8D5C4] rounded-xl">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-semibold text-[#4A3728]">No Auto-Reply Rules</h3>
              <p className="text-sm text-[#5D4A3A] mt-2 max-w-md mx-auto">
                Create rules to automatically respond to or organize incoming messages
              </p>
              <button
                onClick={seedDefaults}
                className="mt-6 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-6 py-2.5 text-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Default Rules
              </button>
            </div>
          ) : (
            rules.map(rule => {
              const ActionInfo = ACTIONS.find(a => a.value === rule.action);
              const ActionIcon = ActionInfo?.icon || Settings;
              
              return (
                <div
                  key={rule.rule_id}
                  className="bg-white border border-[#E8D5C4] rounded-xl p-5 hover:border-[#D4BBA6] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#4A3728]">{rule.name}</h3>
                        <span className={`w-2 h-2 rounded-full ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-[10px] text-[#9ca3af]">Priority: {rule.priority}</span>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-[#5D4A3A] mb-3">{rule.description}</p>
                      )}

                      {/* Conditions Preview */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-[10px] text-[#5D4A3A]">When message:</span>
                        {rule.conditions?.slice(0, 3).map((c, i) => (
                          <span key={i} className="text-[10px] bg-[#F5EDE5] px-2 py-1 rounded text-[#4A3728]">
                            {c.operator} "{c.value}"
                          </span>
                        ))}
                        {rule.conditions?.length > 3 && (
                          <span className="text-[10px] text-[#9ca3af]">+{rule.conditions.length - 3} more</span>
                        )}
                      </div>

                      {/* Action Badge */}
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                          rule.action === 'reply' ? 'bg-blue-100' :
                          rule.action === 'tag' ? 'bg-purple-100' :
                          rule.action === 'assign' ? 'bg-green-100' :
                          rule.action === 'escalate' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <ActionIcon className={`w-3 h-3 ${ActionInfo?.color}`} />
                          <span className={`text-[10px] font-medium ${
                            rule.action === 'reply' ? 'text-blue-700' :
                            rule.action === 'tag' ? 'text-purple-700' :
                            rule.action === 'assign' ? 'text-green-700' :
                            rule.action === 'escalate' ? 'text-red-700' : 'text-gray-700'
                          }`}>{ActionInfo?.label}</span>
                        </div>
                        {rule.stats && (
                          <div className="flex items-center gap-1 text-[10px] text-[#9ca3af]">
                            <BarChart3 className="w-3 h-3" />
                            Triggered {rule.stats.triggered || 0}x
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleRule(rule)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          rule.is_active
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={rule.is_active ? 'Active' : 'Paused'}
                      >
                        {rule.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="p-1.5 hover:bg-[#F5EDE5] rounded-lg text-[#5D4A3A]"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.rule_id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-[#5D4A3A] hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
