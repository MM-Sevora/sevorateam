import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Package, ArrowLeft, Plus, Calendar, CheckCircle, Clock, Rocket, Archive,
  Edit, Trash2, Link2, Unlink, ChevronRight, Target, AlertTriangle, RefreshCw
} from 'lucide-react';
import { format, parseISO, isPast, isFuture } from 'date-fns';

const statusConfig = {
  planned: { label: 'Planned', color: 'bg-gray-100 text-gray-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  ready: { label: 'Ready for Release', color: 'bg-amber-100 text-amber-700', icon: CheckCircle },
  released: { label: 'Released', color: 'bg-green-100 text-green-700', icon: Rocket },
  archived: { label: 'Archived', color: 'bg-stone-100 text-stone-500', icon: Archive }
};

const ReleasesPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [releases, setReleases] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '',
    name: '',
    description: '',
    start_date: '',
    release_date: '',
    status: 'planned'
  });
  const [saving, setSaving] = useState(false);
  
  // Task linking modal
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [releaseTasks, setReleaseTasks] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [releasesRes, projectsRes] = await Promise.all([
        api.get('/projects/releases', { 
          params: { 
            project_id: selectedProject || undefined,
            status: statusFilter || undefined
          }
        }),
        api.get('/projects/list')
      ]);
      setReleases(releasesRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error fetching releases:', error);
      toast.error('Failed to load releases');
    } finally {
      setLoading(false);
    }
  }, [api, selectedProject, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateRelease = () => {
    setEditingRelease(null);
    setFormData({
      project_id: selectedProject || '',
      name: '',
      description: '',
      start_date: '',
      release_date: '',
      status: 'planned'
    });
    setShowModal(true);
  };

  const handleEditRelease = (release) => {
    setEditingRelease(release);
    setFormData({
      project_id: release.project_id,
      name: release.name,
      description: release.description || '',
      start_date: release.start_date || '',
      release_date: release.release_date || '',
      status: release.status
    });
    setShowModal(true);
  };

  const handleSaveRelease = async () => {
    if (!formData.project_id || !formData.name) {
      toast.error('Project and name are required');
      return;
    }
    
    setSaving(true);
    try {
      if (editingRelease) {
        await api.put(`/projects/releases/${editingRelease.id}`, {
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date || null,
          release_date: formData.release_date || null,
          status: formData.status
        });
        toast.success('Release updated');
      } else {
        await api.post('/projects/releases', formData);
        toast.success('Release created');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save release');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRelease = async (release) => {
    if (!confirm(`Delete release "${release.name}"?`)) return;
    
    try {
      await api.delete(`/projects/releases/${release.id}`);
      toast.success('Release deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete release');
    }
  };

  const handleManageTasks = async (release) => {
    setSelectedRelease(release);
    
    try {
      // Fetch tasks linked to this release
      const [linkedRes, allTasksRes] = await Promise.all([
        api.get(`/projects/releases/${release.id}/tasks`),
        api.get(`/projects/${release.project_id}/tasks`)
      ]);
      
      setReleaseTasks(linkedRes.data || []);
      // Filter out already linked tasks
      const linkedIds = new Set((linkedRes.data || []).map(t => t.id));
      setAvailableTasks((allTasksRes.data || []).filter(t => !linkedIds.has(t.id) && !t.release_id));
      setShowTasksModal(true);
    } catch (error) {
      toast.error('Failed to load tasks');
    }
  };

  const handleLinkTask = async (taskId) => {
    try {
      await api.post(`/projects/releases/${selectedRelease.id}/tasks/${taskId}`);
      toast.success('Task linked');
      handleManageTasks(selectedRelease);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to link task');
    }
  };

  const handleUnlinkTask = async (taskId) => {
    try {
      await api.delete(`/projects/releases/${selectedRelease.id}/tasks/${taskId}`);
      toast.success('Task unlinked');
      handleManageTasks(selectedRelease);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unlink task');
    }
  };

  const getReleaseStatusInfo = (release) => {
    if (release.status === 'released') {
      return { type: 'success', message: release.actual_release_date ? `Released ${format(parseISO(release.actual_release_date), 'MMM d, yyyy')}` : 'Released' };
    }
    if (release.release_date) {
      const date = parseISO(release.release_date);
      if (isPast(date) && release.status !== 'released') {
        return { type: 'warning', message: 'Overdue' };
      }
      if (isFuture(date)) {
        return { type: 'info', message: `Due ${format(date, 'MMM d, yyyy')}` };
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading releases...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-[#FAF7F5] to-[#F5EBE0] min-h-screen" data-testid="releases-page">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-violet-600" />
                Releases & Versions
              </h1>
              <p className="text-gray-500 mt-1">
                Manage software releases and version tracking
              </p>
            </div>
          </div>
          
          <Button onClick={handleCreateRelease} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Release
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={selectedProject || "all"} onValueChange={(v) => setSelectedProject(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Releases Grid */}
      {releases.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No releases found</h3>
          <p className="text-gray-500 mt-1 mb-4">
            Create your first release to start tracking versions
          </p>
          <Button onClick={handleCreateRelease} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Release
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.map(release => {
            const config = statusConfig[release.status] || statusConfig.planned;
            const StatusIcon = config.icon;
            const statusInfo = getReleaseStatusInfo(release);
            
            return (
              <Card key={release.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{release.name}</CardTitle>
                      <p className="text-sm text-gray-500 truncate">{release.project_name}</p>
                    </div>
                    <Badge className={config.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {release.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{release.description}</p>
                  )}
                  
                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{release.progress}%</span>
                    </div>
                    <Progress value={release.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>{release.completed_issues}/{release.total_issues} issues</span>
                      {release.story_points_total > 0 && (
                        <span>{release.story_points_completed}/{release.story_points_total} SP</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Info */}
                  {statusInfo && (
                    <div className={`flex items-center gap-1 text-xs mb-3 ${
                      statusInfo.type === 'warning' ? 'text-amber-600' : 
                      statusInfo.type === 'success' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {statusInfo.type === 'warning' && <AlertTriangle className="w-3 h-3" />}
                      {statusInfo.type === 'success' && <CheckCircle className="w-3 h-3" />}
                      <Calendar className="w-3 h-3" />
                      {statusInfo.message}
                    </div>
                  )}
                  
                  {/* Dates */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    {release.start_date && (
                      <div className="flex items-center gap-1">
                        <span>Start:</span>
                        <span>{format(parseISO(release.start_date), 'MMM d')}</span>
                      </div>
                    )}
                    {release.release_date && (
                      <div className="flex items-center gap-1">
                        <span>Target:</span>
                        <span>{format(parseISO(release.release_date), 'MMM d')}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleManageTasks(release)}
                      className="flex-1"
                    >
                      <Link2 className="w-3 h-3 mr-1" />
                      Tasks ({release.total_issues})
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditRelease(release)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRelease(release)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRelease ? 'Edit Release' : 'Create Release'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Project *</Label>
              <Select 
                value={formData.project_id} 
                onValueChange={(v) => setFormData({...formData, project_id: v})}
                disabled={!!editingRelease}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Release Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., v1.2.0, 2024-Q1 Release"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="What's included in this release?"
                rows={3}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Target Release Date</Label>
                <Input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({...formData, release_date: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({...formData, status: v})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSaveRelease} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? 'Saving...' : editingRelease ? 'Save Changes' : 'Create Release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Linking Modal */}
      <Dialog open={showTasksModal} onOpenChange={setShowTasksModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Manage Tasks - {selectedRelease?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto py-4">
            {/* Linked Tasks */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-violet-600" />
                Linked Tasks ({releaseTasks.length})
              </h4>
              {releaseTasks.length === 0 ? (
                <p className="text-sm text-gray-500 py-3">No tasks linked to this release</p>
              ) : (
                <div className="space-y-2">
                  {releaseTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 bg-violet-50 rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Target className="w-4 h-4 text-violet-600 shrink-0" />
                        <span className="text-sm truncate">{task.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{task.status}</Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleUnlinkTask(task.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Available Tasks */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Available Tasks ({availableTasks.length})
              </h4>
              {availableTasks.length === 0 ? (
                <p className="text-sm text-gray-500 py-3">All project tasks are already linked</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {availableTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Target className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm truncate">{task.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{task.status}</Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleLinkTask(task.id)}
                      >
                        <Link2 className="w-4 h-4 mr-1" />
                        Link
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowTasksModal(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReleasesPage;
