/**
 * Shared configuration for Users & Permissions components
 */
import {
  Activity, TrendingUp, Flag, CalendarDays, FolderKanban, ClipboardList,
  ShoppingBag, PenTool, Package, Settings, Server, Zap, Bell, HelpCircle,
  Folder, Shield, Users, Briefcase, Building2
} from 'lucide-react';

export const ICON_MAP = {
  Activity, TrendingUp, Flag, CalendarDays, FolderKanban, ClipboardList,
  ShoppingBag, PenTool, Package, Settings, Server, Zap, Bell, HelpCircle,
  Folder, Shield, Users, Briefcase, Building2
};

export const COLOR_OPTIONS = [
  { value: 'green', label: 'Green', bg: 'bg-green-500', badge: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'red', label: 'Red', bg: 'bg-red-500', badge: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-500', badge: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'cyan', label: 'Cyan', bg: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-500', badge: 'bg-teal-100 text-teal-800 border-teal-300' },
];

export const ACCESS_TYPE_OPTIONS = [
  { value: 'everyone', label: 'Everyone', description: 'All users get access' },
  { value: 'team', label: 'Team-based', description: 'Access based on team assignment' },
  { value: 'department', label: 'Department-based', description: 'Access based on department' },
  { value: 'admin', label: 'Admin-only', description: 'Only administrators' },
];

export const DATA_SCOPE_OPTIONS = [
  { value: 'all', label: 'All Data', description: 'See all records in module', icon: 'globe' },
  { value: 'team', label: 'Team/Department', description: 'See team or department records', icon: 'users' },
  { value: 'own_assigned', label: 'Own + Assigned', description: 'See own + assigned to me', icon: 'user-check' },
  { value: 'own_only', label: 'Own Only', description: 'See only records I created', icon: 'user' },
];

export const DEFAULT_MODULE_PERMISSION = {
  create: true,
  read: true,
  update: true,
  delete: false,
  data_scope: 'all',
  can_edit_others: false,
  can_delete_others: false,
};

export const getIcon = (iconName) => {
  const IconComponent = ICON_MAP[iconName] || Server;
  return IconComponent;
};
