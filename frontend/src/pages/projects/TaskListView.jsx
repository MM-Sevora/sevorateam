import React, { useState, useMemo } from 'react';
import { 
  Flag, Calendar, User, CheckCircle2, Clock, ArrowUpDown, 
  ArrowUp, ArrowDown, MoreVertical, Edit, Trash2
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
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

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200', dotColor: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  low: { label: 'Low', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-stone-100 text-stone-700' },
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  pending_review: { label: 'Review', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' }
};

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

const TaskListView = ({ 
  tasks, 
  onTaskClick, 
  onEditTask, 
  onDeleteTask,
  selectedTasks = [],
  onSelectTask,
  selectionMode,
  users = []
}) => {
  const [sortField, setSortField] = useState('due_date');
  const [sortDirection, setSortDirection] = useState('asc');

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle null values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      
      // Handle dates
      if (sortField === 'due_date' || sortField === 'created_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      // Handle priority
      if (sortField === 'priority') {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        aVal = order[aVal] ?? 4;
        bVal = order[bVal] ?? 4;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortField, sortDirection]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortHeader = ({ field, label, className = '' }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-xs font-semibold text-[#6B5D52] hover:text-[#4A3728] transition-colors ${className}`}
    >
      {label}
      {sortField === field ? (
        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (task) => {
    return task.due_date && new Date(task.due_date) < new Date() && 
      !['completed', 'approved'].includes(task.status);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E8D5C4]">
            <th className="text-left p-3 w-10">
              <Checkbox 
                checked={selectedTasks.length === tasks.length && tasks.length > 0}
                onCheckedChange={() => {
                  if (selectedTasks.length === tasks.length) {
                    tasks.forEach(t => onSelectTask?.(t.id));
                  } else {
                    tasks.filter(t => !selectedTasks.includes(t.id)).forEach(t => onSelectTask?.(t.id));
                  }
                }}
                className="border-[#D4BBA6]"
              />
            </th>
            <th className="text-left p-3 min-w-[250px]">
              <SortHeader field="name" label="Task Name" />
            </th>
            <th className="text-left p-3 w-[120px]">
              <SortHeader field="status" label="Status" />
            </th>
            <th className="text-left p-3 w-[100px]">
              <SortHeader field="priority" label="Priority" />
            </th>
            <th className="text-left p-3 w-[150px]">
              <SortHeader field="assigned_to_name" label="Assignee" />
            </th>
            <th className="text-left p-3 w-[100px]">
              <SortHeader field="due_date" label="Due Date" />
            </th>
            <th className="text-left p-3 w-[150px]">Labels</th>
            <th className="text-left p-3 w-[60px]"></th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-12 text-[#9C8C74]">
                No tasks found
              </td>
            </tr>
          ) : (
            sortedTasks.map((task, index) => (
              <tr 
                key={task.id}
                className={`border-b border-[#E8D5C4]/50 hover:bg-[#FDF8F3] transition-colors cursor-pointer ${
                  selectedTasks.includes(task.id) ? 'bg-rose-50/50' : ''
                }`}
                onClick={(e) => {
                  if (e.target.closest('[data-no-click]')) return;
                  onTaskClick?.(task);
                }}
              >
                <td className="p-3" data-no-click>
                  <Checkbox 
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={() => onSelectTask?.(task.id)}
                    className="border-[#D4BBA6]"
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm text-[#4A3728] ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                      {task.name}
                    </span>
                    {task.subtask_count > 0 && (
                      <span className="text-xs text-[#9C8C74]">
                        ({task.subtask_completed || 0}/{task.subtask_count})
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3" data-no-click>
                  <Badge className={`${statusConfig[task.status]?.color} text-xs`}>
                    {statusConfig[task.status]?.label}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${priorityConfig[task.priority]?.dotColor}`} />
                    <span className="text-xs text-[#6B5D52] capitalize">{task.priority}</span>
                  </div>
                </td>
                <td className="p-3">
                  {task.assigned_to_name ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#E8D5C4] flex items-center justify-center text-xs font-medium text-[#4A3728]">
                        {task.assigned_to_name.charAt(0)}
                      </div>
                      <span className="text-sm text-[#4A3728] truncate max-w-[100px]">{task.assigned_to_name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#9C8C74]">Unassigned</span>
                  )}
                </td>
                <td className="p-3">
                  <span className={`text-sm ${isOverdue(task) ? 'text-red-600 font-medium' : 'text-[#6B5D52]'}`}>
                    {formatDate(task.due_date)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {task.labels?.slice(0, 2).map(label => (
                      <span 
                        key={label.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${labelColors[label.color] || labelColors.gray}`}
                      >
                        {label.name}
                      </span>
                    ))}
                    {task.labels?.length > 2 && (
                      <span className="text-[10px] text-[#9C8C74]">+{task.labels.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="p-3" data-no-click>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#E8D5C4]">
                        <MoreVertical className="w-4 h-4 text-[#6B5D52]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
                      <DropdownMenuItem onClick={() => onEditTask?.(task)} className="text-[#4A3728]">
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDeleteTask?.(task)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TaskListView;
