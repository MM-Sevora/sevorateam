import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, FolderKanban, Calendar, Users, Flag,
  MoreVertical, Edit, Trash2, Eye, RefreshCw, ChevronDown,
  CheckCircle2, Clock, AlertTriangle, Folder, ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  low: { label: 'Low', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-500/10 text-slate-400', icon: Clock },
  active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
  on_hold: { label: 'On Hold', color: 'bg-amber-500/10 text-amber-400', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-400', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400', icon: Trash2 }
};

const ProjectCard = ({ project, onEdit, onDelete, onView }) => {
  const navigate = useNavigate();
  const StatusIcon = statusConfig[project.status]?.icon || Clock;
  
  const progressColor = project.progress >= 75 ? 'bg-emerald-500' : 
                        project.progress >= 50 ? 'bg-blue-500' : 
                        project.progress >= 25 ? 'bg-amber-500' : 'bg-slate-500';

  return (
    <Card 
      className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all cursor-pointer group"
      onClick={() => navigate(`/projects/${project.id}`)}
      data-testid={`project-card-${project.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={priorityConfig[project.priority]?.color}>
              <Flag className="w-3 h-3 mr-1" />
              {project.priority}
            </Badge>
            <Badge variant="outline" className={statusConfig[project.status]?.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[project.status]?.label}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(project); }}>
                <Eye className="w-4 h-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(project); }}
                className="text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-white text-lg mb-1">{project.name}</h3>
        
        {project.module_name && (
          <p className="text-sm text-slate-400 flex items-center gap-1 mb-3">
            <Folder className="w-3.5 h-3.5" />
            {project.module_name}
          </p>
        )}

        {project.description && (
          <p className="text-sm text-slate-400 line-clamp-2 mb-4">{project.description}</p>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-400">Progress</span>
            <span className="text-white font-medium">{project.progress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${progressColor} transition-all`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {project.completed_task_count}/{project.task_count} tasks
            </span>
            {project.team_members?.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {project.team_members.length}
              </span>
            )}
          </div>
          {project.end_date && (
            <span className="text-slate-400 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CreateProjectModal = ({ open, onClose, modules, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    module_id: '',
    description: '',
    priority: 'medium',
    start_date: '',
    end_date: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.module_id) {
      toast.error('Name and Module are required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create project');
      
      toast.success('Project created successfully');
      onSuccess();
      onClose();
      setFormData({ name: '', module_id: '', description: '', priority: 'medium', start_date: '', end_date: '' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-rose-500" />
            Create New Project
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-300">Project Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              className="bg-slate-900 border-slate-600 mt-1"
              data-testid="project-name-input"
            />
          </div>

          <div>
            <Label className="text-slate-300">Module *</Label>
            <Select
              value={formData.module_id}
              onValueChange={(value) => setFormData({ ...formData, module_id: value })}
            >
              <SelectTrigger className="bg-slate-900 border-slate-600 mt-1" data-testid="module-select">
                <SelectValue placeholder="Select a module" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {modules.map(module => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief project description"
              className="bg-slate-900 border-slate-600 mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="bg-slate-900 border-slate-600 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">End Date</Label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="bg-slate-900 border-slate-600 mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-600">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700" data-testid="create-project-submit">
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ProjectsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    module_id: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [projectsRes, modulesRes] = await Promise.all([
        fetch(`${API}/api/projects/list`, { headers }),
        fetch(`${API}/api/projects/modules`, { headers })
      ]);

      if (!projectsRes.ok || !modulesRes.ok) throw new Error('Failed to fetch data');

      const [projectsData, modulesData] = await Promise.all([
        projectsRes.json(),
        modulesRes.json()
      ]);

      setProjects(projectsData);
      setModules(modulesData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? This will also delete all tasks.`)) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Project deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && project.status !== filters.status) return false;
    if (filters.priority && project.priority !== filters.priority) return false;
    if (filters.module_id && project.module_id !== filters.module_id) return false;
    return true;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    onHold: projects.filter(p => p.status === 'on_hold').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-48"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-700 rounded-lg"></div>)}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-slate-700 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="projects-title">Projects</h1>
            <p className="text-slate-400 mt-1">Manage all your projects</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/projects/my-tasks')}
              className="border-slate-600"
            >
              My Tasks
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchData}
              className="border-slate-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="bg-rose-600 hover:bg-rose-700"
              data-testid="create-project-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-400">Total Projects</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-400">Active</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-400">Completed</p>
              <p className="text-2xl font-bold text-blue-400">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-400">On Hold</p>
              <p className="text-2xl font-bold text-amber-400">{stats.onHold}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/30 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search projects..."
                    className="bg-slate-900 border-slate-600 pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-[150px] bg-slate-900 border-slate-600">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.priority}
                onValueChange={(value) => setFilters({ ...filters, priority: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-[150px] bg-slate-900 border-slate-600">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.module_id}
                onValueChange={(value) => setFilters({ ...filters, module_id: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-[180px] bg-slate-900 border-slate-600">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => navigate(`/projects/${p.id}`)}
                onDelete={handleDelete}
                onView={(p) => navigate(`/projects/${p.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800/30 border-slate-700">
            <CardContent className="p-12 text-center">
              <FolderKanban className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No projects found</h3>
              <p className="text-slate-400 mb-4">
                {filters.search || filters.status || filters.priority || filters.module_id
                  ? 'Try adjusting your filters'
                  : 'Create your first project to get started'}
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="bg-rose-600 hover:bg-rose-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        modules={modules}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ProjectsList;
