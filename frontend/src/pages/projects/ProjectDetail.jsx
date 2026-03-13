import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Edit, Trash2, Users, Calendar, Flag, Clock,
  CheckCircle2, AlertTriangle, PlayCircle, Eye, MoreVertical,
  GripVertical, MessageSquare, ListTodo, RefreshCw, Settings,
  User, Folder, AlertOctagon, LayoutGrid, CalendarDays, Search,
  Filter, X, ChevronDown, CheckSquare, Square, Move, List,
  ArrowUpDown, ArrowUp, ArrowDown, BookCopy, Lock, Globe, UserPlus, UserMinus,
  Video
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
  { id: 'draft', label: 'Draft', color: 'border-t-stone-400', bgColor: 'bg-stone-50/50' },
  { id: 'assigned', label: 'Assigned', color: 'border-t-blue-500', bgColor: 'bg-blue-50/30' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-purple-500', bgColor: 'bg-purple-50/30' },
  { id: 'pending_review', label: 'Review', color: 'border-t-amber-500', bgColor: 'bg-amber-50/30' },
  { id: 'completed', label: 'Completed', color: 'border-t-emerald-500', bgColor: 'bg-emerald-50/30' }
];

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

const TaskCard = ({ task, onStatusChange, onEdit, onDelete, onDragStart, onClick, isSelected, onSelect, selectionMode }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && 
    !['completed', 'approved'].includes(task.status);

  const handleClick = (e) => {
    if (e.target.closest('[role="menu"]') || e.target.closest('button') || e.target.closest('[data-checkbox]')) return;
    onClick?.(task);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect?.(task.id);
  };

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
      className={`bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-all group cursor-pointer border-l-4 ${priorityConfig[task.priority]?.borderColor} ${
        task.is_blocked ? 'ring-2 ring-rose-400 ring-offset-1 bg-rose-50/50' : ''
      } ${isSelected ? 'ring-2 ring-rose-500 bg-rose-50/30 border-[#E8D5C4]' : 'border-[#E8D5C4]/50'}`}
      data-testid={`kanban-task-${task.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Selection Checkbox */}
          <div 
            data-checkbox
            onClick={handleCheckboxClick}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
              isSelected 
                ? 'bg-rose-500 border-rose-500' 
                : 'border-[#D4BBA6] hover:border-rose-400 bg-white'
            } ${selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          {task.is_blocked && (
            <div className="w-5 h-5 rounded bg-rose-100 flex items-center justify-center" title="Blocked by dependencies">
              <AlertOctagon className="w-3 h-3 text-rose-600" />
            </div>
          )}
          <div className={`w-2 h-2 rounded-full ${priorityConfig[task.priority]?.dotColor}`} />
          <span className="text-xs text-[#6B5D52] capitalize">{task.priority}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-[#E8D5C4]">
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

      <h4 className="font-medium text-[#4A3728] text-sm mb-2 line-clamp-2 group-hover:text-rose-600 transition-colors">{task.name}</h4>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map(label => (
            <span 
              key={label.id}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${labelColors[label.color] || labelColors.gray}`}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 text-[#6B5D52]">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-[#6B5D52] mt-2 pt-2 border-t border-[#F5EBE0]">
        <div className="flex items-center gap-3">
          {task.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
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
          <div className="w-6 h-6 rounded-full bg-[#E8D5C4] flex items-center justify-center text-xs font-medium text-[#4A3728]" title={task.assigned_to_name}>
            {task.assigned_to_name.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanColumn = ({ column, tasks, onDrop, onDragOver, onStatusChange, onEditTask, onDeleteTask, onDragStart, onTaskClick, selectedTasks, onSelectTask, selectionMode, onSelectAllInColumn }) => {
  const columnTasks = tasks.filter(t => t.status === column.id);
  const allSelected = columnTasks.length > 0 && columnTasks.every(t => selectedTasks.includes(t.id));
  const someSelected = columnTasks.some(t => selectedTasks.includes(t.id));
  
  return (
    <div
      className={`flex-1 min-w-[280px] max-w-[320px] rounded-xl ${column.bgColor} p-4 border border-transparent hover:border-[#E8D5C4]/50 transition-colors border-t-4 ${column.color}`}
      onDrop={(e) => onDrop(e, column.id)}
      onDragOver={onDragOver}
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
        <span className="bg-[#4A3728]/10 text-[#4A3728] px-2 py-0.5 rounded-full text-xs font-bold">
          {columnTasks.length}
        </span>
      </div>
      <div className="space-y-3 min-h-[200px]">
        {columnTasks.map(task => (
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
          />
        ))}
        {columnTasks.length === 0 && (
          <div className="text-center py-8 text-[#9C8C74] text-sm">
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
      <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#4A3728] flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-rose-600" />
            Create New Task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[#4A3728]">Task Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter task name"
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#4A3728]">Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="border-[#D4BBA6] mt-1"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="0"
                className="border-[#D4BBA6] mt-1"
              />
            </div>
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
                value={selectedMember}
                onValueChange={setSelectedMember}
                disabled={loading}
              >
                <SelectTrigger className="border-[#D4BBA6] flex-1" data-testid="add-member-select">
                  <SelectValue placeholder="Select a user to add" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddMember} 
                disabled={loading || !selectedMember}
                className="bg-rose-600 hover:bg-rose-700 text-white"
                data-testid="add-member-btn"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
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
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'calendar'
  
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

      const [projectRes, tasksRes, usersRes, labelsRes] = await Promise.all([
        fetch(`${API}/api/projects/${projectId}`, { headers }),
        fetch(`${API}/api/projects/${projectId}/tasks`, { headers }),
        fetch(`${API}/api/workos/users`, { headers }),
        fetch(`${API}/api/projects/labels?project_id=${projectId}`, { headers })
      ]);

      if (!projectRes.ok) throw new Error('Project not found');

      const projectData = await projectRes.json();
      const tasksData = tasksRes.ok ? await tasksRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const labelsData = labelsRes.ok ? await labelsRes.json() : [];

      setProject(projectData);
      setTasks(tasksData);
      setUsers(usersData.users || usersData || []);
      setProjectLabels(labelsData);
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
    fetchRelatedMeetings();
  }, [fetchData, fetchRelatedMeetings]);

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
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-[#4A3728]" data-testid="project-title">{project.name}</h1>
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
                </div>
                {project.module_name && (
                  <p className="text-[#6B5D52] flex items-center gap-2 mb-3 font-medium">
                    <Folder className="w-4 h-4" />
                    {project.module_name}
                  </p>
                )}
                {project.description && (
                  <div 
                    className="text-[#6B5D52] mb-4 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: project.description }}
                  />
                )}
                <div className="flex items-center gap-6 text-sm text-[#6B5D52] flex-wrap">
                  {project.owner_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Owner: {project.owner_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {project.completed_task_count}/{project.task_count} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {project.team_members?.length || 0} team members
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/meetings/new?project_id=${project.id}&type=project_review`)}
                  className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
                  data-testid="schedule-meeting-btn"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTeamModal(true)} 
                  className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
                  data-testid="manage-team-btn"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Team
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchData} 
                  className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setShowCreateTask(true)} 
                  className="bg-rose-600 hover:bg-rose-700 text-white" 
                  data-testid="add-task-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="col-span-full md:col-span-4 bg-[#E8D5C4]/30 border-[#E8D5C4]">
          <CardContent className="p-8 flex flex-col justify-center h-full">
            <div className="text-center mb-4">
              <p className="text-[#6B5D52] text-sm mb-1">Overall Progress</p>
              <p className="text-4xl font-bold text-[#4A3728]">{project.progress}%</p>
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

      {/* Task Board - Kanban or Calendar */}
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
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x">
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
              onClick={() => navigate(`/meetings/new?project_id=${project.id}&type=project_review`)}
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
                onClick={() => navigate(`/meetings/new?project_id=${project.id}&type=project_review`)}
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

      <CreateTaskModal
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={projectId}
        users={users}
        onSuccess={fetchData}
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
