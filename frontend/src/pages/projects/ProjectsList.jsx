import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, FolderKanban, Calendar, Users, Flag,
  MoreVertical, Edit, Trash2, Eye, RefreshCw, ChevronDown,
  CheckCircle2, Clock, AlertTriangle, Folder, ArrowRight, ListTodo
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
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Low', color: 'bg-stone-100 text-stone-600 border-stone-200' }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-stone-100 text-stone-600', icon: Clock },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  on_hold: { label: 'On Hold', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: Trash2 }
};

const ProjectCard = ({ project, onEdit, onDelete, onView }) => {
  const navigate = useNavigate();
  const StatusIcon = statusConfig[project.status]?.icon || Clock;
  
  const progressColor = project.progress >= 75 ? 'bg-emerald-500' : 
                        project.progress >= 50 ? 'bg-blue-500' : 
                        project.progress >= 25 ? 'bg-amber-500' : 'bg-stone-400';

  return (
    <Card 
      className="bg-white border-[#E8D5C4] hover:border-[#D4BBA6] transition-all cursor-pointer group shadow-sm hover:shadow-md"
      onClick={() => navigate(`/projects/${project.id}`)}
      data-testid={`project-card-${project.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {project.project_id && (
              <Badge variant="secondary" className="bg-[#E8D5C4] text-[#4A3728] text-xs font-mono">
                {project.project_id}
              </Badge>
            )}
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
                <MoreVertical className="w-4 h-4 text-[#5D4A3A]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(project); }} className="text-[#4A3728]">
                <Eye className="w-4 h-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="text-[#4A3728]">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(project); }}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-[#4A3728] text-lg mb-1">{project.name}</h3>
        
        {project.module_name && (
          <p className="text-sm text-[#5D4A3A] flex items-center gap-1 mb-3">
            <Folder className="w-3.5 h-3.5" />
            {project.module_name}
          </p>
        )}

        {project.description && (
          <p className="text-sm text-[#5D4A3A] line-clamp-2 mb-4">{project.description}</p>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[#5D4A3A]">Progress</span>
            <span className="text-[#4A3728] font-medium">{project.progress}%</span>
          </div>
          <div className="h-2 bg-[#E8D5C4] rounded-full overflow-hidden">
            <div 
              className={`h-full ${progressColor} transition-all`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-[#5D4A3A]">
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
            <span className="text-[#5D4A3A] flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CreateProjectModal = ({ open, onClose, modules, departments, users, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    module_id: '',
    project_type: 'other',
    department_id: '',
    description: '',
    priority: 'medium',
    project_manager_id: '',
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
      const payload = { ...formData };
      if (!payload.department_id) delete payload.department_id;
      if (!payload.project_manager_id) delete payload.project_manager_id;
      
      const response = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create project');
      
      toast.success('Project created successfully');
      onSuccess();
      onClose();
      setFormData({ name: '', module_id: '', project_type: 'other', department_id: '', description: '', priority: 'medium', project_manager_id: '', start_date: '', end_date: '' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const projectTypes = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'development', label: 'Development' },
    { value: 'pr', label: 'PR' },
    { value: 'design', label: 'Design' },
    { value: 'operations', label: 'Operations' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-[#D4BBA6] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#4A3728] flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-rose-600" />
            Create New Project
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[#4A3728]">Project Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              className="border-[#D4BBA6] focus:border-rose-500 mt-1"
              data-testid="project-name-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#4A3728]">Module *</Label>
              <Select
                value={formData.module_id}
                onValueChange={(value) => setFormData({ ...formData, module_id: value })}
              >
                <SelectTrigger className="border-[#D4BBA6] mt-1" data-testid="module-select">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6]">
                  {modules.map(module => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#4A3728]">Project Type</Label>
              <Select
                value={formData.project_type}
                onValueChange={(value) => setFormData({ ...formData, project_type: value })}
              >
                <SelectTrigger className="border-[#D4BBA6] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6]">
                  {projectTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#4A3728]">Department</Label>
              <Select
                value={formData.department_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, department_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="border-[#D4BBA6] mt-1">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6]">
                  <SelectItem value="none">None</SelectItem>
                  {departments?.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#4A3728]">Project Manager</Label>
              <Select
                value={formData.project_manager_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, project_manager_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="border-[#D4BBA6] mt-1">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6]">
                  <SelectItem value="none">None</SelectItem>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[#4A3728]">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief project description"
              className="border-[#D4BBA6] focus:border-rose-500 mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
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
              <Label className="text-[#4A3728]">Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="border-[#D4BBA6] mt-1"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="border-[#D4BBA6] mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-[#D4BBA6] text-[#4A3728]">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white" data-testid="create-project-submit">
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
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
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

      const [projectsRes, modulesRes, deptsRes, usersRes] = await Promise.all([
        fetch(`${API}/api/projects/list`, { headers }),
        fetch(`${API}/api/projects/modules`, { headers }),
        fetch(`${API}/api/workos/departments`, { headers }),
        fetch(`${API}/api/workos/users`, { headers })
      ]);

      if (!projectsRes.ok || !modulesRes.ok) throw new Error('Failed to fetch data');

      const [projectsData, modulesData] = await Promise.all([
        projectsRes.json(),
        modulesRes.json()
      ]);
      
      const deptsData = deptsRes.ok ? await deptsRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };

      setProjects(projectsData);
      setModules(modulesData);
      setDepartments(deptsData);
      setUsers(usersData.users || usersData || []);
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
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8" data-testid="projects-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]" data-testid="projects-title">Projects</h1>
          <p className="text-[#5D4A3A] mt-1">Manage all your projects</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/projects/my-tasks')}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
          >
            <ListTodo className="w-4 h-4 mr-2" />
            My Tasks
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchData}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white"
            data-testid="create-project-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Total Projects</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Active</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Completed</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">On Hold</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.onHold}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[#FDF8F3] border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search projects..."
                  className="border-[#D4BBA6] pl-10 bg-white"
                  data-testid="search-input"
                />
              </div>
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-[150px] border-[#D4BBA6] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
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
              <SelectTrigger className="w-[150px] border-[#D4BBA6] bg-white">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
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
              <SelectTrigger className="w-[180px] border-[#D4BBA6] bg-white">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
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
        <Card className="bg-[#FDF8F3] border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <FolderKanban className="w-16 h-16 mx-auto text-[#D4BBA6] mb-4" />
            <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No projects found</h3>
            <p className="text-[#5D4A3A] mb-4">
              {filters.search || filters.status || filters.priority || filters.module_id
                ? 'Try adjusting your filters'
                : 'Create your first project to get started'}
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        modules={modules}
        departments={departments}
        users={users}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ProjectsList;
