import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Users, UserCheck,
  Settings, Shield, Clock, Save, X, Loader2, CheckCircle, AlertTriangle
} from 'lucide-react';

const APPROVER_TYPES = [
  { value: 'role', label: 'By Role', icon: Shield },
  { value: 'user', label: 'Specific Users', icon: Users },
];

const AVAILABLE_ROLES = [
  { value: 'social_manager', label: 'Social Manager' },
  { value: 'marketing_manager', label: 'Marketing Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
];

export default function ApprovalWorkflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/social/workflows/approval-chains');
      setWorkflows(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const createNewWorkflow = () => {
    setEditingWorkflow({
      name: '',
      description: '',
      is_default: false,
      platforms: [],
      stages: [
        {
          stage_id: `stage-${Date.now()}`,
          stage_name: 'Review',
          stage_order: 1,
          approver_type: 'role',
          approver_ids: ['social_manager'],
          can_skip: false,
          auto_approve_after_hours: null
        }
      ]
    });
  };

  const addStage = () => {
    if (!editingWorkflow) return;
    const newStage = {
      stage_id: `stage-${Date.now()}`,
      stage_name: `Stage ${editingWorkflow.stages.length + 1}`,
      stage_order: editingWorkflow.stages.length + 1,
      approver_type: 'role',
      approver_ids: [],
      can_skip: false,
      auto_approve_after_hours: null
    };
    setEditingWorkflow({
      ...editingWorkflow,
      stages: [...editingWorkflow.stages, newStage]
    });
  };

  const removeStage = (stageId) => {
    if (!editingWorkflow) return;
    setEditingWorkflow({
      ...editingWorkflow,
      stages: editingWorkflow.stages
        .filter(s => s.stage_id !== stageId)
        .map((s, i) => ({ ...s, stage_order: i + 1 }))
    });
  };

  const updateStage = (stageId, field, value) => {
    if (!editingWorkflow) return;
    setEditingWorkflow({
      ...editingWorkflow,
      stages: editingWorkflow.stages.map(s =>
        s.stage_id === stageId ? { ...s, [field]: value } : s
      )
    });
  };

  const toggleApproverRole = (stageId, role) => {
    if (!editingWorkflow) return;
    setEditingWorkflow({
      ...editingWorkflow,
      stages: editingWorkflow.stages.map(s => {
        if (s.stage_id !== stageId) return s;
        const current = s.approver_ids || [];
        return {
          ...s,
          approver_ids: current.includes(role)
            ? current.filter(r => r !== role)
            : [...current, role]
        };
      })
    });
  };

  const togglePlatform = (platform) => {
    if (!editingWorkflow) return;
    const current = editingWorkflow.platforms || [];
    setEditingWorkflow({
      ...editingWorkflow,
      platforms: current.includes(platform)
        ? current.filter(p => p !== platform)
        : [...current, platform]
    });
  };

  const saveWorkflow = async () => {
    if (!editingWorkflow) return;
    if (!editingWorkflow.name.trim()) {
      setError('Workflow name is required');
      return;
    }
    if (editingWorkflow.stages.length === 0) {
      setError('At least one approval stage is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingWorkflow.workflow_id) {
        await api.put(`/social/workflows/approval-chains/${editingWorkflow.workflow_id}`, editingWorkflow);
      } else {
        await api.post('/social/workflows/approval-chains', editingWorkflow);
      }
      setSuccess('Workflow saved successfully');
      setEditingWorkflow(null);
      fetchWorkflows();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkflow = async (workflowId) => {
    if (!window.confirm('Delete this workflow?')) return;
    try {
      await api.delete(`/social/workflows/approval-chains/${workflowId}`);
      fetchWorkflows();
    } catch (err) {
      setError('Failed to delete workflow');
    }
  };

  const seedDefaults = async () => {
    try {
      await api.post('/social/workflows/seed-defaults');
      fetchWorkflows();
      setSuccess('Default workflows created');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to seed defaults');
    }
  };

  return (
    <div className="space-y-5 p-8 animate-fade-in" data-testid="approval-workflows-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#5D4A3A] mb-1">SOCIAL MEDIA</p>
          <h1 className="text-2xl font-bold text-[#4A3728] tracking-tight">Approval Workflows</h1>
          <p className="text-sm text-[#5D4A3A] mt-1">Configure multi-stage approval chains for post publishing</p>
        </div>
        <div className="flex items-center gap-2">
          {workflows.length === 0 && (
            <button
              onClick={seedDefaults}
              className="px-4 py-2 border border-[#E8D5C4] rounded-lg text-sm text-[#5D4A3A] hover:bg-[#F5EDE5] transition-colors"
            >
              Create Defaults
            </button>
          )}
          <button
            onClick={createNewWorkflow}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2.5 flex items-center gap-2"
            data-testid="new-workflow-btn"
          >
            <Plus className="w-4 h-4" /> New Workflow
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
      ) : editingWorkflow ? (
        /* Editor Panel */
        <div className="bg-white border border-[#E8D5C4] rounded-xl p-6" data-testid="workflow-editor">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#4A3728]">
              {editingWorkflow.workflow_id ? 'Edit Workflow' : 'New Workflow'}
            </h2>
            <button onClick={() => setEditingWorkflow(null)} className="p-2 hover:bg-[#F5EDE5] rounded-lg text-[#5D4A3A]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Workflow Name *</label>
              <input
                type="text"
                value={editingWorkflow.name}
                onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728] focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                placeholder="e.g., Standard Review Process"
              />
            </div>
            <div>
              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Description</label>
              <input
                type="text"
                value={editingWorkflow.description || ''}
                onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Platforms */}
          <div className="mb-6">
            <label className="text-xs text-[#5D4A3A] font-medium mb-2 block">Apply to Platforms (empty = all)</label>
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => togglePlatform(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    (editingWorkflow.platforms || []).includes(p.value)
                      ? 'bg-rose-500 text-white'
                      : 'bg-[#F5EDE5] text-[#5D4A3A] hover:bg-[#E8D5C4]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default Toggle */}
          <label className="flex items-center gap-2 text-sm text-[#5D4A3A] mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={editingWorkflow.is_default}
              onChange={(e) => setEditingWorkflow({ ...editingWorkflow, is_default: e.target.checked })}
              className="rounded bg-white border-[#D4BBA6] text-rose-500 focus:ring-rose-500/20"
            />
            Set as default workflow
          </label>

          {/* Stages */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-[#5D4A3A] font-medium">Approval Stages</label>
              <button
                onClick={addStage}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Stage
              </button>
            </div>

            <div className="space-y-3">
              {editingWorkflow.stages.map((stage, idx) => (
                <div key={stage.stage_id} className="bg-[#F5EDE5] rounded-lg p-4 border border-[#E8D5C4]">
                  <div className="flex items-center gap-3 mb-3">
                    <GripVertical className="w-4 h-4 text-[#9ca3af] cursor-grab" />
                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={stage.stage_name}
                      onChange={(e) => updateStage(stage.stage_id, 'stage_name', e.target.value)}
                      className="flex-1 bg-white border border-[#D4BBA6] rounded-lg px-3 py-1.5 text-sm text-[#4A3728]"
                      placeholder="Stage name"
                    />
                    {editingWorkflow.stages.length > 1 && (
                      <button
                        onClick={() => removeStage(stage.stage_id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg text-[#5D4A3A] hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 ml-9">
                    {/* Approver Roles */}
                    <div>
                      <label className="text-xs text-[#5D4A3A] mb-1.5 block">Who can approve?</label>
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_ROLES.map(role => (
                          <button
                            key={role.value}
                            onClick={() => toggleApproverRole(stage.stage_id, role.value)}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              (stage.approver_ids || []).includes(role.value)
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-[#5D4A3A] border border-[#D4BBA6] hover:border-blue-300'
                            }`}
                          >
                            {role.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-[#5D4A3A] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stage.can_skip}
                          onChange={(e) => updateStage(stage.stage_id, 'can_skip', e.target.checked)}
                          className="rounded bg-white border-[#D4BBA6] text-rose-500 focus:ring-rose-500/20"
                        />
                        Can be skipped
                      </label>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-[#5D4A3A]" />
                        <span className="text-xs text-[#5D4A3A]">Auto-approve after</span>
                        <input
                          type="number"
                          value={stage.auto_approve_after_hours || ''}
                          onChange={(e) => updateStage(stage.stage_id, 'auto_approve_after_hours', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-16 bg-white border border-[#D4BBA6] rounded px-2 py-1 text-xs text-[#4A3728]"
                          placeholder="—"
                        />
                        <span className="text-xs text-[#5D4A3A]">hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditingWorkflow(null)}
              className="px-4 py-2 border border-[#D4BBA6] rounded-lg text-sm text-[#5D4A3A] hover:bg-[#F5EDE5]"
            >
              Cancel
            </button>
            <button
              onClick={saveWorkflow}
              disabled={saving}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Workflow
            </button>
          </div>
        </div>
      ) : (
        /* Workflow List */
        <div className="space-y-3">
          {workflows.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#E8D5C4] rounded-xl">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-semibold text-[#4A3728]">No Approval Workflows</h3>
              <p className="text-sm text-[#5D4A3A] mt-2 max-w-md mx-auto">
                Create approval workflows to control who reviews posts before publishing
              </p>
              <button
                onClick={createNewWorkflow}
                className="mt-6 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-6 py-2.5 text-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create First Workflow
              </button>
            </div>
          ) : (
            workflows.map(wf => (
              <div
                key={wf.workflow_id}
                className="bg-white border border-[#E8D5C4] rounded-xl p-5 hover:border-[#D4BBA6] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#4A3728]">{wf.name}</h3>
                      {wf.is_default && (
                        <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-medium">
                          DEFAULT
                        </span>
                      )}
                      {wf.platforms?.length > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          {wf.platforms.join(', ')}
                        </span>
                      )}
                    </div>
                    {wf.description && (
                      <p className="text-sm text-[#5D4A3A] mb-3">{wf.description}</p>
                    )}

                    {/* Stages Preview */}
                    <div className="flex items-center gap-2">
                      {wf.stages?.map((stage, idx) => (
                        <React.Fragment key={stage.stage_id}>
                          <div className="flex items-center gap-1.5 bg-[#F5EDE5] rounded-lg px-3 py-1.5">
                            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-medium">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-[#4A3728]">{stage.stage_name}</span>
                            {stage.can_skip && (
                              <span className="text-[9px] text-[#5D4A3A]">(skippable)</span>
                            )}
                          </div>
                          {idx < wf.stages.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-[#9ca3af]" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingWorkflow(wf)}
                      className="px-3 py-1.5 text-xs text-[#5D4A3A] hover:text-[#4A3728] hover:bg-[#F5EDE5] rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteWorkflow(wf.workflow_id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-[#5D4A3A] hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
