import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Clock, AlertTriangle, ListTodo, ChevronRight,
  Calendar, User, Flag, Folder, LayoutGrid, PlayCircle, Eye,
  RefreshCw, Plus, ChevronDown, FolderKanban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { toast } from 'sonner';

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
            {task.module_name && (
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
  const [activeTab, setActiveTab] = useState('all');

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

  const handleTaskClick = (task) => {
    navigate(`/projects/${task.project_id || task.id}`);
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
    <div className="p-8 space-y-8" data-testid="my-tasks-page">
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
            onClick={() => navigate('/projects')}
            className="bg-rose-600 hover:bg-rose-700 text-white"
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
          { id: 'in_progress', label: 'In Progress', count: stats.in_progress },
          { id: 'review', label: 'Pending Review', count: stats.pending_review },
          { id: 'completed', label: 'Recently Done', count: stats.completed_this_week }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
    </div>
  );
};

export default MyTasks;
