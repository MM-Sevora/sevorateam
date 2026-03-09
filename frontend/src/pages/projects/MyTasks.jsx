import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Clock, AlertTriangle, ListTodo, ChevronRight,
  Calendar, User, Flag, Folder, LayoutGrid, PlayCircle, Eye,
  RefreshCw, Plus, ChevronDown
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
  urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-500/10 text-slate-400', icon: ListTodo },
  assigned: { label: 'Assigned', color: 'bg-blue-500/10 text-blue-400', icon: User },
  in_progress: { label: 'In Progress', color: 'bg-purple-500/10 text-purple-400', icon: PlayCircle },
  pending_review: { label: 'Pending Review', color: 'bg-amber-500/10 text-amber-400', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-400', icon: CheckCircle2 },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
  on_hold: { label: 'On Hold', color: 'bg-slate-500/10 text-slate-400', icon: Clock }
};

const TaskCard = ({ task, onStatusChange }) => {
  const navigate = useNavigate();
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
      className="group bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 transition-all cursor-pointer"
      onClick={() => navigate(`/projects/tasks/${task.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
              <Flag className="w-3 h-3 mr-1" />
              {task.priority}
            </Badge>
            {task.module_name && (
              <Badge variant="outline" className="text-xs bg-slate-700/50 text-slate-300">
                <Folder className="w-3 h-3 mr-1" />
                {task.module_name}
              </Badge>
            )}
          </div>
          <h4 className="font-medium text-white truncate">{task.name}</h4>
          {task.project_name && (
            <p className="text-sm text-slate-400 truncate">{task.project_name}</p>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <StatusIcon className="w-4 h-4 mr-1" />
              <span className="text-xs">{statusConfig[task.status]?.label}</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem 
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, key);
                }}
                className="cursor-pointer"
              >
                <config.icon className="w-4 h-4 mr-2" />
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
        {task.due_date && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
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

const TaskSection = ({ title, icon: Icon, tasks, count, color, onStatusChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (tasks.length === 0) return null;
  
  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-3 w-full text-left group"
      >
        <div className={`p-1.5 rounded ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-white">{title}</h3>
        <Badge variant="secondary" className="ml-2 bg-slate-700">
          {count || tasks.length}
        </Badge>
        <ChevronRight className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="space-y-2 pl-8">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
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

      if (!response.ok) throw new Error('Failed to update task');
      
      toast.success(`Task moved to ${statusConfig[newStatus]?.label}`);
      fetchMyTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-48"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-slate-700 rounded-lg"></div>
              ))}
            </div>
            <div className="h-64 bg-slate-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="my-tasks-title">My Tasks</h1>
            <p className="text-slate-400 mt-1">Your personal task dashboard</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchMyTasks}
              className="border-slate-600"
              data-testid="refresh-tasks-btn"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate('/projects')}
              className="bg-rose-600 hover:bg-rose-700"
              data-testid="view-all-projects-btn"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              All Projects
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Assigned</p>
                  <p className="text-2xl font-bold text-white">{stats.total_assigned || 0}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <ListTodo className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Due Today</p>
                  <p className="text-2xl font-bold text-white">{stats.due_today || 0}</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <Calendar className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Overdue</p>
                  <p className="text-2xl font-bold text-red-400">{stats.overdue || 0}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Completed</p>
                  <p className="text-2xl font-bold text-emerald-400">{stats.total_completed || 0}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-4">
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
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-2 bg-slate-700/50">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Task Lists */}
        <Card className="bg-slate-800/30 border-slate-700">
          <CardContent className="p-6">
            {activeTab === 'all' && (
              <>
                {(data?.tasks_overdue?.length > 0) && (
                  <TaskSection
                    title="Overdue"
                    icon={AlertTriangle}
                    tasks={data.tasks_overdue}
                    color="bg-red-500/10 text-red-400"
                    onStatusChange={handleStatusChange}
                  />
                )}
                
                {(data?.tasks_due_today?.length > 0) && (
                  <TaskSection
                    title="Due Today"
                    icon={Calendar}
                    tasks={data.tasks_due_today}
                    color="bg-amber-500/10 text-amber-400"
                    onStatusChange={handleStatusChange}
                  />
                )}
                
                {(data?.tasks_in_progress?.length > 0) && (
                  <TaskSection
                    title="In Progress"
                    icon={PlayCircle}
                    tasks={data.tasks_in_progress}
                    color="bg-purple-500/10 text-purple-400"
                    onStatusChange={handleStatusChange}
                  />
                )}
                
                {(data?.tasks_pending_review?.length > 0) && (
                  <TaskSection
                    title="Pending Review"
                    icon={Eye}
                    tasks={data.tasks_pending_review}
                    color="bg-blue-500/10 text-blue-400"
                    onStatusChange={handleStatusChange}
                  />
                )}
                
                {(data?.tasks_assigned?.length > 0) && (
                  <TaskSection
                    title="All Assigned"
                    icon={ListTodo}
                    tasks={data.tasks_assigned}
                    color="bg-slate-500/10 text-slate-400"
                    onStatusChange={handleStatusChange}
                  />
                )}
                
                {(!data?.tasks_assigned?.length && !data?.tasks_overdue?.length) && (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500/30 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">All caught up!</h3>
                    <p className="text-slate-400 mb-4">You have no pending tasks assigned to you.</p>
                    <Button 
                      onClick={() => navigate('/projects')}
                      className="bg-rose-600 hover:bg-rose-700"
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
                    color="bg-purple-500/10 text-purple-400"
                    onStatusChange={handleStatusChange}
                  />
                ) : (
                  <div className="text-center py-12">
                    <PlayCircle className="w-16 h-16 mx-auto text-purple-500/30 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No tasks in progress</h3>
                    <p className="text-slate-400">Start working on a task to see it here.</p>
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
                    color="bg-blue-500/10 text-blue-400"
                    onStatusChange={handleStatusChange}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Eye className="w-16 h-16 mx-auto text-blue-500/30 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No tasks awaiting review</h3>
                    <p className="text-slate-400">Complete tasks and submit them for review.</p>
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
                    color="bg-emerald-500/10 text-emerald-400"
                    onStatusChange={handleStatusChange}
                  />
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500/30 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No recent completions</h3>
                    <p className="text-slate-400">Complete tasks to see them here.</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyTasks;
