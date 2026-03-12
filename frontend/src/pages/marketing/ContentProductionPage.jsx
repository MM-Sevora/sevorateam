import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import {
  Plus, Search, Filter, Video, Image, FileText, Music, 
  Calendar, Clock, User, CheckCircle, AlertCircle, Play,
  Edit, Trash2, MoreHorizontal, ChevronRight, RefreshCw,
  Clapperboard, Wand2, Eye, Send
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CONTENT_TYPES = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'photo', label: 'Photo', icon: Image },
  { value: 'reel', label: 'Reel', icon: Play },
  { value: 'story', label: 'Story', icon: Clock },
  { value: 'carousel', label: 'Carousel', icon: Image },
  { value: 'graphic', label: 'Graphic', icon: FileText },
  { value: 'blog', label: 'Blog', icon: FileText },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'multi', label: 'Multi-Platform' },
];

const PROJECT_TYPES = [
  { value: 'original_production', label: 'Original Production', description: 'Full workflow with shoot' },
  { value: 'adaptation', label: 'Adaptation / Repurpose', description: 'Edit existing content for new platform' },
  { value: 'delivery_only', label: 'Delivery Only', description: 'Just resize/format existing content' },
  { value: 'graphics', label: 'Graphics / Design', description: 'Static design work' },
];

const STATUS_CONFIG = {
  idea: { label: 'Idea', color: 'bg-gray-500', step: 1 },
  briefing: { label: 'Briefing', color: 'bg-blue-400', step: 2 },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500', step: 3 },
  in_production: { label: 'In Production', color: 'bg-yellow-500', step: 4 },
  shooting: { label: 'Shooting', color: 'bg-orange-500', step: 5 },
  editing: { label: 'Editing', color: 'bg-purple-500', step: 6 },
  review: { label: 'Review', color: 'bg-pink-500', step: 7 },
  revisions: { label: 'Revisions', color: 'bg-red-400', step: 7 },
  approved: { label: 'Approved', color: 'bg-green-500', step: 8 },
  published: { label: 'Published', color: 'bg-green-600', step: 9 },
  archived: { label: 'Archived', color: 'bg-gray-400', step: 10 },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
};

