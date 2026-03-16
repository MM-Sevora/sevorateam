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
  GripVertical, Plus, X, ChevronDown, Layers, Target
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
  
  // Quick filters
  const [quickFilter, setQuickFilter] = useState('all'); // 'all', 'my_issues', 'unassigned', 'overdue'
  const [selectedEpic, setSelectedEpic] = useState('');
  const [epics, setEpics] = useState([]);
  const [swimlaneBy, setSwimlaneBy] = useState('none'); // 'none', 'assignee', 'epic', 'priority'
  
  // Get current user from localStorage
  const currentUserId = (() => {
    try {
      const token = localStorage.getItem('sevora_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.sub;
      }
    } catch (e) {}
    return null;
  })();
  
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
      
      // Fetch epics from all projects
      const allEpics = [];
      for (const project of (projectsRes.data || [])) {
        try {
          const epicsRes = await api.get(`/engineering/projects/${project.id}/epics`);
          if (epicsRes.data) {
            epicsRes.data.forEach(epic => {
              allEpics.push({ ...epic, project_name: project.name });
            });
          }
        } catch (e) {}
      }
      setEpics(allEpics);
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
    let filtered = tasks;
    
    // Quick filters
    if (quickFilter === 'my_issues' && currentUserId) {
      filtered = filtered.filter(task => task.assigned_to === currentUserId);
    } else if (quickFilter === 'unassigned') {
      filtered = filtered.filter(task => !task.assigned_to);
    } else if (quickFilter === 'overdue') {
      filtered = filtered.filter(task => {
        if (!task.due_date) return false;
        return isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
      });
    }
    
    // Epic filter
    if (selectedEpic === 'no_epic') {
      filtered = filtered.filter(task => !task.epic_id);
    } else if (selectedEpic) {
      filtered = filtered.filter(task => task.epic_id === selectedEpic);
    }
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(query) ||
        task.project_name?.toLowerCase().includes(query) ||
        task.assigned_to_name?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  // Get swimlane groups
  const getSwimlanes = () => {
    if (swimlaneBy === 'none') return null;
    
    const allTasks = Object.values(boardData.tasks_by_column || {}).flat();
    const filteredAllTasks = getFilteredTasks(allTasks);
    
    if (swimlaneBy === 'assignee') {
      const groups = {};
      filteredAllTasks.forEach(task => {
        const key = task.assigned_to || 'unassigned';
        const name = task.assigned_to_name || 'Unassigned';
        if (!groups[key]) groups[key] = { id: key, name, tasks: [] };
        groups[key].tasks.push(task);
      });
      return Object.values(groups).sort((a, b) => {
        if (a.id === 'unassigned') return 1;
        if (b.id === 'unassigned') return -1;
        return a.name.localeCompare(b.name);
      });
    }
    
    if (swimlaneBy === 'epic') {
      const groups = {};
      filteredAllTasks.forEach(task => {
        const key = task.epic_id || 'no_epic';
        const epic = epics.find(e => e.id === task.epic_id);
        const name = epic?.name || 'No Epic';
        if (!groups[key]) groups[key] = { id: key, name, color: epic?.color, tasks: [] };
        groups[key].tasks.push(task);
      });
      return Object.values(groups).sort((a, b) => {
        if (a.id === 'no_epic') return 1;
        if (b.id === 'no_epic') return -1;
        return a.name.localeCompare(b.name);
      });
    }
    
    if (swimlaneBy === 'priority') {
      const priorityOrder = ['urgent', 'high', 'medium', 'low'];
      const groups = {};
      filteredAllTasks.forEach(task => {
        const key = task.priority || 'medium';
        if (!groups[key]) groups[key] = { id: key, name: key.charAt(0).toUpperCase() + key.slice(1), tasks: [] };
        groups[key].tasks.push(task);
      });
      return priorityOrder
        .filter(p => groups[p])
        .map(p => groups[p]);
    }
    
    return null;
  };

  const swimlanes = getSwimlanes();

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
        
        {/* Quick Filters */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-[#6B5D52]">Quick Filters:</span>
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-[#E8D5C4]">
            <Button
              size="sm"
              variant={quickFilter === 'all' ? 'default' : 'ghost'}
              onClick={() => setQuickFilter('all')}
              className={`h-7 px-3 text-xs ${quickFilter === 'all' ? 'bg-teal-600 text-white' : ''}`}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={quickFilter === 'my_issues' ? 'default' : 'ghost'}
              onClick={() => setQuickFilter('my_issues')}
              className={`h-7 px-3 text-xs ${quickFilter === 'my_issues' ? 'bg-teal-600 text-white' : ''}`}
            >
              <User className="w-3 h-3 mr-1" />
              My Issues
            </Button>
            <Button
              size="sm"
              variant={quickFilter === 'unassigned' ? 'default' : 'ghost'}
              onClick={() => setQuickFilter('unassigned')}
              className={`h-7 px-3 text-xs ${quickFilter === 'unassigned' ? 'bg-amber-600 text-white' : ''}`}
            >
              Unassigned
            </Button>
            <Button
              size="sm"
              variant={quickFilter === 'overdue' ? 'default' : 'ghost'}
              onClick={() => setQuickFilter('overdue')}
              className={`h-7 px-3 text-xs ${quickFilter === 'overdue' ? 'bg-red-600 text-white' : ''}`}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Overdue
            </Button>
          </div>
          
          {/* Epic Filter */}
          {epics.length > 0 && (
            <Select value={selectedEpic || "all_epics"} onValueChange={(v) => setSelectedEpic(v === "all_epics" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-8 border-[#D4BBA6] bg-white">
                <Layers className="w-3 h-3 mr-1 text-purple-600" />
                <SelectValue placeholder="All Epics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_epics">All Epics</SelectItem>
                <SelectItem value="no_epic">No Epic</SelectItem>
                {epics.map((epic) => (
                  <SelectItem key={epic.id} value={epic.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: epic.color || '#8B5CF6' }} />
                      {epic.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Swimlane Selector */}
          <div className="h-5 w-px bg-[#E8D5C4]" />
          <span className="text-sm text-[#6B5D52]">Group by:</span>
          <Select value={swimlaneBy} onValueChange={setSwimlaneBy}>
            <SelectTrigger className="w-[130px] h-8 border-[#D4BBA6] bg-white">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="assignee">Assignee</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
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
          
          {(selectedProject || selectedAssignee || searchQuery || quickFilter !== 'all' || selectedEpic) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSelectedProject('');
                setSelectedAssignee('');
                setSearchQuery('');
                setQuickFilter('all');
                setSelectedEpic('');
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
      <div className="flex-1 overflow-auto p-4">
        {swimlaneBy !== 'none' && swimlanes ? (
          // Swimlane view
          <div className="space-y-6">
            {swimlanes.map(swimlane => (
              <div key={swimlane.id} className="bg-white/50 rounded-xl border border-[#E8D5C4]">
                {/* Swimlane Header */}
                <div className="p-3 border-b border-[#E8D5C4] bg-[#FAF7F5]/50 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    {swimlaneBy === 'epic' && swimlane.color && (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: swimlane.color }} />
                    )}
                    {swimlaneBy === 'assignee' && swimlane.id !== 'unassigned' && (
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                          {swimlane.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {swimlaneBy === 'priority' && (
                      <Flag className={`w-4 h-4 ${
                        swimlane.id === 'urgent' ? 'text-red-600' :
                        swimlane.id === 'high' ? 'text-orange-600' :
                        swimlane.id === 'medium' ? 'text-yellow-600' :
                        'text-gray-400'
                      }`} />
                    )}
                    <span className="font-medium text-[#4A3728]">{swimlane.name}</span>
                    <Badge variant="secondary" className="bg-[#E8D5C4] text-[#4A3728]">
                      {swimlane.tasks.length}
                    </Badge>
                  </div>
                </div>
                
                {/* Swimlane Columns */}
                <div className="p-3">
                  <div className="flex gap-4 overflow-x-auto">
                    {boardData?.columns?.map((column) => {
                      const columnTasks = swimlane.tasks.filter(t => t.status === column.id);
                      return (
                        <div 
                          key={column.id}
                          className="flex-1 min-w-[200px] max-w-[250px] bg-[#F5EBE0]/30 rounded-lg p-2"
                        >
                          <div className="text-xs font-medium text-[#6B5D52] mb-2 flex items-center justify-between">
                            <span>{column.name}</span>
                            <span className="text-[#8B7355]">{columnTasks.length}</span>
                          </div>
                          <div className="space-y-2 min-h-[60px]">
                            {columnTasks.map(task => (
                              <Card 
                                key={task.id}
                                className="cursor-pointer hover:shadow-md transition-all bg-white"
                                onClick={() => handleTaskClick(task.id)}
                              >
                                <CardContent className="p-2">
                                  <div className="text-sm font-medium text-[#4A3728] line-clamp-1">
                                    {task.name}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    {task.story_points && (
                                      <Badge variant="secondary" className="text-[9px] py-0 px-1 h-4 bg-[#E8D5C4]">
                                        {task.story_points} SP
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {columnTasks.length === 0 && (
                              <div className="text-xs text-[#8B7355] text-center py-4">—</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Normal view
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
        )}
      </div>
    </div>
  );
}
