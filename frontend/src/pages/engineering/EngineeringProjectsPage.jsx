import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { CreateProjectModal } from '../projects/ProjectsList';
import { toast } from 'sonner';
import { 
  FolderKanban, Plus, Search, ArrowRight, Users, Calendar,
  CheckCircle2, Clock, AlertTriangle, LayoutGrid, List, Filter
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Project type configuration for Engineering
const PROJECT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'development', label: 'Development' },
  { value: 'design', label: 'Design' },
  { value: 'operations', label: 'Operations' },
  { value: 'other', label: 'Other' },
];

const EngineeringProjectsPage = () => {
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('development'); // Default to development
  
  // Data for the modal
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects/list');
      setProjects(response.data || []);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchModalData = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [deptRes, usersRes] = await Promise.all([
        fetch(`${API}/api/workos/departments`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/api/workos/users`, { headers }).then(r => r.ok ? r.json() : { users: [] })
      ]);
      
      setDepartments(deptRes || []);
      const allUsers = usersRes.users || usersRes || [];
      setUsers(allUsers.filter(u => u.status === 'active'));
    } catch (e) {
      console.error('Error fetching modal data:', e);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchModalData();
  }, [fetchProjects, fetchModalData]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft' },
      active: { color: 'bg-emerald-100 text-emerald-700', label: 'Active' },
      on_hold: { color: 'bg-amber-100 text-amber-700', label: 'On Hold' },
      completed: { color: 'bg-blue-100 text-blue-700', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
      archived: { color: 'bg-stone-100 text-stone-700', label: 'Archived' }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { color: 'bg-slate-100 text-slate-700', label: 'Low' },
      medium: { color: 'bg-blue-100 text-blue-700', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-700', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-700', label: 'Urgent' },
      critical: { color: 'bg-red-200 text-red-800', label: 'Critical' }
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      development: { color: 'bg-violet-100 text-violet-700', label: 'Development' },
      design: { color: 'bg-pink-100 text-pink-700', label: 'Design' },
      operations: { color: 'bg-cyan-100 text-cyan-700', label: 'Operations' },
      marketing: { color: 'bg-orange-100 text-orange-700', label: 'Marketing' },
      other: { color: 'bg-gray-100 text-gray-700', label: 'Other' }
    };
    const config = typeConfig[type] || typeConfig.other;
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  // Filter projects by type and search query
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || p.project_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Stats based on filtered projects
  const stats = {
    total: filteredProjects.length,
    active: filteredProjects.filter(p => p.status === 'active').length,
    onHold: filteredProjects.filter(p => p.status === 'on_hold').length,
    completed: filteredProjects.filter(p => p.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="engineering-projects-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-violet-600" />
            Engineering Projects
          </h1>
          <p className="text-gray-500 mt-1">
            Manage and track all engineering projects
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Projects</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
            <div className="text-sm text-gray-500">Active</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.onHold}</div>
            <div className="text-sm text-gray-500">On Hold</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Search, Filter & View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-10"
            />
          </div>
          
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => setViewMode('grid')}
            className="h-8 px-3"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            onClick={() => setViewMode('list')}
            className="h-8 px-3"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Projects Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <Card 
              key={project.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {project.description?.replace(/<[^>]*>/g, '') || 'No description'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {getStatusBadge(project.status)}
                  {getPriorityBadge(project.priority)}
                  {project.project_type && getTypeBadge(project.project_type)}
                </div>

                {project.progress !== undefined && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">{project.progress || 0}%</span>
                    </div>
                    <Progress value={project.progress || 0} className="h-2" />
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {project.task_count || 0} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {project.team_members?.length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProjects.map(project => (
            <Card 
              key={project.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                  <p className="text-sm text-gray-500 truncate">
                    {project.description?.replace(/<[^>]*>/g, '') || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(project.status)}
                  {getPriorityBadge(project.priority)}
                  <span className="text-sm text-gray-500">
                    {project.task_count || 0} tasks
                  </span>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-gray-500 mt-1 mb-4">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Create your first project to get started'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Project
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Project Modal - Full Version */}
      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        modules={modules}
        departments={departments}
        users={users}
        defaultProjectType="development"
        onSuccess={() => {
          setShowCreateModal(false);
          fetchProjects();
        }}
      />
    </div>
  );
};

export default EngineeringProjectsPage;
