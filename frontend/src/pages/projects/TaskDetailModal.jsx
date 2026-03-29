import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Calendar, User, Flag, Clock, CheckCircle2, Circle, Plus,
  MessageSquare, Trash2, Edit, Save, ListTodo, Timer, ChevronDown,
  AlertTriangle, Link2, Unlink, Paperclip, Upload, FileText, Image,
  File, Download, Folder, Repeat, RefreshCw, Bell, BellRing, Copy,
  Layers, Bug, BookOpen, Zap, Search, CheckSquare, Target, ShieldCheck
} from 'lucide-react';

// Import extracted sub-components (refactored)
import SubtasksSection from './components/SubtasksSection';
import ChecklistsSection from './components/ChecklistsSection';
import CommentsSection from './components/CommentsSection';
import TimeLogsSection from './components/TimeLogsSection';
import DependenciesSection from './components/DependenciesSection';
import AttachmentsSection from './components/AttachmentsSection';
import RemindersSection from './components/RemindersSection';
import DoDSection from './components/DoDSection';

// Animation styles
const animationStyles = `
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes checkPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.4); opacity: 0; }
  }
  
  .modal-animate {
    animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .tab-content-animate {
    animation: fadeSlideIn 0.25s ease-out;
  }
  
  .check-animate {
    animation: checkPop 0.3s ease-out;
  }
  
  .item-hover {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .item-hover:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(74, 55, 40, 0.08);
  }
  
  .btn-hover {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .btn-hover:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(190, 18, 60, 0.25);
  }
  
  .btn-hover:active {
    transform: translateY(0);
  }
  
  .progress-bar-animate {
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .tab-trigger-hover {
    transition: all 0.2s ease;
  }
  
  .tab-trigger-hover:hover:not([data-state="active"]) {
    background-color: rgba(232, 213, 196, 0.5);
    transform: translateY(-1px);
  }
  
  .badge-pulse {
    position: relative;
  }
  
  .badge-pulse::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: inherit;
    animation: pulse-ring 2s ease-out infinite;
    opacity: 0;
  }
  
  .stagger-1 { animation-delay: 0.05s; }
  .stagger-2 { animation-delay: 0.1s; }
  .stagger-3 { animation-delay: 0.15s; }
  .stagger-4 { animation-delay: 0.2s; }
  .stagger-5 { animation-delay: 0.25s; }
`;
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { toast } from 'sonner';
import { RichTextEditor } from '../../components/ui/rich-text-editor';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Low', color: 'bg-stone-100 text-stone-600 border-stone-200' }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-stone-400' },
  assigned: { label: 'Assigned', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500' },
  pending_review: { label: 'Review', color: 'bg-amber-500' },
  completed: { label: 'Completed', color: 'bg-emerald-500' },
  approved: { label: 'Approved', color: 'bg-green-500' },
  on_hold: { label: 'On Hold', color: 'bg-stone-400' }
};

// Issue type configuration (Jira-like)
const issueTypeConfig = {
  task: { label: 'Task', icon: CheckSquare, color: 'text-blue-600 bg-blue-50' },
  story: { label: 'Story', icon: BookOpen, color: 'text-green-600 bg-green-50' },
  bug: { label: 'Bug', icon: Bug, color: 'text-red-600 bg-red-50' },
  epic: { label: 'Epic', icon: Layers, color: 'text-purple-600 bg-purple-50' },
  subtask: { label: 'Sub-task', icon: CheckSquare, color: 'text-gray-500 bg-gray-50' },
  improvement: { label: 'Improvement', icon: Zap, color: 'text-amber-600 bg-amber-50' },
  spike: { label: 'Spike', icon: Search, color: 'text-indigo-600 bg-indigo-50' }
};

// Bug severity configuration
const bugSeverityConfig = {
  critical: { label: 'Critical', color: 'bg-red-600 text-white' },
  major: { label: 'Major', color: 'bg-orange-500 text-white' },
  minor: { label: 'Minor', color: 'bg-yellow-500 text-white' },
  trivial: { label: 'Trivial', color: 'bg-gray-400 text-white' }
};

