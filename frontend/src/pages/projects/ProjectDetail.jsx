import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Edit, Trash2, Users, Calendar, Flag, Clock,
  CheckCircle2, AlertTriangle, PlayCircle, Eye, MoreVertical,
  GripVertical, MessageSquare, ListTodo, RefreshCw, Settings,
  User, Folder, AlertOctagon, LayoutGrid, CalendarDays, Search,
  Filter, X, ChevronDown, CheckSquare, Square, Move, List,
  ArrowUpDown, ArrowUp, ArrowDown, BookCopy, Lock, Globe, UserPlus, UserMinus,
  Video, Paperclip, Upload, FileText, Image, File, Download, ChevronUp, ChevronRight,
  ArrowRightCircle, Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import TaskDetailModal from './TaskDetailModal';
import TaskCalendarView from './TaskCalendarView';
import TaskListView from './TaskListView';
import TaskTemplatesPanel from './TaskTemplatesPanel';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500', borderColor: 'border-l-red-500' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200', dotColor: 'bg-orange-500', borderColor: 'border-l-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dotColor: 'bg-amber-500', borderColor: 'border-l-amber-500' },
  low: { label: 'Low', color: 'bg-stone-100 text-stone-600 border-stone-200', dotColor: 'bg-emerald-500', borderColor: 'border-l-emerald-500' }
};

