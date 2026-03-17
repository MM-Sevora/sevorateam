/**
 * SubtasksSection Component
 * Handles subtask management for a task
 */
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '../../../components/ui/select';
import { toast } from 'sonner';
import { API } from './taskConfig';

const SubtasksSection = ({ taskId, token, users = [] }) => {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState('medium');
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
      const payload = { 
        parent_task_id: taskId, 
        name: newSubtask,
        priority: newSubtaskPriority
      };
      if (newSubtaskDueDate) payload.due_date = newSubtaskDueDate;
      
      const res = await fetch(`${API}/api/projects/subtasks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewSubtask('');
        setNewSubtaskDueDate('');
        setNewSubtaskPriority('medium');
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

  const updateSubtaskPriority = async (subtaskId, priority) => {
    try {
      await fetch(`${API}/api/projects/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });
      fetchSubtasks();
    } catch (e) { toast.error('Failed to update priority'); }
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
        <select
          value={newSubtaskPriority}
          onChange={(e) => setNewSubtaskPriority(e.target.value)}
          className="border border-[#D4BBA6] rounded-md px-2 text-xs w-[80px] bg-white text-[#4A3728]"
          title="Priority"
        >
          <option value="low">Low</option>
          <option value="medium">Med</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
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
              <select
                value={st.priority || 'medium'}
                onChange={(e) => updateSubtaskPriority(st.id, e.target.value)}
                className={`h-7 text-xs border border-[#D4BBA6] rounded px-1 bg-white ${
                  st.priority === 'urgent' ? 'text-red-600 border-red-300' :
                  st.priority === 'high' ? 'text-orange-600 border-orange-300' :
                  st.priority === 'low' ? 'text-blue-600 border-blue-300' :
                  'text-[#4A3728]'
                }`}
                title="Priority"
              >
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <input
                type="date"
                value={st.due_date ? st.due_date.split('T')[0] : ''}
                onChange={(e) => updateSubtaskDueDate(st.id, e.target.value)}
                className={`w-[120px] h-7 text-xs border border-[#D4BBA6] rounded-md px-2 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-400 ${
                  st.due_date && new Date(st.due_date) < new Date() && st.status !== 'completed' 
                    ? 'text-red-600 border-red-300' 
                    : 'text-[#4A3728]'
                }`}
                title="Click to set due date"
              />
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

export default SubtasksSection;