// Animated wrapper for tab content
const AnimatedTabContent = ({ children, isActive }) => {
  const [shouldRender, setShouldRender] = useState(isActive);
  
  useEffect(() => {
    if (isActive) setShouldRender(true);
  }, [isActive]);
  
  if (!shouldRender) return null;
  
  return (
    <div className={isActive ? 'tab-content-animate' : ''}>
      {children}
    </div>
  );
};

// Main Task Detail Modal
const TaskDetailModal = ({ open, onClose, taskId, onUpdate, users = [], projectId }) => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('subtasks');
  const [epics, setEpics] = useState([]);
  const [releases, setReleases] = useState([]);
  const token = localStorage.getItem('sevora_token');

  // Fetch epics for this project
  const fetchEpics = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${API}/api/engineering/projects/${projectId}/epics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEpics(await res.json());
      }
    } catch (e) {
      console.error('Error fetching epics:', e);
    }
  };

  // Fetch releases for this project
  const fetchReleases = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${API}/api/projects/releases?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReleases(await res.json());
      }
    } catch (e) {
      console.error('Error fetching releases:', e);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      fetchEpics();
      fetchReleases();
    }
  }, [open, projectId]);

  const fetchTask = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        setEditData({
          name: data.name,
          description: data.description || '',
          priority: data.priority,
          status: data.status,
          assigned_to: data.assigned_to || '',
          start_date: data.start_date ? data.start_date.split('T')[0] : '',
          due_date: data.due_date ? data.due_date.split('T')[0] : '',
          estimated_hours: data.estimated_hours || '',
          is_recurring: data.is_recurring || false,
          recurrence_pattern: data.recurrence_pattern || 'weekly',
          recurrence_interval: data.recurrence_interval || 1,
          recurrence_end_date: data.recurrence_end_date ? data.recurrence_end_date.split('T')[0] : '',
          // Issue type fields
          issue_type: data.issue_type || 'task',
          epic_id: data.epic_id || '',
          release_id: data.release_id || '',
          story_points: data.story_points || '',
          // Bug-specific fields
          bug_severity: data.bug_severity || '',
          reproduction_steps: data.reproduction_steps || '',
          expected_behavior: data.expected_behavior || '',
          actual_behavior: data.actual_behavior || '',
          // Story-specific fields
          acceptance_criteria: data.acceptance_criteria || ''
        });
      }
    } catch (e) { 
      console.error(e);
      toast.error('Failed to load task');
    }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
      setEditing(false);
    }
  }, [open, taskId]);

  const saveTask = async () => {
    setSaving(true);
    try {
      const payload = { ...editData };
      
      // Clean up empty string fields - convert to null or delete
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.estimated_hours) delete payload.estimated_hours;
      else payload.estimated_hours = parseFloat(payload.estimated_hours);
      
      // Handle story points
      if (payload.story_points) payload.story_points = parseInt(payload.story_points);
      else delete payload.story_points;
      
      // Handle dates - send null for empty dates
      if (!payload.start_date) payload.start_date = null;
      if (!payload.due_date) payload.due_date = null;
      if (!payload.recurrence_end_date) payload.recurrence_end_date = null;
      
      // Handle epic and release - delete if empty
      if (!payload.epic_id) delete payload.epic_id;
      if (!payload.release_id) delete payload.release_id;
      
      // Handle bug-specific fields - delete if empty
      if (!payload.bug_severity) delete payload.bug_severity;
      if (!payload.reproduction_steps) delete payload.reproduction_steps;
      if (!payload.expected_behavior) delete payload.expected_behavior;
      if (!payload.actual_behavior) delete payload.actual_behavior;
      
      // Handle story-specific fields - delete if empty
      if (!payload.acceptance_criteria) delete payload.acceptance_criteria;
      
      // Handle recurrence fields
      if (!payload.is_recurring) {
        delete payload.recurrence_pattern;
        delete payload.recurrence_interval;
        delete payload.recurrence_end_date;
      }

      const res = await fetch(`${API}/api/projects/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success('Task updated');
        setEditing(false);
        fetchTask();
        onUpdate?.();
      } else {
        const error = await res.json();
        console.error('Save error response:', error);
        toast.error(error.detail || 'Failed to save');
      }
    } catch (e) { 
      console.error('Save error:', e);
      toast.error('Failed to save'); 
    }
    finally { setSaving(false); }
  };

  const duplicateTask = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const payload = {
        name: `${task.name} (Copy)`,
        project_id: task.project_id,
        description: task.description,
        priority: task.priority,
        start_date: task.start_date,
        due_date: task.due_date,
        estimated_hours: task.estimated_hours,
        tags: task.tags || []
      };
      
      const res = await fetch(`${API}/api/projects/tasks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const newTask = await res.json();
        toast.success('Task duplicated');
        onUpdate?.();
        // Optionally close and open the new task
        onClose();
      } else {
        throw new Error('Failed to duplicate');
      }
    } catch (e) {
      console.error('Error duplicating task:', e);
      toast.error('Failed to duplicate task');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Inject animation styles */}
      <style>{animationStyles}</style>
      <DialogContent className="bg-[#FDF8F3] border-[#D4BBA6] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col modal-animate p-0">
        {loading ? (
          <div className="animate-pulse space-y-4 p-6">
            <div className="h-8 bg-[#E8D5C4] rounded w-3/4"></div>
            <div className="h-4 bg-[#E8D5C4] rounded w-1/2"></div>
            <div className="h-32 bg-[#E8D5C4] rounded"></div>
          </div>
        ) : task ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white border-b border-[#E8D5C4] p-5 pr-12">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="border-[#D4BBA6] text-xl font-semibold text-[#4A3728] bg-[#FDF8F3]"
                      data-testid="task-name-edit"
                      autoFocus
                    />
                  ) : (
                    <h2 
                      className="text-xl font-bold text-[#4A3728] truncate pr-2 cursor-pointer hover:bg-[#F5EBE0] px-2 py-1 -mx-2 rounded transition-colors"
                      onClick={() => setEditing(true)}
                      title="Click to edit"
                    >
                      {task.name}
                    </h2>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-sm text-[#6B5D52]">
                    <Folder className="w-4 h-4" />
                    <span>{task.project_name}</span>
                    {task.module_name && (
                      <>
                        <span className="text-[#D4BBA6]">•</span>
                        <span>{task.module_name}</span>
                      </>
                    )}
                    {task.parent_recurring_id && (
                      <>
                        <span className="text-[#D4BBA6]">•</span>
                        <span className="flex items-center gap-1 text-indigo-600">
                          <RefreshCw className="w-3 h-3" />
                          Recurring Task
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {editing ? (
                    <>
                      <Button onClick={saveTask} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white btn-hover">
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button onClick={() => setEditing(false)} variant="outline" size="sm" className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={duplicateTask} variant="outline" size="sm" className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]" data-testid="duplicate-task-btn">
                        <Copy className="w-4 h-4 mr-1" />
                        Duplicate
                      </Button>
                      <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Quick Info Bar */}
                <div className="flex flex-wrap items-center gap-3 p-4 bg-white border-b border-[#E8D5C4]">
                  {/* Status - Always editable with quick action */}
                  <Select 
                    value={task.status} 
                    onValueChange={async (v) => {
                      try {
                        const res = await fetch(`${API}/api/projects/tasks/${taskId}`, {
                          method: 'PUT',
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: v })
                        });
                        if (res.ok) {
                          toast.success('Status updated');
                          fetchTask();
                          onUpdate?.();
                        } else {
                          toast.error('Failed to update status');
                        }
                      } catch (e) {
                        toast.error('Failed to update status');
                      }
                    }}
                  >
                    <SelectTrigger className="w-[140px] border-[#D4BBA6] bg-[#FDF8F3] h-8" data-testid="task-status-select">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusConfig[task.status]?.color}`}></div>
                        <SelectValue>{statusConfig[task.status]?.label}</SelectValue>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      {Object.entries(statusConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${v.color}`}></div>
                            {v.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Priority */}
                  {editing ? (
                    <Select value={editData.priority} onValueChange={(v) => setEditData({ ...editData, priority: v })}>
                      <SelectTrigger className="w-[120px] border-[#D4BBA6] bg-[#FDF8F3] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        {Object.entries(priorityConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`${priorityConfig[task.priority]?.color}`}>
                      <Flag className="w-3 h-3 mr-1" />
                      {task.priority}
                    </Badge>
                  )}

                  <div className="h-5 w-px bg-[#E8D5C4]" />

                  {/* Issue Type */}
                  {editing ? (
                    <Select value={editData.issue_type || 'task'} onValueChange={(v) => setEditData({ ...editData, issue_type: v })}>
                      <SelectTrigger className="w-[130px] border-[#D4BBA6] bg-[#FDF8F3] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        {Object.entries(issueTypeConfig).map(([k, v]) => {
                          const IconComp = v.icon;
                          return (
                            <SelectItem key={k} value={k}>
                              <div className="flex items-center gap-2">
                                <IconComp className="w-4 h-4" />
                                {v.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${issueTypeConfig[task.issue_type || 'task']?.color}`}>
                      {(() => {
                        const config = issueTypeConfig[task.issue_type || 'task'];
                        const IconComp = config?.icon || CheckSquare;
                        return <IconComp className="w-3 h-3" />;
                      })()}
                      <span className="text-xs font-medium">{issueTypeConfig[task.issue_type || 'task']?.label}</span>
                    </div>
                  )}

                  {/* Epic Selector */}
                  {epics.length > 0 && (
                    <>
                      <div className="h-5 w-px bg-[#E8D5C4]" />
                      {editing ? (
                        <Select value={editData.epic_id || 'no_epic'} onValueChange={(v) => setEditData({ ...editData, epic_id: v === 'no_epic' ? '' : v })}>
                          <SelectTrigger className="w-[140px] border-[#D4BBA6] bg-[#FDF8F3] h-8">
                            <Layers className="w-3 h-3 mr-1 text-purple-600" />
                            <SelectValue placeholder="No Epic" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#D4BBA6]">
                            <SelectItem value="no_epic">No Epic</SelectItem>
                            {epics.map(epic => (
                              <SelectItem key={epic.id} value={epic.id}>
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: epic.color || '#8B5CF6' }} />
                                  {epic.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : task.epic_id ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-50 text-purple-600">
                          <Layers className="w-3 h-3" />
                          <span className="text-xs font-medium">
                            {epics.find(e => e.id === task.epic_id)?.name || 'Epic'}
                          </span>
                        </div>
                      ) : null}
                    </>
                  )}

                  {/* Release Selector */}
                  {releases.length > 0 && (
                    <>
                      <div className="h-5 w-px bg-[#E8D5C4]" />
                      {editing ? (
                        <Select value={editData.release_id || 'no_release'} onValueChange={(v) => setEditData({ ...editData, release_id: v === 'no_release' ? '' : v })}>
                          <SelectTrigger className="w-[140px] border-[#D4BBA6] bg-[#FDF8F3] h-8">
                            <Target className="w-3 h-3 mr-1 text-violet-600" />
                            <SelectValue placeholder="No Release" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#D4BBA6]">
                            <SelectItem value="no_release">No Release</SelectItem>
                            {releases.map(rel => (
                              <SelectItem key={rel.id} value={rel.id}>
                                {rel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : task.release_id ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-violet-50 text-violet-600">
                          <Target className="w-3 h-3" />
                          <span className="text-xs font-medium">
                            {releases.find(r => r.id === task.release_id)?.name || 'Release'}
                          </span>
                        </div>
                      ) : null}
                    </>
                  )}

                  <div className="h-5 w-px bg-[#E8D5C4]" />

                  {/* Assignee */}
                  {editing ? (
                    <Select value={editData.assigned_to || 'unassigned'} onValueChange={(v) => setEditData({ ...editData, assigned_to: v === 'unassigned' ? '' : v })}>
                      <SelectTrigger className="w-[150px] border-[#D4BBA6] bg-[#FDF8F3] h-8">
                        <User className="w-3 h-3 mr-1 text-[#6B5D52]" />
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[#6B5D52]">
                      <User className="w-4 h-4" />
                      <span>{task.assigned_to_name || 'Unassigned'}</span>
                    </div>
                  )}

                  <div className="h-5 w-px bg-[#E8D5C4]" />

                  {/* Start Date */}
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[#6B5D52]">Start:</span>
                      <Input
                        type="date"
                        value={editData.start_date}
                        onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                        className="w-[130px] border-[#D4BBA6] bg-[#FDF8F3] h-8"
                      />
                    </div>
                  ) : task.start_date && (
                    <div className="flex items-center gap-2 text-sm text-[#6B5D52]">
                      <Clock className="w-4 h-4" />
                      <span>Start: {formatDate(task.start_date)}</span>
                    </div>
                  )}

                  {/* Due Date */}
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[#6B5D52]">Due:</span>
                      <Input
                        type="date"
                        value={editData.due_date}
                        onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                        className="w-[130px] border-[#D4BBA6] bg-[#FDF8F3] h-8"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[#6B5D52]">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {formatDate(task.due_date)}</span>
                    </div>
                  )}

                  {/* Story Points */}
                  <div className="h-5 w-px bg-[#E8D5C4]" />
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-violet-600" />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editData.story_points || ''}
                        onChange={(e) => setEditData({ ...editData, story_points: e.target.value })}
                        placeholder="SP"
                        className="w-[60px] border-[#D4BBA6] bg-[#FDF8F3] h-8 text-center"
                      />
                    </div>
                  ) : task.story_points ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-violet-50 text-violet-700">
                      <Target className="w-3 h-3" />
                      <span className="text-xs font-medium">{task.story_points} pts</span>
                    </div>
                  ) : null}

                  {/* Recurring Indicator */}
                  {(task.is_recurring || editing) && (
                    <>
                      <div className="h-5 w-px bg-[#E8D5C4]" />
                      {editing ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-8 border-[#D4BBA6] ${editData.is_recurring ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}>
                              <Repeat className="w-4 h-4 mr-1" />
                              {editData.is_recurring ? editData.recurrence_pattern || 'Custom' : 'Repeat'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-4 bg-white border-[#D4BBA6]" align="start">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm text-[#4A3728]">Recurring Task</Label>
                                <button
                                  onClick={() => setEditData({
                                    ...editData,
                                    is_recurring: !editData.is_recurring,
                                    recurrence_pattern: editData.is_recurring ? null : 'weekly'
                                  })}
                                  className={`w-10 h-6 rounded-full transition-colors ${editData.is_recurring ? 'bg-rose-500' : 'bg-[#D4BBA6]'}`}
                                >
                                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editData.is_recurring ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                              </div>
                              {editData.is_recurring && (
                                <>
                                  <div>
                                    <Label className="text-xs text-[#6B5D52]">Repeat</Label>
                                    <Select
                                      value={editData.recurrence_pattern || 'weekly'}
                                      onValueChange={(v) => setEditData({ ...editData, recurrence_pattern: v })}
                                    >
                                      <SelectTrigger className="mt-1 border-[#D4BBA6] h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border-[#D4BBA6]">
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-[#6B5D52]">Every</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Input
                                        type="number"
                                        min="1"
                                        value={editData.recurrence_interval || 1}
                                        onChange={(e) => setEditData({ ...editData, recurrence_interval: parseInt(e.target.value) || 1 })}
                                        className="w-16 border-[#D4BBA6] h-8"
                                      />
                                      <span className="text-sm text-[#6B5D52]">
                                        {editData.recurrence_pattern === 'daily' ? 'day(s)' :
                                         editData.recurrence_pattern === 'weekly' ? 'week(s)' :
                                         editData.recurrence_pattern === 'monthly' ? 'month(s)' : 'year(s)'}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-[#6B5D52]">End Date (optional)</Label>
                                    <Input
                                      type="date"
                                      value={editData.recurrence_end_date || ''}
                                      onChange={(e) => setEditData({ ...editData, recurrence_end_date: e.target.value })}
                                      className="mt-1 border-[#D4BBA6] h-8"
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          <Repeat className="w-3.5 h-3.5" />
                          <span className="capitalize">{task.recurrence_pattern}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Description */}
                <div className="p-4 bg-white border-b border-[#E8D5C4]">
                  <Label className="text-[#6B5D52] text-xs font-medium mb-2 block">Description</Label>
                  {editing ? (
                    <RichTextEditor
                      content={editData.description || ''}
                      onChange={(html) => setEditData({ ...editData, description: html })}
                      placeholder="Add a description..."
                      users={users}
                      minHeight="100px"
                    />
                  ) : (
                    <div className="text-[#6B5D52] text-sm min-h-[40px] rich-content">
                      {task.description ? (
                        <div dangerouslySetInnerHTML={{ __html: task.description }} />
                      ) : (
                        <span className="text-[#9C8C74] italic">No description</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bug-specific fields */}
                {(task.issue_type === 'bug' || editData.issue_type === 'bug') && (
                  <div className="p-4 bg-red-50/50 border-b border-[#E8D5C4] space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Bug className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Bug Details</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[#6B5D52] text-xs font-medium mb-1 block">Severity</Label>
                        {editing ? (
                          <Select value={editData.bug_severity || ''} onValueChange={(v) => setEditData({ ...editData, bug_severity: v })}>
                            <SelectTrigger className="h-8 border-[#D4BBA6] bg-white">
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#D4BBA6]">
                              {Object.entries(bugSeverityConfig).map(([k, v]) => (
                                <SelectItem key={k} value={k}>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${v.color}`}>{v.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={bugSeverityConfig[task.bug_severity]?.color || 'bg-gray-200'}>
                            {bugSeverityConfig[task.bug_severity]?.label || 'Not set'}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <Label className="text-[#6B5D52] text-xs font-medium mb-1 block">Environment</Label>
                        {editing ? (
                          <Input
                            value={editData.environment || ''}
                            onChange={(e) => setEditData({ ...editData, environment: e.target.value })}
                            placeholder="e.g., Chrome 120, Windows 11"
                            className="h-8 border-[#D4BBA6] bg-white"
                          />
                        ) : (
                          <span className="text-sm text-[#6B5D52]">{task.environment || 'Not specified'}</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-[#6B5D52] text-xs font-medium mb-1 block">Steps to Reproduce</Label>
                      {editing ? (
                        <Textarea
                          value={editData.reproduction_steps || ''}
                          onChange={(e) => setEditData({ ...editData, reproduction_steps: e.target.value })}
                          placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
                          className="min-h-[60px] border-[#D4BBA6] bg-white"
                        />
                      ) : (
                        <p className="text-sm text-[#6B5D52] whitespace-pre-wrap">{task.reproduction_steps || 'Not provided'}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[#6B5D52] text-xs font-medium mb-1 block">Expected Behavior</Label>
                        {editing ? (
                          <Textarea
                            value={editData.expected_behavior || ''}
                            onChange={(e) => setEditData({ ...editData, expected_behavior: e.target.value })}
                            placeholder="What should happen?"
                            className="min-h-[50px] border-[#D4BBA6] bg-white"
                          />
                        ) : (
                          <p className="text-sm text-[#6B5D52] whitespace-pre-wrap">{task.expected_behavior || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-[#6B5D52] text-xs font-medium mb-1 block">Actual Behavior</Label>
                        {editing ? (
                          <Textarea
                            value={editData.actual_behavior || ''}
                            onChange={(e) => setEditData({ ...editData, actual_behavior: e.target.value })}
                            placeholder="What actually happens?"
                            className="min-h-[50px] border-[#D4BBA6] bg-white"
                          />
                        ) : (
                          <p className="text-sm text-[#6B5D52] whitespace-pre-wrap">{task.actual_behavior || 'Not provided'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Story-specific fields - Acceptance Criteria */}
                {(task.issue_type === 'story' || editData.issue_type === 'story') && (
                  <div className="p-4 bg-green-50/50 border-b border-[#E8D5C4]">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Acceptance Criteria</span>
                    </div>
                    {editing ? (
                      <Textarea
                        value={editData.acceptance_criteria || ''}
                        onChange={(e) => setEditData({ ...editData, acceptance_criteria: e.target.value })}
                        placeholder="Given...&#10;When...&#10;Then..."
                        className="min-h-[80px] border-[#D4BBA6] bg-white"
                      />
                    ) : (
                      <p className="text-sm text-[#6B5D52] whitespace-pre-wrap">
                        {task.acceptance_criteria || 'No acceptance criteria defined'}
                      </p>
                    )}
                  </div>
                )}

                {/* Tabs Section */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pb-4">
                  <TabsList className="bg-gradient-to-r from-[#FDF8F3] to-white border border-[#E8D5C4] rounded-xl mb-4 p-1.5 h-auto flex flex-wrap gap-1 shadow-sm">
                    <TabsTrigger 
                      value="subtasks" 
                      className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm data-[state=active]:border-[#D4BBA6] text-[#6B5D52] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/50 border border-transparent tab-trigger-hover"
                    >
                      <ListTodo className="w-4 h-4 mr-1.5" />
                      Subtasks
                      {task.subtask_count > 0 && <Badge className="ml-1.5 bg-rose-100 text-rose-700 text-xs px-1.5 py-0 h-5 font-semibold">{task.subtask_count}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="checklists" 
                      className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm data-[state=active]:border-[#D4BBA6] text-[#6B5D52] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/50 border border-transparent tab-trigger-hover"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Checklist
                      {task.checklist_count > 0 && <Badge className="ml-1.5 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0 h-5 font-semibold">{task.checklist_completed}/{task.checklist_count}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="comments" 
                      className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm data-[state=active]:border-[#D4BBA6] text-[#6B5D52] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/50 border border-transparent tab-trigger-hover"
                    >
                      <MessageSquare className="w-4 h-4 mr-1.5" />
                      Comments
                      {task.comment_count > 0 && <Badge className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0 h-5 font-semibold">{task.comment_count}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="dependencies" 
                      className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm data-[state=active]:border-[#D4BBA6] text-[#6B5D52] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/50 border border-transparent tab-trigger-hover"
                    >
                      <Link2 className="w-4 h-4 mr-1.5" />
                      Dependencies
                    </TabsTrigger>
                    <TabsTrigger 
                      value="time" 
                      className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm data-[state=active]:border-[#D4BBA6] text-[#6B5D52] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/50 border border-transparent tab-trigger-hover"
                    >
                      <Timer className="w-4 h-4 mr-1.5" />
                      Time
                    </TabsTrigger>
                    <TabsTrigger 
                      value="attachments" 
                      className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm data-[state=active]:border-[#D4BBA6] text-[#6B5D52] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/50 border border-transparent tab-trigger-hover"
                    >
                      <Paperclip className="w-4 h-4 mr-1.5" />
                      Files
                      {task.attachment_count > 0 && <Badge className="ml-1.5 bg-purple-100 text-purple-700 text-xs px-1.5 py-0 h-5 font-semibold">{task.attachment_count}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="reminders" 
                      className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm data-[state=active]:border-[#D4BBA6] text-[#6B5D52] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/50 border border-transparent tab-trigger-hover"
                    >
                      <Bell className="w-4 h-4 mr-1.5" />
                      Follow-ups
                    </TabsTrigger>
                    <TabsTrigger 
                      value="dod" 
                      className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] data-[state=active]:shadow-sm data-[state=active]:border-[#D4BBA6] text-[#6B5D52] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/50 border border-transparent tab-trigger-hover"
                    >
                      <ShieldCheck className={`w-4 h-4 mr-1.5 ${task.dod_complete ? 'text-green-600' : ''}`} />
                      DoD
                      {task.dod_checklist?.length > 0 && (
                        <Badge className={`ml-1.5 text-xs px-1.5 py-0 h-5 font-semibold ${task.dod_complete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {task.dod_complete ? '✓' : task.dod_checklist.filter(i => i.completed).length + '/' + task.dod_checklist.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <div className="bg-white rounded-xl border border-[#E8D5C4] p-4 shadow-sm">
                    <TabsContent value="subtasks" className="tab-content-animate mt-0">
                      <SubtasksSection taskId={taskId} token={token} users={users} />
                    </TabsContent>
                    <TabsContent value="checklists" className="tab-content-animate mt-0">
                      <ChecklistsSection taskId={taskId} token={token} />
                    </TabsContent>
                    <TabsContent value="comments" className="tab-content-animate mt-0">
                      <CommentsSection taskId={taskId} token={token} users={users} />
                    </TabsContent>
                    <TabsContent value="dependencies" className="tab-content-animate mt-0">
                      <DependenciesSection task={task} projectId={task.project_id} token={token} onUpdate={fetchTask} />
                    </TabsContent>
                    <TabsContent value="time" className="tab-content-animate mt-0">
                      <TimeLogsSection taskId={taskId} task={task} token={token} onUpdate={fetchTask} />
                    </TabsContent>
                    <TabsContent value="attachments" className="tab-content-animate mt-0">
                      <AttachmentsSection taskId={taskId} token={token} />
                    </TabsContent>
                    <TabsContent value="reminders" className="tab-content-animate mt-0">
                      <RemindersSection taskId={taskId} token={token} />
                    </TabsContent>
                    <TabsContent value="dod" className="tab-content-animate mt-0">
                      <DoDSection taskId={taskId} task={task} token={token} onUpdate={fetchTask} />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-[#9C8C74]">Task not found</div>
        )}
        
        {/* Styles for rich text content */}
        <style>{`
          .rich-content ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          .rich-content ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          .rich-content li {
            margin: 0.25rem 0;
          }
          .rich-content li p {
            margin: 0;
          }
          .rich-content h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0.5rem 0;
            color: #4A3728;
          }
          .rich-content h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0.5rem 0;
            color: #4A3728;
          }
          .rich-content h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0.5rem 0;
            color: #4A3728;
          }
          .rich-content p {
            margin: 0.5rem 0;
          }
          .rich-content blockquote {
            border-left: 3px solid #D4BBA6;
            padding-left: 1rem;
            margin: 0.5rem 0;
            color: #6B5D52;
            font-style: italic;
          }
          .rich-content pre {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 0.75rem;
            border-radius: 0.5rem;
            font-family: monospace;
            overflow-x: auto;
            margin: 0.5rem 0;
          }
          .rich-content code {
            background: #F5EBE0;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: monospace;
            font-size: 0.875rem;
          }
          .rich-content pre code {
            background: none;
            padding: 0;
          }
          .rich-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 0.5rem 0;
          }
          .rich-content th,
          .rich-content td {
            border: 1px solid #D4BBA6;
            padding: 0.5rem;
            text-align: left;
          }
          .rich-content th {
            background: #F5EBE0;
            font-weight: 600;
          }
          .rich-content img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
          }
          .rich-content a {
            color: #be123c;
            text-decoration: underline;
          }
          .rich-content a:hover {
            color: #9f1239;
          }
          .rich-content .mention {
            background-color: rgb(254 226 226);
            color: rgb(185 28 28);
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
