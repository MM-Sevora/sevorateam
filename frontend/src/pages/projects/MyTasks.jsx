import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Clock, AlertTriangle, ListTodo, ChevronRight,
  Calendar, User, Flag, Folder, LayoutGrid, PlayCircle, Eye,
  RefreshCw, Plus, ChevronDown, FolderKanban, Link as LinkIcon, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const priorityColors = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-stone-100 text-stone-600 border-stone-200'
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-stone-100 text-stone-600', icon: ListTodo },
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-700', icon: User },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: PlayCircle },
  pending_review: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  on_hold: { label: 'On Hold', color: 'bg-stone-100 text-stone-500', icon: Clock }
};

const TaskCard = ({ task, onStatusChange, onClick }) => {
  const StatusIcon = statusConfig[task.status]?.icon || ListTodo;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && 
    !['completed', 'approved'].includes(task.status);

  const isIndividualTask = !task.project_id || task.is_individual;

  return (
    <div 
      data-testid={`task-card-${task.id}`}
      className="group bg-white hover:bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg p-4 transition-all cursor-pointer shadow-sm hover:shadow-md"
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
              <Flag className="w-3 h-3 mr-1" />
              {task.priority}
            </Badge>
            {isIndividualTask ? (
              <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                <User className="w-3 h-3 mr-1" />
                Individual
              </Badge>
            ) : task.module_name && (
              <Badge variant="outline" className="text-xs bg-[#F5EBE0] text-[#5D4A3A] border-[#D4BBA6]">
                <Folder className="w-3 h-3 mr-1" />
                {task.module_name}
              </Badge>
            )}
          </div>
          <h4 className="font-semibold text-[#4A3728]">{task.name}</h4>
          {task.project_name && (
            <p className="text-sm text-[#5D4A3A] mt-1">{task.project_name}</p>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="h-8 px-2 border-[#D4BBA6] bg-white hover:bg-[#F5EBE0]">
              <StatusIcon className="w-4 h-4 mr-1 text-[#5D4A3A]" />
              <span className="text-xs text-[#5D4A3A]">{statusConfig[task.status]?.label}</span>
              <ChevronDown className="w-3 h-3 ml-1 text-[#5D4A3A]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem 
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, key);
                }}
                className="cursor-pointer text-[#4A3728] hover:bg-[#F5EBE0]"
              >
                <config.icon className="w-4 h-4 mr-2" />
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="flex items-center gap-4 mt-3 text-sm text-[#5D4A3A]">
        {task.due_date && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(task.due_date)}
            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 ml-1" />}
          </span>
        )}
        {(task.checklist_count > 0) && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {task.checklist_completed}/{task.checklist_count}
          </span>
        )}
        {task.subtask_count > 0 && (
          <span className="flex items-center gap-1">
            <LayoutGrid className="w-3.5 h-3.5" />
            {task.subtask_count} subtasks
          </span>
        )}
        {task.external_links?.length > 0 && (
          <span className="flex items-center gap-1 text-blue-600">
            <LinkIcon className="w-3.5 h-3.5" />
            {task.external_links.length} links
          </span>
        )}
      </div>
    </div>
  );
};

