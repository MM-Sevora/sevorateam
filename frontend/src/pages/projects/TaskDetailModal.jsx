import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Calendar, User, Flag, Clock, CheckCircle2, Circle, Plus,
  MessageSquare, Trash2, Edit, Save, ListTodo, Timer, ChevronDown,
  AlertTriangle, Link2, Unlink, Paperclip, Upload, FileText, Image,
  File, Download, Folder, Tag, Repeat, RefreshCw, Bell, BellRing, Copy,
  Layers, Bug, BookOpen, Zap, Search, CheckSquare, Target
} from 'lucide-react';

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

// Label colors
const labelColors = {
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' }
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

// Subtasks Section
const SubtasksSection = ({ taskId, token, users = [] }) => {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [adding, setAdding] = useState(false);
  const [recentlyToggled, setRecentlyToggled] = useState(null);

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
      const payload = { parent_task_id: taskId, name: newSubtask };
      if (newSubtaskDueDate) payload.due_date = newSubtaskDueDate;
      
      const res = await fetch(`${API}/api/projects/subtasks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewSubtask('');
        setNewSubtaskDueDate('');
        fetchSubtasks();
        toast.success('Subtask added');
      }
    } catch (e) { toast.error('Failed to add subtask'); }
    finally { setAdding(false); }
  };

  const updateSubtaskDueDate = async (subtaskId, dueDate) => {
    try {
      await fetch(`${API}/api/projects/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: dueDate || null })
      });
      fetchSubtasks();
      toast.success('Due date updated');
    } catch (e) { toast.error('Failed to update due date'); }
  };

  const toggleSubtask = async (subtask) => {
    const newStatus = subtask.status === 'completed' ? 'draft' : 'completed';
    setRecentlyToggled(subtask.id);
    setTimeout(() => setRecentlyToggled(null), 300);
    try {
      await fetch(`${API}/api/projects/subtasks/${subtask.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchSubtasks();
    } catch (e) { toast.error('Failed to update'); }
  };

  const assignSubtask = async (subtaskId, userId) => {
    try {
      await fetch(`${API}/api/projects/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: userId === 'unassigned' ? null : userId })
      });
      fetchSubtasks();
      toast.success('Subtask assigned');
    } catch (e) { toast.error('Failed to assign'); }
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
          className="border-[#D4BBA6] focus:border-rose-500 flex-1 transition-all duration-200 focus:shadow-md"
          onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
          data-testid="subtask-input"
        />
        <Input
          type="date"
          value={newSubtaskDueDate}
          onChange={(e) => setNewSubtaskDueDate(e.target.value)}
          className="border-[#D4BBA6] w-[130px] text-sm"
          title="Due date"
        />
        <Button onClick={addSubtask} disabled={adding} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white btn-hover">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {subtasks.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4 tab-content-animate">No subtasks yet</p>
      ) : (
        <div className="space-y-2">
          {subtasks.map((st, index) => (
            <div 
              key={st.id} 
              className={`flex items-center gap-3 p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group item-hover stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'both' }}
            >
              <button onClick={() => toggleSubtask(st)} className="text-[#6B5D52] hover:text-[#4A3728] transition-colors">
                {st.status === 'completed' ? (
                  <CheckCircle2 className={`w-5 h-5 text-emerald-600 ${recentlyToggled === st.id ? 'check-animate' : ''}`} />
                ) : (
                  <Circle className={`w-5 h-5 ${recentlyToggled === st.id ? 'check-animate' : ''}`} />
                )}
              </button>
              <span className={`flex-1 text-sm transition-all duration-200 ${st.status === 'completed' ? 'line-through text-[#9C8C74]' : 'text-[#4A3728]'}`}>
                {st.name}
              </span>
              {/* Due Date */}
              <Input
                type="date"
                value={st.due_date ? st.due_date.split('T')[0] : ''}
                onChange={(e) => updateSubtaskDueDate(st.id, e.target.value)}
                className={`w-[110px] h-7 text-xs border-[#D4BBA6] bg-white ${
                  st.due_date && new Date(st.due_date) < new Date() && st.status !== 'completed' 
                    ? 'text-red-600 border-red-300' 
                    : ''
                }`}
                title="Due date"
              />
              {/* Assignee */}
              <Select 
                value={st.assigned_to || 'unassigned'} 
                onValueChange={(v) => assignSubtask(st.id, v)}
              >
                <SelectTrigger className="w-[110px] h-7 text-xs border-[#D4BBA6] bg-white">
                  {st.assigned_to_name ? (
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-[#E8D5C4] flex items-center justify-center text-[10px] font-medium">
                        {st.assigned_to_name.charAt(0)}
                      </div>
                      <span className="truncate">{st.assigned_to_name.split(' ')[0]}</span>
                    </div>
                  ) : (
                    <span className="text-[#9C8C74]">Assign</span>
                  )}
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6]">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button 
                onClick={() => deleteSubtask(st.id)} 
                className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
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
  const [recentlyToggled, setRecentlyToggled] = useState(null);

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
    setRecentlyToggled(item.id);
    setTimeout(() => setRecentlyToggled(null), 300);
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
              className="h-full bg-emerald-500 progress-bar-animate" 
              style={{ width: `${(completed / items.length) * 100}%` }}
            />
          </div>
          <span className="font-medium">{completed}/{items.length}</span>
        </div>
      )}
      
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item..."
          className="border-[#D4BBA6] focus:border-rose-500 flex-1 transition-all duration-200 focus:shadow-md"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          data-testid="checklist-input"
        />
        <Button onClick={addItem} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white btn-hover">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {items.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4 tab-content-animate">No checklist items</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className={`flex items-center gap-3 p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group item-hover stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'both' }}
            >
              <button onClick={() => toggleItem(item)} className="text-[#6B5D52] hover:text-[#4A3728] transition-colors">
                {item.is_completed ? (
                  <CheckCircle2 className={`w-5 h-5 text-emerald-600 ${recentlyToggled === item.id ? 'check-animate' : ''}`} />
                ) : (
                  <Circle className={`w-5 h-5 ${recentlyToggled === item.id ? 'check-animate' : ''}`} />
                )}
              </button>
              <span className={`flex-1 text-sm transition-all duration-200 ${item.is_completed ? 'line-through text-[#9C8C74]' : 'text-[#4A3728]'}`}>
                {item.text}
              </span>
              <button 
                onClick={() => deleteItem(item.id)} 
                className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
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
const CommentsSection = ({ taskId, token, users = [] }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState([]);

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
    if (!newComment.trim() || newComment === '<p></p>') return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/projects/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_id: taskId, 
          content: newComment,
          mentions: mentionedUsers 
        })
      });
      if (res.ok) {
        setNewComment('');
        setMentionedUsers([]);
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
        <RichTextEditor
          content={newComment}
          onChange={setNewComment}
          onMentionsChange={setMentionedUsers}
          placeholder="Write a comment... Use @ to mention someone"
          users={users}
          minHeight="80px"
        />
        <Button 
          onClick={addComment} 
          disabled={submitting || !newComment.trim() || newComment === '<p></p>'} 
          size="sm" 
          className="bg-rose-600 hover:bg-rose-700 text-white btn-hover"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
      
      {comments.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4 tab-content-animate">No comments yet</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {comments.map((comment, index) => (
            <div 
              key={comment.id} 
              className={`p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group item-hover stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#E8D5C4] flex items-center justify-center text-xs font-medium text-[#4A3728] transition-transform hover:scale-110">
                    {comment.author_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm font-medium text-[#4A3728]">{comment.author_name}</span>
                  <span className="text-xs text-[#9C8C74]">{formatDate(comment.created_at)}</span>
                </div>
                <button 
                  onClick={() => deleteComment(comment.id)} 
                  className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-[#6B5D52] prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: comment.content }} />
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
        <div className="p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg text-center transition-all duration-200 hover:shadow-md hover:border-[#D4BBA6]">
          <p className="text-xs text-[#6B5D52]">Estimated</p>
          <p className="text-lg font-bold text-[#4A3728]">{task?.estimated_hours || '-'}h</p>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center transition-all duration-200 hover:shadow-md hover:border-emerald-300">
          <p className="text-xs text-emerald-700">Logged</p>
          <p className="text-lg font-bold text-emerald-600">{totalLogged.toFixed(1)}h</p>
        </div>
        <div className="p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg text-center transition-all duration-200 hover:shadow-md hover:border-[#D4BBA6]">
          <p className="text-xs text-[#6B5D52]">Remaining</p>
          <p className={`text-lg font-bold ${(task?.estimated_hours || 0) - totalLogged < 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {task?.estimated_hours ? ((task.estimated_hours - totalLogged).toFixed(1)) : '-'}h
          </p>
        </div>
      </div>

      {/* Log Time Form */}
      {showForm ? (
        <div className="p-3 bg-white rounded-lg border border-[#D4BBA6] space-y-3 tab-content-animate">
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
                className="border-[#D4BBA6] mt-1 transition-all duration-200 focus:shadow-md"
                data-testid="time-hours-input"
              />
            </div>
            <div>
              <Label className="text-[#6B5D52] text-xs">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What did you work on?"
                className="border-[#D4BBA6] mt-1 transition-all duration-200 focus:shadow-md"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addTimeLog} disabled={submitting || !formData.hours} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white btn-hover">
              {submitting ? 'Saving...' : 'Log Time'}
            </Button>
            <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="border-[#D4BBA6] text-[#4A3728] transition-all duration-200 hover:bg-[#F5EBE0]">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="w-full border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0] transition-all duration-200 hover:shadow-md">
          <Timer className="w-4 h-4 mr-2" />
          Log Time
        </Button>
      )}

      {/* Time Logs List */}
      {logs.length > 0 && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {logs.map((log, index) => (
            <div 
              key={log.id} 
              className={`flex items-center justify-between p-2 bg-[#FDF8F3] border border-[#E8D5C4] rounded text-sm item-hover stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#E8D5C4] flex items-center justify-center text-xs text-[#4A3728] transition-transform hover:scale-110">
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

// Attachments Section
const AttachmentsSection = ({ taskId, token }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`${API}/api/projects/tasks/${taskId}/attachments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAttachments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAttachments(); }, [taskId]);

  const uploadFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API}/api/projects/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        toast.success('File uploaded');
        fetchAttachments();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to upload');
      }
    } catch (e) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files?.length) {
      Array.from(files).forEach(uploadFile);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer?.files;
    if (files?.length) {
      Array.from(files).forEach(uploadFile);
    }
  };

  const downloadAttachment = async (attachment) => {
    try {
      const res = await fetch(`${API}/api/projects/attachments/${attachment.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.original_filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      toast.error('Failed to download file');
    }
  };

  const deleteAttachment = async (id) => {
    try {
      const res = await fetch(`${API}/api/projects/attachments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAttachments();
        toast.success('Attachment deleted');
      }
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (contentType) => {
    if (contentType?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (contentType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-[#6B5D52]" />;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200
          ${dragActive 
            ? 'border-rose-500 bg-rose-50' 
            : 'border-[#D4BBA6] hover:border-[#9C8C74] hover:bg-[#FDF8F3]'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          data-testid="file-input"
        />
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? 'text-rose-500' : 'text-[#9C8C74]'}`} />
        <p className="text-sm text-[#6B5D52]">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-[#9C8C74] mt-1">Max 10MB per file</p>
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <p className="text-[#9C8C74] text-sm text-center py-4 tab-content-animate">No attachments yet</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att, index) => (
            <div
              key={att.id}
              className={`flex items-center gap-3 p-3 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group item-hover stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'both' }}
            >
              {getFileIcon(att.content_type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#4A3728] truncate">{att.original_filename}</p>
                <p className="text-xs text-[#9C8C74]">
                  {formatFileSize(att.size)} • {formatDate(att.created_at)}
                  {att.uploaded_by_name && ` • ${att.uploaded_by_name}`}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => downloadAttachment(att)}
                  className="p-1.5 text-[#6B5D52] hover:text-[#4A3728] hover:bg-[#E8D5C4] rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteAttachment(att.id)}
                  className="p-1.5 text-[#9C8C74] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Reminders/Follow-ups Section
const RemindersSection = ({ taskId, token }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newReminder, setNewReminder] = useState({ remind_at: '', message: '' });
  const [saving, setSaving] = useState(false);

  const fetchReminders = async () => {
    try {
      const response = await fetch(`${API}/api/projects/reminders?task_id=${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [taskId]);

  const handleCreate = async () => {
    if (!newReminder.remind_at) {
      toast.error('Please select a date and time');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API}/api/projects/reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: taskId,
          remind_at: new Date(newReminder.remind_at).toISOString(),
          message: newReminder.message || null
        })
      });

      if (!response.ok) throw new Error('Failed to create reminder');
      
      toast.success('Follow-up reminder created');
      setNewReminder({ remind_at: '', message: '' });
      setShowCreate(false);
      fetchReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reminderId) => {
    try {
      const response = await fetch(`${API}/api/projects/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete reminder');
      
      toast.success('Reminder deleted');
      setReminders(reminders.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isPast = (dateStr) => new Date(dateStr) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-[#9C8C74]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B5D52]">
          Set reminders to follow up on this task
        </p>
        <Button
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="bg-rose-600 hover:bg-rose-700 text-white"
          data-testid="add-reminder-btn"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Reminder
        </Button>
      </div>

      {showCreate && (
        <div className="p-4 bg-[#FDF8F3] rounded-lg border border-[#E8D5C4] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#6B5D52] text-xs">Remind me at *</Label>
              <Input
                type="datetime-local"
                value={newReminder.remind_at}
                onChange={(e) => setNewReminder({ ...newReminder, remind_at: e.target.value })}
                className="border-[#D4BBA6] bg-white mt-1"
                min={new Date().toISOString().slice(0, 16)}
                data-testid="reminder-datetime-input"
              />
            </div>
            <div>
              <Label className="text-[#6B5D52] text-xs">Message (optional)</Label>
              <Input
                value={newReminder.message}
                onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                className="border-[#D4BBA6] bg-white mt-1"
                placeholder="Follow up on progress..."
                data-testid="reminder-message-input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="border-[#D4BBA6] text-[#5D4A3A]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              data-testid="save-reminder-btn"
            >
              {saving ? 'Saving...' : 'Save Reminder'}
            </Button>
          </div>
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="text-center py-8 text-[#9C8C74]">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No follow-up reminders set</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map(reminder => (
            <div
              key={reminder.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                reminder.is_sent 
                  ? 'bg-stone-50 border-stone-200 opacity-60' 
                  : isPast(reminder.remind_at)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-[#E8D5C4]'
              }`}
              data-testid={`reminder-${reminder.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  reminder.is_sent 
                    ? 'bg-stone-100' 
                    : isPast(reminder.remind_at)
                      ? 'bg-red-100'
                      : 'bg-amber-100'
                }`}>
                  {reminder.is_sent ? (
                    <CheckCircle2 className="w-4 h-4 text-stone-500" />
                  ) : (
                    <BellRing className={`w-4 h-4 ${isPast(reminder.remind_at) ? 'text-red-600' : 'text-amber-600'}`} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#4A3728]">
                    {formatDate(reminder.remind_at)}
                  </p>
                  {reminder.message && (
                    <p className="text-xs text-[#6B5D52]">{reminder.message}</p>
                  )}
                  {reminder.is_sent && (
                    <Badge className="mt-1 bg-stone-100 text-stone-600 text-xs">Sent</Badge>
                  )}
                </div>
              </div>
              {!reminder.is_sent && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(reminder.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid={`delete-reminder-${reminder.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Labels Section
const LabelsSection = ({ taskId, task, projectId, token, onUpdate }) => {
  const [labels, setLabels] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: 'blue' });
  const [creating, setCreating] = useState(false);

  const fetchLabels = async () => {
    try {
      const res = await fetch(`${API}/api/projects/labels?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAllLabels(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLabels(); }, [projectId]);

  const taskLabels = task?.labels || [];

  const createLabel = async () => {
    if (!newLabel.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/projects/labels`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLabel, project_id: projectId })
      });
      if (res.ok) {
        const created = await res.json();
        setAllLabels(prev => [...prev, created]);
        setNewLabel({ name: '', color: 'blue' });
        setShowCreate(false);
        // Also add to task
        await addLabelToTask(created.id);
        toast.success('Label created');
      }
    } catch (e) { toast.error('Failed to create label'); }
    finally { setCreating(false); }
  };

  const addLabelToTask = async (labelId) => {
    try {
      await fetch(`${API}/api/projects/tasks/${taskId}/labels/${labelId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      onUpdate?.();
    } catch (e) { toast.error('Failed to add label'); }
  };

  const removeLabelFromTask = async (labelId) => {
    try {
      await fetch(`${API}/api/projects/tasks/${taskId}/labels/${labelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      onUpdate?.();
    } catch (e) { toast.error('Failed to remove label'); }
  };

  const deleteLabel = async (labelId) => {
    if (!window.confirm('Delete this label from all tasks?')) return;
    try {
      await fetch(`${API}/api/projects/labels/${labelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAllLabels(prev => prev.filter(l => l.id !== labelId));
      onUpdate?.();
      toast.success('Label deleted');
    } catch (e) { toast.error('Failed to delete label'); }
  };

  const isLabelOnTask = (labelId) => taskLabels.some(l => l.id === labelId);

  if (loading) return <div className="animate-pulse h-20 bg-[#E8D5C4] rounded"></div>;

  return (
    <div className="space-y-4">
      {/* Current Labels */}
      <div>
        <Label className="text-[#6B5D52] text-xs font-medium mb-2 block">Task Labels</Label>
        {taskLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {taskLabels.map(label => {
              const colors = labelColors[label.color] || labelColors.gray;
              return (
                <span
                  key={label.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  {label.name}
                  <button
                    onClick={() => removeLabelFromTask(label.id)}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-[#9C8C74] text-sm">No labels assigned</p>
        )}
      </div>

      {/* Add Labels */}
      <div>
        <Label className="text-[#6B5D52] text-xs font-medium mb-2 block">Add Label</Label>
        <div className="flex flex-wrap gap-2">
          {allLabels.filter(l => !isLabelOnTask(l.id)).map(label => {
            const colors = labelColors[label.color] || labelColors.gray;
            return (
              <button
                key={label.id}
                onClick={() => addLabelToTask(label.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border ${colors.bg} ${colors.text} ${colors.border} hover:ring-2 hover:ring-offset-1 hover:ring-rose-400 transition-all`}
              >
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                {label.name}
              </button>
            );
          })}
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border border-dashed border-[#D4BBA6] text-[#6B5D52] hover:border-rose-400 hover:text-rose-600 transition-all"
          >
            <Plus className="w-3 h-3" />
            New Label
          </button>
        </div>
      </div>

      {/* Create Label Form */}
      {showCreate && (
        <div className="p-3 bg-white border border-[#D4BBA6] rounded-lg space-y-3 tab-content-animate">
          <div className="flex gap-2">
            <Input
              value={newLabel.name}
              onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
              placeholder="Label name..."
              className="border-[#D4BBA6] flex-1"
              onKeyDown={(e) => e.key === 'Enter' && createLabel()}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(labelColors).map(([color, config]) => (
              <button
                key={color}
                onClick={() => setNewLabel({ ...newLabel, color })}
                className={`w-6 h-6 rounded-full ${config.dot} ${newLabel.color === color ? 'ring-2 ring-offset-2 ring-rose-500' : ''} hover:scale-110 transition-transform`}
                title={color}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={createLabel} disabled={creating || !newLabel.name.trim()} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
              {creating ? 'Creating...' : 'Create'}
            </Button>
            <Button onClick={() => setShowCreate(false)} variant="outline" size="sm" className="border-[#D4BBA6] text-[#4A3728]">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Manage Labels */}
      {allLabels.length > 0 && (
        <div className="pt-3 border-t border-[#E8D5C4]">
          <Label className="text-[#6B5D52] text-xs font-medium mb-2 block">Manage Labels</Label>
          <div className="space-y-1">
            {allLabels.map(label => {
              const colors = labelColors[label.color] || labelColors.gray;
              return (
                <div key={label.id} className="flex items-center justify-between py-1 group">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-sm ${colors.bg} ${colors.text}`}>
                    <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    {label.name}
                  </span>
                  <button
                    onClick={() => deleteLabel(label.id)}
                    className="text-[#9C8C74] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.estimated_hours) delete payload.estimated_hours;
      else payload.estimated_hours = parseFloat(payload.estimated_hours);
      // Handle story points
      if (payload.story_points) payload.story_points = parseInt(payload.story_points);
      else delete payload.story_points;

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

  const duplicateTask = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const payload = {
        name: `${task.name} (Copy)`,
        project_id: task.project_id,
        description: task.description,
        priority: task.priority,
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
                  {/* Status */}
                  {editing ? (
                    <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                      <SelectTrigger className="w-[130px] border-[#D4BBA6] bg-[#FDF8F3] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        {Object.entries(statusConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5EBE0] rounded-full">
                      <div className={`w-2 h-2 rounded-full ${statusConfig[task.status]?.color}`}></div>
                      <span className="text-sm font-medium text-[#4A3728]">{statusConfig[task.status]?.label}</span>
                    </div>
                  )}

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

                  {/* Due Date */}
                  {editing ? (
                    <Input
                      type="date"
                      value={editData.due_date}
                      onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                      className="w-[140px] border-[#D4BBA6] bg-[#FDF8F3] h-8"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[#6B5D52]">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(task.due_date)}</span>
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
                    <div className="text-[#6B5D52] text-sm min-h-[40px] prose prose-sm max-w-none">
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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
                  <TabsList className="bg-white border border-[#E8D5C4] mb-4 p-1 h-auto flex-wrap gap-1">
                    <TabsTrigger value="subtasks" className="data-[state=active]:bg-[#F5EBE0] data-[state=active]:text-[#4A3728] text-[#6B5D52] rounded-md px-3 py-1.5 text-sm">
                      <ListTodo className="w-4 h-4 mr-1.5" />
                      Subtasks
                      {task.subtask_count > 0 && <Badge className="ml-1.5 bg-[#E8D5C4] text-[#4A3728] text-xs px-1.5">{task.subtask_count}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="checklists" className="data-[state=active]:bg-[#F5EBE0] data-[state=active]:text-[#4A3728] text-[#6B5D52] rounded-md px-3 py-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Checklist
                      {task.checklist_count > 0 && <Badge className="ml-1.5 bg-[#E8D5C4] text-[#4A3728] text-xs px-1.5">{task.checklist_completed}/{task.checklist_count}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="data-[state=active]:bg-[#F5EBE0] data-[state=active]:text-[#4A3728] text-[#6B5D52] rounded-md px-3 py-1.5 text-sm">
                      <MessageSquare className="w-4 h-4 mr-1.5" />
                      Comments
                      {task.comment_count > 0 && <Badge className="ml-1.5 bg-[#E8D5C4] text-[#4A3728] text-xs px-1.5">{task.comment_count}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="dependencies" className="data-[state=active]:bg-[#F5EBE0] data-[state=active]:text-[#4A3728] text-[#6B5D52] rounded-md px-3 py-1.5 text-sm">
                      <Link2 className="w-4 h-4 mr-1.5" />
                      Dependencies
                    </TabsTrigger>
                    <TabsTrigger value="time" className="data-[state=active]:bg-[#F5EBE0] data-[state=active]:text-[#4A3728] text-[#6B5D52] rounded-md px-3 py-1.5 text-sm">
                      <Timer className="w-4 h-4 mr-1.5" />
                      Time
                    </TabsTrigger>
                    <TabsTrigger value="attachments" className="data-[state=active]:bg-[#F5EBE0] data-[state=active]:text-[#4A3728] text-[#6B5D52] rounded-md px-3 py-1.5 text-sm">
                      <Paperclip className="w-4 h-4 mr-1.5" />
                      Files
                      {task.attachment_count > 0 && <Badge className="ml-1.5 bg-[#E8D5C4] text-[#4A3728] text-xs px-1.5">{task.attachment_count}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="labels" className="data-[state=active]:bg-[#F5EBE0] data-[state=active]:text-[#4A3728] text-[#6B5D52] rounded-md px-3 py-1.5 text-sm">
                      <Tag className="w-4 h-4 mr-1.5" />
                      Labels
                      {task.labels?.length > 0 && <Badge className="ml-1.5 bg-[#E8D5C4] text-[#4A3728] text-xs px-1.5">{task.labels.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="reminders" className="data-[state=active]:bg-[#F5EBE0] data-[state=active]:text-[#4A3728] text-[#6B5D52] rounded-md px-3 py-1.5 text-sm">
                      <Bell className="w-4 h-4 mr-1.5" />
                      Follow-ups
                    </TabsTrigger>
                  </TabsList>

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
                  <TabsContent value="labels" className="tab-content-animate mt-0">
                    <LabelsSection taskId={taskId} task={task} projectId={task.project_id} token={token} onUpdate={fetchTask} />
                  </TabsContent>
                  <TabsContent value="reminders" className="tab-content-animate mt-0">
                    <RemindersSection taskId={taskId} token={token} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-[#9C8C74]">Task not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
