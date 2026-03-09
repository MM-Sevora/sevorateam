import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, User, Flag, Clock, CheckCircle2, Circle, Plus,
  MessageSquare, Trash2, Edit, Save, ListTodo, Timer, ChevronDown,
  AlertTriangle, Link2, Unlink
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  low: { label: 'Low', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-500' },
  assigned: { label: 'Assigned', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500' },
  pending_review: { label: 'Review', color: 'bg-amber-500' },
  completed: { label: 'Completed', color: 'bg-emerald-500' },
  approved: { label: 'Approved', color: 'bg-green-500' },
  on_hold: { label: 'On Hold', color: 'bg-slate-400' }
};

// Subtasks Section
const SubtasksSection = ({ taskId, token }) => {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchSubtasks = async () => {
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}/subtasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSubtasks(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSubtasks(); }, [taskId]);

  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${API}/api/projects/subtasks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_task_id: taskId, name: newSubtask })
      });
      if (res.ok) {
        setNewSubtask('');
        fetchSubtasks();
        toast.success('Subtask added');
      }
    } catch (e) { toast.error('Failed to add subtask'); }
    finally { setAdding(false); }
  };

  const toggleSubtask = async (subtask) => {
    const newStatus = subtask.status === 'completed' ? 'draft' : 'completed';
    try {
      await fetch(`${API}/api/projects/subtasks/${subtask.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchSubtasks();
    } catch (e) { toast.error('Failed to update'); }
  };

  const deleteSubtask = async (id) => {
    try {
      await fetch(`${API}/api/projects/subtasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchSubtasks();
      toast.success('Subtask deleted');
    } catch (e) { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="animate-pulse h-20 bg-slate-700 rounded"></div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          placeholder="Add a subtask..."
          className="bg-slate-900 border-slate-600 flex-1"
          onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
          data-testid="subtask-input"
        />
        <Button onClick={addSubtask} disabled={adding} size="sm" className="bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {subtasks.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No subtasks yet</p>
      ) : (
        <div className="space-y-2">
          {subtasks.map(st => (
            <div key={st.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded group">
              <button onClick={() => toggleSubtask(st)} className="text-slate-400 hover:text-white">
                {st.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <span className={`flex-1 text-sm ${st.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>
                {st.name}
              </span>
              <button 
                onClick={() => deleteSubtask(st.id)} 
                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Checklists Section
const ChecklistsSection = ({ taskId, token }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}/checklists`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [taskId]);

  const addItem = async () => {
    if (!newItem.trim()) return;
    try {
      const res = await fetch(`${API}/api/projects/checklists`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, text: newItem })
      });
      if (res.ok) {
        setNewItem('');
        fetchItems();
      }
    } catch (e) { toast.error('Failed to add item'); }
  };

  const toggleItem = async (item) => {
    try {
      await fetch(`${API}/api/projects/checklists/${item.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !item.is_completed })
      });
      fetchItems();
    } catch (e) { toast.error('Failed to update'); }
  };

  const deleteItem = async (id) => {
    try {
      await fetch(`${API}/api/projects/checklists/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchItems();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const completed = items.filter(i => i.is_completed).length;

  if (loading) return <div className="animate-pulse h-20 bg-slate-700 rounded"></div>;

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all" 
              style={{ width: `${(completed / items.length) * 100}%` }}
            />
          </div>
          <span>{completed}/{items.length}</span>
        </div>
      )}
      
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item..."
          className="bg-slate-900 border-slate-600 flex-1"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          data-testid="checklist-input"
        />
        <Button onClick={addItem} size="sm" className="bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {items.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No checklist items</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded group">
              <button onClick={() => toggleItem(item)} className="text-slate-400 hover:text-white">
                {item.is_completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-slate-500' : 'text-white'}`}>
                {item.text}
              </span>
              <button 
                onClick={() => deleteItem(item.id)} 
                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Comments Section
const CommentsSection = ({ taskId, token }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComments(); }, [taskId]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/projects/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, content: newComment })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (e) { toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  };

  const deleteComment = async (id) => {
    try {
      await fetch(`${API}/api/projects/comments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchComments();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="animate-pulse h-20 bg-slate-700 rounded"></div>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="bg-slate-900 border-slate-600"
          rows={3}
          data-testid="comment-input"
        />
        <Button 
          onClick={addComment} 
          disabled={submitting || !newComment.trim()} 
          size="sm" 
          className="bg-rose-600 hover:bg-rose-700"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
      
      {comments.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No comments yet</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {comments.map(comment => (
            <div key={comment.id} className="p-3 bg-slate-800/50 rounded group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium">
                    {comment.author_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm font-medium text-white">{comment.author_name}</span>
                  <span className="text-xs text-slate-500">{formatDate(comment.created_at)}</span>
                </div>
                <button 
                  onClick={() => deleteComment(comment.id)} 
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Time Logs Section
const TimeLogsSection = ({ taskId, task, token, onUpdate }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ hours: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}/time-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLogs(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [taskId]);

  const addTimeLog = async () => {
    if (!formData.hours) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/projects/time-logs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_id: taskId, 
          hours: parseFloat(formData.hours),
          description: formData.description 
        })
      });
      if (res.ok) {
        setFormData({ hours: '', description: '' });
        setShowForm(false);
        fetchLogs();
        onUpdate?.();
        toast.success('Time logged');
      }
    } catch (e) { toast.error('Failed to log time'); }
    finally { setSubmitting(false); }
  };

  const totalLogged = logs.reduce((sum, log) => sum + (log.hours || 0), 0);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) return <div className="animate-pulse h-20 bg-slate-700 rounded"></div>;

  return (
    <div className="space-y-4">
      {/* Time Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-slate-800/50 rounded text-center">
          <p className="text-xs text-slate-400">Estimated</p>
          <p className="text-lg font-bold text-white">{task?.estimated_hours || '-'}h</p>
        </div>
        <div className="p-3 bg-slate-800/50 rounded text-center">
          <p className="text-xs text-slate-400">Logged</p>
          <p className="text-lg font-bold text-emerald-400">{totalLogged.toFixed(1)}h</p>
        </div>
        <div className="p-3 bg-slate-800/50 rounded text-center">
          <p className="text-xs text-slate-400">Remaining</p>
          <p className={`text-lg font-bold ${(task?.estimated_hours || 0) - totalLogged < 0 ? 'text-red-400' : 'text-blue-400'}`}>
            {task?.estimated_hours ? ((task.estimated_hours - totalLogged).toFixed(1)) : '-'}h
          </p>
        </div>
      </div>

      {/* Log Time Form */}
      {showForm ? (
        <div className="p-3 bg-slate-800 rounded border border-slate-600 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">Hours *</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="1.5"
                className="bg-slate-900 border-slate-600 mt-1"
                data-testid="time-hours-input"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What did you work on?"
                className="bg-slate-900 border-slate-600 mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addTimeLog} disabled={submitting || !formData.hours} size="sm" className="bg-rose-600 hover:bg-rose-700">
              {submitting ? 'Saving...' : 'Log Time'}
            </Button>
            <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="border-slate-600">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="w-full border-slate-600">
          <Timer className="w-4 h-4 mr-2" />
          Log Time
        </Button>
      )}

      {/* Time Logs List */}
      {logs.length > 0 && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                  {log.user_name?.charAt(0) || '?'}
                </div>
                <div>
                  <span className="text-white font-medium">{log.hours}h</span>
                  {log.description && <span className="text-slate-400 ml-2">- {log.description}</span>}
                </div>
              </div>
              <span className="text-xs text-slate-500">{formatDate(log.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Dependencies Section
const DependenciesSection = ({ task, projectId, token, onUpdate }) => {
  const [projectTasks, setProjectTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedBlockedBy, setSelectedBlockedBy] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState('');

  const fetchProjectTasks = async () => {
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const tasks = await res.json();
        // Filter out current task
        setProjectTasks(tasks.filter(t => t.id !== task.id));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    if (projectId) fetchProjectTasks(); 
  }, [projectId, task.id]);

  const addDependency = async (type) => {
    const taskIdToAdd = type === 'blocked_by' ? selectedBlockedBy : selectedBlocks;
    if (!taskIdToAdd) return;

    setAdding(true);
    try {
      const currentList = task[type] || [];
      const res = await fetch(`${API}/api/projects/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type]: [...currentList, taskIdToAdd] })
      });
      
      if (res.ok) {
        toast.success('Dependency added');
        onUpdate?.();
        if (type === 'blocked_by') setSelectedBlockedBy('');
        else setSelectedBlocks('');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to add dependency');
      }
    } catch (e) { toast.error('Failed to add dependency'); }
    finally { setAdding(false); }
  };

  const removeDependency = async (type, taskIdToRemove) => {
    try {
      const currentList = task[type] || [];
      const res = await fetch(`${API}/api/projects/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type]: currentList.filter(id => id !== taskIdToRemove) })
      });
      
      if (res.ok) {
        toast.success('Dependency removed');
        onUpdate?.();
      }
    } catch (e) { toast.error('Failed to remove dependency'); }
  };

  // Get tasks not already in blocked_by
  const availableBlockers = projectTasks.filter(t => 
    !(task.blocked_by || []).includes(t.id) && t.id !== task.id
  );
  
  // Get tasks not already in blocks
  const availableToBlock = projectTasks.filter(t => 
    !(task.blocks || []).includes(t.id) && t.id !== task.id
  );

  if (loading) return <div className="animate-pulse h-20 bg-slate-700 rounded"></div>;

  return (
    <div className="space-y-6">
      {/* Is Blocked Warning */}
      {task.is_blocked && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5" />
          <span>This task is blocked and cannot be moved forward until dependencies are resolved.</span>
        </div>
      )}

      {/* Blocked By Section */}
      <div>
        <Label className="text-slate-400 text-sm mb-2 block flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Blocked By (must complete first)
        </Label>
        
        {(task.blocked_by || []).length > 0 ? (
          <div className="space-y-2 mb-3">
            {(task.blocked_by || []).map((blockingId, idx) => (
              <div key={blockingId} className="flex items-center justify-between p-2 bg-slate-800/50 rounded group">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-red-400" />
                  <span className="text-white text-sm">{task.blocked_by_names?.[idx] || blockingId}</span>
                </div>
                <button 
                  onClick={() => removeDependency('blocked_by', blockingId)}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm mb-3">No blocking dependencies</p>
        )}

        <div className="flex gap-2">
          <Select value={selectedBlockedBy} onValueChange={setSelectedBlockedBy}>
            <SelectTrigger className="bg-slate-900 border-slate-600 flex-1">
              <SelectValue placeholder="Select task that blocks this..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-[200px]">
              {availableBlockers.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
              {availableBlockers.length === 0 && (
                <div className="p-2 text-sm text-slate-500">No available tasks</div>
              )}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => addDependency('blocked_by')} 
            disabled={!selectedBlockedBy || adding} 
            size="sm" 
            className="bg-rose-600 hover:bg-rose-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Blocks Section */}
      <div>
        <Label className="text-slate-400 text-sm mb-2 block flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Blocks (tasks waiting on this)
        </Label>
        
        {(task.blocks || []).length > 0 ? (
          <div className="space-y-2 mb-3">
            {(task.blocks || []).map((blockedId, idx) => (
              <div key={blockedId} className="flex items-center justify-between p-2 bg-slate-800/50 rounded group">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-amber-400" />
                  <span className="text-white text-sm">{task.blocks_names?.[idx] || blockedId}</span>
                </div>
                <button 
                  onClick={() => removeDependency('blocks', blockedId)}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm mb-3">No dependent tasks</p>
        )}

        <div className="flex gap-2">
          <Select value={selectedBlocks} onValueChange={setSelectedBlocks}>
            <SelectTrigger className="bg-slate-900 border-slate-600 flex-1">
              <SelectValue placeholder="Select task that this blocks..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-[200px]">
              {availableToBlock.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
              {availableToBlock.length === 0 && (
                <div className="p-2 text-sm text-slate-500">No available tasks</div>
              )}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => addDependency('blocks')} 
            disabled={!selectedBlocks || adding} 
            size="sm" 
            className="bg-rose-600 hover:bg-rose-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
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
  const token = localStorage.getItem('sevora_token');

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
          due_date: data.due_date ? data.due_date.split('T')[0] : '',
          estimated_hours: data.estimated_hours || ''
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
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.estimated_hours) delete payload.estimated_hours;
      else payload.estimated_hours = parseFloat(payload.estimated_hours);

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
      }
    } catch (e) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {loading ? (
          <div className="animate-pulse space-y-4 p-4">
            <div className="h-8 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-32 bg-slate-700 rounded"></div>
          </div>
        ) : task ? (
          <>
            <DialogHeader className="border-b border-slate-700 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {editing ? (
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-lg font-semibold"
                      data-testid="task-name-edit"
                    />
                  ) : (
                    <DialogTitle className="text-white text-xl">{task.name}</DialogTitle>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                    <span>{task.project_name}</span>
                    {task.module_name && (
                      <>
                        <span>•</span>
                        <span>{task.module_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button onClick={saveTask} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button onClick={() => setEditing(false)} variant="outline" size="sm" className="border-slate-600">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="border-slate-600">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              {/* Task Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-slate-700">
                <div>
                  <Label className="text-slate-400 text-xs">Status</Label>
                  {editing ? (
                    <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {Object.entries(statusConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${statusConfig[task.status]?.color}`}></div>
                      <span className="text-white text-sm">{statusConfig[task.status]?.label}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Priority</Label>
                  {editing ? (
                    <Select value={editData.priority} onValueChange={(v) => setEditData({ ...editData, priority: v })}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {Object.entries(priorityConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`mt-1 ${priorityConfig[task.priority]?.color}`}>
                      <Flag className="w-3 h-3 mr-1" />
                      {task.priority}
                    </Badge>
                  )}
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Assignee</Label>
                  {editing ? (
                    <Select value={editData.assigned_to || 'unassigned'} onValueChange={(v) => setEditData({ ...editData, assigned_to: v === 'unassigned' ? '' : v })}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 mt-1 h-9">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-white text-sm">{task.assigned_to_name || 'Unassigned'}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Due Date</Label>
                  {editing ? (
                    <Input
                      type="date"
                      value={editData.due_date}
                      onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                      className="bg-slate-900 border-slate-600 mt-1 h-9"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-white text-sm">{formatDate(task.due_date)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="p-4 border-b border-slate-700">
                <Label className="text-slate-400 text-xs mb-2 block">Description</Label>
                {editing ? (
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="bg-slate-900 border-slate-600"
                    rows={3}
                    placeholder="Add a description..."
                  />
                ) : (
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">
                    {task.description || <span className="text-slate-500">No description</span>}
                  </p>
                )}
              </div>

              {/* Tabs for Subtasks, Checklists, Comments, Time */}
              <Tabs defaultValue="subtasks" className="p-4">
                <TabsList className="bg-slate-900 border border-slate-700 mb-4 flex-wrap">
                  <TabsTrigger value="subtasks" className="data-[state=active]:bg-slate-700">
                    <ListTodo className="w-4 h-4 mr-1" />
                    Subtasks
                    {task.subtask_count > 0 && <Badge variant="secondary" className="ml-1 bg-slate-600">{task.subtask_count}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="checklists" className="data-[state=active]:bg-slate-700">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Checklist
                    {task.checklist_count > 0 && <Badge variant="secondary" className="ml-1 bg-slate-600">{task.checklist_completed}/{task.checklist_count}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="data-[state=active]:bg-slate-700">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Comments
                    {task.comment_count > 0 && <Badge variant="secondary" className="ml-1 bg-slate-600">{task.comment_count}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="dependencies" className="data-[state=active]:bg-slate-700">
                    <Link2 className="w-4 h-4 mr-1" />
                    Dependencies
                    {((task.blocked_by?.length || 0) + (task.blocks?.length || 0)) > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-slate-600">
                        {(task.blocked_by?.length || 0) + (task.blocks?.length || 0)}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="time" className="data-[state=active]:bg-slate-700">
                    <Timer className="w-4 h-4 mr-1" />
                    Time
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="subtasks">
                  <SubtasksSection taskId={taskId} token={token} />
                </TabsContent>
                <TabsContent value="checklists">
                  <ChecklistsSection taskId={taskId} token={token} />
                </TabsContent>
                <TabsContent value="comments">
                  <CommentsSection taskId={taskId} token={token} />
                </TabsContent>
                <TabsContent value="dependencies">
                  <DependenciesSection task={task} projectId={task.project_id} token={token} onUpdate={fetchTask} />
                </TabsContent>
                <TabsContent value="time">
                  <TimeLogsSection taskId={taskId} task={task} token={token} onUpdate={fetchTask} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-slate-400">Task not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
