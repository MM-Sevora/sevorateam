import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import {
    ClipboardList, Plus, Search, Filter, Clock, CheckCircle2,
    AlertCircle, User, Calendar, Tag, ExternalLink, MoreVertical,
    Loader2, Target, Bot, ArrowUpRight, Package, ChevronLeft, ChevronRight,
    ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, X
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const priorityColors = {
    urgent: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200'
};

const statusColors = {
    pending: 'bg-gray-100 text-gray-700 border-gray-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200'
};

const moduleIcons = {
    sourcing: Package,
    marketing: Target,
    hr: User,
    projects: ClipboardList,
    sales: Target
};

export default function UnifiedTasksPage() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [moduleFilter, setModuleFilter] = useState('all');
    const [assignedToFilter, setAssignedToFilter] = useState('all');
    const [createdByFilter, setCreatedByFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('month');
    
    // Sorting
    const [sorting, setSorting] = useState({ sort_by: 'created_at', sort_order: 'desc' });
    
    // Pagination
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
    
    // Filter metadata
    const [filtersMeta, setFiltersMeta] = useState({ users: [], teams: [], modules: [], priorities: [], statuses: [] });
    
    // Create task dialog
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        assigned_to: '',
        assigned_team: '',
        due_date: '',
        source_module: '',
        tags: []
    });

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page,
                page_size: pagination.pageSize,
                sort_by: sorting.sort_by,
                sort_order: sorting.sort_order,
                ...(searchQuery && { search: searchQuery }),
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(priorityFilter !== 'all' && { priority: priorityFilter }),
                ...(moduleFilter !== 'all' && { source_module: moduleFilter }),
                ...(assignedToFilter !== 'all' && { assigned_to: assignedToFilter }),
                ...(createdByFilter !== 'all' && { created_by: createdByFilter })
            });
            
            const response = await api.get(`/tasks/paginated?${params.toString()}`);
            setTasks(response.data.tasks || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.total,
                totalPages: response.data.total_pages
            }));
            if (response.data.filters_meta) {
                setFiltersMeta(response.data.filters_meta);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, sorting, searchQuery, statusFilter, priorityFilter, moduleFilter, assignedToFilter, createdByFilter]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const fetchStats = async () => {
        try {
            const response = await api.get(`/tasks/dashboard-stats?period=${periodFilter}`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [periodFilter]);

    const handleSort = (field) => {
        setSorting(prev => ({
            sort_by: field,
            sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc'
        }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const SortIcon = ({ field }) => {
        if (sorting.sort_by !== field) {
            return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        }
        return sorting.sort_order === 'asc' 
            ? <ArrowUp className="h-4 w-4 ml-1 text-[#5C4033]" />
            : <ArrowDown className="h-4 w-4 ml-1 text-[#5C4033]" />;
    };

    const handleCreateTask = async () => {
        if (!newTask.title.trim()) {
            toast.error('Task title is required');
            return;
        }

        try {
            setCreateLoading(true);
            const taskData = {
                ...newTask,
                tags: newTask.tags.length > 0 ? newTask.tags : []
            };
            await api.post('/tasks', taskData);
            toast.success('Task created successfully');
            setShowCreateDialog(false);
            setNewTask({
                title: '',
                description: '',
                priority: 'medium',
                assigned_to: '',
                assigned_team: '',
                due_date: '',
                source_module: '',
                tags: []
            });
            fetchTasks();
            fetchStats();
        } catch (error) {
            console.error('Failed to create task:', error);
            toast.error('Failed to create task');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            await api.put(`/tasks/${taskId}`, { status: newStatus });
            toast.success('Task status updated');
            fetchTasks();
            fetchStats();
        } catch (error) {
            console.error('Failed to update task:', error);
            toast.error('Failed to update task');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.delete(`/tasks/${taskId}`);
            toast.success('Task deleted');
            fetchTasks();
            fetchStats();
        } catch (error) {
            console.error('Failed to delete task:', error);
            toast.error('Failed to delete task');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const isOverdue = (task) => {
        if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
        return new Date(task.due_date) < new Date();
    };

    const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || moduleFilter !== 'all' || 
        assignedToFilter !== 'all' || createdByFilter !== 'all' || searchQuery;

    const clearAllFilters = () => {
        setStatusFilter('all');
        setPriorityFilter('all');
        setModuleFilter('all');
        setAssignedToFilter('all');
        setCreatedByFilter('all');
        setSearchQuery('');
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    return (
        <div className="min-h-screen bg-[#F5EBE0] p-6" data-testid="unified-tasks-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#5C4033]">Operational Tasks</h1>
                    <p className="text-[#8B7355]">Cross-module task tracking and follow-ups</p>
                </div>
                <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-[#8B7355] hover:bg-[#5C4033] text-white"
                    data-testid="create-task-btn"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <Card className="bg-white/80 border-[#DDD0C8]">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <ClipboardList className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-[#8B7355]">Total</p>
                                    <p className="text-xl font-bold text-[#5C4033]">{stats.total || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 border-[#DDD0C8]">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Clock className="w-5 h-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-[#8B7355]">Pending</p>
                                    <p className="text-xl font-bold text-[#5C4033]">{stats.by_status?.pending || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 border-[#DDD0C8]">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Loader2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-[#8B7355]">In Progress</p>
                                    <p className="text-xl font-bold text-[#5C4033]">{stats.by_status?.in_progress || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 border-[#DDD0C8]">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-[#8B7355]">Completed</p>
                                    <p className="text-xl font-bold text-[#5C4033]">{stats.completed || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 border-[#DDD0C8]">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-[#8B7355]">Overdue</p>
                                    <p className="text-xl font-bold text-[#5C4033]">{stats.overdue || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 border-[#DDD0C8]">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Target className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-[#8B7355]">Completion</p>
                                    <p className="text-xl font-bold text-[#5C4033]">{stats.completion_rate || 0}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card className="bg-white/80 border-[#DDD0C8] mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8B7355] w-4 h-4" />
                            <Input
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 border-[#DDD0C8] bg-white"
                                data-testid="search-tasks-input"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] border-[#DDD0C8] bg-white" data-testid="filter-status">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[140px] border-[#DDD0C8] bg-white" data-testid="filter-priority">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priority</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={moduleFilter} onValueChange={setModuleFilter}>
                            <SelectTrigger className="w-[140px] border-[#DDD0C8] bg-white" data-testid="filter-module">
                                <SelectValue placeholder="Module" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Modules</SelectItem>
                                {(filtersMeta.modules?.length > 0 ? filtersMeta.modules : ['sourcing', 'marketing', 'sales', 'hr', 'projects']).map(m => (
                                    <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                            <SelectTrigger className="w-[160px] border-[#DDD0C8] bg-white" data-testid="filter-assigned-to">
                                <SelectValue placeholder="Assigned to" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Assignees</SelectItem>
                                {filtersMeta.users?.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                            <SelectTrigger className="w-[160px] border-[#DDD0C8] bg-white" data-testid="filter-created-by">
                                <SelectValue placeholder="Created by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Creators</SelectItem>
                                {filtersMeta.users?.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchTasks} className="border-[#DDD0C8]">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-gray-500">
                                <X className="w-4 h-4 mr-1" /> Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Tasks Table */}
            <Card className="bg-white/80 border-[#DDD0C8]">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('title')}
                                >
                                    <div className="flex items-center">
                                        Title
                                        <SortIcon field="title" />
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('priority')}
                                >
                                    <div className="flex items-center">
                                        Priority
                                        <SortIcon field="priority" />
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center">
                                        Status
                                        <SortIcon field="status" />
                                    </div>
                                </TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('due_date')}
                                >
                                    <div className="flex items-center">
                                        Due Date
                                        <SortIcon field="due_date" />
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('created_at')}
                                >
                                    <div className="flex items-center">
                                        Created
                                        <SortIcon field="created_at" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B7355]" />
                                    </TableCell>
                                </TableRow>
                            ) : tasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        <ClipboardList className="w-12 h-12 text-[#DDD0C8] mx-auto mb-4" />
                                        <p className="text-[#8B7355]">No tasks found</p>
                                        <Button 
                                            variant="outline" 
                                            className="mt-4 border-[#8B7355] text-[#8B7355]"
                                            onClick={() => setShowCreateDialog(true)}
                                        >
                                            Create your first task
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tasks.map((task) => {
                                    const ModuleIcon = moduleIcons[task.source_module] || ClipboardList;
                                    return (
                                        <TableRow 
                                            key={task.id} 
                                            className={`hover:bg-[#F5EBE0]/50 ${isOverdue(task) ? 'bg-red-50/50' : ''}`}
                                            data-testid={`task-row-${task.id}`}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-[#5C4033]">{task.title}</span>
                                                    {task.is_auto_generated && (
                                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                                            <Bot className="w-3 h-3 mr-1" />
                                                            Auto
                                                        </Badge>
                                                    )}
                                                    {isOverdue(task) && (
                                                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                                                            Overdue
                                                        </Badge>
                                                    )}
                                                </div>
                                                {task.description && (
                                                    <p className="text-xs text-gray-500 truncate max-w-xs">{task.description}</p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={priorityColors[task.priority] || priorityColors.medium}>
                                                    {task.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[task.status] || statusColors.pending}>
                                                    {task.status?.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {task.source_module && (
                                                    <div className="flex items-center gap-1 text-sm text-[#8B7355]">
                                                        <ModuleIcon className="w-3 h-3" />
                                                        {task.source_module}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {task.assigned_to_name && (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <User className="w-3 h-3 text-[#8B7355]" />
                                                        {task.assigned_to_name}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {task.due_date && (
                                                    <div className={`flex items-center gap-1 text-sm ${isOverdue(task) ? 'text-red-600' : 'text-[#8B7355]'}`}>
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(task.due_date)}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-gray-600">
                                                    {formatDate(task.created_at)}
                                                </div>
                                                {task.created_by_name && (
                                                    <div className="text-xs text-gray-400">
                                                        by {task.created_by_name}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {task.status !== 'completed' && (
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'completed')}>
                                                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                                                Mark Complete
                                                            </DropdownMenuItem>
                                                        )}
                                                        {task.status === 'pending' && (
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'in_progress')}>
                                                                <Loader2 className="w-4 h-4 mr-2 text-blue-600" />
                                                                Start Progress
                                                            </DropdownMenuItem>
                                                        )}
                                                        {task.related_url && (
                                                            <DropdownMenuItem onClick={() => window.open(task.related_url, '_blank')}>
                                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                                View Source
                                                            </DropdownMenuItem>
                                                        )}
                                                        {task._permissions?.can_delete && (
                                                            <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-red-600">
                                                                <AlertCircle className="w-4 h-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                        Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} tasks
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={pagination.page === pagination.totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Task Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#5C4033]">Create New Task</DialogTitle>
                        <DialogDescription className="text-[#8B7355]">
                            Add a new task for tracking and follow-up
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[#5C4033]">Title *</Label>
                            <Input
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="Enter task title"
                                className="border-[#DDD0C8]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#5C4033]">Description</Label>
                            <Textarea
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="Enter task description"
                                className="border-[#DDD0C8]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[#5C4033]">Priority</Label>
                                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                                    <SelectTrigger className="border-[#DDD0C8]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[#5C4033]">Due Date</Label>
                                <Input
                                    type="date"
                                    value={newTask.due_date}
                                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                    className="border-[#DDD0C8]"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[#5C4033]">Assign To</Label>
                                <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}>
                                    <SelectTrigger className="border-[#DDD0C8]">
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filtersMeta.users?.map(user => (
                                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[#5C4033]">Module</Label>
                                <Select value={newTask.source_module} onValueChange={(v) => setNewTask({ ...newTask, source_module: v })}>
                                    <SelectTrigger className="border-[#DDD0C8]">
                                        <SelectValue placeholder="Select module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sourcing">Sourcing</SelectItem>
                                        <SelectItem value="marketing">Marketing</SelectItem>
                                        <SelectItem value="sales">Sales</SelectItem>
                                        <SelectItem value="hr">HR</SelectItem>
                                        <SelectItem value="projects">Projects</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#DDD0C8]">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateTask} 
                            disabled={createLoading || !newTask.title.trim()}
                            className="bg-[#8B7355] hover:bg-[#5C4033]"
                        >
                            {createLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