const TaskSection = ({ title, icon: Icon, tasks, count, color, onStatusChange, onTaskClick }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (tasks.length === 0) return null;
  
  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-3 w-full text-left group"
      >
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-[#4A3728]">{title}</h3>
        <Badge variant="secondary" className="ml-2 bg-[#E8D5C4] text-[#4A3728]">
          {count || tasks.length}
        </Badge>
        <ChevronRight className={`w-4 h-4 text-[#5D4A3A] ml-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="space-y-2 pl-8">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} onClick={onTaskClick} />
          ))}
        </div>
      )}
    </div>
  );
};

const MyTasks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [personalProject, setPersonalProject] = useState(null);
  const [personalTasks, setPersonalTasks] = useState([]);
  const [assignedByMe, setAssignedByMe] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTaskData, setQuickTaskData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    due_date: ''
  });
  const [submitting, setSubmitting] = useState(false);

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

  const fetchAssignedByMe = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/assigned-by-me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const tasks = await response.json();
        setAssignedByMe(tasks);
      }
    } catch (error) {
      console.error('Error fetching assigned tasks:', error);
    }
  };

  const fetchPersonalProject = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/personal`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const project = await response.json();
        setPersonalProject(project);
        
        // Fetch personal tasks
        const tasksResponse = await fetch(`${API}/api/projects/${project.id}/tasks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tasksResponse.ok) {
          const tasks = await tasksResponse.json();
          setPersonalTasks(tasks);
        }
      }
    } catch (error) {
      console.error('Error fetching personal project:', error);
    }
  };

  useEffect(() => {
    fetchMyTasks();
    fetchPersonalProject();
    fetchAssignedByMe();
  }, []);

  const handleQuickAddTask = async () => {
    if (!quickTaskData.name.trim()) {
      toast.error('Task name is required');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const payload = {
        name: quickTaskData.name,
        description: quickTaskData.description,
        priority: quickTaskData.priority,
        due_date: quickTaskData.due_date || null
      };
      
      // If personal project exists, link to it. Otherwise create individual task
      if (personalProject?.id) {
        payload.project_id = personalProject.id;
      }
      // Note: if project_id is not set, this creates an individual task
      
      const response = await fetch(`${API}/api/projects/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to create task');
      
      toast.success('Task created!');
      setShowQuickAdd(false);
      setQuickTaskData({ name: '', description: '', priority: 'medium', due_date: '' });
      fetchMyTasks();
      if (personalProject) fetchPersonalProject();
    } catch (error) {
      console.error('Error creating task:', error);
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update task');
      }
      
      toast.success(`Task moved to ${statusConfig[newStatus]?.label}`);
      fetchMyTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(error.message || 'Failed to update task status');
    }
  };

  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const handleTaskClick = (task) => {
    // Open task detail modal instead of navigating to project
    setSelectedTaskId(task.id);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="p-8 space-y-8" data-testid="my-tasks-page" data-tour="my-tasks">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">My Tasks</h1>
          <p className="text-[#5D4A3A] mt-1">Your personal task dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchMyTasks}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
            data-testid="refresh-tasks-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowQuickAdd(true)}
            className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
            data-testid="quick-add-task-btn"
            data-tour="create-task"
          >
            <Plus className="w-4 h-4 mr-2" />
            Quick Add Task
          </Button>
          <Button 
            size="sm"
            variant="outline"
            onClick={() => navigate('/projects')}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
            data-testid="view-all-projects-btn"
          >
            <FolderKanban className="w-4 h-4 mr-2" />
            All Projects
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Total Assigned</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats.total_assigned || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <ListTodo className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Due Today</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats.due_today || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Overdue</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.overdue || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Completed</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.total_completed || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Tabs */}
      <div className="flex gap-2 border-b border-[#E8D5C4] pb-4 flex-wrap">
        {[
          { id: 'all', label: 'All Tasks', count: stats.total_assigned },
          { id: 'assigned_by_me', label: 'Assigned by Me', count: assignedByMe.length },
          { id: 'in_progress', label: 'In Progress', count: stats.in_progress },
          { id: 'review', label: 'Pending Review', count: stats.pending_review },
          { id: 'completed', label: 'Recently Done', count: stats.completed_this_week }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-rose-600 text-white' 
                : 'bg-[#F5EBE0] text-[#4A3728] hover:bg-[#E8D5C4]'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
            {tab.count > 0 && (
              <Badge variant="secondary" className={`ml-2 ${activeTab === tab.id ? 'bg-rose-700' : 'bg-[#D4BBA6]'}`}>
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Task Lists */}
      <Card className="bg-[#FDF8F3] border-[#E8D5C4]">
        <CardContent className="p-6">
          {activeTab === 'all' && (
            <>
              {(data?.tasks_overdue?.length > 0) && (
                <TaskSection
                  title="Overdue"
                  icon={AlertTriangle}
                  tasks={data.tasks_overdue}
                  color="bg-red-100 text-red-600"
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              )}
              
              {(data?.tasks_due_today?.length > 0) && (
                <TaskSection
                  title="Due Today"
                  icon={Calendar}
                  tasks={data.tasks_due_today}
                  color="bg-amber-100 text-amber-700"
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              )}
              
              {(data?.tasks_in_progress?.length > 0) && (
                <TaskSection
                  title="In Progress"
                  icon={PlayCircle}
                  tasks={data.tasks_in_progress}
                  color="bg-purple-100 text-purple-700"
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              )}
              
              {(data?.tasks_pending_review?.length > 0) && (
                <TaskSection
                  title="Pending Review"
                  icon={Eye}
                  tasks={data.tasks_pending_review}
                  color="bg-blue-100 text-blue-700"
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              )}
              
              {(data?.tasks_assigned?.length > 0) && (
                <TaskSection
                  title="All Assigned"
                  icon={ListTodo}
                  tasks={data.tasks_assigned}
                  color="bg-stone-100 text-stone-600"
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              )}
              
              {(!data?.tasks_assigned?.length && !data?.tasks_overdue?.length) && (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
                  <h3 className="text-lg font-semibold text-[#4A3728] mb-2">All caught up!</h3>
                  <p className="text-[#5D4A3A] mb-4">You have no pending tasks assigned to you.</p>
                  <Button 
                    onClick={() => navigate('/projects')}
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Browse Projects
                  </Button>
                </div>
              )}
            </>
          )}

          {activeTab === 'in_progress' && (
            <>
              {(data?.tasks_in_progress?.length > 0) ? (
                <TaskSection
                  title="In Progress"
                  icon={PlayCircle}
                  tasks={data.tasks_in_progress}
                  color="bg-purple-100 text-purple-700"
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              ) : (
                <div className="text-center py-12">
                  <PlayCircle className="w-16 h-16 mx-auto text-purple-200 mb-4" />
                  <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No tasks in progress</h3>
                  <p className="text-[#5D4A3A]">Start working on a task to see it here.</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'assigned_by_me' && (
            <>
              {assignedByMe.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-rose-600" />
                    <h3 className="font-semibold text-[#4A3728]">Tasks You've Delegated</h3>
                    <Badge className="bg-rose-100 text-rose-700">{assignedByMe.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {assignedByMe.map(task => (
                      <div 
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="bg-white p-4 rounded-lg border border-[#E8D5C4] hover:shadow-md transition-all cursor-pointer"
                        data-testid={`delegated-task-${task.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
                                <Flag className="w-3 h-3 mr-1" />
                                {task.priority}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${statusConfig[task.status]?.color}`}>
                                {statusConfig[task.status]?.label}
                              </Badge>
                              {task.project_name && (
                                <Badge variant="outline" className="text-xs bg-[#F5EBE0] text-[#5D4A3A]">
                                  <Folder className="w-3 h-3 mr-1" />
                                  {task.project_name}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-medium text-[#4A3728]">{task.name}</h4>
                            <div className="flex items-center gap-4 mt-2 text-sm text-[#6B5D52]">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                Assigned to: {task.assigned_to_name || 'Unassigned'}
                              </span>
                              {task.due_date && (
                                <span className={`flex items-center gap-1 ${
                                  new Date(task.due_date) < new Date() ? 'text-red-600' : ''
                                }`}>
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {task.actual_hours > 0 && (
                              <span className="text-xs text-[#6B5D52]">
                                {task.actual_hours}h logged
                              </span>
                            )}
                            {task.subtask_count > 0 && (
                              <span className="text-xs text-[#6B5D52]">
                                {task.checklist_completed || 0}/{task.subtask_count} subtasks
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="w-16 h-16 mx-auto text-stone-200 mb-4" />
                  <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No delegated tasks</h3>
                  <p className="text-[#5D4A3A]">Tasks you assign to others will appear here for monitoring.</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'review' && (
            <>
              {(data?.tasks_pending_review?.length > 0) ? (
                <TaskSection
                  title="Pending Review"
                  icon={Eye}
                  tasks={data.tasks_pending_review}
                  color="bg-blue-100 text-blue-700"
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 mx-auto text-blue-200 mb-4" />
                  <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No tasks awaiting review</h3>
                  <p className="text-[#5D4A3A]">Complete tasks and submit them for review.</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'completed' && (
            <>
              {(data?.recently_completed?.length > 0) ? (
                <TaskSection
                  title="Recently Completed"
                  icon={CheckCircle2}
                  tasks={data.recently_completed}
                  color="bg-emerald-100 text-emerald-700"
                  onStatusChange={handleStatusChange}
                  onTaskClick={handleTaskClick}
                />
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-200 mb-4" />
                  <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No recent completions</h3>
                  <p className="text-[#5D4A3A]">Complete tasks to see them here.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Personal Tasks Section */}
      {personalTasks.length > 0 && (
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Tasks
              </CardTitle>
              <Badge className="bg-[#E8D5C4] text-[#4A3728]">
                {personalTasks.filter(t => t.status !== 'completed').length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {personalTasks.filter(t => t.status !== 'completed').map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onStatusChange={handleStatusChange}
                  onClick={handleTaskClick}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Add Task Dialog */}
      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Quick Add Personal Task</DialogTitle>
            <DialogDescription className="text-[#6B5D52]">
              Add a standalone task to your personal task list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Task Name *</Label>
              <Input
                placeholder="What do you need to do?"
                value={quickTaskData.name}
                onChange={(e) => setQuickTaskData({...quickTaskData, name: e.target.value})}
                className="border-[#D4BBA6]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea
                placeholder="Add more details..."
                value={quickTaskData.description}
                onChange={(e) => setQuickTaskData({...quickTaskData, description: e.target.value})}
                className="border-[#D4BBA6]"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Priority</Label>
                <Select
                  value={quickTaskData.priority}
                  onValueChange={(v) => setQuickTaskData({...quickTaskData, priority: v})}
                >
                  <SelectTrigger className="border-[#D4BBA6]">
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
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Due Date</Label>
                <Input
                  type="date"
                  value={quickTaskData.due_date}
                  onChange={(e) => setQuickTaskData({...quickTaskData, due_date: e.target.value})}
                  className="border-[#D4BBA6]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAdd(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button 
              onClick={handleQuickAddTask}
              disabled={submitting}
              className="bg-[#4A3728] hover:bg-[#3A2A1E]"
            >
              {submitting ? 'Creating...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        taskId={selectedTaskId}
        onUpdate={() => {
          fetchMyTasks();
          fetchAssignedByMe();
        }}
        users={[]}
        projectId={null}
      />
    </div>
  );
};

export default MyTasks;
