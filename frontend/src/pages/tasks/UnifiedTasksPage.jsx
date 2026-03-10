import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import {
    ClipboardList, Plus, Search, Filter, Clock, CheckCircle2,
    AlertCircle, User, Calendar, Tag, ExternalLink, MoreVertical,
    Loader2, Target, Bot, ArrowUpRight, Package
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
    const [periodFilter, setPeriodFilter] = useState('month');
    
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

    useEffect(() => {
        fetchTasks();
        fetchStats();
        fetchUsers();
    }, [statusFilter, priorityFilter, moduleFilter, searchQuery]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (priorityFilter !== 'all') params.append('priority', priorityFilter);
            if (moduleFilter !== 'all') params.append('source_module', moduleFilter);
            if (searchQuery) params.append('search', searchQuery);
            
            const response = await api.get(`/tasks?${params.toString()}`);
            setTasks(response.data.tasks || []);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get(`/tasks/dashboard-stats?period=${periodFilter}`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
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

    return (
        <div className="min-h-screen bg-[#F5EBE0] p-6" data-testid="unified-tasks-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#5C4033]">Task Management</h1>
                    <p className="text-[#8B7355]">Unified task tracking across all modules</p>
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
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
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
                            <SelectTrigger className="w-[150px] border-[#DDD0C8] bg-white">
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
                            <SelectTrigger className="w-[150px] border-[#DDD0C8] bg-white">
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
                            <SelectTrigger className="w-[150px] border-[#DDD0C8] bg-white">
                                <SelectValue placeholder="Module" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Modules</SelectItem>
                                <SelectItem value="sourcing">Sourcing</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="sales">Sales</SelectItem>
                                <SelectItem value="hr">HR</SelectItem>
                                <SelectItem value="projects">Projects</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Tasks List */}
            <Card className="bg-white/80 border-[#DDD0C8]">
                <CardHeader className="border-b border-[#DDD0C8]">
                    <CardTitle className="text-[#5C4033]">Tasks</CardTitle>
                    <CardDescription className="text-[#8B7355]">
                        {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-12">
                            <ClipboardList className="w-12 h-12 text-[#DDD0C8] mx-auto mb-4" />
                            <p className="text-[#8B7355]">No tasks found</p>
                            <Button 
                                variant="outline" 
                                className="mt-4 border-[#8B7355] text-[#8B7355]"
                                onClick={() => setShowCreateDialog(true)}
                            >
                                Create your first task
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#DDD0C8]">
                            {tasks.map((task) => {
                                const ModuleIcon = moduleIcons[task.source_module] || ClipboardList;
                                return (
                                    <div 
                                        key={task.id}
                                        className={`p-4 hover:bg-[#F5EBE0]/50 transition-colors ${isOverdue(task) ? 'bg-red-50/50' : ''}`}
                                        data-testid={`task-item-${task.id}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-medium text-[#5C4033] truncate">{task.title}</h3>
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
                                                    <p className="text-sm text-[#8B7355] mb-2 line-clamp-2">{task.description}</p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge className={`${statusColors[task.status]} text-xs`}>
                                                        {task.status?.replace('_', ' ')}
                                                    </Badge>
                                                    <Badge className={`${priorityColors[task.priority]} text-xs`}>
                                                        {task.priority}
                                                    </Badge>
                                                    {task.source_module && (
                                                        <Badge variant="outline" className="text-xs border-[#DDD0C8]">
                                                            <ModuleIcon className="w-3 h-3 mr-1" />
                                                            {task.source_module}
                                                        </Badge>
                                                    )}
                                                    {task.assigned_to_name && (
                                                        <span className="text-xs text-[#8B7355] flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {task.assigned_to_name}
                                                        </span>
                                                    )}
                                                    {task.due_date && (
                                                        <span className={`text-xs flex items-center gap-1 ${isOverdue(task) ? 'text-red-600' : 'text-[#8B7355]'}`}>
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(task.due_date)}
                                                        </span>
                                                    )}
                                                    {task.tags && task.tags.length > 0 && (
                                                        <span className="text-xs text-[#8B7355] flex items-center gap-1">
                                                            <Tag className="w-3 h-3" />
                                                            {task.tags.slice(0, 2).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {task.related_url && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => navigate(task.related_url)}
                                                        className="text-[#8B7355]"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="text-[#8B7355]">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {task.status !== 'in_progress' && task.status !== 'completed' && (
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'in_progress')}>
                                                                Start Task
                                                            </DropdownMenuItem>
                                                        )}
                                                        {task.status !== 'completed' && (
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'completed')}>
                                                                Mark Complete
                                                            </DropdownMenuItem>
                                                        )}
                                                        {task.status !== 'cancelled' && (
                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'cancelled')}>
                                                                Cancel Task
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem 
                                                            onClick={() => handleDeleteTask(task.id)}
                                                            className="text-red-600"
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Task Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="bg-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-[#5C4033]">Create New Task</DialogTitle>
                        <DialogDescription className="text-[#8B7355]">
                            Create a manual task to track work across modules
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="text-[#5C4033]">Title *</Label>
                            <Input
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="Task title"
                                className="border-[#DDD0C8]"
                                data-testid="new-task-title"
                            />
                        </div>
                        <div>
                            <Label className="text-[#5C4033]">Description</Label>
                            <Textarea
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="Task description"
                                className="border-[#DDD0C8]"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-[#5C4033]">Priority</Label>
                                <Select 
                                    value={newTask.priority} 
                                    onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                                >
                                    <SelectTrigger className="border-[#DDD0C8]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
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
                            <div>
                                <Label className="text-[#5C4033]">Assign To</Label>
                                <Select 
                                    value={newTask.assigned_to} 
                                    onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}
                                >
                                    <SelectTrigger className="border-[#DDD0C8]">
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unassigned</SelectItem>
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-[#5C4033]">Module</Label>
                                <Select 
                                    value={newTask.source_module} 
                                    onValueChange={(v) => setNewTask({ ...newTask, source_module: v })}
                                >
                                    <SelectTrigger className="border-[#DDD0C8]">
                                        <SelectValue placeholder="Select module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="sourcing">Sourcing</SelectItem>
                                        <SelectItem value="marketing">Marketing</SelectItem>
                                        <SelectItem value="sales">Sales</SelectItem>
                                        <SelectItem value="hr">HR</SelectItem>
                                        <SelectItem value="projects">Projects</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label className="text-[#5C4033]">Team</Label>
                            <Select 
                                value={newTask.assigned_team} 
                                onValueChange={(v) => setNewTask({ ...newTask, assigned_team: v })}
                            >
                                <SelectTrigger className="border-[#DDD0C8]">
                                    <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="sourcing">Sourcing Team</SelectItem>
                                    <SelectItem value="marketing">Marketing Team</SelectItem>
                                    <SelectItem value="sales">Sales Team</SelectItem>
                                    <SelectItem value="hr">HR Team</SelectItem>
                                    <SelectItem value="operations">Operations Team</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowCreateDialog(false)}
                            className="border-[#DDD0C8]"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateTask}
                            disabled={createLoading}
                            className="bg-[#8B7355] hover:bg-[#5C4033] text-white"
                            data-testid="submit-create-task"
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
