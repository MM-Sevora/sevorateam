import React, { useState, useEffect } from 'react';
import {
  BookCopy, Plus, Edit, Trash2, X, Clock, Flag, User,
  Repeat, CheckSquare, Tag, Loader2, Copy
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: 'Low', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
};

const labelColors = {
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  gray: 'bg-gray-100 text-gray-700'
};

const TaskTemplatesPanel = ({ open, onClose, projectId, users = [], labels = [], onCreateTask }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showUseTemplate, setShowUseTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('sevora_token');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_id: null, // null = global
    default_priority: 'medium',
    default_assignee: '',
    estimated_hours: '',
    default_labels: [],
    default_tags: [],
    checklist_items: [],
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_interval: 1
  });

  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [useTemplateData, setUseTemplateData] = useState({
    task_name: '',
    due_date: '',
    assigned_to: ''
  });

  const fetchTemplates = async () => {
    try {
      const url = projectId 
        ? `${API}/api/projects/templates?project_id=${projectId}`
        : `${API}/api/projects/templates`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setTemplates(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, projectId]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      project_id: projectId || null,
      default_priority: 'medium',
      default_assignee: '',
      estimated_hours: '',
      default_labels: [],
      default_tags: [],
      checklist_items: [],
      is_recurring: false,
      recurrence_pattern: 'weekly',
      recurrence_interval: 1
    });
    setNewChecklistItem('');
  };

  const openCreateForm = () => {
    resetForm();
    setEditingTemplate(null);
    setShowCreateForm(true);
  };

  const openEditForm = (template) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      project_id: template.project_id,
      default_priority: template.default_priority,
      default_assignee: template.default_assignee || '',
      estimated_hours: template.estimated_hours || '',
      default_labels: template.default_labels || [],
      default_tags: template.default_tags || [],
      checklist_items: template.checklist_items || [],
      is_recurring: template.is_recurring || false,
      recurrence_pattern: template.recurrence_pattern || 'weekly',
      recurrence_interval: template.recurrence_interval || 1
    });
    setEditingTemplate(template);
    setShowCreateForm(true);
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setFormData(prev => ({
      ...prev,
      checklist_items: [...prev.checklist_items, { text: newChecklistItem.trim(), assigned_to: null }]
    }));
    setNewChecklistItem('');
  };

  const removeChecklistItem = (index) => {
    setFormData(prev => ({
      ...prev,
      checklist_items: prev.checklist_items.filter((_, i) => i !== index)
    }));
  };

  const saveTemplate = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        project_id: formData.project_id || null,
        default_assignee: formData.default_assignee || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
      };

      const url = editingTemplate 
        ? `${API}/api/projects/templates/${editingTemplate.id}`
        : `${API}/api/projects/templates`;
      
      const res = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingTemplate ? 'Template updated' : 'Template created');
        setShowCreateForm(false);
        fetchTemplates();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to save template');
      }
    } catch (e) {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (template) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    
    try {
      const res = await fetch(`${API}/api/projects/templates/${template.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Template deleted');
        fetchTemplates();
      }
    } catch (e) {
      toast.error('Failed to delete template');
    }
  };

  const openUseTemplate = (template) => {
    setUseTemplateData({
      task_name: template.name,
      due_date: '',
      assigned_to: template.default_assignee || ''
    });
    setShowUseTemplate(template);
  };

  const createFromTemplate = async () => {
    if (!showUseTemplate) return;
    
    setSaving(true);
    try {
      const params = new URLSearchParams({
        project_id: projectId
      });
      if (useTemplateData.task_name) params.append('task_name', useTemplateData.task_name);
      if (useTemplateData.due_date) params.append('due_date', useTemplateData.due_date);
      if (useTemplateData.assigned_to) params.append('assigned_to', useTemplateData.assigned_to);

      const res = await fetch(
        `${API}/api/projects/templates/${showUseTemplate.id}/create-task?${params.toString()}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (res.ok) {
        const task = await res.json();
        toast.success('Task created from template');
        setShowUseTemplate(null);
        onCreateTask?.(task);
        onClose?.();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to create task');
      }
    } catch (e) {
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] bg-[#FDF8F3] border-l-[#D4BBA6] p-0 overflow-hidden">
        <SheetHeader className="p-6 border-b border-[#E8D5C4] bg-white">
          <SheetTitle className="text-[#4A3728] flex items-center gap-2">
            <BookCopy className="w-5 h-5" />
            Task Templates
          </SheetTitle>
        </SheetHeader>

        <div className="p-6 overflow-y-auto h-[calc(100vh-100px)]">
          {/* Create Button */}
          <Button
            onClick={openCreateForm}
            className="w-full mb-6 bg-rose-600 hover:bg-rose-700 text-white"
            data-testid="create-template-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>

          {/* Templates List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#9C8C74]" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-[#9C8C74]">
              <BookCopy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No templates yet</p>
              <p className="text-xs mt-1">Create templates to quickly add recurring tasks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="p-4 bg-white rounded-lg border border-[#E8D5C4] hover:border-[#D4BBA6] transition-all group"
                  data-testid={`template-${template.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-[#4A3728]">{template.name}</h4>
                      <span className="text-xs text-[#9C8C74]">{template.project_name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openUseTemplate(template)}
                        className="h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        title="Use template"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(template)}
                        className="h-7 text-[#6B5D52] hover:text-[#4A3728]"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplate(template)}
                        className="h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-[#6B5D52] mb-3 line-clamp-2">{template.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className={priorityConfig[template.default_priority]?.color}>
                      <Flag className="w-3 h-3 mr-1" />
                      {template.default_priority}
                    </Badge>

                    {template.estimated_hours && (
                      <span className="flex items-center gap-1 text-[#6B5D52]">
                        <Clock className="w-3 h-3" />
                        {template.estimated_hours}h
                      </span>
                    )}

                    {template.default_assignee_name && (
                      <span className="flex items-center gap-1 text-[#6B5D52]">
                        <User className="w-3 h-3" />
                        {template.default_assignee_name}
                      </span>
                    )}

                    {template.is_recurring && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Repeat className="w-3 h-3" />
                        {template.recurrence_pattern}
                      </span>
                    )}

                    {template.checklist_items?.length > 0 && (
                      <span className="flex items-center gap-1 text-[#6B5D52]">
                        <CheckSquare className="w-3 h-3" />
                        {template.checklist_items.length} items
                      </span>
                    )}
                  </div>

                  {template.default_label_names?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.default_label_names.map(label => (
                        <span
                          key={label.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${labelColors[label.color] || labelColors.gray}`}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {template.usage_count > 0 && (
                    <p className="text-[10px] text-[#9C8C74] mt-2">
                      Used {template.usage_count} time{template.usage_count !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="bg-[#FDF8F3] border-[#D4BBA6] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label className="text-[#6B5D52]">Template Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Team Standup"
                className="mt-1 border-[#D4BBA6]"
                data-testid="template-name-input"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-[#6B5D52]">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this template for?"
                className="mt-1 border-[#D4BBA6]"
                rows={2}
              />
            </div>

            {/* Scope */}
            <div>
              <Label className="text-[#6B5D52]">Scope</Label>
              <Select
                value={formData.project_id || 'global'}
                onValueChange={(v) => setFormData({ ...formData, project_id: v === 'global' ? null : v })}
              >
                <SelectTrigger className="mt-1 border-[#D4BBA6]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6]">
                  <SelectItem value="global">Global (All Projects)</SelectItem>
                  {projectId && <SelectItem value={projectId}>This Project Only</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Priority & Assignee */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[#6B5D52]">Default Priority</Label>
                <Select
                  value={formData.default_priority}
                  onValueChange={(v) => setFormData({ ...formData, default_priority: v })}
                >
                  <SelectTrigger className="mt-1 border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#6B5D52]">Default Assignee</Label>
                <Select
                  value={formData.default_assignee || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, default_assignee: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="mt-1 border-[#D4BBA6]">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="none">None</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estimated Hours */}
            <div>
              <Label className="text-[#6B5D52]">Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="e.g., 2"
                className="mt-1 border-[#D4BBA6] w-32"
              />
            </div>

            {/* Recurring Settings */}
            <div className="p-3 bg-white rounded-lg border border-[#E8D5C4]">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-[#6B5D52] flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Recurring Task
                </Label>
                <button
                  onClick={() => setFormData({ ...formData, is_recurring: !formData.is_recurring })}
                  className={`w-10 h-6 rounded-full transition-colors ${formData.is_recurring ? 'bg-rose-500' : 'bg-[#D4BBA6]'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.is_recurring ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              {formData.is_recurring && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6B5D52]">Every</span>
                  <Input
                    type="number"
                    min="1"
                    value={formData.recurrence_interval}
                    onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })}
                    className="w-16 border-[#D4BBA6] h-8"
                  />
                  <Select
                    value={formData.recurrence_pattern}
                    onValueChange={(v) => setFormData({ ...formData, recurrence_pattern: v })}
                  >
                    <SelectTrigger className="w-28 border-[#D4BBA6] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      <SelectItem value="daily">Day(s)</SelectItem>
                      <SelectItem value="weekly">Week(s)</SelectItem>
                      <SelectItem value="monthly">Month(s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Default Labels */}
            {labels.length > 0 && (
              <div>
                <Label className="text-[#6B5D52]">Default Labels</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {labels.map(label => (
                    <button
                      key={label.id}
                      onClick={() => {
                        const current = formData.default_labels || [];
                        if (current.includes(label.id)) {
                          setFormData({ ...formData, default_labels: current.filter(id => id !== label.id) });
                        } else {
                          setFormData({ ...formData, default_labels: [...current, label.id] });
                        }
                      }}
                      className={`text-xs px-2 py-1 rounded border transition-all ${
                        formData.default_labels?.includes(label.id)
                          ? 'ring-2 ring-rose-400 ring-offset-1'
                          : ''
                      } ${labelColors[label.color] || labelColors.gray}`}
                    >
                      {label.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist Items */}
            <div>
              <Label className="text-[#6B5D52]">Checklist Items</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add checklist item..."
                  className="border-[#D4BBA6]"
                  onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                />
                <Button onClick={addChecklistItem} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.checklist_items.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.checklist_items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-[#E8D5C4]">
                      <CheckSquare className="w-4 h-4 text-[#9C8C74]" />
                      <span className="flex-1 text-sm text-[#4A3728]">{item.text}</span>
                      <button
                        onClick={() => removeChecklistItem(idx)}
                        className="text-[#9C8C74] hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={saveTemplate}
                disabled={saving}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                data-testid="save-template-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
                className="border-[#D4BBA6] text-[#4A3728]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Use Template Dialog */}
      <Dialog open={!!showUseTemplate} onOpenChange={() => setShowUseTemplate(null)}>
        <DialogContent className="bg-[#FDF8F3] border-[#D4BBA6] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">
              Create Task from Template
            </DialogTitle>
          </DialogHeader>

          {showUseTemplate && (
            <div className="space-y-4">
              <div className="p-3 bg-white rounded-lg border border-[#E8D5C4]">
                <p className="text-sm font-medium text-[#4A3728]">{showUseTemplate.name}</p>
                {showUseTemplate.description && (
                  <p className="text-xs text-[#6B5D52] mt-1">{showUseTemplate.description}</p>
                )}
              </div>

              <div>
                <Label className="text-[#6B5D52]">Task Name</Label>
                <Input
                  value={useTemplateData.task_name}
                  onChange={(e) => setUseTemplateData({ ...useTemplateData, task_name: e.target.value })}
                  className="mt-1 border-[#D4BBA6]"
                  data-testid="use-template-name-input"
                />
              </div>

              <div>
                <Label className="text-[#6B5D52]">Due Date</Label>
                <Input
                  type="date"
                  value={useTemplateData.due_date}
                  onChange={(e) => setUseTemplateData({ ...useTemplateData, due_date: e.target.value })}
                  className="mt-1 border-[#D4BBA6]"
                />
              </div>

              <div>
                <Label className="text-[#6B5D52]">Assignee</Label>
                <Select
                  value={useTemplateData.assigned_to || 'none'}
                  onValueChange={(v) => setUseTemplateData({ ...useTemplateData, assigned_to: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="mt-1 border-[#D4BBA6]">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="none">None</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={createFromTemplate}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  data-testid="create-from-template-btn"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Task
                </Button>
                <Button
                  onClick={() => setShowUseTemplate(null)}
                  variant="outline"
                  className="border-[#D4BBA6] text-[#4A3728]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default TaskTemplatesPanel;
