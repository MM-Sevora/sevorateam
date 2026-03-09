import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Edit, Trash2, Users, Calendar, Flag, Clock,
  CheckCircle2, AlertTriangle, PlayCircle, Eye, MoreVertical,
  GripVertical, MessageSquare, ListTodo, RefreshCw, Settings,
  User, Folder
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-400 border-red-500/20', dotColor: 'bg-red-500' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dotColor: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dotColor: 'bg-yellow-500' },
  low: { label: 'Low', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', dotColor: 'bg-slate-500' }
};

const statusColumns = [
  { id: 'draft', label: 'Draft', color: 'border-slate-500', bgColor: 'bg-slate-500/10' },
  { id: 'assigned', label: 'Assigned', color: 'border-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'in_progress', label: 'In Progress', color: 'border-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'pending_review', label: 'Review', color: 'border-amber-500', bgColor: 'bg-amber-500/10' },
  { id: 'completed', label: 'Completed', color: 'border-emerald-500', bgColor: 'bg-emerald-500/10' }
];

const TaskCard = ({ task, onStatusChange, onEdit, onDelete, onDragStart }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && 
    !['completed', 'approved'].includes(task.status);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all group"
      data-testid={`kanban-task-${task.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${priorityConfig[task.priority]?.dotColor}`} />
          <span className="text-xs text-slate-400 capitalize">{task.priority}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-400">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h4 className="font-medium text-white text-sm mb-2 line-clamp-2">{task.name}</h4>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {task.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
              <Calendar className="w-3 h-3" />
              {formatDate(task.due_date)}
            </span>
          )}
          {task.checklist_count > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {task.checklist_completed}/{task.checklist_count}
            </span>
          )}
          {task.comment_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task.comment_count}
            </span>
          )}
        </div>
        {task.assigned_to_name && (
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium" title={task.assigned_to_name}>
            {task.assigned_to_name.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanColumn = ({ column, tasks, onDrop, onDragOver, onStatusChange, onEditTask, onDeleteTask, onDragStart }) => {
  const columnTasks = tasks.filter(t => t.status === column.id);
  
  return (
    <div
      className={`flex-1 min-w-[280px] max-w-[320px] rounded-lg ${column.bgColor} p-3`}
      onDrop={(e) => onDrop(e, column.id)}
      onDragOver={onDragOver}
      data-testid={`kanban-column-${column.id}`}
    >
      <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${column.color}`}>
        <h3 className="font-semibold text-white text-sm">{column.label}</h3>
        <Badge variant="secondary" className="bg-slate-700/50 text-xs">
          {columnTasks.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[200px]">
        {columnTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onStatusChange={onStatusChange}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onDragStart={onDragStart}
          />
        ))}
        {columnTasks.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
};

const CreateTaskModal = ({ open, onClose, projectId, users, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
    estimated_hours: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Task name is required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const payload = {
        ...formData,
        project_id: projectId,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
      };
      if (!payload.assigned_to || payload.assigned_to === 'unassigned') delete payload.assigned_to;

      const response = await fetch(`${API}/api/projects/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create task');
      
      toast.success('Task created');
      onSuccess();
      onClose();
      setFormData({ name: '', description: '', priority: 'medium', assigned_to: '', due_date: '', estimated_hours: '' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-rose-500" />
            Create New Task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-300">Task Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter task name"
              className="bg-slate-900 border-slate-600 mt-1"
              data-testid="task-name-input"
            />
          </div>

          <div>
            <Label className="text-slate-300">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description"
              className="bg-slate-900 border-slate-600 mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Assign To</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 mt-1">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="bg-slate-900 border-slate-600 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="0"
                className="bg-slate-900 border-slate-600 mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-600">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700" data-testid="create-task-submit">
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [projectRes, tasksRes, usersRes] = await Promise.all([
        fetch(`${API}/api/projects/${projectId}`, { headers }),
        fetch(`${API}/api/projects/${projectId}/tasks`, { headers }),
        fetch(`${API}/api/workos/users`, { headers })
      ]);

      if (!projectRes.ok) throw new Error('Project not found');

      const projectData = await projectRes.json();
      const tasksData = tasksRes.ok ? await tasksRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];

      setProject(projectData);
      setTasks(tasksData);
      setUsers(usersData.users || usersData || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === draggedTask.id ? { ...t, status: newStatus } : t
    ));

    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update');
      toast.success(`Task moved to ${statusColumns.find(c => c.id === newStatus)?.label}`);
    } catch (error) {
      // Revert on error
      setTasks(prev => prev.map(t => 
        t.id === draggedTask.id ? { ...t, status: draggedTask.status } : t
      ));
      toast.error('Failed to update task status');
    }
    
    setDraggedTask(null);
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.name}"?`)) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Task deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleEditTask = (task) => {
    // For now, just show toast - can implement edit modal later
    toast.info('Edit modal coming soon. Use My Tasks to update status.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-full mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="h-24 bg-slate-700 rounded-lg"></div>
            <div className="flex gap-4">
              {[1,2,3,4,5].map(i => <div key={i} className="flex-1 h-64 bg-slate-700 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const progressColor = project.progress >= 75 ? 'bg-emerald-500' : 
                        project.progress >= 50 ? 'bg-blue-500' : 
                        project.progress >= 25 ? 'bg-amber-500' : 'bg-slate-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Project Info */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white" data-testid="project-title">{project.name}</h1>
                  <Badge variant="outline" className={priorityConfig[project.priority]?.color}>
                    <Flag className="w-3 h-3 mr-1" />
                    {project.priority}
                  </Badge>
                </div>
                {project.module_name && (
                  <p className="text-slate-400 flex items-center gap-2 mb-3">
                    <Folder className="w-4 h-4" />
                    {project.module_name}
                  </p>
                )}
                {project.description && (
                  <p className="text-slate-400 mb-4">{project.description}</p>
                )}
                <div className="flex items-center gap-6 text-sm text-slate-400">
                  {project.owner_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Owner: {project.owner_name}
                    </span>
                  )}
                  {project.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {project.completed_task_count}/{project.task_count} tasks
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-600">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => setShowCreateTask(true)} className="bg-rose-600 hover:bg-rose-700" data-testid="add-task-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-400">Overall Progress</span>
                <span className="text-white font-medium">{project.progress}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${progressColor} transition-all`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <Card className="bg-slate-800/30 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-rose-500" />
              Task Board
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {statusColumns.map(column => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={tasks}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onStatusChange={() => {}}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateTaskModal
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={projectId}
        users={users}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ProjectDetail;