export default function ContentProductionPage() {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Dialog states
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showTasksDialog, setShowTasksDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/marketing/v3/content/projects`),
        fetch(`${API_URL}/api/marketing/v3/content/stats`)
      ]);

      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load content data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/content/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Project created successfully');
        setShowProjectDialog(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create project');
      }
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleGenerateTasks = async (projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/content/projects/${projectId}/generate-tasks`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`${result.tasks_created} tasks generated`);
        fetchProjectTasks(projectId);
      }
    } catch (error) {
      toast.error('Failed to generate tasks');
    }
  };

  const fetchProjectTasks = async (projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/content/projects/${projectId}/tasks`);
      if (response.ok) {
        setProjectTasks(await response.json());
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleUpdateStatus = async (projectId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/content/projects/${projectId}/status?status=${newStatus}`, {
        method: 'PUT'
      });

      if (response.ok) {
        toast.success('Status updated');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleViewTasks = async (project) => {
    setSelectedProject(project);
    await fetchProjectTasks(project.id);
    setShowTasksDialog(true);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
    const matchesType = selectedType === 'all' || project.content_type === selectedType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Group projects by status for Kanban view
  const projectsByStatus = {};
  Object.keys(STATUS_CONFIG).forEach(status => {
    projectsByStatus[status] = filteredProjects.filter(p => p.status === status);
  });

  return (
    <div className="p-6 space-y-6" data-testid="content-production-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Production</h1>
          <p className="text-gray-500">Manage content creation workflow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowProjectDialog(true)} data-testid="create-project-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clapperboard className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Projects</p>
                  <p className="text-2xl font-bold">{stats.total_projects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Play className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500">In Production</p>
                  <p className="text-2xl font-bold">
                    {(stats.by_status?.in_production || 0) + (stats.by_status?.shooting || 0) + (stats.by_status?.editing || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Eye className="w-8 h-8 text-pink-500" />
                <div>
                  <p className="text-sm text-gray-500">In Review</p>
                  <p className="text-2xl font-bold">{stats.by_status?.review || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Published</p>
                  <p className="text-2xl font-bold">{stats.by_status?.published || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-2xl font-bold">{stats.projects_this_month}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold">{stats.overdue_projects}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects">All Projects</TabsTrigger>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {/* Projects List View */}
        <TabsContent value="projects" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CONTENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Projects Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Project</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Project Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Content</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Platform</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Progress</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No projects found
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map(project => {
                        const TypeIcon = CONTENT_TYPES.find(t => t.value === project.content_type)?.icon || FileText;
                        const progress = project.task_count > 0 ? (project.completed_tasks / project.task_count) * 100 : 0;
                        const projectTypeLabel = PROJECT_TYPES.find(pt => pt.value === project.project_type)?.label || 'Original';
                        
                        return (
                          <tr key={project.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{project.title}</p>
                                {project.description && (
                                  <p className="text-sm text-gray-500 truncate max-w-[200px]">{project.description}</p>
                                )}
                                {project.source_project_title && (
                                  <p className="text-xs text-blue-500">↳ From: {project.source_project_title}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="text-xs">
                                {projectTypeLabel}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <TypeIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm capitalize">{project.content_type}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="capitalize">{project.platform}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={STATUS_CONFIG[project.status]?.color}>
                                {STATUS_CONFIG[project.status]?.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="w-24">
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-gray-500 mt-1">
                                  {project.completed_tasks}/{project.task_count} tasks
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewTasks(project)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kanban Board View */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {['idea', 'briefing', 'in_production', 'editing', 'review', 'approved', 'published'].map(status => (
              <div key={status} className="flex-shrink-0 w-72">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status]?.color}`}></span>
                      {STATUS_CONFIG[status]?.label}
                    </h3>
                    <Badge variant="outline">{projectsByStatus[status]?.length || 0}</Badge>
                  </div>
                  <div className="space-y-2">
                    {(projectsByStatus[status] || []).map(project => (
                      <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <p className="font-medium text-sm">{project.title}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs capitalize">{project.content_type}</Badge>
                            <span className={`text-xs ${PRIORITY_CONFIG[project.priority]?.color}`}>
                              {PRIORITY_CONFIG[project.priority]?.label}
                            </span>
                          </div>
                          {project.publish_date && (
                            <p className="text-xs text-gray-400 mt-2">
                              Publish: {formatDate(project.publish_date)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {(projectsByStatus[status] || []).length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No projects</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Calendar View Coming Soon</h3>
              <p className="text-gray-500">View content schedule by dates</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Content Project</DialogTitle>
            <DialogDescription>Set up a new content production project</DialogDescription>
          </DialogHeader>
          <CreateProjectForm
            onSubmit={handleCreateProject}
            onCancel={() => setShowProjectDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Project Tasks Dialog */}
      <Dialog open={showTasksDialog} onOpenChange={setShowTasksDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.title}</DialogTitle>
            <DialogDescription>
              <Badge className={STATUS_CONFIG[selectedProject?.status]?.color}>
                {STATUS_CONFIG[selectedProject?.status]?.label}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {projectTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No tasks yet</p>
                <Button onClick={() => handleGenerateTasks(selectedProject?.id)}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Workflow Tasks
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {projectTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      className="w-4 h-4"
                      readOnly
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500">{task.task_type}</p>
                    </div>
                    {task.estimated_hours && (
                      <span className="text-sm text-gray-400">{task.estimated_hours}h</span>
                    )}
                    <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Project Form Component
function CreateProjectForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_type: '',
    content_category: '',
    content_sub_type: '',
    medium: '',
    campaign_id: '',
    priority: 'medium',
    source_project_id: '',
    shoot_date: '',
    publish_date: '',
    due_date: '',
    brief: ''
  });
  
  const [config, setConfig] = useState({
    project_types: [],
    content_categories: [],
    content_subtypes: [],
    mediums: []
  });
  const [campaigns, setCampaigns] = useState([]);
  const [sourceProjects, setSourceProjects] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSources, setLoadingSources] = useState(false);

  // Load configuration options
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [configRes, campaignsRes] = await Promise.all([
          fetch(`${API_URL}/api/marketing/v3/config/all`),
          fetch(`${API_URL}/api/marketing/v2/unified-campaigns?limit=50`)
        ]);
        
        if (configRes.ok) {
          const data = await configRes.json();
          setConfig(data);
          // Set defaults from first options
          if (data.project_types.length > 0) {
            setFormData(prev => ({ ...prev, project_type: data.project_types[0].slug }));
          }
          if (data.content_categories.length > 0) {
            setFormData(prev => ({ ...prev, content_category: data.content_categories[0].slug }));
          }
          if (data.mediums.length > 0) {
            setFormData(prev => ({ ...prev, medium: data.mediums[0].slug }));
          }
        }
        
        if (campaignsRes.ok) {
          const campaignsData = await campaignsRes.json();
          setCampaigns(campaignsData.campaigns || campaignsData || []);
        }
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // Determine if this project type needs source content
  const needsSourceContent = ['adaptation', 'delivery'].includes(formData.project_type);
  const showShootDate = formData.project_type === 'original_production';

  // Get available subtypes for selected category
  const availableSubtypes = config.content_subtypes.filter(
    s => s.category_slug === formData.content_category
  );

  // Auto-select first subtype when category changes
  useEffect(() => {
    if (formData.content_category && availableSubtypes.length > 0) {
      const currentSubtype = availableSubtypes.find(s => s.slug === formData.content_sub_type);
      if (!currentSubtype) {
        setFormData(prev => ({ ...prev, content_sub_type: availableSubtypes[0].slug }));
      }
    }
  }, [formData.content_category, availableSubtypes]);

  // Load available source projects when needed
  useEffect(() => {
    if (needsSourceContent) {
      setLoadingSources(true);
      fetch(`${API_URL}/api/marketing/v3/content/projects/sources`)
        .then(res => res.json())
        .then(data => setSourceProjects(data))
        .catch(err => console.error('Error loading sources:', err))
        .finally(() => setLoadingSources(false));
    }
  }, [needsSourceContent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Please enter a project title');
      return;
    }
    if (!formData.project_type || !formData.content_category || !formData.medium) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const submitData = { ...formData };
    if (!submitData.shoot_date) delete submitData.shoot_date;
    if (!submitData.publish_date) delete submitData.publish_date;
    if (!submitData.due_date) delete submitData.due_date;
    if (!submitData.source_project_id) delete submitData.source_project_id;
    if (!submitData.campaign_id) delete submitData.campaign_id;
    
    onSubmit(submitData);
  };

  const selectedProjectType = config.project_types.find(pt => pt.slug === formData.project_type);
  const selectedCategory = config.content_categories.find(c => c.slug === formData.content_category);

  if (loadingConfig) {
    return <div className="py-8 text-center text-gray-500">Loading configuration...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Project Title */}
        <div className="col-span-2 space-y-2">
          <Label>Project Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g., Summer Collection Lookbook Shoot"
            data-testid="project-title-input"
          />
        </div>

        {/* HOW - Project Type */}
        <div className="col-span-2 space-y-2">
          <Label className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">HOW</span>
            Project Type *
          </Label>
          <Select 
            value={formData.project_type || undefined} 
            onValueChange={(v) => setFormData({...formData, project_type: v, source_project_id: ''})}
          >
            <SelectTrigger data-testid="project-type-select">
              <SelectValue placeholder="Select production type" />
            </SelectTrigger>
            <SelectContent>
              {config.project_types.map(type => (
                <SelectItem key={type.id} value={type.slug}>
                  <span className="font-medium">{type.name}</span>
                  {type.description && (
                    <span className="text-xs text-gray-500 ml-2">- {type.description}</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProjectType?.description && (
            <p className="text-xs text-gray-500">{selectedProjectType.description}</p>
          )}
        </div>

        {/* Source Content Picker - only for adaptation/delivery */}
        {needsSourceContent && (
          <div className="col-span-2 space-y-2">
            <Label>Source Content {formData.project_type === 'delivery' ? '*' : '(Optional)'}</Label>
            <Select 
              value={formData.source_project_id} 
              onValueChange={(v) => setFormData({...formData, source_project_id: v})}
            >
              <SelectTrigger data-testid="source-project-select">
                <SelectValue placeholder={loadingSources ? "Loading..." : "Select source project"} />
              </SelectTrigger>
              <SelectContent>
                {sourceProjects.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-gray-500 text-center">No published projects available</div>
                ) : (
                  sourceProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title} ({project.content_sub_type || project.content_type})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Select an existing project to repurpose or adapt</p>
          </div>
        )}

        {/* WHAT - Content Category */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">WHAT</span>
            Category *
          </Label>
          <Select 
            value={formData.content_category || undefined} 
            onValueChange={(v) => setFormData({...formData, content_category: v, content_sub_type: ''})}
          >
            <SelectTrigger data-testid="content-category-select">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {config.content_categories.map(cat => (
                <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* WHAT - Content Sub-Type */}
        <div className="space-y-2">
          <Label>Sub-Type *</Label>
          <Select 
            value={formData.content_sub_type || undefined} 
            onValueChange={(v) => setFormData({...formData, content_sub_type: v})}
          >
            <SelectTrigger data-testid="content-subtype-select">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {availableSubtypes.map(sub => (
                <SelectItem key={sub.id} value={sub.slug}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* WHERE - Medium */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">WHERE</span>
            Medium *
          </Label>
          <Select value={formData.medium || undefined} onValueChange={(v) => setFormData({...formData, medium: v})}>
            <SelectTrigger data-testid="medium-select">
              <SelectValue placeholder="Select medium" />
            </SelectTrigger>
            <SelectContent>
              {config.mediums.map(med => (
                <SelectItem key={med.id} value={med.slug}>{med.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
            <SelectTrigger>
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

        {/* Campaign (Optional) */}
        <div className="col-span-2 space-y-2">
          <Label>Link to Campaign (Optional)</Label>
          <Select 
            value={formData.campaign_id || "none"} 
            onValueChange={(v) => setFormData({...formData, campaign_id: v === "none" ? "" : v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Campaign</SelectItem>
              {campaigns.map(camp => (
                <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dates */}
        {showShootDate && (
          <div className="space-y-2">
            <Label>Shoot Date</Label>
            <Input
              type="date"
              value={formData.shoot_date}
              onChange={(e) => setFormData({...formData, shoot_date: e.target.value})}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({...formData, due_date: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label>Publish Date</Label>
          <Input
            type="date"
            value={formData.publish_date}
            onChange={(e) => setFormData({...formData, publish_date: e.target.value})}
          />
        </div>

        {/* Description */}
        <div className="col-span-2 space-y-2">
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Brief description of the content..."
            rows={2}
          />
        </div>

        {/* Brief - only show for original/graphics */}
        {['original_production', 'graphics'].includes(formData.project_type) && (
          <div className="col-span-2 space-y-2">
            <Label>Brief / Requirements</Label>
            <Textarea
              value={formData.brief}
              onChange={(e) => setFormData({...formData, brief: e.target.value})}
              placeholder="Key messages, target audience, do's and don'ts, deliverable specs..."
              rows={3}
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" data-testid="create-project-submit">Create Project</Button>
      </DialogFooter>
    </form>
  );
}