const statusColumns = [
  { id: 'draft', label: 'Draft', color: 'border-t-stone-400', bgColor: 'bg-stone-50/50', nextStatus: 'assigned' },
  { id: 'assigned', label: 'Assigned', color: 'border-t-blue-500', bgColor: 'bg-blue-50/30', nextStatus: 'in_progress' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-purple-500', bgColor: 'bg-purple-50/30', nextStatus: 'pending_review' },
  { id: 'pending_review', label: 'Review', color: 'border-t-amber-500', bgColor: 'bg-amber-50/30', nextStatus: 'completed' },
  { id: 'completed', label: 'Completed', color: 'border-t-emerald-500', bgColor: 'bg-emerald-50/30', nextStatus: null }
];

// Task type configuration for visual badges
const taskTypeConfig = {
  design: { label: 'Design', color: 'bg-purple-100 text-purple-700', icon: '🎨' },
  frontend: { label: 'Frontend', color: 'bg-blue-100 text-blue-700', icon: '💻' },
  backend: { label: 'Backend', color: 'bg-green-100 text-green-700', icon: '⚙️' },
  qa: { label: 'QA', color: 'bg-orange-100 text-orange-700', icon: '🧪' },
  user_story: { label: 'Story', color: 'bg-indigo-100 text-indigo-700', icon: '📖' }
};

// Label colors
const labelColors = {
  red: 'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200'
};

const TaskCard = ({ task, onStatusChange, onEdit, onDelete, onDragStart, onClick, isSelected, onSelect, selectionMode, onQuickStatusChange }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && 
    !['completed', 'approved'].includes(task.status);

  const handleClick = (e) => {
    if (e.target.closest('[role="menu"]') || e.target.closest('button') || e.target.closest('[data-checkbox]') || e.target.closest('[data-quick-action]')) return;
    onClick?.(task);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect?.(task.id);
  };

  // Get next status for quick action
  const currentColumn = statusColumns.find(col => col.id === task.status);
  const nextStatus = currentColumn?.nextStatus;
  const nextColumn = statusColumns.find(col => col.id === nextStatus);
  
  // Get task type config
  const typeConfig = taskTypeConfig[task.type];

  return (
    <div
      draggable={!task.is_blocked && !selectionMode}
      onDragStart={(e) => {
        if (task.is_blocked || selectionMode) {
          e.preventDefault();
          return;
        }
        onDragStart(e, task);
      }}
      onClick={handleClick}
      className={`bg-white p-3 rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 group cursor-pointer border-l-4 ${priorityConfig[task.priority]?.borderColor} ${
        task.is_blocked ? 'ring-2 ring-rose-400 ring-offset-1 bg-rose-50/50' : ''
      } ${isSelected ? 'ring-2 ring-rose-500 bg-rose-50/30 border-[#E8D5C4]' : 'border-[#E8D5C4]/50 hover:border-[#D4BBA6]'}`}
      data-testid={`kanban-task-${task.id}`}
    >
      {/* Top row: Type badge, Priority, Menu */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Selection Checkbox */}
          <div 
            data-checkbox
            onClick={handleCheckboxClick}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
              isSelected 
                ? 'bg-rose-500 border-rose-500' 
                : 'border-[#D4BBA6] hover:border-rose-400 bg-white'
            } ${selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            {isSelected && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
          </div>
          
          {/* Task Type Badge */}
          {typeConfig && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeConfig.color}`}>
              {typeConfig.icon} {typeConfig.label}
            </span>
          )}
          
          {task.is_blocked && (
            <div className="w-4 h-4 rounded bg-rose-100 flex items-center justify-center" title="Blocked by dependencies">
              <AlertOctagon className="w-2.5 h-2.5 text-rose-600" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Priority dot */}
          <div className={`w-2 h-2 rounded-full ${priorityConfig[task.priority]?.dotColor}`} title={priorityConfig[task.priority]?.label} />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-[#E8D5C4]">
                <MoreVertical className="w-3 h-3 text-[#4A3728]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
              <DropdownMenuItem onClick={() => onEdit(task)} className="text-[#4A3728] hover:bg-[#F5EBE0]">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Task Name */}
      <h4 className="font-medium text-[#4A3728] text-sm mb-2 line-clamp-2 group-hover:text-rose-600 transition-colors leading-tight">{task.name}</h4>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 2).map(label => (
            <span 
              key={label.id}
              className={`text-[9px] px-1.5 py-0.5 rounded border ${labelColors[label.color] || labelColors.gray}`}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[9px] px-1.5 py-0.5 text-[#6B5D52]">+{task.labels.length - 2}</span>
          )}
        </div>
      )}

      {/* Bottom row: Stats + Quick Action */}
      <div className="flex items-center justify-between text-xs text-[#6B5D52] mt-2 pt-2 border-t border-[#F5EBE0]">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="w-3 h-3" />
              {formatDate(task.due_date)}
            </span>
          )}
          {task.subtask_count > 0 && (
            <span className="flex items-center gap-0.5" title={`${task.subtask_completed || 0} of ${task.subtask_count} subtasks`}>
              <ListTodo className="w-3 h-3" />
              <span className={task.subtask_completed === task.subtask_count ? 'text-emerald-600' : ''}>
                {task.subtask_completed || 0}/{task.subtask_count}
              </span>
            </span>
          )}
          {task.comment_count > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {task.comment_count}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Assignee Avatar */}
          {task.assigned_to_name && (
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#D4BBA6] flex items-center justify-center text-[10px] font-bold text-[#4A3728]" title={task.assigned_to_name}>
              {task.assigned_to_name.charAt(0)}
            </div>
          )}
          
          {/* Quick Status Change Button */}
          {nextStatus && onQuickStatusChange && (
            <button
              data-quick-action
              onClick={(e) => {
                e.stopPropagation();
                onQuickStatusChange(task.id, nextStatus);
              }}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#F5EBE0] hover:bg-rose-100 text-[10px] font-medium text-[#4A3728] hover:text-rose-600 transition-all"
              title={`Move to ${nextColumn?.label}`}
            >
              <ArrowRightCircle className="w-3 h-3" />
              {nextColumn?.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const KanbanColumn = ({ column, tasks, onDrop, onDragOver, onStatusChange, onEditTask, onDeleteTask, onDragStart, onTaskClick, selectedTasks, onSelectTask, selectionMode, onSelectAllInColumn, onAddTask, onQuickStatusChange, epics, groupByEpic, collapsedEpics, onToggleEpic, isDragOver }) => {
  const columnTasks = tasks.filter(t => t.status === column.id);
  const allSelected = columnTasks.length > 0 && columnTasks.every(t => selectedTasks.includes(t.id));
  const someSelected = columnTasks.some(t => selectedTasks.includes(t.id));
  
  // Group tasks by epic if groupByEpic is enabled
  const groupedTasks = useMemo(() => {
    if (!groupByEpic || !epics?.length) {
      return { ungrouped: columnTasks };
    }
    
    const groups = { ungrouped: [] };
    epics.forEach(epic => {
      groups[epic.id] = [];
    });
    
    columnTasks.forEach(task => {
      if (task.epic_id && groups[task.epic_id]) {
        groups[task.epic_id].push(task);
      } else {
        groups.ungrouped.push(task);
      }
    });
    
    return groups;
  }, [columnTasks, groupByEpic, epics]);
  
  const renderTaskList = (taskList) => (
    taskList.map(task => (
      <TaskCard
        key={task.id}
        task={task}
        onStatusChange={onStatusChange}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        onDragStart={onDragStart}
        onClick={onTaskClick}
        isSelected={selectedTasks.includes(task.id)}
        onSelect={onSelectTask}
        selectionMode={selectionMode}
        onQuickStatusChange={onQuickStatusChange}
      />
    ))
  );
  
  return (
    <div
      className={`flex-1 min-w-[280px] max-w-[320px] rounded-xl ${column.bgColor} p-4 border-2 transition-all duration-200 border-t-4 ${column.color} ${
        isDragOver 
          ? 'border-rose-400 bg-rose-50/50 scale-[1.02] shadow-lg' 
          : 'border-transparent hover:border-[#E8D5C4]/50'
      }`}
      onDrop={(e) => onDrop(e, column.id)}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={() => {}}
      data-testid={`kanban-column-${column.id}`}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          {/* Select All Checkbox for Column */}
          <div 
            onClick={() => onSelectAllInColumn(column.id, columnTasks.map(t => t.id))}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
              allSelected 
                ? 'bg-rose-500 border-rose-500' 
                : someSelected 
                  ? 'bg-rose-200 border-rose-400' 
                  : 'border-[#D4BBA6] hover:border-rose-400 bg-white'
            } ${selectionMode ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
          >
            {(allSelected || someSelected) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
          </div>
          <h3 className="font-bold text-[#4A3728] text-base">{column.label}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#4A3728]/10 text-[#4A3728] px-2 py-0.5 rounded-full text-xs font-bold">
            {columnTasks.length}
          </span>
          {/* Add Task Button */}
          <button
            onClick={() => onAddTask(column.id)}
            className="w-6 h-6 rounded-full bg-white border border-[#D4BBA6] flex items-center justify-center text-[#6B5D52] hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-colors"
            title={`Add task to ${column.label}`}
            data-testid={`add-task-${column.id}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-3 min-h-[200px] max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin">
        {groupByEpic && epics?.length > 0 ? (
          <>
            {/* Render grouped by epic */}
            {epics.map(epic => {
              const epicTasks = groupedTasks[epic.id] || [];
              if (epicTasks.length === 0) return null;
              const isCollapsed = collapsedEpics?.[epic.id];
              
              return (
                <div key={epic.id} className="mb-3">
                  <button
                    onClick={() => onToggleEpic?.(epic.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/60 hover:bg-white/80 border border-[#E8D5C4]/50 mb-2 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-[#6B5D52]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#6B5D52]" />
                    )}
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-medium text-[#4A3728] truncate flex-1 text-left">{epic.title}</span>
                    <Badge variant="outline" className="text-[10px] bg-white/80">{epicTasks.length}</Badge>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-2 pl-2 border-l-2 border-indigo-200/50 ml-2">
                      {renderTaskList(epicTasks)}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Ungrouped tasks */}
            {groupedTasks.ungrouped?.length > 0 && (
              <div className="space-y-2">
                {renderTaskList(groupedTasks.ungrouped)}
              </div>
            )}
          </>
        ) : (
          <>
            {renderTaskList(columnTasks)}
          </>
        )}
        {columnTasks.length === 0 && (
          <div className="text-center py-8 text-[#9C8C74] text-sm">
            <button
              onClick={() => onAddTask(column.id)}
              className="text-rose-500 hover:text-rose-600 text-sm flex items-center gap-1 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CreateTaskModal = ({ open, onClose, projectId, users, onSuccess, defaultStatus = 'draft' }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    issue_type: 'task',
    status: defaultStatus,
    priority: 'medium',
    assigned_to: '',
    start_date: '',
    due_date: '',
    estimated_hours: ''
  });

  // Task type options for Agile workflow
  const taskTypes = [
    { value: 'task', label: 'Task', icon: '✓', color: 'bg-blue-100 text-blue-700' },
    { value: 'user_story', label: 'Story', icon: '📖', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'bug', label: 'Bug', icon: '🐛', color: 'bg-red-100 text-red-700' },
    { value: 'design', label: 'Design', icon: '🎨', color: 'bg-pink-100 text-pink-700' },
    { value: 'frontend', label: 'Frontend', icon: '🖥️', color: 'bg-cyan-100 text-cyan-700' },
    { value: 'backend', label: 'Backend', icon: '⚙️', color: 'bg-amber-100 text-amber-700' },
    { value: 'qa', label: 'QA', icon: '🧪', color: 'bg-emerald-100 text-emerald-700' }
  ];

  // Update status when defaultStatus changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, status: defaultStatus }));
  }, [defaultStatus]);

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
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        // Auto-set status to 'assigned' if someone is assigned
        status: formData.assigned_to && formData.assigned_to !== 'unassigned' ? 'assigned' : formData.status
      };
      if (!payload.assigned_to || payload.assigned_to === 'unassigned') delete payload.assigned_to;
      if (!payload.start_date) delete payload.start_date;

      const response = await fetch(`${API}/api/projects/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create task');
      
      const taskTypeLabel = taskTypes.find(t => t.value === formData.issue_type)?.label || 'Task';
      toast.success(`${taskTypeLabel} created`);
      onSuccess();
      onClose();
      setFormData({ name: '', description: '', issue_type: 'task', status: 'draft', priority: 'medium', assigned_to: '', due_date: '', estimated_hours: '' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#4A3728] flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-rose-600" />
            Create New Item
          </DialogTitle>
          <p className="text-sm text-[#6B5D52]">Select the issue type and fill in the details</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Type Selector - Agile Workflow */}
          <div>
            <Label className="text-[#4A3728] mb-2 block">Issue Type *</Label>
            <div className="flex flex-wrap gap-2">
              {taskTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, issue_type: type.value })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    formData.issue_type === type.value 
                      ? `${type.color} ring-2 ring-offset-1 ring-[#4A3728]` 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  data-testid={`task-type-${type.value}`}
                >
                  <span>{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[#4A3728]">
              {formData.issue_type === 'user_story' ? 'Story' : formData.issue_type === 'bug' ? 'Bug' : 'Task'} Name *
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.issue_type === 'user_story' ? 'As a user, I want to...' : formData.issue_type === 'bug' ? 'Bug description' : 'Enter task name'}
              className="border-[#D4BBA6] focus:border-rose-500 mt-1"
              data-testid="task-name-input"
            />
          </div>

          <div>
            <Label className="text-[#4A3728]">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description"
              className="border-[#D4BBA6] focus:border-rose-500 mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#4A3728]">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="border-[#D4BBA6] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6]">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#4A3728]">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="border-[#D4BBA6] mt-1">
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
          </div>
          
          <div>
            <Label className="text-[#4A3728]">Assign To</Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
            >
              <SelectTrigger className="border-[#D4BBA6] mt-1">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#4A3728]">Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="border-[#D4BBA6] mt-1"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="border-[#D4BBA6] mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-[#4A3728]">Estimated Hours</Label>
            <Input
              type="number"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              placeholder="0"
              className="border-[#D4BBA6] mt-1 w-32"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-[#D4BBA6] text-[#4A3728]">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white" data-testid="create-task-submit">
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};


// Team Management Modal
const TeamManagementModal = ({ open, onClose, project, users, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [visibility, setVisibility] = useState('public');

  useEffect(() => {
    if (project) {
      setTeamMembers(project.team_members || []);
      setVisibility(project.visibility || 'public');
    }
  }, [project]);

  const handleAddMember = async () => {
    if (!selectedMember || teamMembers.includes(selectedMember)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: selectedMember })
      });

      if (!response.ok) throw new Error('Failed to add member');
      
      setTeamMembers([...teamMembers, selectedMember]);
      setSelectedMember('');
      toast.success('Team member added');
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/${project.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to remove member');
      
      setTeamMembers(teamMembers.filter(id => id !== memberId));
      toast.success('Team member removed');
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVisibility = async (newVisibility) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ visibility: newVisibility })
      });

      if (!response.ok) throw new Error('Failed to update visibility');
      
      setVisibility(newVisibility);
      toast.success(`Project visibility set to ${newVisibility}`);
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update visibility');
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (memberId) => {
    const user = users.find(u => u.id === memberId);
    return user ? user.name : memberId;
  };

  const availableUsers = users.filter(u => !teamMembers.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#4A3728] flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-600" />
            Team & Visibility Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Visibility Section */}
          <div>
            <Label className="text-[#4A3728] font-medium">Project Visibility</Label>
            <p className="text-sm text-[#6B5D52] mb-2">Control who can see this project</p>
            <Select
              value={visibility}
              onValueChange={handleUpdateVisibility}
              disabled={loading}
            >
              <SelectTrigger className="border-[#D4BBA6]" data-testid="project-visibility-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
                <SelectItem value="public">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    Public - Visible to all employees
                  </span>
                </SelectItem>
                <SelectItem value="private">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    Private - Only team members
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team Members Section */}
          <div>
            <Label className="text-[#4A3728] font-medium">Team Members</Label>
            <p className="text-sm text-[#6B5D52] mb-3">
              {visibility === 'private' 
                ? 'Only these members can access this project' 
                : 'Team members for task assignment'}
            </p>

            {/* Add Member */}
            <div className="flex gap-2 mb-4">
              <Select
                value=""
                onValueChange={(userId) => {
                  if (userId && !teamMembers.includes(userId)) {
                    // Auto-add member on selection
                    setSelectedMember(userId);
                    setTimeout(() => {
                      setLoading(true);
                      const token = localStorage.getItem('sevora_token');
                      fetch(`${API}/api/projects/${project.id}/members`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ user_id: userId })
                      }).then(response => {
                        if (response.ok) {
                          setTeamMembers(prev => [...prev, userId]);
                          toast.success('Team member added');
                          onSuccess();
                        } else {
                          toast.error('Failed to add member');
                        }
                      }).catch(() => {
                        toast.error('Failed to add member');
                      }).finally(() => {
                        setLoading(false);
                        setSelectedMember('');
                      });
                    }, 0);
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger className="border-[#D4BBA6] flex-1" data-testid="add-member-select">
                  <SelectValue placeholder="Click to add team members..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                  {availableUsers.length === 0 ? (
                    <div className="p-2 text-sm text-[#9C8C74] text-center">All users are already in the team</div>
                  ) : (
                    availableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                            <User className="w-3 h-3 text-rose-600" />
                          </div>
                          <span>{user.name}</span>
                          <span className="text-[#9C8C74] text-xs">({user.email})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Members List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-[#6B5D52] italic">No team members yet</p>
              ) : (
                teamMembers.map(memberId => {
                  const memberUser = users.find(u => u.id === memberId);
                  return (
                    <div 
                      key={memberId} 
                      className="flex items-center justify-between p-2 bg-[#F5EBE0] rounded-lg"
                      data-testid={`team-member-${memberId}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#4A3728]">{getMemberName(memberId)}</p>
                          {memberUser && (
                            <p className="text-xs text-[#6B5D52]">{memberUser.email}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(memberId)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`remove-member-${memberId}`}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#E8D5C4]">
          <Button variant="outline" onClick={onClose} className="border-[#D4BBA6] text-[#4A3728]">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'calendar'
  
  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef(null);
  
  // Project tabs state
  const [projectTab, setProjectTab] = useState('tasks');
  
  // Create task with pre-selected status (for creating from Kanban column)
  const [createTaskStatus, setCreateTaskStatus] = useState('draft');
  
  // Handle URL parameter to open task detail
  useEffect(() => {
    const taskFromUrl = searchParams.get('task');
    if (taskFromUrl) {
      setSelectedTaskId(taskFromUrl);
      // Clear the URL parameter after reading it
      searchParams.delete('task');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    assignee: 'all',
    priorities: [],
    dueDate: 'all' // 'all', 'overdue', 'today', 'this_week', 'no_date'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (filters.search && !task.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Assignee filter
      if (filters.assignee !== 'all' && task.assigned_to !== filters.assignee) {
        if (filters.assignee === 'unassigned' && task.assigned_to) return false;
        if (filters.assignee !== 'unassigned' && task.assigned_to !== filters.assignee) return false;
      }
      
      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }
      
      // Due date filter
      if (filters.dueDate !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = task.due_date ? new Date(task.due_date) : null;
        
        if (filters.dueDate === 'no_date' && taskDate) return false;
        if (filters.dueDate === 'overdue') {
          if (!taskDate || taskDate >= today || ['completed', 'approved'].includes(task.status)) return false;
        }
        if (filters.dueDate === 'today') {
          if (!taskDate) return false;
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (taskDate < today || taskDate >= tomorrow) return false;
        }
        if (filters.dueDate === 'this_week') {
          if (!taskDate) return false;
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (taskDate < today || taskDate >= weekEnd) return false;
        }
      }
      
      return true;
    });
  }, [tasks, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.assignee !== 'all') count++;
    if (filters.priorities.length > 0) count++;
    if (filters.dueDate !== 'all') count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      assignee: 'all',
      priorities: [],
      dueDate: 'all'
    });
  };

  const togglePriority = (priority) => {
    setFilters(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority]
    }));
  };

  // Bulk selection state
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [projectLabels, setProjectLabels] = useState([]);
  
  // Epic grouping
  const [groupByEpic, setGroupByEpic] = useState(false);
  const [epics, setEpics] = useState([]);
  const [collapsedEpics, setCollapsedEpics] = useState({});
  
  // Related meetings
  const [relatedMeetings, setRelatedMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  const selectionMode = selectedTasks.length > 0;
  
  const fetchRelatedMeetings = useCallback(async () => {
    if (!projectId) return;
    setLoadingMeetings(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRelatedMeetings(Array.isArray(data) ? data : data.meetings || []);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoadingMeetings(false);
    }
  }, [projectId]);

  // Compute task counts by type
  const taskCountsByType = useMemo(() => {
    const counts = { design: 0, frontend: 0, backend: 0, qa: 0, user_story: 0, other: 0 };
    tasks.forEach(task => {
      const type = task.type || 'other';
      if (counts.hasOwnProperty(type)) {
        counts[type]++;
      } else {
        counts.other++;
      }
    });
    return counts;
  }, [tasks]);

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const selectAllInColumn = (columnId, taskIds) => {
    const columnTaskIds = taskIds;
    const allSelected = columnTaskIds.every(id => selectedTasks.includes(id));
    
    if (allSelected) {
      // Deselect all in column
      setSelectedTasks(prev => prev.filter(id => !columnTaskIds.includes(id)));
    } else {
      // Select all in column
      setSelectedTasks(prev => [...new Set([...prev, ...columnTaskIds])]);
    }
  };

  const selectAllTasks = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(t => t.id));
    }
  };

  const clearSelection = () => {
    setSelectedTasks([]);
  };

  // Toggle epic collapse
  const toggleEpicCollapse = (epicId) => {
    setCollapsedEpics(prev => ({
      ...prev,
      [epicId]: !prev[epicId]
    }));
  };

  // Quick status change handler (single task)
  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      // Optimistically update local state
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      
      const statusLabel = statusColumns.find(c => c.id === newStatus)?.label;
      toast.success(`Task moved to ${statusLabel}`);
    } catch (error) {
      toast.error('Failed to update task status');
      fetchData(); // Refresh on error
    }
  };

  // Bulk actions
  const bulkUpdateStatus = async (newStatus) => {
    if (selectedTasks.length === 0) return;
    setBulkActionLoading(true);
    
    try {
      const token = localStorage.getItem('sevora_token');
      await Promise.all(selectedTasks.map(taskId =>
        fetch(`${API}/api/projects/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      ));
      toast.success(`${selectedTasks.length} tasks moved to ${statusColumns.find(c => c.id === newStatus)?.label}`);
      clearSelection();
      fetchData();
    } catch (error) {
      toast.error('Failed to update tasks');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkUpdatePriority = async (newPriority) => {
    if (selectedTasks.length === 0) return;
    setBulkActionLoading(true);
    
    try {
      const token = localStorage.getItem('sevora_token');
      await Promise.all(selectedTasks.map(taskId =>
        fetch(`${API}/api/projects/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: newPriority })
        })
      ));
      toast.success(`${selectedTasks.length} tasks updated to ${newPriority} priority`);
      clearSelection();
      fetchData();
    } catch (error) {
      toast.error('Failed to update tasks');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkAssign = async (userId) => {
    if (selectedTasks.length === 0) return;
    setBulkActionLoading(true);
    
    try {
      const token = localStorage.getItem('sevora_token');
      await Promise.all(selectedTasks.map(taskId =>
        fetch(`${API}/api/projects/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_to: userId === 'unassigned' ? null : userId })
        })
      ));
      const assigneeName = userId === 'unassigned' ? 'Unassigned' : users.find(u => u.id === userId)?.name;
      toast.success(`${selectedTasks.length} tasks assigned to ${assigneeName}`);
      clearSelection();
      fetchData();
    } catch (error) {
      toast.error('Failed to assign tasks');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (!window.confirm(`Delete ${selectedTasks.length} selected tasks? This cannot be undone.`)) return;
    
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      await Promise.all(selectedTasks.map(taskId =>
        fetch(`${API}/api/projects/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ));
      toast.success(`${selectedTasks.length} tasks deleted`);
      clearSelection();
      fetchData();
    } catch (error) {
      toast.error('Failed to delete tasks');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [projectRes, tasksRes, usersRes, labelsRes, attachmentsRes, epicsRes] = await Promise.all([
        fetch(`${API}/api/projects/${projectId}`, { headers }),
        fetch(`${API}/api/projects/${projectId}/tasks`, { headers }),
        fetch(`${API}/api/workos/users`, { headers }),
        fetch(`${API}/api/projects/labels?project_id=${projectId}`, { headers }),
        fetch(`${API}/api/projects/${projectId}/attachments`, { headers }),
        fetch(`${API}/api/projects/${projectId}/epics`, { headers })
      ]);

      if (!projectRes.ok) throw new Error('Project not found');

      const projectData = await projectRes.json();
      const tasksData = tasksRes.ok ? await tasksRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const labelsData = labelsRes.ok ? await labelsRes.json() : [];
      const attachmentsData = attachmentsRes.ok ? await attachmentsRes.json() : [];
      const epicsData = epicsRes.ok ? await epicsRes.json() : [];

      setProject(projectData);
      setTasks(tasksData);
      // Filter to show only active users
      const allUsers = usersData.users || usersData || [];
      setUsers(allUsers.filter(u => u.status === 'active'));
      setProjectLabels(labelsData);
      setAttachments(attachmentsData);
      setEpics(epicsData);
      
      // Auto-enable epic grouping if epics exist
      if (epicsData.length > 0 && !groupByEpic) {
        setGroupByEpic(true);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate, groupByEpic]);

  useEffect(() => {
    fetchData();
    fetchRelatedMeetings();
  }, [fetchData, fetchRelatedMeetings]);

  // Attachment handlers
  const handleAttachmentUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingAttachment(true);
    const token = localStorage.getItem('sevora_token');
    
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API}/api/projects/${projectId}/attachments`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
      }
      toast.success('File(s) uploaded');
      fetchData();
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return;
    
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/${projectId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Delete failed');
      toast.success('Attachment deleted');
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      toast.error('Failed to delete attachment');
    }
  };

  const getFileIcon = (contentType) => {
    if (contentType?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (contentType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback class
    e.target.classList.add('opacity-50', 'scale-95');
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (columnId) setDragOverColumn(columnId);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
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
    setSelectedTaskId(task.id);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  const progressColor = project.progress >= 75 ? 'bg-emerald-500' : 
                        project.progress >= 50 ? 'bg-blue-500' : 
                        project.progress >= 25 ? 'bg-amber-500' : 'bg-stone-400';

  return (
    <div className="p-8 space-y-6" data-testid="project-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/projects')} 
          className="text-[#5D4A3A] hover:text-[#4A3728] hover:bg-[#E8D5C4]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Project Info - Bento Grid Style */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Info Card */}
        <Card className="col-span-full md:col-span-8 bg-white/50 border-[#E8D5C4]">
          <CardContent className="p-6">
            {/* Header Row - Title + CTAs */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-[#4A3728]" data-testid="project-title">
                {project.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/meetings/new?project_id=${project.id}&project_name=${encodeURIComponent(project.name)}&type=project_review`)}
                  className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
                  data-testid="schedule-meeting-btn"
                >
                  <Video className="w-4 h-4 mr-1" />
                  Meeting
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTeamModal(true)} 
                  className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
                  data-testid="manage-team-btn"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Team
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={fetchData} 
                  className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0] h-9 w-9"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setShowCreateTask(true)} 
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  data-testid="add-task-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
              </div>
            </div>
            
            {/* Badges Row */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {project.visibility === 'private' ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <Globe className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              )}
              <Badge variant="outline" className={priorityConfig[project.priority]?.color}>
                <Flag className="w-3 h-3 mr-1" />
                {project.priority}
              </Badge>
              {project.module_name && (
                <Badge variant="outline" className="bg-[#F5EBE0] text-[#4A3728] border-[#D4BBA6]">
                  <Folder className="w-3 h-3 mr-1" />
                  {project.module_name}
                </Badge>
              )}
            </div>
            
            {/* Info Row */}
            <div className="flex items-center gap-4 text-sm text-[#6B5D52] flex-wrap">
              {project.owner_name && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {project.owner_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {project.completed_task_count}/{project.task_count} tasks
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {project.team_members?.length || 0} members
              </span>
            </div>
            
            {/* Task Type Breakdown */}
            {(taskCountsByType.design > 0 || taskCountsByType.frontend > 0 || taskCountsByType.backend > 0 || taskCountsByType.qa > 0) && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-[#6B5D52] mr-1">By type:</span>
                {taskCountsByType.user_story > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                    📖 {taskCountsByType.user_story} Stories
                  </span>
                )}
                {taskCountsByType.design > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                    🎨 {taskCountsByType.design} Design
                  </span>
                )}
                {taskCountsByType.frontend > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                    💻 {taskCountsByType.frontend} Frontend
                  </span>
                )}
                {taskCountsByType.backend > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                    ⚙️ {taskCountsByType.backend} Backend
                  </span>
                )}
                {taskCountsByType.qa > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                    🧪 {taskCountsByType.qa} QA
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="col-span-full md:col-span-4 bg-[#E8D5C4]/30 border-[#E8D5C4]">
          <CardContent className="p-6 md:p-8 flex flex-col justify-center h-full">
            <div className="text-center mb-4">
              <p className="text-[#6B5D52] text-sm mb-1">Overall Progress</p>
              <p className="text-3xl md:text-4xl font-bold text-[#4A3728]">{project.progress}%</p>
            </div>
            <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full ${progressColor} transition-all duration-500`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
            {project.end_date && (
              <p className="text-center text-[#6B5D52] text-sm mt-4 flex items-center justify-center gap-1">
                <Calendar className="w-4 h-4" />
                Due: {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Tabs - Tasks, Files, Info */}
      <Tabs value={projectTab} onValueChange={setProjectTab} className="space-y-4">
        <TabsList className="bg-[#F5EBE0] border border-[#E8D5C4]">
          <TabsTrigger value="tasks" className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728]">
            <ListTodo className="w-4 h-4 mr-2" />
            Tasks
            <Badge className="ml-2 bg-[#E8D5C4] text-[#4A3728]">{tasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728]">
            <Paperclip className="w-4 h-4 mr-2" />
            Files
            {attachments.length > 0 && <Badge className="ml-2 bg-[#E8D5C4] text-[#4A3728]">{attachments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="info" className="data-[state=active]:bg-white data-[state=active]:text-[#4A3728]">
            <Folder className="w-4 h-4 mr-2" />
            Project Info
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-0">
          <Card className="bg-[#FDF8F3] border-[#E8D5C4]">
            <CardHeader className="border-b border-[#E8D5C4] bg-white/50 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#4A3728] flex items-center gap-2">
              {viewMode === 'kanban' ? (
                <GripVertical className="w-5 h-5 text-rose-600" />
              ) : (
                <CalendarDays className="w-5 h-5 text-rose-600" />
              )}
              {viewMode === 'kanban' ? 'Task Board' : 'Calendar View'}
              {activeFilterCount > 0 && (
                <Badge className="bg-rose-100 text-rose-700 ml-2">
                  {filteredTasks.length} of {tasks.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 bg-[#F5EBE0] rounded-lg p-1">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={viewMode === 'kanban' 
                  ? 'bg-white text-[#4A3728] shadow-sm' 
                  : 'text-[#6B5D52] hover:text-[#4A3728]'
                }
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' 
                  ? 'bg-white text-[#4A3728] shadow-sm' 
                  : 'text-[#6B5D52] hover:text-[#4A3728]'
                }
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' 
                  ? 'bg-white text-[#4A3728] shadow-sm' 
                  : 'text-[#6B5D52] hover:text-[#4A3728]'
                }
              >
                <CalendarDays className="w-4 h-4 mr-1" />
                Calendar
              </Button>
            </div>
            {/* Templates Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
              className="border-[#D4BBA6] text-[#6B5D52] hover:text-[#4A3728] hover:bg-[#F5EBE0]"
              data-testid="templates-btn"
            >
              <BookCopy className="w-4 h-4 mr-1" />
              Templates
            </Button>
            
            {/* Epic Grouping Toggle (only show if epics exist) */}
            {epics.length > 0 && viewMode === 'kanban' && (
              <Button
                variant={groupByEpic ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGroupByEpic(!groupByEpic)}
                className={groupByEpic 
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white' 
                  : 'border-[#D4BBA6] text-[#6B5D52] hover:text-[#4A3728] hover:bg-[#F5EBE0]'
                }
                data-testid="group-by-epic-btn"
              >
                <Layers className="w-4 h-4 mr-1" />
                Group by Epic
              </Button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8C74]" />
              <Input
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search tasks..."
                className="pl-9 border-[#D4BBA6] bg-white focus:border-rose-500 h-9"
                data-testid="task-search-input"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C8C74] hover:text-[#4A3728]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Assignee Filter */}
            <Select
              value={filters.assignee}
              onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}
            >
              <SelectTrigger className="w-[160px] border-[#D4BBA6] bg-white h-9">
                <User className="w-4 h-4 mr-2 text-[#6B5D52]" />
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-[#D4BBA6] bg-white h-9 ${filters.priorities.length > 0 ? 'border-rose-400 bg-rose-50' : ''}`}
                >
                  <Flag className="w-4 h-4 mr-2 text-[#6B5D52]" />
                  Priority
                  {filters.priorities.length > 0 && (
                    <Badge className="ml-2 bg-rose-500 text-white text-xs px-1.5">{filters.priorities.length}</Badge>
                  )}
                  <ChevronDown className="w-4 h-4 ml-2 text-[#6B5D52]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3 bg-white border-[#D4BBA6]" align="start">
                <div className="space-y-2">
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-[#F5EBE0] p-1.5 rounded">
                      <Checkbox
                        checked={filters.priorities.includes(key)}
                        onCheckedChange={() => togglePriority(key)}
                        className="border-[#D4BBA6]"
                      />
                      <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                      <span className="text-sm text-[#4A3728]">{config.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Due Date Filter */}
            <Select
              value={filters.dueDate}
              onValueChange={(value) => setFilters(prev => ({ ...prev, dueDate: value }))}
            >
              <SelectTrigger className={`w-[140px] border-[#D4BBA6] bg-white h-9 ${filters.dueDate !== 'all' ? 'border-rose-400 bg-rose-50' : ''}`}>
                <Calendar className="w-4 h-4 mr-2 text-[#6B5D52]" />
                <SelectValue placeholder="Due Date" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="overdue">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    Overdue
                  </span>
                </SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="no_date">No Due Date</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-[#6B5D52] hover:text-rose-600 hover:bg-rose-50 h-9"
              >
                <X className="w-4 h-4 mr-1" />
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectionMode && viewMode === 'kanban' && (
            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllTasks}
                  className="flex items-center gap-2 text-sm text-[#4A3728] hover:text-rose-600"
                >
                  {selectedTasks.length === filteredTasks.length ? (
                    <CheckSquare className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedTasks.length === filteredTasks.length ? 'Deselect All' : 'Select All'}
                </button>
                <Badge className="bg-rose-500 text-white">{selectedTasks.length} selected</Badge>
              </div>
              
              <div className="h-6 w-px bg-rose-200" />
              
              {/* Move to Status */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkActionLoading} className="border-rose-300 text-[#4A3728] hover:bg-rose-100 h-8">
                    <Move className="w-4 h-4 mr-1" />
                    Move to
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2 bg-white border-[#D4BBA6]" align="start">
                  <div className="space-y-1">
                    {statusColumns.map(col => (
                      <button
                        key={col.id}
                        onClick={() => bulkUpdateStatus(col.id)}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-[#F5EBE0] text-[#4A3728] flex items-center gap-2"
                      >
                        <div className={`w-2 h-2 rounded-full ${col.color.replace('border-t-', 'bg-')}`} />
                        {col.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Change Priority */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkActionLoading} className="border-rose-300 text-[#4A3728] hover:bg-rose-100 h-8">
                    <Flag className="w-4 h-4 mr-1" />
                    Priority
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-36 p-2 bg-white border-[#D4BBA6]" align="start">
                  <div className="space-y-1">
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => bulkUpdatePriority(key)}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-[#F5EBE0] text-[#4A3728] flex items-center gap-2"
                      >
                        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                        {config.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Assign to */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkActionLoading} className="border-rose-300 text-[#4A3728] hover:bg-rose-100 h-8">
                    <User className="w-4 h-4 mr-1" />
                    Assign
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2 bg-white border-[#D4BBA6]" align="start">
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    <button
                      onClick={() => bulkAssign('unassigned')}
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-[#F5EBE0] text-[#9C8C74]"
                    >
                      Unassigned
                    </button>
                    {users.map(user => (
                      <button
                        key={user.id}
                        onClick={() => bulkAssign(user.id)}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-[#F5EBE0] text-[#4A3728] flex items-center gap-2"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#E8D5C4] flex items-center justify-center text-xs">
                          {user.name?.charAt(0)}
                        </div>
                        {user.name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="h-6 w-px bg-rose-200" />

              {/* Delete */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={bulkDelete}
                disabled={bulkActionLoading}
                className="border-red-300 text-red-600 hover:bg-red-50 h-8"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>

              {/* Clear Selection */}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-[#6B5D52] hover:text-[#4A3728] ml-auto h-8"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {viewMode === 'kanban' && (
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x scrollbar-thin" onDragEnd={handleDragEnd}>
              {statusColumns.map(column => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={filteredTasks}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onStatusChange={() => {}}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onDragStart={handleDragStart}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                  selectedTasks={selectedTasks}
                  onSelectTask={toggleTaskSelection}
                  selectionMode={selectionMode}
                  onSelectAllInColumn={selectAllInColumn}
                  onAddTask={(status) => {
                    setCreateTaskStatus(status);
                    setShowCreateTask(true);
                  }}
                  onQuickStatusChange={handleQuickStatusChange}
                  epics={epics}
                  groupByEpic={groupByEpic}
                  collapsedEpics={collapsedEpics}
                  onToggleEpic={toggleEpicCollapse}
                  isDragOver={dragOverColumn === column.id}
                />
              ))}
            </div>
          )}
          {viewMode === 'list' && (
            <TaskListView
              tasks={filteredTasks}
              onTaskClick={(task) => setSelectedTaskId(task.id)}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              selectedTasks={selectedTasks}
              onSelectTask={toggleTaskSelection}
              selectionMode={selectionMode}
              users={users}
            />
          )}
          {viewMode === 'calendar' && (
            <TaskCalendarView
              tasks={filteredTasks}
              onTaskClick={(task) => setSelectedTaskId(task.id)}
            />
          )}
        </CardContent>
      </Card>

      {/* Related Meetings Section */}
      <Card className="bg-white border-[#E8D5C4] shadow-sm mt-6">
        <CardHeader className="border-b border-[#E8D5C4]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#4A3728] flex items-center gap-2">
              <Video className="w-5 h-5 text-rose-600" />
              Related Meetings
              {relatedMeetings.length > 0 && (
                <Badge className="bg-rose-100 text-rose-700 ml-2">{relatedMeetings.length}</Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => navigate(`/meetings/new?project_id=${project.id}&project_name=${encodeURIComponent(project.name)}&type=project_review`)}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {loadingMeetings ? (
            <div className="text-center py-8 text-[#6B5D52]">Loading meetings...</div>
          ) : relatedMeetings.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
              <p className="text-[#6B5D52]">No meetings linked to this project yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/meetings/new?project_id=${project.id}&project_name=${encodeURIComponent(project.name)}&type=project_review`)}
                className="mt-3 border-[#D4BBA6]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule First Meeting
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {relatedMeetings.slice(0, 5).map(meeting => (
                <div 
                  key={meeting.id}
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                  className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg hover:bg-[#EDE3D8] cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-[#4A3728]">{meeting.title}</p>
                    <div className="flex items-center gap-3 text-xs text-[#6B5D52] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(meeting.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(meeting.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {meeting.participant_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {meeting.participant_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={
                    meeting.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }>
                    {meeting.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              {relatedMeetings.length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/meetings?project_id=${project.id}`)}
                  className="w-full border-[#D4BBA6]"
                >
                  View All {relatedMeetings.length} Meetings
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-0">
          <Card className="bg-white/50 border-[#E8D5C4]">
            <CardHeader className="border-b border-[#E8D5C4] py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#4A3728] flex items-center gap-2 text-base">
                  <Paperclip className="w-5 h-5 text-rose-600" />
                  Project Files & Attachments
                </CardTitle>
                <div>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    onChange={handleAttachmentUpload}
                    className="hidden"
                    id="project-attachment-input"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
                    data-testid="upload-attachment-btn"
                  >
                    {uploadingAttachment ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Files
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {attachments.length === 0 ? (
                <div className="text-center py-12 text-[#9C8C74]">
                  <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg">No files uploaded yet</p>
                  <p className="text-sm mt-1">Upload documents, images, or any files to share with your team</p>
                  <Button
                    variant="outline"
                    className="mt-4 border-[#D4BBA6]"
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Your First File
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-4 bg-[#FDF8F3] border border-[#E8D5C4] rounded-lg group hover:border-[#D4BBA6] hover:shadow-md transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white border border-[#E8D5C4] flex items-center justify-center">
                        {getFileIcon(att.content_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#4A3728] truncate" title={att.original_filename}>
                          {att.original_filename}
                        </p>
                        <p className="text-xs text-[#9C8C74]">
                          {formatFileSize(att.size)}
                          {att.uploaded_by_name && ` • ${att.uploaded_by_name}`}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`${API}${att.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#6B5D52] hover:text-[#4A3728] hover:bg-[#E8D5C4] rounded-lg"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="p-2 text-[#9C8C74] hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Info Tab */}
        <TabsContent value="info" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Details Card */}
            <Card className="bg-white/50 border-[#E8D5C4]">
              <CardHeader className="border-b border-[#E8D5C4] py-4">
                <CardTitle className="text-[#4A3728] flex items-center gap-2 text-base">
                  <Folder className="w-5 h-5 text-rose-600" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-[#6B5D52]">Description</label>
                  <div className="mt-1 text-[#4A3728] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: project.description || '<span class="text-[#9C8C74]">No description provided</span>' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#6B5D52]">Start Date</label>
                    <p className="mt-1 text-[#4A3728]">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-[#6B5D52]">Due Date</label>
                    <p className="mt-1 text-[#4A3728]">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#6B5D52]">Priority</label>
                    <div className="mt-1">
                      <Badge className={priorityConfig[project.priority]?.color || 'bg-stone-100'}>
                        {priorityConfig[project.priority]?.label || project.priority}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-[#6B5D52]">Visibility</label>
                    <div className="mt-1">
                      <Badge variant="outline" className={project.visibility === 'private' ? 'border-amber-200 text-amber-700' : 'border-emerald-200 text-emerald-700'}>
                        {project.visibility === 'private' ? <Lock className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                        {project.visibility === 'private' ? 'Private' : 'Public'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Meetings Card - Moved here */}
            <Card className="bg-white/50 border-[#E8D5C4]">
              <CardHeader className="border-b border-[#E8D5C4] py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#4A3728] flex items-center gap-2 text-base">
                    <Video className="w-5 h-5 text-rose-600" />
                    Related Meetings
                    {relatedMeetings.length > 0 && (
                      <Badge className="bg-rose-100 text-rose-700 ml-1">{relatedMeetings.length}</Badge>
                    )}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/meetings/new?project_id=${project.id}&project_name=${encodeURIComponent(project.name)}&type=project_review`)}
                    className="border-[#D4BBA6]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {loadingMeetings ? (
                  <div className="text-center py-6 text-[#6B5D52]">Loading...</div>
                ) : relatedMeetings.length === 0 ? (
                  <div className="text-center py-6">
                    <Video className="w-10 h-10 mx-auto text-[#D4BBA6] mb-2" />
                    <p className="text-sm text-[#6B5D52]">No meetings linked yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {relatedMeetings.slice(0, 5).map(meeting => (
                      <div 
                        key={meeting.id}
                        onClick={() => navigate(`/meetings/${meeting.id}`)}
                        className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg hover:bg-[#EDE3D8] cursor-pointer"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-[#4A3728] text-sm">{meeting.title}</p>
                          <p className="text-xs text-[#6B5D52]">
                            {new Date(meeting.start_time).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <CreateTaskModal
        open={showCreateTask}
        onClose={() => {
          setShowCreateTask(false);
          setCreateTaskStatus('draft');
        }}
        projectId={projectId}
        users={users}
        onSuccess={fetchData}
        defaultStatus={createTaskStatus}
      />

      <TaskDetailModal
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        taskId={selectedTaskId}
        onUpdate={fetchData}
        users={users}
        projectId={projectId}
      />

      <TeamManagementModal
        open={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        project={project}
        users={users}
        onSuccess={fetchData}
      />

      <TaskTemplatesPanel
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        projectId={projectId}
        users={users}
        labels={projectLabels}
        onCreateTask={(task) => {
          fetchData();
          setSelectedTaskId(task.id);
        }}
      />
    </div>
  );
};

export default ProjectDetail;
