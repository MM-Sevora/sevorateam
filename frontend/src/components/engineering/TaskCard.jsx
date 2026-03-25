import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  Layers, BookOpen, CheckSquare, Bug, Zap, User, 
  GripVertical, Edit3, ArrowRight, ArrowLeft, Clock,
  AlertTriangle
} from 'lucide-react';

// Issue type icons configuration
export const issueTypeIcons = {
  epic: <Layers className="w-4 h-4 text-purple-600" />,
  story: <BookOpen className="w-4 h-4 text-green-600" />,
  task: <CheckSquare className="w-4 h-4 text-blue-600" />,
  bug: <Bug className="w-4 h-4 text-red-600" />,
  subtask: <CheckSquare className="w-4 h-4 text-gray-500" />,
  improvement: <Zap className="w-4 h-4 text-amber-600" />,
  design: <Layers className="w-4 h-4 text-pink-600" />,
  frontend: <CheckSquare className="w-4 h-4 text-cyan-600" />,
  backend: <CheckSquare className="w-4 h-4 text-indigo-600" />,
  qa: <Bug className="w-4 h-4 text-orange-600" />
};

// Priority colors configuration
export const priorityColors = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200'
};

// Status colors configuration
export const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  todo: 'bg-blue-100 text-blue-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  in_review: 'bg-amber-100 text-amber-700',
  pending_review: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700'
};

/**
 * Compact Task Card for Sprint Planning and Backlog views
 */
export const TaskCardCompact = ({
  task,
  onEdit,
  onMoveToSprint,
  onRemoveFromSprint,
  onNavigate,
  isDragging = false,
  showCheckbox = false,
  isSelected = false,
  onSelect,
  isEditing = false,
  editForm,
  onEditFormChange,
  onSaveEdit,
  onCancelEdit,
  teamMembers = []
}) => {
  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 group cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-200 ${
        isDragging ? 'opacity-50' : ''
      }`}
      data-testid={`task-card-${task.id}`}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect?.(e.target.checked)}
          className="rounded border-gray-300"
        />
      )}
      
      <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
      
      {issueTypeIcons[task.issue_type] || issueTypeIcons[task.type] || issueTypeIcons.task}
      
      <span 
        className="flex-1 text-sm font-medium truncate cursor-pointer hover:text-violet-600"
        onClick={() => onNavigate?.(task)}
      >
        {task.name}
      </span>
      
      {isEditing ? (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <select
            value={editForm?.assigned_to || ''}
            onChange={(e) => onEditFormChange?.({ ...editForm, assigned_to: e.target.value })}
            className="w-28 h-7 text-xs border rounded px-1"
          >
            <option value="">Assign</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name?.split(' ')[0]}</option>
            ))}
          </select>
          <input
            type="number"
            value={editForm?.story_points || ''}
            onChange={(e) => onEditFormChange?.({ ...editForm, story_points: e.target.value })}
            placeholder="SP"
            className="w-14 h-7 text-xs text-center border rounded"
            min={0}
            max={100}
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onSaveEdit}>
            <CheckSquare className="w-4 h-4 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancelEdit}>
            <span className="text-gray-400">×</span>
          </Button>
        </div>
      ) : (
        <>
          {task.assigned_to_name ? (
            <Badge variant="outline" className="text-xs">
              <User className="w-3 h-3 mr-1" />
              {task.assigned_to_name.split(' ')[0]}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
              Unassigned
            </Badge>
          )}
          
          <Badge className="bg-violet-100 text-violet-700 text-xs">
            {task.story_points || '-'} pts
          </Badge>
          
          {onEdit && (
            <Button 
              size="sm" 
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
          )}
          
          {onMoveToSprint && (
            <Button 
              size="sm" 
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-violet-600"
              onClick={(e) => { e.stopPropagation(); onMoveToSprint(task.id); }}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          
          {onRemoveFromSprint && (
            <Button 
              size="sm" 
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-red-500 hover:text-red-700"
              onClick={(e) => { e.stopPropagation(); onRemoveFromSprint(task.id); }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Full Task Card for Kanban boards
 */
export const TaskCardKanban = ({
  task,
  onNavigate,
  onStatusChange,
  showPriority = true,
  showAssignee = true,
  showPoints = true,
  isDragging = false
}) => {
  const priorityClass = priorityColors[task.priority] || priorityColors.medium;
  
  return (
    <div 
      className={`p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        isDragging ? 'opacity-50 rotate-2' : ''
      }`}
      onClick={() => onNavigate?.(task)}
      data-testid={`kanban-card-${task.id}`}
    >
      <div className="flex items-start gap-2 mb-2">
        {issueTypeIcons[task.issue_type] || issueTypeIcons[task.type] || issueTypeIcons.task}
        <span className="flex-1 text-sm font-medium line-clamp-2">{task.name}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showPriority && task.priority && (
            <Badge className={`text-xs ${priorityClass}`}>
              {task.priority}
            </Badge>
          )}
          
          {showPoints && (
            <Badge variant="outline" className="text-xs">
              {task.story_points || '-'} pts
            </Badge>
          )}
        </div>
        
        {showAssignee && task.assigned_to_name && (
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
              {task.assigned_to_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      
      {task.due_date && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${
          new Date(task.due_date) < new Date() ? 'text-red-600' : 'text-gray-500'
        }`}>
          <Clock className="w-3 h-3" />
          {new Date(task.due_date).toLocaleDateString()}
          {new Date(task.due_date) < new Date() && (
            <AlertTriangle className="w-3 h-3 text-red-500" />
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCardCompact;
