/**
 * Shared configuration and constants for Task components
 */
import { CheckSquare, BookOpen, Bug, Layers, Zap, Search } from 'lucide-react';

export const API = process.env.REACT_APP_BACKEND_URL;

export const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Low', color: 'bg-stone-100 text-stone-600 border-stone-200' }
};

export const statusConfig = {
  draft: { label: 'Draft', color: 'bg-stone-400' },
  assigned: { label: 'Assigned', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500' },
  pending_review: { label: 'Review', color: 'bg-amber-500' },
  completed: { label: 'Completed', color: 'bg-emerald-500' },
  approved: { label: 'Approved', color: 'bg-green-500' },
  on_hold: { label: 'On Hold', color: 'bg-stone-400' }
};

export const issueTypeConfig = {
  task: { label: 'Task', icon: CheckSquare, color: 'text-blue-600 bg-blue-50' },
  story: { label: 'Story', icon: BookOpen, color: 'text-green-600 bg-green-50' },
  bug: { label: 'Bug', icon: Bug, color: 'text-red-600 bg-red-50' },
  epic: { label: 'Epic', icon: Layers, color: 'text-purple-600 bg-purple-50' },
  subtask: { label: 'Sub-task', icon: CheckSquare, color: 'text-gray-500 bg-gray-50' },
  improvement: { label: 'Improvement', icon: Zap, color: 'text-amber-600 bg-amber-50' },
  spike: { label: 'Spike', icon: Search, color: 'text-indigo-600 bg-indigo-50' }
};

export const bugSeverityConfig = {
  critical: { label: 'Critical', color: 'bg-red-600 text-white' },
  major: { label: 'Major', color: 'bg-orange-500 text-white' },
  minor: { label: 'Minor', color: 'bg-yellow-500 text-white' },
  trivial: { label: 'Trivial', color: 'bg-gray-400 text-white' }
};
