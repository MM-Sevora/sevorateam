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

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          placeholder="Add a subtask..."
          className="border-[#D4BBA6] focus:border-rose-500 flex-1"
          onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
          data-testid="subtask-input"
        />
        <Button onClick={addSubtask} disabled={adding} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {subtasks.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4">No subtasks yet</p>
      ) : (
        <div className="space-y-2">
          {subtasks.map(st => (
            <div key={st.id} className="flex items-center gap-3 p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group">
              <button onClick={() => toggleSubtask(st)} className="text-[#6B5D52] hover:text-[#4A3728]">
                {st.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <span className={`flex-1 text-sm ${st.status === 'completed' ? 'line-through text-[#9C8C74]' : 'text-[#4A3728]'}`}>
                {st.name}
              </span>
              <button 
                onClick={() => deleteSubtask(st.id)} 
                className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100"
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

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-[#6B5D52]">
          <div className="flex-1 h-2 bg-[#E8D5C4] rounded-full overflow-hidden">
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
          className="border-[#D4BBA6] focus:border-rose-500 flex-1"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          data-testid="checklist-input"
        />
        <Button onClick={addItem} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {items.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4">No checklist items</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group">
              <button onClick={() => toggleItem(item)} className="text-[#6B5D52] hover:text-[#4A3728]">
                {item.is_completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-[#9C8C74]' : 'text-[#4A3728]'}`}>
                {item.text}
              </span>
              <button 
                onClick={() => deleteItem(item.id)} 
                className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100"
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

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="border-[#D4BBA6] focus:border-rose-500"
          rows={3}
          data-testid="comment-input"
        />
        <Button 
          onClick={addComment} 
          disabled={submitting || !newComment.trim()} 
          size="sm" 
          className="bg-rose-600 hover:bg-rose-700 text-white"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
      
      {comments.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4">No comments yet</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {comments.map(comment => (
            <div key={comment.id} className="p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#E8D5C4] flex items-center justify-center text-xs font-medium text-[#4A3728]">
                    {comment.author_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm font-medium text-[#4A3728]">{comment.author_name}</span>
                  <span className="text-xs text-[#9C8C74]">{formatDate(comment.created_at)}</span>
                </div>
                <button 
                  onClick={() => deleteComment(comment.id)} 
                  className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#6B5D52] whitespace-pre-wrap">{comment.content}</p>
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

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-4">
      {/* Time Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg text-center">
          <p className="text-xs text-[#6B5D52]">Estimated</p>
          <p className="text-lg font-bold text-[#4A3728]">{task?.estimated_hours || '-'}h</p>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
          <p className="text-xs text-emerald-700">Logged</p>
          <p className="text-lg font-bold text-emerald-600">{totalLogged.toFixed(1)}h</p>
        </div>
        <div className="p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg text-center">
          <p className="text-xs text-[#6B5D52]">Remaining</p>
          <p className={`text-lg font-bold ${(task?.estimated_hours || 0) - totalLogged < 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {task?.estimated_hours ? ((task.estimated_hours - totalLogged).toFixed(1)) : '-'}h
          </p>
        </div>
      </div>

      {/* Log Time Form */}
      {showForm ? (
        <div className="p-3 bg-white rounded-lg border border-[#D4BBA6] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#6B5D52] text-xs">Hours *</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="1.5"
                className="border-[#D4BBA6] mt-1"
                data-testid="time-hours-input"
              />
            </div>
            <div>
              <Label className="text-[#6B5D52] text-xs">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What did you work on?"
                className="border-[#D4BBA6] mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addTimeLog} disabled={submitting || !formData.hours} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
              {submitting ? 'Saving...' : 'Log Time'}
            </Button>
            <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="border-[#D4BBA6] text-[#4A3728]">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="w-full border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]">
          <Timer className="w-4 h-4 mr-2" />
          Log Time
        </Button>
      )}

      {/* Time Logs List */}
      {logs.length > 0 && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex items-center justify-between p-2 bg-[#FDF8F3] border border-[#E8D5C4] rounded text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#E8D5C4] flex items-center justify-center text-xs text-[#4A3728]">
                  {log.user_name?.charAt(0) || '?'}
                </div>
                <div>
                  <span className="text-[#4A3728] font-medium">{log.hours}h</span>
                  {log.description && <span className="text-[#6B5D52] ml-2">- {log.description}</span>}
                </div>
              </div>
              <span className="text-xs text-[#9C8C74]">{formatDate(log.created_at)}</span>
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

  const availableBlockers = projectTasks.filter(t => 
    !(task.blocked_by || []).includes(t.id) && t.id !== task.id
  );
  
  const availableToBlock = projectTasks.filter(t => 
    !(task.blocks || []).includes(t.id) && t.id !== task.id
  );

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-6">
      {/* Is Blocked Warning */}
      {task.is_blocked && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5" />
          <span>This task is blocked and cannot be moved forward until dependencies are resolved.</span>
        </div>
      )}

      {/* Blocked By Section */}
      <div>
        <Label className="text-[#6B5D52] text-sm mb-2 block flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Blocked By (must complete first)
        </Label>
        
        {(task.blocked_by || []).length > 0 ? (
          <div className="space-y-2 mb-3">
            {(task.blocked_by || []).map((blockingId, idx) => (
              <div key={blockingId} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg group">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-red-600" />
                  <span className="text-[#4A3728] text-sm">{task.blocked_by_names?.[idx] || blockingId}</span>
                </div>
                <button 
                  onClick={() => removeDependency('blocked_by', blockingId)}
                  className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#9C8C74] text-sm mb-3">No blocking dependencies</p>
        )}

        <div className="flex gap-2">
          <Select value={selectedBlockedBy} onValueChange={setSelectedBlockedBy}>
            <SelectTrigger className="border-[#D4BBA6] flex-1">
              <SelectValue placeholder="Select task that blocks this..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-[#D4BBA6] max-h-[200px]">
              {availableBlockers.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
              {availableBlockers.length === 0 && (
                <div className="p-2 text-sm text-[#9C8C74]">No available tasks</div>
              )}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => addDependency('blocked_by')} 
            disabled={!selectedBlockedBy || adding} 
            size="sm" 
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Blocks Section */}
      <div>
        <Label className="text-[#6B5D52] text-sm mb-2 block flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Blocks (tasks waiting on this)
        </Label>
        
        {(task.blocks || []).length > 0 ? (
          <div className="space-y-2 mb-3">
            {(task.blocks || []).map((blockedId, idx) => (
              <div key={blockedId} className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg group">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-amber-600" />
                  <span className="text-[#4A3728] text-sm">{task.blocks_names?.[idx] || blockedId}</span>
                </div>
                <button 
                  onClick={() => removeDependency('blocks', blockedId)}
                  className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#9C8C74] text-sm mb-3">No dependent tasks</p>
        )}

        <div className="flex gap-2">
          <Select value={selectedBlocks} onValueChange={setSelectedBlocks}>
            <SelectTrigger className="border-[#D4BBA6] flex-1">
              <SelectValue placeholder="Select task that this blocks..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-[#D4BBA6] max-h-[200px]">
              {availableToBlock.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
              {availableToBlock.length === 0 && (
                <div className="p-2 text-sm text-[#9C8C74]">No available tasks</div>
              )}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => addDependency('blocks')} 
            disabled={!selectedBlocks || adding} 
            size="sm" 
            className="bg-rose-600 hover:bg-rose-700 text-white"
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
      <DialogContent className="bg-white border-[#D4BBA6] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {loading ? (
          <div className="animate-pulse space-y-4 p-4">
            <div className="h-8 bg-[#E8D5C4] rounded w-3/4"></div>
            <div className="h-4 bg-[#E8D5C4] rounded w-1/2"></div>
            <div className="h-32 bg-[#E8D5C4] rounded"></div>
          </div>
        ) : task ? (
          <>
            <DialogHeader className="border-b border-[#E8D5C4] pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {editing ? (
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="border-[#D4BBA6] text-lg font-semibold text-[#4A3728]"
                      data-testid="task-name-edit"
                    />
                  ) : (
                    <DialogTitle className="text-[#4A3728] text-xl">{task.name}</DialogTitle>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-sm text-[#6B5D52]">
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
                      <Button onClick={saveTask} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button onClick={() => setEditing(false)} variant="outline" size="sm" className="border-[#D4BBA6] text-[#4A3728]">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              {/* Task Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-[#E8D5C4]">
                <div>
                  <Label className="text-[#6B5D52] text-xs">Status</Label>
                  {editing ? (
                    <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                      <SelectTrigger className="border-[#D4BBA6] mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        {Object.entries(statusConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${statusConfig[task.status]?.color}`}></div>
                      <span className="text-[#4A3728] text-sm">{statusConfig[task.status]?.label}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[#6B5D52] text-xs">Priority</Label>
                  {editing ? (
                    <Select value={editData.priority} onValueChange={(v) => setEditData({ ...editData, priority: v })}>
                      <SelectTrigger className="border-[#D4BBA6] mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
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
                  <Label className="text-[#6B5D52] text-xs">Assignee</Label>
                  {editing ? (
                    <Select value={editData.assigned_to || 'unassigned'} onValueChange={(v) => setEditData({ ...editData, assigned_to: v === 'unassigned' ? '' : v })}>
                      <SelectTrigger className="border-[#D4BBA6] mt-1 h-9">
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
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-[#6B5D52]" />
                      <span className="text-[#4A3728] text-sm">{task.assigned_to_name || 'Unassigned'}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[#6B5D52] text-xs">Due Date</Label>
                  {editing ? (
                    <Input
                      type="date"
                      value={editData.due_date}
                      onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                      className="border-[#D4BBA6] mt-1 h-9"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-[#6B5D52]" />
                      <span className="text-[#4A3728] text-sm">{formatDate(task.due_date)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="p-4 border-b border-[#E8D5C4]">
                <Label className="text-[#6B5D52] text-xs mb-2 block">Description</Label>
                {editing ? (
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="border-[#D4BBA6]"
                    rows={3}
                    placeholder="Add a description..."
                  />
                ) : (
                  <p className="text-[#6B5D52] text-sm whitespace-pre-wrap">
                    {task.description || <span className="text-[#9C8C74]">No description</span>}
                  </p>
                )}
              </div>

              {/* Tabs for Subtasks, Checklists, Comments, Time */}
              <Tabs defaultValue="subtasks" className="p-4">
                <TabsList className="bg-[#F5EBE0] border border-[#E8D5C4] mb-4 flex-wrap">
                  <TabsTrigger value="subtasks" className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] text-[#6B5D52]">
                    <ListTodo className="w-4 h-4 mr-1" />
                    Subtasks
                    {task.subtask_count > 0 && <Badge variant="secondary" className="ml-1 bg-[#E8D5C4] text-[#4A3728]">{task.subtask_count}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="checklists" className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] text-[#6B5D52]">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Checklist
                    {task.checklist_count > 0 && <Badge variant="secondary" className="ml-1 bg-[#E8D5C4] text-[#4A3728]">{task.checklist_completed}/{task.checklist_count}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] text-[#6B5D52]">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Comments
                    {task.comment_count > 0 && <Badge variant="secondary" className="ml-1 bg-[#E8D5C4] text-[#4A3728]">{task.comment_count}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="dependencies" className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] text-[#6B5D52]">
                    <Link2 className="w-4 h-4 mr-1" />
                    Dependencies
                    {((task.blocked_by?.length || 0) + (task.blocks?.length || 0)) > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-[#E8D5C4] text-[#4A3728]">
                        {(task.blocked_by?.length || 0) + (task.blocks?.length || 0)}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="time" className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728] text-[#6B5D52]">
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
          <div className="p-8 text-center text-[#9C8C74]">Task not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
