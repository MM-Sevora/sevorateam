import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Users, Search, Plus, Edit, Trash2, RefreshCw, CheckCircle, XCircle, 
  UserPlus, Key, Eye, EyeOff, Briefcase, ChevronDown, ChevronRight, Shield,
  Building2, Package, Server, Settings, Save, X, Tag, UsersRound, Folder,
  Activity, TrendingUp, Flag, CalendarDays, FolderKanban, ClipboardList,
  ShoppingBag, PenTool, Bell, HelpCircle, Zap, Check, Palette, Lock,
  Layers, ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Icon mapping for modules
const ICON_MAP = {
  Activity, TrendingUp, Flag, CalendarDays, FolderKanban, ClipboardList,
  ShoppingBag, PenTool, Package, Settings, Server, Zap, Bell, HelpCircle,
  Folder, Shield, Users, Briefcase, Building2
};

const COLOR_OPTIONS = [
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

const ACCESS_TYPE_OPTIONS = [
  { value: 'everyone', label: 'Everyone', description: 'All users get access' },
  { value: 'team', label: 'Team-based', description: 'Access based on team assignment' },
  { value: 'department', label: 'Department-based', description: 'Access based on department' },
  { value: 'admin', label: 'Admin-only', description: 'Only administrators' },
];

// Data scope options for module permissions
const DATA_SCOPE_OPTIONS = [
  { value: 'all', label: 'All Data', description: 'See all records in module', icon: 'globe' },
  { value: 'team', label: 'Team/Department', description: 'See team or department records', icon: 'users' },
  { value: 'own_assigned', label: 'Own + Assigned', description: 'See own + assigned to me', icon: 'user-check' },
  { value: 'own_only', label: 'Own Only', description: 'See only records I created', icon: 'user' },
];

// Default module permission structure
const DEFAULT_MODULE_PERMISSION = {
  create: true,
  read: true,
  update: true,
  delete: false,
  data_scope: 'all',
  can_edit_others: false,
  can_delete_others: false,
};

const UsersPermissionsPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Core data
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [grades, setGrades] = useState([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkRolesDialog, setBulkRolesDialog] = useState(false);
  const [bulkRoleIds, setBulkRoleIds] = useState([]);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  
  // User panel state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [userPermForm, setUserPermForm] = useState({ 
    role_ids: [], 
    module_access: [], 
    sub_module_access: {},
    module_permissions: {}  // { module_code: { create, read, update, delete, data_scope, can_edit_others, can_delete_others } }
  });
  const [expandedModules, setExpandedModules] = useState([]);
  
  // User dialog states
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', status: 'active', notes: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  
  // Password dialog
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null });
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [customPassword, setCustomPassword] = useState('');
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  
  // Onboarding state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [selectedUserForOnboard, setSelectedUserForOnboard] = useState(null);
  const [onboardForm, setOnboardForm] = useState({
    department_id: '', grade_id: '', reports_to: '', custom_role_ids: [],
    designation: '', employment_type: 'full_time', work_mode: 'office',
    joining_date: new Date().toISOString().split('T')[0],
  });
  
  // Module edit dialog
  const [moduleDialog, setModuleDialog] = useState({ open: false, module: null });
  const [moduleForm, setModuleForm] = useState({ department: '', team: '', tags: [], is_active: true, category: 'general', is_default: false });
  const [tagInput, setTagInput] = useState('');
  
  // Category dialog
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null, mode: 'create' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: 'blue', access_type: 'department' });
  
  // Role dialog
  const [roleDialog, setRoleDialog] = useState({ open: false, role: null, mode: 'create' });
  const [roleForm, setRoleForm] = useState({
    name: '', code: '', description: '', module_access: [], module_permissions: {},
    can_manage_users: false, can_manage_employees: false, can_manage_roles: false
  });
  const [deleteRoleDialog, setDeleteRoleDialog] = useState({ open: false, role: null });

  // License states
  const [licenseStats, setLicenseStats] = useState(null);
  const [syncingLicenses, setSyncingLicenses] = useState(false);
  const [showLicensedOnly, setShowLicensedOnly] = useState(false);

  // User Permission Override Dialog
  const [permissionDialog, setPermissionDialog] = useState({ open: false, user: null });
  const [effectivePermissions, setEffectivePermissions] = useState(null);
  const [customPermissions, setCustomPermissions] = useState({});
  const [overrideMode, setOverrideMode] = useState('merge');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Fetch license stats
  const fetchLicenseStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/workos/license-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLicenseStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch license stats:', err);
    }
  }, []);

  // Sync licenses from Azure AD
  const syncLicenses = async () => {
    setSyncingLicenses(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/workos/azure-ad/sync-licenses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Synced ${data.synced_count} licenses from Azure AD`);
        await fetchLicenseStats();
        await fetchData();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to sync licenses');
      }
    } catch (err) {
      toast.error('Failed to sync licenses from Azure AD');
    } finally {
      setSyncingLicenses(false);
    }
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, modulesRes, categoriesRes, deptsRes, teamsRes, employeesRes, gradesRes] = await Promise.all([
        api.get('/admin/users'),  // Use admin/users to get role field
        api.get('/rbac/roles'),  // Use RBAC endpoint for enriched role data
        api.get('/system-modules/'),
        api.get('/module-categories/'),
        api.get('/workos/departments'),
        api.get('/system-modules/config/teams'),
        api.get('/hr/v2/employees'),
        api.get('/hr/grades'),
      ]);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
      setModules(modulesRes.data || []);
      setCategories(categoriesRes.data || []);
      setDepartments(deptsRes.data || []);
      setTeams(teamsRes.data || []);
      setEmployees(employeesRes.data || []);
      setGrades(gradesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); fetchLicenseStats(); }, [fetchData, fetchLicenseStats]);

  // Check if user is onboarded
  const isUserOnboarded = useCallback((userId) => {
    const user = users.find(u => u.id === userId);
    if (user?.is_onboarded) return true;
    if (user?.custom_role_ids?.length > 0 && user?.department_id) return true;
    return employees.some(emp => emp.user_id === userId);
  }, [users, employees]);

  // Stats
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    inactiveUsers: users.filter(u => u.status === 'inactive').length,
    onboardedUsers: users.filter(u => isUserOnboarded(u.id)).length,
    licensedUsers: licenseStats?.licensed_users || users.filter(u => u.has_azure_license).length,
    totalRoles: roles.length,
    totalModules: modules.length,
    totalCategories: categories.length,
  };

  // ================== PERMISSION OVERRIDE FUNCTIONS ==================
  const openPermissionDialog = async (user) => {
    setPermissionDialog({ open: true, user });
    setLoadingPermissions(true);
    try {
      const res = await api.get(`/workos/users/${user.id}/effective-permissions`);
      setEffectivePermissions(res.data);
      setCustomPermissions(res.data.custom_permissions || {});
      setOverrideMode(res.data.override_mode || 'merge');
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
      toast.error('Failed to load user permissions');
      setCustomPermissions({});
      setOverrideMode('merge');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const togglePermissionAction = (category, module, action) => {
    setCustomPermissions(prev => {
      const newPerms = { ...prev };
      if (!newPerms[category]) newPerms[category] = {};
      if (!newPerms[category][module]) newPerms[category][module] = [];
      
      const actions = newPerms[category][module];
      if (actions.includes(action)) {
        newPerms[category][module] = actions.filter(a => a !== action);
        // Clean up empty arrays/objects
        if (newPerms[category][module].length === 0) delete newPerms[category][module];
        if (Object.keys(newPerms[category]).length === 0) delete newPerms[category];
      } else {
        newPerms[category][module] = [...actions, action];
      }
      return newPerms;
    });
  };

  const addModulePermission = (category, module) => {
    setCustomPermissions(prev => {
      const newPerms = { ...prev };
      if (!newPerms[category]) newPerms[category] = {};
      if (!newPerms[category][module]) {
        newPerms[category][module] = ['view']; // Default to view permission
      }
      return newPerms;
    });
  };

  const removeModulePermission = (category, module) => {
    setCustomPermissions(prev => {
      const newPerms = { ...prev };
      if (newPerms[category]) {
        delete newPerms[category][module];
        if (Object.keys(newPerms[category]).length === 0) delete newPerms[category];
      }
      return newPerms;
    });
  };

  const saveCustomPermissions = async () => {
    if (!permissionDialog.user) return;
    setSavingPermissions(true);
    try {
      await api.put(`/workos/users/${permissionDialog.user.id}/permissions`, {
        custom_permissions: customPermissions,
        override_mode: overrideMode
      });
      toast.success('User permissions updated successfully');
      setPermissionDialog({ open: false, user: null });
      fetchData(); // Refresh user list
    } catch (err) {
      console.error('Failed to save permissions:', err);
      toast.error(err.response?.data?.detail || 'Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const clearCustomPermissions = async () => {
    if (!permissionDialog.user) return;
    if (!window.confirm('Clear all custom permissions for this user? They will only have permissions from their assigned role.')) return;
    
    setSavingPermissions(true);
    try {
      await api.delete(`/workos/users/${permissionDialog.user.id}/permissions`);
      toast.success('Custom permissions cleared');
      setCustomPermissions({});
      setPermissionDialog({ open: false, user: null });
      fetchData();
    } catch (err) {
      toast.error('Failed to clear permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  // Data scope options for permissions
  const dataScopeOptions = [
    { value: 'own', label: 'Own Data Only', description: 'User can only access their own data' },
    { value: 'department', label: 'Department', description: 'User can access their department\'s data' },
    { value: 'all', label: 'All Data', description: 'User can access all organization data' },
  ];

  // Default actions available for all modules
  const defaultActions = ['view', 'create', 'edit', 'delete'];
  
  // Module-specific actions (additional actions for certain modules)
  const moduleSpecificActions = {
    hr: ['approve', 'export'],
    expense: ['approve', 'reimburse'],
    project_management: ['assign', 'archive'],
    sales: ['convert', 'export'],
    marketing_ops: ['publish', 'schedule'],
    admin: ['configure'],
  };

  // Get actions for a module
  const getModuleActions = (moduleCode) => {
    const specificActions = moduleSpecificActions[moduleCode] || [];
    return [...defaultActions, ...specificActions];
  };

  // Toggle data scope for a module
  const setModuleDataScope = (moduleCode, scope) => {
    setCustomPermissions(prev => {
      const newPerms = JSON.parse(JSON.stringify(prev)); // Deep clone
      if (!newPerms[moduleCode]) {
        newPerms[moduleCode] = { actions: ['view'], data_scope: scope };
      } else {
        newPerms[moduleCode] = { ...newPerms[moduleCode], data_scope: scope };
      }
      return newPerms;
    });
  };

  // Toggle permission action for a module (new format with data_scope)
  const toggleModuleAction = (moduleCode, action) => {
    setCustomPermissions(prev => {
      const newPerms = JSON.parse(JSON.stringify(prev)); // Deep clone to ensure immutability
      if (!newPerms[moduleCode]) {
        newPerms[moduleCode] = { actions: [action], data_scope: 'own' };
      } else {
        const currentActions = newPerms[moduleCode].actions || [];
        if (currentActions.includes(action)) {
          // Remove action
          newPerms[moduleCode] = {
            ...newPerms[moduleCode],
            actions: currentActions.filter(a => a !== action)
          };
          // If no actions left, remove the module
          if (newPerms[moduleCode].actions.length === 0) {
            delete newPerms[moduleCode];
          }
        } else {
          // Add action
          newPerms[moduleCode] = {
            ...newPerms[moduleCode],
            actions: [...currentActions, action]
          };
        }
      }
      return newPerms;
    });
  };

  // Enable/disable entire module
  const toggleModuleAccess = (moduleCode, enabled) => {
    setCustomPermissions(prev => {
      const newPerms = { ...prev };
      if (enabled) {
        newPerms[moduleCode] = { actions: ['view'], data_scope: 'own' };
      } else {
        delete newPerms[moduleCode];
      }
      return newPerms;
    });
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesLicense = !showLicensedOnly || user.has_azure_license;
    return matchesSearch && matchesStatus && matchesLicense;
  });

  // Get role names for display
  const getUserRoleNames = (user) => {
    // Bail early if roles haven't loaded yet
    if (!roles || roles.length === 0) {
      return [];
    }
    
    const roleIds = user.custom_role_ids || [];
    const userRoleIds = user.role_ids || [];
    const legacyRole = user.role || '';
    
    // Match by custom_role_ids and role_ids (may be old IDs)
    let matchedRoles = roles.filter(r => roleIds.includes(r.id) || userRoleIds.includes(r.id));
    
    // If no matches by ID, try matching by legacy role field (e.g., "viewer" -> "Viewer")
    if (matchedRoles.length === 0 && legacyRole) {
      matchedRoles = roles.filter(r => 
        r.code === legacyRole || 
        r.name?.toLowerCase().replace(/ /g, '_') === legacyRole ||
        r.name?.toLowerCase() === legacyRole
      );
    }
    
    return matchedRoles.map(r => r.name);
  };

  // ================== USER CRUD ==================
  const openCreateUserDialog = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', password: '', status: 'active', notes: '' });
    setShowPassword(false);
    setShowUserDialog(true);
  };

  const openEditUserDialog = (user) => {
    setEditingUser(user);
    setUserForm({ name: user.name || '', email: user.email || '', password: '', status: user.status || 'active', notes: user.notes || '' });
    setShowUserDialog(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.email) {
      toast.error('Name and Email are required');
      return;
    }
    if (!editingUser && !userForm.password) {
      toast.error('Password is required for new users');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: userForm.name, email: userForm.email, status: userForm.status, notes: userForm.notes };
      if (userForm.password) payload.password = userForm.password;
      
      if (editingUser) {
        await api.put(`/workos/users/${editingUser.id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/workos/users', payload);
        toast.success('User created');
      }
      setShowUserDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    try {
      await api.delete(`/workos/users/${deleteDialog.user.id}`);
      toast.success('User deleted');
      setDeleteDialog({ open: false, user: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/workos/users/${user.id}`, { status: newStatus });
      const emp = employees.find(e => e.user_id === user.id);
      if (emp) {
        await api.put(`/hr/v2/employees/${emp.id}`, { status: newStatus });
      }
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  // ================== PASSWORD MANAGEMENT ==================
  const openPasswordDialog = async (user) => {
    setPasswordDialog({ open: true, user });
    setGeneratedPassword(null);
    setCustomPassword('');
    setShowGeneratedPassword(false);
    try {
      const res = await api.get(`/workos/users/${user.id}/temp-password`);
      if (res.data.has_temp_password) setGeneratedPassword(res.data.password);
    } catch (error) { /* No temp password */ }
  };

  const generatePassword = async () => {
    if (!passwordDialog.user) return;
    setGeneratingPassword(true);
    try {
      const res = await api.post(`/workos/users/${passwordDialog.user.id}/generate-password`);
      setGeneratedPassword(res.data.password);
      setShowGeneratedPassword(true);
      toast.success('Password generated!');
    } catch (error) {
      toast.error('Failed to generate password');
    } finally {
      setGeneratingPassword(false);
    }
  };

  const setCustomPasswordForUser = async () => {
    if (!passwordDialog.user || !customPassword || customPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setGeneratingPassword(true);
    try {
      await api.post(`/workos/users/${passwordDialog.user.id}/set-password`, { password: customPassword, must_change: true });
      setGeneratedPassword(customPassword);
      setShowGeneratedPassword(true);
      setCustomPassword('');
      toast.success('Password set!');
    } catch (error) {
      toast.error('Failed to set password');
    } finally {
      setGeneratingPassword(false);
    }
  };

  // ================== ONBOARDING ==================
  const openOnboardModal = (user) => {
    setSelectedUserForOnboard(user);
    setOnboardForm({
      department_id: '', grade_id: '', reports_to: '', custom_role_ids: [],
      designation: '', employment_type: 'full_time', work_mode: 'office',
      joining_date: new Date().toISOString().split('T')[0],
    });
    setShowOnboardModal(true);
  };

  const handleOnboard = async () => {
    if (!selectedUserForOnboard || !onboardForm.department_id || onboardForm.custom_role_ids.length === 0) {
      toast.error('Department and at least one role are required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/access/onboard/${selectedUserForOnboard.id}`, {
        ...onboardForm,
        grade_id: onboardForm.grade_id || null,
        reports_to: onboardForm.reports_to || null,
      });
      toast.success('Employee onboarded!');
      setShowOnboardModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to onboard');
    } finally {
      setSaving(false);
    }
  };

  // ================== USER PERMISSIONS PANEL ==================
  const openUserPanel = async (user) => {
    setSelectedUser(user);
    setExpandedModules([]);
    
    // Match user's roles - check custom_role_ids, role_ids, AND legacy role field
    let matchedRoleIds = [];
    const existingRoleIds = [...(user.custom_role_ids || []), ...(user.role_ids || [])];
    
    // Add any existing role IDs that match current roles
    existingRoleIds.forEach(rid => {
      if (roles.some(r => r.id === rid) && !matchedRoleIds.includes(rid)) {
        matchedRoleIds.push(rid);
      }
    });
    
    // Also match by legacy role field (e.g., "super_admin" -> Super Admin role)
    const legacyRole = user.role || '';
    if (legacyRole && matchedRoleIds.length === 0) {
      const matchedRole = roles.find(r => 
        r.code === legacyRole || 
        r.name?.toLowerCase().replace(/ /g, '_') === legacyRole
      );
      if (matchedRole && !matchedRoleIds.includes(matchedRole.id)) {
        matchedRoleIds.push(matchedRole.id);
      }
    }
    
    try {
      const res = await api.get(`/system-modules/user/${user.id}/access`);
      const userModules = res.data?.modules || [];
      setUserPermForm({
        role_ids: matchedRoleIds,
        module_access: userModules.filter(m => m.has_access).map(m => m.code),
        sub_module_access: user.sub_module_access || {},
        module_permissions: user.module_permissions || {},
      });
    } catch (error) {
      setUserPermForm({
        role_ids: matchedRoleIds,
        module_access: user.merged_module_access || [],
        sub_module_access: user.sub_module_access || {},
        module_permissions: user.module_permissions || {},
      });
    }
    setUserPanelOpen(true);
  };

  const togglePermRole = (roleId) => {
    setUserPermForm(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId]
    }));
  };

  const togglePermModule = (moduleCode) => {
    setUserPermForm(prev => {
      const hasAccess = prev.module_access.includes(moduleCode);
      if (hasAccess) {
        const newSubModules = { ...prev.sub_module_access };
        delete newSubModules[moduleCode];
        const newModulePerms = { ...prev.module_permissions };
        delete newModulePerms[moduleCode];
        return { 
          ...prev, 
          module_access: prev.module_access.filter(m => m !== moduleCode), 
          sub_module_access: newSubModules,
          module_permissions: newModulePerms
        };
      } else {
        const mod = modules.find(m => m.code === moduleCode);
        const allSubModules = mod?.sub_modules?.map(s => s.code) || [];
        return {
          ...prev,
          module_access: [...prev.module_access, moduleCode],
          sub_module_access: { ...prev.sub_module_access, [moduleCode]: allSubModules },
          module_permissions: { 
            ...prev.module_permissions, 
            [moduleCode]: { ...DEFAULT_MODULE_PERMISSION }
          }
        };
      }
    });
  };

  const togglePermSubModule = (moduleCode, subModuleCode) => {
    setUserPermForm(prev => {
      const currentSubs = prev.sub_module_access[moduleCode] || [];
      const hasSub = currentSubs.includes(subModuleCode);
      return {
        ...prev,
        sub_module_access: {
          ...prev.sub_module_access,
          [moduleCode]: hasSub ? currentSubs.filter(s => s !== subModuleCode) : [...currentSubs, subModuleCode]
        }
      };
    });
  };

  // Update module permission field
  const updateModulePermission = (moduleCode, field, value) => {
    setUserPermForm(prev => ({
      ...prev,
      module_permissions: {
        ...prev.module_permissions,
        [moduleCode]: {
          ...(prev.module_permissions[moduleCode] || DEFAULT_MODULE_PERMISSION),
          [field]: value
        }
      }
    }));
  };

  // Get module permission with defaults
  const getModulePermission = (moduleCode) => {
    return userPermForm.module_permissions[moduleCode] || DEFAULT_MODULE_PERMISSION;
  };

  const saveUserPermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.put(`/access/users/${selectedUser.id}/roles`, { custom_role_ids: userPermForm.role_ids });
      await api.put(`/system-modules/user/${selectedUser.id}/access`, {
        granted_modules: userPermForm.module_access,
        denied_modules: [],
        sub_module_access: userPermForm.sub_module_access,
        module_permissions: userPermForm.module_permissions
      });
      toast.success('Permissions saved');
      setUserPanelOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // ================== MODULE MANAGEMENT ==================
  const openModuleDialog = (module) => {
    setModuleForm({
      department: module.department || '',
      team: module.team || '',
      tags: module.tags || [],
      is_active: module.is_active !== false,
      category: module.category || 'general',
      is_default: module.is_default || false
    });
    setTagInput('');
    setModuleDialog({ open: true, module });
  };

  const addTag = () => {
    if (tagInput.trim() && !moduleForm.tags.includes(tagInput.trim())) {
      setModuleForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const saveModuleMetadata = async () => {
    if (!moduleDialog.module) return;
    setSaving(true);
    try {
      await api.put(`/system-modules/${moduleDialog.module.code}/metadata`, {
        department: moduleForm.department || null,
        team: moduleForm.team || null,
        tags: moduleForm.tags,
        is_active: moduleForm.is_active,
        category: moduleForm.category,
        is_default: moduleForm.is_default
      });
      toast.success('Module updated');
      setModuleDialog({ open: false, module: null });
      fetchData();
    } catch (error) {
      toast.error('Failed to update module');
    } finally {
      setSaving(false);
    }
  };

  // ================== CATEGORY MANAGEMENT ==================
  const openCreateCategoryDialog = () => {
    setCategoryForm({ name: '', description: '', color: 'blue', access_type: 'department' });
    setCategoryDialog({ open: true, category: null, mode: 'create' });
  };

  const openEditCategoryDialog = (category) => {
    setCategoryForm({ name: category.name, description: category.description || '', color: category.color, access_type: category.access_type });
    setCategoryDialog({ open: true, category, mode: 'edit' });
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);
    try {
      if (categoryDialog.mode === 'create') {
        await api.post('/module-categories/', categoryForm);
        toast.success('Category created');
      } else {
        await api.put(`/module-categories/${categoryDialog.category.id}`, categoryForm);
        toast.success('Category updated');
      }
      setCategoryDialog({ open: false, category: null, mode: 'create' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category) => {
    if (category.is_system) {
      toast.error('System categories cannot be deleted');
      return;
    }
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      await api.delete(`/module-categories/${category.id}`);
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  // ================== ROLE MANAGEMENT ==================
  const openCreateRoleDialog = () => {
    setRoleForm({
      name: '', code: '', description: '', module_access: [], module_permissions: {},
      can_manage_users: false, can_manage_employees: false, can_manage_roles: false
    });
    setRoleDialog({ open: true, role: null, mode: 'create' });
  };

  const openEditRoleDialog = (role) => {
    setRoleForm({
      name: role.name, code: role.code, description: role.description || '',
      module_access: role.module_access || [], module_permissions: role.module_permissions || {},
      can_manage_users: role.can_manage_users || false,
      can_manage_employees: role.can_manage_employees || false,
      can_manage_roles: role.can_manage_roles || false
    });
    setRoleDialog({ open: true, role, mode: 'edit' });
  };

  const toggleRoleModule = (moduleCode) => {
    setRoleForm(prev => {
      const isSelected = prev.module_access.includes(moduleCode);
      if (isSelected) {
        const newPerms = { ...prev.module_permissions };
        delete newPerms[moduleCode];
        return { ...prev, module_access: prev.module_access.filter(m => m !== moduleCode), module_permissions: newPerms };
      } else {
        return {
          ...prev,
          module_access: [...prev.module_access, moduleCode],
          module_permissions: { 
            ...prev.module_permissions, 
            [moduleCode]: { 
              create: true, 
              read: true, 
              update: true, 
              delete: false,
              data_scope: 'all',
              can_edit_others: false,
              can_delete_others: false
            } 
          }
        };
      }
    });
  };

  const toggleRolePermission = (moduleCode, perm) => {
    setRoleForm(prev => ({
      ...prev,
      module_permissions: {
        ...prev.module_permissions,
        [moduleCode]: { ...(prev.module_permissions[moduleCode] || {}), [perm]: !(prev.module_permissions[moduleCode]?.[perm]) }
      }
    }));
  };

  const updateRoleModulePermission = (moduleCode, field, value) => {
    setRoleForm(prev => ({
      ...prev,
      module_permissions: {
        ...prev.module_permissions,
        [moduleCode]: { ...(prev.module_permissions[moduleCode] || DEFAULT_MODULE_PERMISSION), [field]: value }
      }
    }));
  };

  // Track which modules are expanded in role dialog
  const [expandedRoleModules, setExpandedRoleModules] = useState([]);

  const toggleRoleModuleExpand = (moduleCode) => {
    setExpandedRoleModules(prev => 
      prev.includes(moduleCode) 
        ? prev.filter(c => c !== moduleCode) 
        : [...prev, moduleCode]
    );
  };

  const saveRole = async () => {
    if (!roleForm.name.trim() || !roleForm.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    setSaving(true);
    try {
      if (roleDialog.mode === 'create') {
        await api.post('/rbac/roles', roleForm);
        toast.success('Role created');
      } else {
        await api.put(`/rbac/roles/${roleDialog.role.id}`, roleForm);
        toast.success('Role updated');
      }
      setRoleDialog({ open: false, role: null, mode: 'create' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!deleteRoleDialog.role) return;
    try {
      await api.delete(`/rbac/roles/${deleteRoleDialog.role.id}`);
      toast.success('Role deleted');
      setDeleteRoleDialog({ open: false, role: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete role');
    }
  };

  // ================== BULK ACTIONS ==================
  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const clearSelection = () => setSelectedUserIds([]);

  const handleBulkActivate = async () => {
    if (selectedUserIds.length === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all(selectedUserIds.map(id => api.put(`/workos/users/${id}`, { status: 'active' })));
      toast.success(`${selectedUserIds.length} users activated`);
      clearSelection();
      fetchData();
    } catch (error) {
      toast.error('Failed to activate some users');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedUserIds.length === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all(selectedUserIds.map(id => api.put(`/workos/users/${id}`, { status: 'inactive' })));
      toast.success(`${selectedUserIds.length} users deactivated`);
      clearSelection();
      fetchData();
    } catch (error) {
      toast.error('Failed to deactivate some users');
    } finally {
      setBulkProcessing(false);
    }
  };

  const openBulkRolesDialog = () => {
    setBulkRoleIds([]);
    setBulkRolesDialog(true);
  };

  const handleBulkAssignRoles = async () => {
    if (selectedUserIds.length === 0 || bulkRoleIds.length === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all(selectedUserIds.map(id => 
        api.put(`/access/users/${id}/roles`, { custom_role_ids: bulkRoleIds })
      ));
      toast.success(`Roles assigned to ${selectedUserIds.length} users`);
      setBulkRolesDialog(false);
      clearSelection();
      fetchData();
    } catch (error) {
      toast.error('Failed to assign roles to some users');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all(selectedUserIds.map(id => api.delete(`/workos/users/${id}`)));
      toast.success(`${selectedUserIds.length} users deleted`);
      setBulkDeleteDialog(false);
      clearSelection();
      fetchData();
    } catch (error) {
      toast.error('Failed to delete some users');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Helper functions
  const getIcon = (iconName) => {
    const IconComponent = ICON_MAP[iconName] || Server;
    return <IconComponent className="h-4 w-4" />;
  };

  const groupedModules = {};
  modules.forEach(mod => {
    const cat = mod.category || 'general';
    if (!groupedModules[cat]) groupedModules[cat] = [];
    groupedModules[cat].push(mod);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <RefreshCw className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="users-permissions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#8B7355] uppercase tracking-wider">Administration</p>
          <h1 className="text-3xl font-bold text-[#4A3728] flex items-center gap-2">
            <Shield className="h-8 w-8" /> Users & Permissions
          </h1>
          <p className="text-[#5D4A3A] mt-1">Manage users, roles, modules, and access control</p>
        </div>
        <Button variant="outline" onClick={fetchData} className="border-[#E8D5C4]">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{stats.totalUsers}</p>
              <p className="text-xs text-[#5D4A3A]">Total Users ({stats.activeUsers} active)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4] border-emerald-200 bg-gradient-to-r from-emerald-50/30 to-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><Key className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{stats.licensedUsers}</p>
              <p className="text-xs text-[#5D4A3A]">Licensed (Azure AD)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Shield className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{stats.totalRoles}</p>
              <p className="text-xs text-[#5D4A3A]">Roles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Package className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{stats.totalModules}</p>
              <p className="text-xs text-[#5D4A3A]">Modules</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><Folder className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{stats.totalCategories}</p>
              <p className="text-xs text-[#5D4A3A]">Categories</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5EDE5]">
          <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Package className="h-4 w-4" /> Modules
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Shield className="h-4 w-4" /> Roles
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Folder className="h-4 w-4" /> Categories
          </TabsTrigger>
        </TabsList>

        {/* ==================== USERS TAB ==================== */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7355]" />
                <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 border-[#E8D5C4]" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 border-[#E8D5C4]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50">
                <Switch 
                  checked={showLicensedOnly} 
                  onCheckedChange={setShowLicensedOnly}
                  className="data-[state=checked]:bg-emerald-600"
                />
                <span className="text-sm text-emerald-700 font-medium">Licensed Only</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={syncLicenses} 
                disabled={syncingLicenses}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                data-testid="sync-licenses-btn"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncingLicenses ? 'animate-spin' : ''}`} /> 
                Sync Azure AD
              </Button>
              <Button onClick={openCreateUserDialog} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="create-user-btn">
                <UserPlus className="h-4 w-4 mr-2" /> Create User
              </Button>
            </div>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg" data-testid="bulk-actions-toolbar">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white">{selectedUserIds.length} selected</Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="text-blue-600">
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkActivate} disabled={bulkProcessing} className="border-green-300 text-green-700 hover:bg-green-50">
                  <CheckCircle className="h-4 w-4 mr-1" /> Activate
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkDeactivate} disabled={bulkProcessing} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <XCircle className="h-4 w-4 mr-1" /> Deactivate
                </Button>
                <Button variant="outline" size="sm" onClick={openBulkRolesDialog} disabled={bulkProcessing} className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  <Shield className="h-4 w-4 mr-1" /> Assign Roles
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBulkDeleteDialog(true)} disabled={bulkProcessing} className="border-red-300 text-red-700 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}

          <Card className="border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5EDE5]">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="text-[#4A3728]">User</TableHead>
                    <TableHead className="text-[#4A3728]">Status</TableHead>
                    <TableHead className="text-[#4A3728]">HR Status</TableHead>
                    <TableHead className="text-[#4A3728]">Roles</TableHead>
                    <TableHead className="text-[#4A3728]">Created</TableHead>
                    <TableHead className="text-[#4A3728] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#5D4A3A]">No users found</TableCell></TableRow>
                  ) : (
                    filteredUsers.map(user => {
                      const roleNames = getUserRoleNames(user);
                      const onboarded = isUserOnboarded(user.id);
                      const isSelected = selectedUserIds.includes(user.id);
                      return (
                        <TableRow 
                          key={user.id} 
                          className={`hover:bg-[#F5EDE5] cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                          onClick={() => openUserPanel(user)}
                          data-testid={`user-row-${user.id}`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleUserSelection(user.id)}
                              aria-label={`Select ${user.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#E8D5C4] flex items-center justify-center">
                                <span className="text-[#4A3728] font-medium">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                              </div>
                              <div>
                                <p className="font-medium text-[#4A3728]">{user.name}</p>
                                <p className="text-sm text-[#5D4A3A]">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {user.status === 'active' ? 'Active' : 'Inactive'}
                              </Badge>
                              {user.has_azure_license && (
                                <Badge className="bg-emerald-100 text-emerald-700" title={user.azure_licenses?.join(', ') || 'Licensed'}>
                                  <Key className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {onboarded ? (
                              <Badge className="bg-green-100 text-green-800"><Briefcase className="h-3 w-3 mr-1" /> Onboarded</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {roleNames.length > 0 ? (
                                <>
                                  {roleNames.slice(0, 2).map(name => (
                                    <Badge key={name} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">{name}</Badge>
                                  ))}
                                  {roleNames.length > 2 && <Badge variant="outline" className="text-xs">+{roleNames.length - 2}</Badge>}
                                </>
                              ) : (
                                <span className="text-gray-400 text-sm">No roles</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-[#5D4A3A] text-sm">
                            {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {!onboarded && (
                                <Button variant="default" size="sm" onClick={() => openOnboardModal(user)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
                                  <Briefcase className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="outline" size="icon" onClick={() => openPermissionDialog(user)} className="border-purple-300 bg-purple-50 text-purple-600 hover:bg-purple-100" title="Manage Permissions">
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => toggleUserStatus(user)} className={user.status === 'active' ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}>
                                {user.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => openPasswordDialog(user)} className="border-amber-200 text-amber-600">
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => openEditUserDialog(user)} className="border-[#E8D5C4]">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => setDeleteDialog({ open: true, user })} className="border-red-200 text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== MODULES TAB ==================== */}
        <TabsContent value="modules" className="mt-4 space-y-4">
          {categories.map(cat => {
            const catModules = groupedModules[cat.code] || [];
            const colorOpt = COLOR_OPTIONS.find(c => c.value === cat.color) || COLOR_OPTIONS[0];
            return (
              <Card key={cat.code} className="border-[#E8D5C4]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={colorOpt.badge}>{cat.name}</Badge>
                      <span className="text-sm text-[#5D4A3A]">{cat.description}</span>
                    </div>
                    <span className="text-sm text-[#8B7355]">{catModules.length} modules</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {catModules.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No modules in this category</p>
                  ) : (
                    <div className="space-y-2">
                      {catModules.map(mod => (
                        <div key={mod.code} className="flex items-center justify-between p-3 border rounded-lg hover:bg-[#F5EDE5]">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">{getIcon(mod.icon)}</div>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {mod.name}
                                {mod.is_default && <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Default</Badge>}
                                {!mod.is_active && <Badge variant="outline" className="text-xs bg-red-50 text-red-700">Inactive</Badge>}
                              </div>
                              <p className="text-sm text-[#5D4A3A]">{mod.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {mod.department && <span className="text-xs text-purple-600 flex items-center gap-1"><Building2 className="h-3 w-3" />{mod.department}</span>}
                            {mod.team && <span className="text-xs text-blue-600 flex items-center gap-1"><UsersRound className="h-3 w-3" />{mod.team}</span>}
                            <Badge variant="outline">{mod.sub_modules?.length || 0} sub-modules</Badge>
                            <Button variant="ghost" size="sm" onClick={() => openModuleDialog(mod)}><Edit className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ==================== ROLES TAB ==================== */}
        <TabsContent value="roles" className="mt-4 space-y-4">
          {/* Quick View Header with link to full Roles Management */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-purple-600" />
              <div>
                <h3 className="font-medium text-gray-900">Roles Overview</h3>
                <p className="text-sm text-gray-500">Quick view of system roles. For full management, use the dedicated Roles page.</p>
              </div>
            </div>
            <Button onClick={() => navigate('/admin/roles')} className="bg-purple-600 hover:bg-purple-700">
              <Settings className="h-4 w-4 mr-2" /> Manage Roles
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          <Card className="border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Modules</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No roles created yet</TableCell></TableRow>
                  ) : (
                    roles.map(role => (
                      <TableRow key={role.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            {role.name}
                          </div>
                        </TableCell>
                        <TableCell><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{role.code}</code></TableCell>
                        <TableCell className="text-gray-500 max-w-xs truncate">{role.description || '-'}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{role.module_access?.length || 0}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{role.user_count || 0}</Badge></TableCell>
                        <TableCell className="text-center">
                          {role.is_active !== false ? (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-[#E8D5C4]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-sm text-gray-500">Total Roles</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#E8D5C4]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roles.reduce((sum, r) => sum + (r.user_count || 0), 0)}</p>
                  <p className="text-sm text-gray-500">Users Assigned</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#E8D5C4]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roles.filter(r => r.is_active !== false).length}</p>
                  <p className="text-sm text-gray-500">Active Roles</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== CATEGORIES TAB ==================== */}
        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateCategoryDialog} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Create Category
            </Button>
          </div>
          <Card className="border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Access Type</TableHead>
                    <TableHead className="text-center">Modules</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(cat => {
                    const colorOpt = COLOR_OPTIONS.find(c => c.value === cat.color) || COLOR_OPTIONS[0];
                    const accessOpt = ACCESS_TYPE_OPTIONS.find(a => a.value === cat.access_type);
                    return (
                      <TableRow key={cat.id}>
                        <TableCell><div className={`w-4 h-4 rounded ${colorOpt.bg}`}></div></TableCell>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-gray-500">{cat.description}</TableCell>
                        <TableCell><Badge variant="outline">{accessOpt?.label || cat.access_type}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{cat.module_count || 0}</Badge></TableCell>
                        <TableCell>
                          {cat.is_system ? <Badge className="bg-blue-100 text-blue-800">System</Badge> : <Badge className="bg-green-100 text-green-800">Custom</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditCategoryDialog(cat)}><Edit className="h-4 w-4" /></Button>
                            {!cat.is_system && (
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteCategory(cat)}><Trash2 className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== USER PERMISSIONS PANEL (Sheet) ==================== */}
      <Sheet open={userPanelOpen} onOpenChange={setUserPanelOpen}>
        <SheetContent className="w-[550px] sm:max-w-[550px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> User Permissions
            </SheetTitle>
            <SheetDescription>
              Assign roles to {selectedUser?.name}. Permissions are inherited from roles.
            </SheetDescription>
          </SheetHeader>

          {selectedUser && (
            <div className="space-y-6 mt-6">
              {/* User Info */}
              <div className="bg-[#F5EDE5] p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#E8D5C4] flex items-center justify-center">
                    <span className="text-[#4A3728] font-bold text-lg">{selectedUser.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#4A3728]">{selectedUser.name}</p>
                    <p className="text-sm text-[#5D4A3A]">{selectedUser.email}</p>
                  </div>
                  <Badge className={`ml-auto ${selectedUser.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {selectedUser.status}
                  </Badge>
                </div>
              </div>

              {/* Roles Section - Primary */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Assigned Roles ({userPermForm.role_ids.length})
                </Label>
                <p className="text-xs text-gray-500">Users inherit all permissions from their assigned roles. Click on a role to view its permissions.</p>
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                  {roles.map(role => {
                    const isSelected = userPermForm.role_ids.includes(role.id);
                    const moduleCount = role.module_access?.length || 0;
                    return (
                      <div key={role.id} className={`p-3 rounded-lg border ${isSelected ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isSelected} onCheckedChange={() => togglePermRole(role.id)} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{role.name}</p>
                            <p className="text-xs text-gray-500">{role.description || `${moduleCount} modules`}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{moduleCount} modules</Badge>
                            {(role.can_manage_users || role.can_manage_roles) && (
                              <Badge className="bg-amber-100 text-amber-800 text-xs">Admin</Badge>
                            )}
                          </div>
                        </div>
                        {isSelected && role.module_access?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-purple-100">
                            <p className="text-xs text-gray-500 mb-1">Modules: {role.module_access.slice(0, 5).join(', ')}{role.module_access.length > 5 ? ` +${role.module_access.length - 5} more` : ''}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inherited Permissions Preview */}
              {userPermForm.role_ids.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" /> Inherited Permissions
                  </Label>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700 mb-2">Merged permissions from {userPermForm.role_ids.length} role(s):</p>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const mergedModules = new Set();
                        userPermForm.role_ids.forEach(roleId => {
                          const role = roles.find(r => r.id === roleId);
                          role?.module_access?.forEach(m => mergedModules.add(m));
                        });
                        return Array.from(mergedModules).slice(0, 10).map(mod => (
                          <Badge key={mod} variant="secondary" className="text-xs">{modules.find(m => m.code === mod)?.name || mod}</Badge>
                        ));
                      })()}
                      {(() => {
                        const mergedModules = new Set();
                        userPermForm.role_ids.forEach(roleId => {
                          const role = roles.find(r => r.id === roleId);
                          role?.module_access?.forEach(m => mergedModules.add(m));
                        });
                        return mergedModules.size > 10 ? <Badge variant="outline" className="text-xs">+{mergedModules.size - 10} more</Badge> : null;
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* User-Level Overrides (Collapsible Advanced Section) */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm text-gray-600 hover:bg-gray-100">
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Advanced: User-Level Overrides
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-2">
                    <p className="text-xs text-amber-700 mb-3">
                      <strong>Override role permissions</strong> for this specific user. Use sparingly - prefer assigning appropriate roles instead.
                    </p>
                    
                    {/* Sub-module Access Overrides */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Sub-module Access (restrict sub-modules from roles)</Label>
                      <div className="border rounded-lg max-h-48 overflow-y-auto bg-white">
                        {userPermForm.module_access.length === 0 ? (
                          <p className="p-3 text-xs text-gray-500">No modules assigned via roles</p>
                        ) : (
                          userPermForm.module_access.slice(0, 5).map(modCode => {
                            const mod = modules.find(m => m.code === modCode);
                            if (!mod?.sub_modules?.length) return null;
                            return (
                              <div key={modCode} className="p-2 border-b last:border-0">
                                <p className="text-xs font-medium mb-1">{mod.name}</p>
                                <div className="flex flex-wrap gap-2">
                                  {mod.sub_modules.map(sub => {
                                    const isEnabled = (userPermForm.sub_module_access[modCode] || []).includes(sub.code);
                                    return (
                                      <label key={sub.code} className="flex items-center gap-1 text-xs cursor-pointer">
                                        <Checkbox 
                                          checked={isEnabled} 
                                          onCheckedChange={() => togglePermSubModule(modCode, sub.code)} 
                                          className="h-3 w-3"
                                        />
                                        {sub.name}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Info Box */}
              <div className="p-3 bg-gray-50 rounded-lg border text-xs space-y-1">
                <p className="font-semibold text-gray-700">How permissions work:</p>
                <p className="text-gray-600">• Assign roles to grant module access and permissions</p>
                <p className="text-gray-600">• Users inherit CRUD, data scope, and other settings from roles</p>
                <p className="text-gray-600">• Multiple roles? Permissions are merged (most permissive wins)</p>
                <p className="text-gray-600">• Edit roles in the <strong>Roles</strong> tab to configure 3D permissions</p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setUserPanelOpen(false)}>Cancel</Button>
                <Button onClick={saveUserPermissions} disabled={saving} className="bg-[#4A3728] hover:bg-[#5D4A3A]">
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Permissions
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ==================== CREATE/EDIT USER DIALOG ==================== */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
            <DialogDescription>{editingUser ? 'Update user details' : 'Create a new platform user'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Full name" className="border-[#E8D5C4]" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="email@example.com" className="border-[#E8D5C4]" disabled={!!editingUser} />
            </div>
            <div>
              <Label>Password {editingUser ? '(leave blank to keep)' : '*'}</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUser ? '********' : 'Enter password'} className="border-[#E8D5C4] pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7355]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={userForm.status} onValueChange={(v) => setUserForm({ ...userForm, status: v })}>
                <SelectTrigger className="border-[#E8D5C4]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={userForm.notes} onChange={(e) => setUserForm({ ...userForm, notes: e.target.value })} placeholder="Optional notes..." className="border-[#E8D5C4]" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={saving} className="bg-[#4A3728] hover:bg-[#5D4A3A]">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE USER DIALOG ==================== */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteDialog.user?.name}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== PASSWORD DIALOG ==================== */}
      <Dialog open={passwordDialog.open} onOpenChange={(open) => !open && setPasswordDialog({ open: false, user: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Password Management</DialogTitle>
            <DialogDescription>Manage password for {passwordDialog.user?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-[#F5EDE5] p-3 rounded-lg">
              <p className="font-medium text-[#4A3728]">{passwordDialog.user?.name}</p>
              <p className="text-sm text-[#5D4A3A]">{passwordDialog.user?.email}</p>
            </div>
            {generatedPassword && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <Label className="text-green-800 font-medium mb-2 block">Current Password</Label>
                <div className="flex items-center gap-2">
                  <Input type={showGeneratedPassword ? 'text' : 'password'} value={generatedPassword} readOnly className="font-mono bg-white" />
                  <Button variant="outline" size="icon" onClick={() => setShowGeneratedPassword(!showGeneratedPassword)}>
                    {showGeneratedPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(generatedPassword); toast.success('Copied!'); }} className="border-green-300 text-green-600">
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="border border-[#E8D5C4] p-4 rounded-lg">
              <Label className="font-medium mb-2 block">Generate Random Password</Label>
              <Button onClick={generatePassword} disabled={generatingPassword} className="w-full bg-amber-600 hover:bg-amber-700">
                {generatingPassword ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                Generate Secure Password
              </Button>
            </div>
            <div className="border border-[#E8D5C4] p-4 rounded-lg">
              <Label className="font-medium mb-2 block">Set Custom Password</Label>
              <div className="flex gap-2">
                <Input type="text" value={customPassword} onChange={(e) => setCustomPassword(e.target.value)} placeholder="Min 8 characters" className="border-[#E8D5C4]" />
                <Button onClick={setCustomPasswordForUser} disabled={generatingPassword || customPassword.length < 8} variant="outline">Set</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog({ open: false, user: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== ONBOARD MODAL ==================== */}
      <Dialog open={showOnboardModal} onOpenChange={(open) => { setShowOnboardModal(open); if (!open) setSelectedUserForOnboard(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Onboard Employee</DialogTitle>
            <DialogDescription>Set up HR records for this user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-[#F5EDE5] p-3 rounded-lg">
              <p className="font-medium text-[#4A3728]">{selectedUserForOnboard?.name}</p>
              <p className="text-sm text-[#5D4A3A]">{selectedUserForOnboard?.email}</p>
            </div>
            <div>
              <Label>Department *</Label>
              <Select value={onboardForm.department_id} onValueChange={(v) => setOnboardForm({ ...onboardForm, department_id: v })}>
                <SelectTrigger className="border-[#E8D5C4]"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access Roles *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between border-[#E8D5C4]">
                    {onboardForm.custom_role_ids.length > 0 ? `${onboardForm.custom_role_ids.length} role(s) selected` : 'Select roles...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-2">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {roles.map(role => (
                      <label key={role.id} className="flex items-center gap-2 p-2 hover:bg-[#F5EDE5] rounded cursor-pointer">
                        <Checkbox
                          checked={onboardForm.custom_role_ids.includes(role.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setOnboardForm({ ...onboardForm, custom_role_ids: [...onboardForm.custom_role_ids, role.id] });
                            else setOnboardForm({ ...onboardForm, custom_role_ids: onboardForm.custom_role_ids.filter(id => id !== role.id) });
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium">{role.name}</p>
                          <p className="text-xs text-[#5D4A3A]">{role.code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Grade</Label>
                <Select value={onboardForm.grade_id || "none"} onValueChange={(v) => setOnboardForm({ ...onboardForm, grade_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="border-[#E8D5C4]"><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grade</SelectItem>
                    {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Manager</Label>
                <Select value={onboardForm.reports_to || "none"} onValueChange={(v) => setOnboardForm({ ...onboardForm, reports_to: v === "none" ? "" : v })}>
                  <SelectTrigger className="border-[#E8D5C4]"><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Designation</Label>
              <Input value={onboardForm.designation} onChange={(e) => setOnboardForm({ ...onboardForm, designation: e.target.value })} placeholder="e.g., Senior Developer" className="border-[#E8D5C4]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employment Type</Label>
                <Select value={onboardForm.employment_type} onValueChange={(v) => setOnboardForm({ ...onboardForm, employment_type: v })}>
                  <SelectTrigger className="border-[#E8D5C4]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Work Mode</Label>
                <Select value={onboardForm.work_mode} onValueChange={(v) => setOnboardForm({ ...onboardForm, work_mode: v })}>
                  <SelectTrigger className="border-[#E8D5C4]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Joining Date</Label>
              <Input type="date" value={onboardForm.joining_date} onChange={(e) => setOnboardForm({ ...onboardForm, joining_date: e.target.value })} className="border-[#E8D5C4]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowOnboardModal(false); setSelectedUserForOnboard(null); }}>Cancel</Button>
            <Button onClick={handleOnboard} disabled={saving || !onboardForm.department_id || onboardForm.custom_role_ids.length === 0} className="bg-[#4A3728] hover:bg-[#5D4A3A]">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Briefcase className="h-4 w-4 mr-2" />}
              Complete Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODULE EDIT DIALOG ==================== */}
      <Dialog open={moduleDialog.open} onOpenChange={(open) => !open && setModuleDialog({ open: false, module: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Configure Module: {moduleDialog.module?.name}</DialogTitle>
            <DialogDescription>Set category, department, team, and tags</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Module Active</Label>
              <Switch checked={moduleForm.is_active} onCheckedChange={(checked) => setModuleForm(prev => ({ ...prev, is_active: checked }))} />
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <Label className="text-green-800">Default Module</Label>
                <p className="text-xs text-green-600">Everyone gets access automatically</p>
              </div>
              <Switch checked={moduleForm.is_default} onCheckedChange={(checked) => setModuleForm(prev => ({ ...prev, is_default: checked }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={moduleForm.category} onValueChange={(val) => setModuleForm(prev => ({ ...prev, category: val }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => {
                    const colorOpt = COLOR_OPTIONS.find(c => c.value === cat.color) || COLOR_OPTIONS[0];
                    return <SelectItem key={cat.code} value={cat.code}><span className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${colorOpt.bg}`}></span>{cat.name}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={moduleForm.department || "_none"} onValueChange={(val) => setModuleForm(prev => ({ ...prev, department: val === "_none" ? '' : val }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {departments.map(dept => <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={moduleForm.team || "_none"} onValueChange={(val) => setModuleForm(prev => ({ ...prev, team: val === "_none" ? '' : val }))}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {teams.map(team => <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input placeholder="Add a tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
              </div>
              {moduleForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {moduleForm.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setModuleForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog({ open: false, module: null })}>Cancel</Button>
            <Button onClick={saveModuleMetadata} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== CATEGORY DIALOG ==================== */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => !open && setCategoryDialog({ open: false, category: null, mode: 'create' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Folder className="h-5 w-5" /> {categoryDialog.mode === 'create' ? 'Create Category' : 'Edit Category'}</DialogTitle>
            <DialogDescription>{categoryDialog.mode === 'create' ? 'Create a new module category' : `Edit ${categoryDialog.category?.name}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Finance, HR" disabled={categoryDialog.category?.is_system} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={categoryForm.description} onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button key={color.value} type="button" className={`w-8 h-8 rounded-full ${color.bg} ${categoryForm.color === color.value ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`} onClick={() => setCategoryForm(prev => ({ ...prev, color: color.value }))} title={color.label} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Access Type</Label>
              <Select value={categoryForm.access_type} onValueChange={(val) => setCategoryForm(prev => ({ ...prev, access_type: val }))} disabled={categoryDialog.category?.is_system}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_TYPE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label} - {opt.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, category: null, mode: 'create' })}>Cancel</Button>
            <Button onClick={saveCategory} disabled={saving || !categoryForm.name.trim()}>{saving ? 'Saving...' : categoryDialog.mode === 'create' ? 'Create' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Role management moved to /admin/roles page */}

      {/* ==================== BULK ASSIGN ROLES DIALOG ==================== */}
      <Dialog open={bulkRolesDialog} onOpenChange={setBulkRolesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Bulk Assign Roles</DialogTitle>
            <DialogDescription>Assign roles to {selectedUserIds.length} selected users. This will replace their existing roles.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800"><strong>{selectedUserIds.length}</strong> users selected</p>
            </div>
            <div>
              <Label className="mb-2 block">Select Roles</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                {roles.map(role => (
                  <label key={role.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${bulkRoleIds.includes(role.id) ? 'bg-purple-50 border border-purple-200' : ''}`}>
                    <Checkbox 
                      checked={bulkRoleIds.includes(role.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setBulkRoleIds([...bulkRoleIds, role.id]);
                        else setBulkRoleIds(bulkRoleIds.filter(id => id !== role.id));
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{role.name}</p>
                      <p className="text-xs text-gray-500">{role.description || role.code}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{role.module_access?.length || 0} modules</Badge>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRolesDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkAssignRoles} disabled={bulkProcessing || bulkRoleIds.length === 0} className="bg-purple-600 hover:bg-purple-700">
              {bulkProcessing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Assign to {selectedUserIds.length} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== BULK DELETE DIALOG ==================== */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete {selectedUserIds.length} Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUserIds.length} users? This action cannot be undone and will remove all their data and access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700" disabled={bulkProcessing}>
              {bulkProcessing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete {selectedUserIds.length} Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== USER PERMISSION OVERRIDE DIALOG ==================== */}
      <Sheet open={permissionDialog.open} onOpenChange={(open) => !open && setPermissionDialog({ open: false, user: null })}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Manage Permissions
            </SheetTitle>
            <SheetDescription>
              {permissionDialog.user && (
                <span>Configure custom permissions for <strong>{permissionDialog.user.name}</strong> ({permissionDialog.user.email})</span>
              )}
            </SheetDescription>
          </SheetHeader>

          {loadingPermissions ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Override Mode Selection */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                <Label className="text-sm font-medium text-purple-900">Override Mode</Label>
                <p className="text-xs text-purple-700 mt-1 mb-3">Choose how custom permissions interact with the user's role permissions</p>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${overrideMode === 'merge' ? 'bg-white border-purple-400 shadow-sm' : 'bg-purple-50 border-purple-200'}`}>
                    <input
                      type="radio"
                      name="overrideMode"
                      value="merge"
                      checked={overrideMode === 'merge'}
                      onChange={(e) => setOverrideMode(e.target.value)}
                      className="text-purple-600"
                    />
                    <div>
                      <p className="font-medium text-sm">Merge</p>
                      <p className="text-xs text-gray-500">Add to role permissions</p>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${overrideMode === 'replace' ? 'bg-white border-purple-400 shadow-sm' : 'bg-purple-50 border-purple-200'}`}>
                    <input
                      type="radio"
                      name="overrideMode"
                      value="replace"
                      checked={overrideMode === 'replace'}
                      onChange={(e) => setOverrideMode(e.target.value)}
                      className="text-purple-600"
                    />
                    <div>
                      <p className="font-medium text-sm">Replace</p>
                      <p className="text-xs text-gray-500">Override role completely</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Role Permissions Info */}
              {effectivePermissions?.role_permissions && Object.keys(effectivePermissions.role_permissions).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <Label className="text-sm font-medium text-gray-700">Role Permissions (from assigned role)</Label>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(effectivePermissions.role_permissions).map(([cat, mods]) => (
                      <Badge key={cat} variant="outline" className="text-xs bg-gray-100">
                        {cat}: {Object.keys(mods).length} modules
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Permission Editor - All Modules with Data Scope */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Module Permissions</Label>
                  {Object.keys(customPermissions).length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCustomPermissions} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-1" /> Clear All
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {modules.map(mod => {
                    const modulePerms = customPermissions[mod.code];
                    const isEnabled = !!modulePerms;
                    const currentActions = modulePerms?.actions || [];
                    const currentScope = modulePerms?.data_scope || 'own';
                    const availableActions = getModuleActions(mod.code);
                    
                    return (
                      <div key={mod.code} className={`p-3 rounded-lg border transition-all ${isEnabled ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => toggleModuleAccess(mod.code, checked)}
                              className="data-[state=checked]:bg-purple-600"
                            />
                            <div>
                              <span className="text-sm font-medium">{mod.name}</span>
                              {mod.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{mod.description?.substring(0, 50)}...</p>
                              )}
                            </div>
                          </div>
                          {isEnabled && (
                            <Badge className={`text-xs ${currentScope === 'all' ? 'bg-green-100 text-green-700' : currentScope === 'department' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {currentScope === 'all' ? 'All Data' : currentScope === 'department' ? 'Dept' : 'Own'}
                            </Badge>
                          )}
                        </div>
                        
                        {isEnabled && (
                          <div className="mt-3 ml-12 space-y-3">
                            {/* Data Scope Selection */}
                            <div>
                              <Label className="text-xs text-gray-600 mb-1.5 block">Data Scope</Label>
                              <div className="flex gap-2">
                                {dataScopeOptions.map(scope => (
                                  <button
                                    key={scope.value}
                                    onClick={() => setModuleDataScope(mod.code, scope.value)}
                                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                      currentScope === scope.value
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-400'
                                    }`}
                                    title={scope.description}
                                  >
                                    {scope.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div>
                              <Label className="text-xs text-gray-600 mb-1.5 block">Actions</Label>
                              <div className="flex flex-wrap gap-1.5">
                                {availableActions.map(action => (
                                  <button
                                    key={action}
                                    onClick={() => toggleModuleAction(mod.code, action)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                                      currentActions.includes(action)
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-400'
                                    }`}
                                  >
                                    {currentActions.includes(action) && <Check className="h-3 w-3" />}
                                    {action}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Custom Permissions Summary */}
              {Object.keys(customPermissions).length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <Label className="text-sm font-medium text-green-800">Custom Permissions Summary ({Object.keys(customPermissions).length} modules)</Label>
                  <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
                    {Object.entries(customPermissions).map(([moduleCode, perms]) => {
                      const mod = modules.find(m => m.code === moduleCode);
                      return (
                        <div key={moduleCode} className="text-xs text-green-700 flex items-center gap-2">
                          <span className="font-medium">{mod?.name || moduleCode}:</span>
                          <span className="text-green-600">[{perms.data_scope || 'own'}]</span>
                          <span>{(perms.actions || []).join(', ')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setPermissionDialog({ open: false, user: null })} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={saveCustomPermissions} disabled={savingPermissions} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  {savingPermissions ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Permissions
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default UsersPermissionsPage;
