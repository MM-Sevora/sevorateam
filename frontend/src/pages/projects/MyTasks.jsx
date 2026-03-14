import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Clock, AlertTriangle, ListTodo, Calendar, 
  Flag, Plus, ChevronDown, FolderKanban, PlayCircle, Eye,
  MoreHorizontal, Search, Filter, RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import TaskDetailModal from './TaskDetailModal';

const API = process.env.REACT_APP_BACKEND_URL;

// Simplified priority config
const priorityConfig = {
  urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
  high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  low: { label: 'Low', color: 'text-stone-500', bg: 'bg-stone-50', dot: 'bg-stone-400' }
};

// Simplified status config
const statusConfig = {
  draft: { label: 'To Do', color: 'text-stone-600', bg: 'bg-stone-100' },
  assigned: { label: 'Assigned', color: 'text-blue-600', bg: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-purple-600', bg: 'bg-purple-100' },
  pending_review: { label: 'Review', color: 'text-amber-600', bg: 'bg-amber-100' },
  completed: { label: 'Done', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  approved: { label: 'Done', color: 'text-emerald-600', bg: 'bg-emerald-100' }
};

// Simple, clean task row
const TaskRow = ({ task, onStatusChange, onClick }) => {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && 
    !['completed', 'approved'].includes(task.status);
  const isDone = ['completed', 'approved'].includes(task.status);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      data-testid={`task-row-${task.id}`}
      onClick={() => onClick?.(task)}
      className={`group flex items-center gap-4 py-3 px-4 rounded-lg cursor-pointer transition-all
        ${isDone ? 'bg-emerald-50/50 hover:bg-emerald-50' : 
          isOverdue ? 'bg-red-50/50 hover:bg-red-50' : 
          'hover:bg-[#F5EBE0]'}`}
    >
      {/* Checkbox-style status toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(task.id, isDone ? 'in_progress' : 'completed');
        }}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
          ${isDone ? 'bg-emerald-500 border-emerald-500' : 
            isOverdue ? 'border-red-400 hover:border-red-500' :
            'border-[#D4BBA6] hover:border-teal-500'}`}
      >
        {isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
      </button>
      
      {/* Task name and project */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-[#4A3728] truncate ${isDone ? 'line-through opacity-60' : ''}`}>
          {task.name}
        </p>
        {task.project_name && (
          <p className="text-xs text-[#8B7355] truncate">{task.project_name}</p>
        )}
      </div>
      
      {/* Priority dot */}
      <div 
        className={`w-2 h-2 rounded-full ${priorityConfig[task.priority]?.dot || 'bg-stone-300'}`}
        title={task.priority}
      />
      
      {/* Due date */}
      {task.due_date && (
        <span className={`text-xs whitespace-nowrap ${
          isOverdue ? 'text-red-600 font-medium' : 'text-[#8B7355]'
        }`}>
          {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
          {formatDate(task.due_date)}
        </span>
      )}
      
      {/* Status badge */}
      <Badge 
        variant="outline" 
        className={`text-xs ${statusConfig[task.status]?.bg} ${statusConfig[task.status]?.color} border-0`}
      >
        {statusConfig[task.status]?.label}
      </Badge>
      
      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-4 h-4 text-[#5D4A3A]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white border-[#E8D5C4]">
          <DropdownMenuItem onClick={() => onClick?.(task)}>
            <Eye className="w-4 h-4 mr-2" /> View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <DropdownMenuItem 
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, key);
              }}
            >
              {cfg.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const MyTasks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('active'); // active, completed, all
  const [search, setSearch] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    priority: 'medium',
    due_date: ''
  });

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/my-tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const handleAddTask = async () => {
    if (!newTask.name.trim()) {
      toast.error('Task name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTask.name,
          description: newTask.description,
          priority: newTask.priority,
          due_date: newTask.due_date || null
        })
      });
      
      if (!response.ok) throw new Error('Failed to create task');
      
      toast.success('Task created!');
      setShowAddTask(false);
      setNewTask({ name: '', description: '', priority: 'medium', due_date: '' });
      fetchMyTasks();
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update task');
      
      toast.success('Task updated');
      fetchMyTasks();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  // Combine all tasks and filter
  const getAllTasks = () => {
    if (!data) return [];
    
    const all = [
      ...(data.tasks_overdue || []),
      ...(data.tasks_due_today || []),
      ...(data.tasks_in_progress || []),
      ...(data.tasks_pending_review || []),
      ...(data.tasks_assigned || []),
      ...(data.tasks_completed || [])
    ];
    
    // Remove duplicates by ID
    const unique = Array.from(new Map(all.map(t => [t.id, t])).values());
    
    // Apply search filter
    let filtered = unique;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.project_name?.toLowerCase().includes(q)
      );
    }
    
    // Apply status filter
    if (filter === 'active') {
      filtered = filtered.filter(t => !['completed', 'approved'].includes(t.status));
    } else if (filter === 'completed') {
      filtered = filtered.filter(t => ['completed', 'approved'].includes(t.status));
    }
    
    return filtered;
  };

  const tasks = getAllTasks();
  const stats = data?.stats || {};
  
  // Group tasks by section
  const overdueTasks = tasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && 
    !['completed', 'approved'].includes(t.status)
  );
  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    const today = new Date().toDateString();
    return new Date(t.due_date).toDateString() === today && 
      !['completed', 'approved'].includes(t.status);
  });
  const otherTasks = tasks.filter(t => 
    !overdueTasks.includes(t) && !todayTasks.includes(t)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" data-testid="my-tasks-page">
      {/* Clean Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">My Tasks</h1>
          <p className="text-[#8B7355] text-sm mt-1">
            {stats.total_assigned || 0} tasks · {stats.overdue || 0} overdue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchMyTasks}
            className="text-[#6B5D52]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button 
            onClick={() => setShowAddTask(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
            data-testid="add-task-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Quick Stats - Minimal Design */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-[#E8D5C4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{stats.total_assigned || 0}</p>
              <p className="text-xs text-[#8B7355]">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8D5C4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{stats.due_today || 0}</p>
              <p className="text-xs text-[#8B7355]">Today</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8D5C4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.overdue || 0}</p>
              <p className="text-xs text-[#8B7355]">Overdue</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8D5C4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.total_completed || 0}</p>
              <p className="text-xs text-[#8B7355]">Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar - Simple */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-[#E8D5C4] bg-white"
          />
        </div>
        <div className="flex rounded-lg border border-[#E8D5C4] overflow-hidden bg-white">
          {[
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
            { id: 'all', label: 'All' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filter === f.id 
                  ? 'bg-teal-600 text-white' 
                  : 'text-[#4A3728] hover:bg-[#F5EBE0]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/projects/kanban')}
          className="border-[#D4BBA6] text-[#4A3728]"
        >
          <FolderKanban className="w-4 h-4 mr-2" />
          Kanban
        </Button>
      </div>

      {/* Task List - Clean & Simple */}
      <Card className="border-[#E8D5C4] bg-white">
        <CardContent className="p-2">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#4A3728]">
                {filter === 'active' ? 'All caught up!' : 'No tasks found'}
              </h3>
              <p className="text-[#8B7355] text-sm mt-1">
                {filter === 'active' ? 'You have no active tasks' : 'Try changing your filters'}
              </p>
              {filter === 'active' && (
                <Button 
                  onClick={() => setShowAddTask(true)} 
                  className="mt-4 bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add a task
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E8D5C4]">
              {/* Overdue Section */}
              {overdueTasks.length > 0 && (
                <div className="pb-2">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">Overdue</span>
                    <Badge variant="outline" className="bg-red-50 text-red-600 border-0 text-xs">
                      {overdueTasks.length}
                    </Badge>
                  </div>
                  {overdueTasks.map(task => (
                    <TaskRow 
                      key={task.id} 
                      task={task} 
                      onStatusChange={handleStatusChange}
                      onClick={(t) => setSelectedTaskId(t.id)}
                    />
                  ))}
                </div>
              )}
              
              {/* Due Today Section */}
              {todayTasks.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-600">Due Today</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-0 text-xs">
                      {todayTasks.length}
                    </Badge>
                  </div>
                  {todayTasks.map(task => (
                    <TaskRow 
                      key={task.id} 
                      task={task} 
                      onStatusChange={handleStatusChange}
                      onClick={(t) => setSelectedTaskId(t.id)}
                    />
                  ))}
                </div>
              )}
              
              {/* Other Tasks */}
              {otherTasks.length > 0 && (
                <div className="pt-2">
                  {(overdueTasks.length > 0 || todayTasks.length > 0) && (
                    <div className="flex items-center gap-2 px-4 py-2">
                      <ListTodo className="w-4 h-4 text-[#8B7355]" />
                      <span className="text-sm font-medium text-[#6B5D52]">Tasks</span>
                      <Badge variant="outline" className="bg-[#F5EBE0] text-[#6B5D52] border-0 text-xs">
                        {otherTasks.length}
                      </Badge>
                    </div>
                  )}
                  {otherTasks.map(task => (
                    <TaskRow 
                      key={task.id} 
                      task={task} 
                      onStatusChange={handleStatusChange}
                      onClick={(t) => setSelectedTaskId(t.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex items-center justify-center gap-4 mt-6 text-sm">
        <button 
          onClick={() => navigate('/projects')}
          className="text-[#6B5D52] hover:text-teal-600 transition-colors"
        >
          All Projects
        </button>
        <span className="text-[#D4BBA6]">·</span>
        <button 
          onClick={() => navigate('/projects/recurring')}
          className="text-[#6B5D52] hover:text-teal-600 transition-colors"
        >
          Recurring Tasks
        </button>
        <span className="text-[#D4BBA6]">·</span>
        <button 
          onClick={() => navigate('/projects/sprints')}
          className="text-[#6B5D52] hover:text-teal-600 transition-colors"
        >
          Sprints
        </button>
      </div>

      {/* Add Task Dialog - Simplified */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[#4A3728]">Task name</Label>
              <Input
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                placeholder="What needs to be done?"
                className="border-[#E8D5C4] mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Description (optional)</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add details..."
                className="border-[#E8D5C4] mt-1"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Priority</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                >
                  <SelectTrigger className="border-[#E8D5C4] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#4A3728]">Due date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="border-[#E8D5C4] mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddTask(false)}
              className="border-[#D4BBA6]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddTask}
              disabled={submitting || !newTask.name.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={fetchMyTasks}
        />
      )}
    </div>
  );
};

export default MyTasks;
