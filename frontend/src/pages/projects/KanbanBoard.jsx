import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, Filter, Search, User, Calendar, Flag,
  MoreVertical, Eye, Edit, Copy, Clock, AlertTriangle, CheckCircle2,
  GripVertical, Plus, X, ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import api from '../../lib/api';
import { format, isPast, isToday } from 'date-fns';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200', dotColor: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dotColor: 'bg-yellow-500' },
  low: { label: 'Low', color: 'bg-stone-100 text-stone-600 border-stone-200', dotColor: 'bg-stone-400' }
};

const KanbanColumn = ({ column, tasks, onDragStart, onDragOver, onDrop, onTaskClick, onDuplicate }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e, column.id);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, column.status);
  };

  const isOverWipLimit = column.wip_limit && tasks.length >= column.wip_limit;

  return (
    <div
      className={`flex-1 min-w-[280px] max-w-[320px] bg-[#F5EBE0]/50 rounded-xl ${
        isDragOver ? 'ring-2 ring-teal-400 bg-teal-50/30' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`kanban-column-${column.id}`}
    >
      <div className="p-3 border-b border-[#E8D5C4]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-[#4A3728]">{column.name}</h3>
            <Badge variant="secondary" className="bg-[#E8D5C4] text-[#4A3728]">
              {tasks.length}
            </Badge>
          </div>
          {column.wip_limit && (
            <Badge 
              variant="outline" 
              className={isOverWipLimit ? 'border-red-300 text-red-600' : 'border-[#D4BBA6] text-[#6B5D52]'}
            >
              WIP: {column.wip_limit}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="p-2 space-y-2 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto">
        {tasks.map((task) => (
          <KanbanCard 
            key={task.id} 
            task={task} 
            onDragStart={onDragStart}
            onClick={() => onTaskClick(task)}
            onDuplicate={() => onDuplicate(task)}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-[#8B7355]">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanCard = ({ task, onDragStart, onClick, onDuplicate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('currentStatus', task.status);
    onDragStart(task);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && 
                   !['completed', 'approved'].includes(task.status);
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={`cursor-grab active:cursor-grabbing bg-white border-[#E8D5C4] hover:border-[#D4BBA6] 
        hover:shadow-md transition-all group ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''}`}
      data-testid={`kanban-task-${task.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <GripVertical className="w-4 h-4 text-[#8B7355] opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#4A3728] text-sm line-clamp-2">{task.name}</p>
            {task.project_name && (
              <p className="text-xs text-[#8B7355] mt-0.5 truncate">{task.project_name}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-3 h-3 text-[#5D4A3A]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <Eye className="w-4 h-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects/${task.project_id}?task=${task.id}`); }}>
                <Edit className="w-4 h-4 mr-2" /> Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="w-4 h-4 mr-2" /> Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex flex-wrap gap-1.5 mb-2">
          {/* Priority badge */}
          <div className={`w-2 h-2 rounded-full ${priorityConfig[task.priority]?.dotColor || 'bg-stone-400'}`} 
               title={task.priority} />
          
          {/* Labels */}
          {task.labels?.slice(0, 2).map((label) => (
            <Badge key={label.id} variant="outline" className="text-xs py-0 px-1.5"
                   style={{ backgroundColor: `${label.color}15`, borderColor: label.color, color: label.color }}>
              {label.name}
            </Badge>
          ))}
          {task.labels?.length > 2 && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 border-[#D4BBA6] text-[#6B5D52]">
              +{task.labels.length - 2}
            </Badge>
          )}
          
          {/* Blocked indicator */}
          {task.is_blocked && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 border-red-200 text-red-600 bg-red-50">
              Blocked
            </Badge>
          )}
          
          {/* Sprint badge */}
          {task.sprint_name && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 border-indigo-200 text-indigo-600 bg-indigo-50">
              {task.sprint_name}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-[#8B7355]">
          <div className="flex items-center gap-2">
            {/* Assignee */}
            {task.assigned_to_name && (
              <div className="flex items-center gap-1">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="bg-[#E8D5C4] text-[#4A3728] text-[10px]">
                    {task.assigned_to_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            
            {/* Due date */}
            {task.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : ''}`}>
                {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                <span>{format(new Date(task.due_date), 'MMM d')}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Story points */}
            {task.story_points && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1 bg-[#E8D5C4] text-[#4A3728]">
                {task.story_points} SP
              </Badge>
            )}
            
            {/* Subtask count */}
            {task.subtask_count > 0 && (
              <span className="flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {task.checklist_completed}/{task.checklist_count || task.subtask_count}
              </span>
            )}
            
            {/* Watcher count */}
            {task.watcher_count > 0 && (
              <span className="flex items-center gap-0.5">
                <User className="w-3 h-3" />
                {task.watcher_count}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function KanbanBoard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [boardData, setBoardData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Filters
  const [selectedProject, setSelectedProject] = useState(searchParams.get('project') || '');
  const [selectedAssignee, setSelectedAssignee] = useState(searchParams.get('assignee') || '');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drag state
  const [draggedTask, setDraggedTask] = useState(null);
  
  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedProject) params.append('project_id', selectedProject);
      if (selectedAssignee) params.append('assigned_to', selectedAssignee);
      
      const response = await api.get(`/projects/kanban?${params.toString()}`);
      setBoardData(response.data);
    } catch (error) {
      console.error('Failed to fetch kanban board:', error);
      toast.error('Failed to load Kanban board');
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedAssignee]);

  const fetchFilters = useCallback(async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        api.get('/projects/list'),
        api.get('/users/active')
      ]);
      setProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchBoard();
    
    // Update URL params
    const params = new URLSearchParams();
    if (selectedProject) params.set('project', selectedProject);
    if (selectedAssignee) params.set('assignee', selectedAssignee);
    setSearchParams(params);
  }, [fetchBoard, selectedProject, selectedAssignee, setSearchParams]);

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    
    const taskId = e.dataTransfer.getData('taskId');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    
    if (!taskId || currentStatus === newStatus) {
      setDraggedTask(null);
      return;
    }
    
    // Optimistic update
    const updatedBoard = { ...boardData };
    const currentColumnId = getColumnIdForStatus(currentStatus);
    const newColumnId = getColumnIdForStatus(newStatus);
    
    if (currentColumnId && newColumnId && updatedBoard.tasks_by_column) {
      const taskIndex = updatedBoard.tasks_by_column[currentColumnId]?.findIndex(t => t.id === taskId);
      if (taskIndex > -1) {
        const [movedTask] = updatedBoard.tasks_by_column[currentColumnId].splice(taskIndex, 1);
        movedTask.status = newStatus;
        updatedBoard.tasks_by_column[newColumnId] = updatedBoard.tasks_by_column[newColumnId] || [];
        updatedBoard.tasks_by_column[newColumnId].unshift(movedTask);
        setBoardData(updatedBoard);
      }
    }
    
    try {
      await api.put(`/projects/kanban/move-task?task_id=${taskId}&new_status=${newStatus}`);
      toast.success('Task moved');
    } catch (error) {
      console.error('Failed to move task:', error);
      toast.error(error.response?.data?.detail || 'Failed to move task');
      fetchBoard(); // Revert on failure
    }
    
    setDraggedTask(null);
  };

  const getColumnIdForStatus = (status) => {
    if (['completed', 'approved'].includes(status)) return 'completed';
    if (status === 'pending_review') return 'pending_review';
    if (status === 'in_progress') return 'in_progress';
    if (status === 'assigned') return 'assigned';
    return 'draft';
  };

  const handleTaskClick = (task) => {
    if (task.project_id) {
      navigate(`/projects/${task.project_id}?task=${task.id}`);
    } else {
      navigate(`/projects/my-tasks?task=${task.id}`);
    }
  };

  const handleDuplicate = async (task) => {
    try {
      await api.post('/projects/tasks/duplicate', { task_id: task.id });
      toast.success('Task duplicated');
      fetchBoard();
    } catch (error) {
      toast.error('Failed to duplicate task');
    }
  };

  // Filter tasks by search query
  const getFilteredTasks = (tasks) => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => 
      task.name.toLowerCase().includes(query) ||
      task.project_name?.toLowerCase().includes(query) ||
      task.assigned_to_name?.toLowerCase().includes(query)
    );
  };

  if (loading && !boardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#FAF7F5] to-[#F5EBE0]" data-testid="kanban-board-page">
      {/* Header */}
      <div className="p-4 border-b border-[#E8D5C4] bg-white/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#4A3728]">Kanban Board</h1>
            <p className="text-[#6B5D52] text-sm">Drag and drop tasks between columns</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchBoard}
              className="border-[#D4BBA6]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate('/projects')}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px] border-[#D4BBA6] bg-white"
            />
          </div>
          
          <Select value={selectedProject || "all"} onValueChange={(v) => setSelectedProject(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px] border-[#D4BBA6] bg-white">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedAssignee || "all"} onValueChange={(v) => setSelectedAssignee(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px] border-[#D4BBA6] bg-white">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(selectedProject || selectedAssignee || searchQuery) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSelectedProject('');
                setSelectedAssignee('');
                setSearchQuery('');
              }}
              className="text-[#8B7355]"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
          
          <div className="ml-auto text-sm text-[#6B5D52]">
            {boardData?.total_tasks || 0} tasks
          </div>
        </div>
      </div>
      
      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max">
          {boardData?.columns?.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getFilteredTasks(boardData.tasks_by_column?.[column.id] || [])}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTaskClick={handleTaskClick}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
