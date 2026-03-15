import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  Loader2, Plus, Calendar, Target, Play, CheckCircle2, Pause,
  MoreVertical, Edit, Trash2, RefreshCw, Zap, Clock, AlertTriangle,
  ChevronRight, BarChart3, TrendingUp, Eye, EyeOff, Archive
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import api from '../../lib/api';
import { format, differenceInDays, isPast } from 'date-fns';

const statusConfig = {
  planning: { label: 'Planning', color: 'bg-blue-100 text-blue-700', icon: Edit },
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: Play },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-stone-100 text-stone-600', icon: Pause }
};

const SprintCard = ({ sprint, onEdit, onDelete, onStart, onComplete, onViewTasks }) => {
  const StatusIcon = statusConfig[sprint.status]?.icon || Clock;
  const daysRemaining = sprint.end_date ? differenceInDays(new Date(sprint.end_date), new Date()) : null;
  const isOverdue = sprint.status === 'active' && sprint.end_date && isPast(new Date(sprint.end_date));

  return (
    <Card className={`border-[#E8D5C4] ${sprint.status === 'active' ? 'ring-2 ring-green-200' : ''}`}
          data-testid={`sprint-card-${sprint.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={statusConfig[sprint.status]?.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[sprint.status]?.label}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4 text-[#5D4A3A]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
              <DropdownMenuItem onClick={() => onViewTasks(sprint)}>
                <Target className="w-4 h-4 mr-2" /> View Tasks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(sprint)}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              {sprint.status === 'planning' && (
                <DropdownMenuItem onClick={() => onStart(sprint)}>
                  <Play className="w-4 h-4 mr-2" /> Start Sprint
                </DropdownMenuItem>
              )}
              {sprint.status === 'active' && (
                <DropdownMenuItem onClick={() => onComplete(sprint)}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Complete Sprint
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(sprint)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <h3 className="font-semibold text-[#4A3728] text-lg mb-1">{sprint.name}</h3>
        
        {sprint.goal && (
          <p className="text-sm text-[#6B5D52] mb-3 line-clamp-2">{sprint.goal}</p>
        )}
        
        <div className="flex items-center gap-4 text-xs text-[#8B7355] mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(sprint.start_date), 'MMM d')} - {format(new Date(sprint.end_date), 'MMM d')}
          </span>
          {daysRemaining !== null && sprint.status === 'active' && (
            <span className={`flex items-center gap-1 ${daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 2 ? 'text-amber-600' : ''}`}>
              <Clock className="w-3 h-3" />
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d remaining`}
            </span>
          )}
        </div>
        
        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#6B5D52]">Progress</span>
            <span className="text-[#4A3728] font-medium">{sprint.progress}%</span>
          </div>
          <Progress value={sprint.progress} className="h-2" />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#F5EBE0] rounded p-2">
            <p className="text-lg font-bold text-[#4A3728]">{sprint.task_count}</p>
            <p className="text-[10px] text-[#6B5D52]">Tasks</p>
          </div>
          <div className="bg-[#F5EBE0] rounded p-2">
            <p className="text-lg font-bold text-green-600">{sprint.completed_task_count}</p>
            <p className="text-[10px] text-[#6B5D52]">Done</p>
          </div>
          <div className="bg-[#F5EBE0] rounded p-2">
            <p className="text-lg font-bold text-[#4A3728]">{sprint.story_points_completed}/{sprint.story_points_total}</p>
            <p className="text-[10px] text-[#6B5D52]">SP</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function SprintsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [sprints, setSprints] = useState([]);
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [showCompleted, setShowCompleted] = useState(false);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: ''
  });

  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get('/projects/list');
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  const fetchSprints = useCallback(async () => {
    if (!selectedProjectId) {
      setSprints([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const [sprintsRes, projectRes] = await Promise.all([
        api.get(`/projects/${selectedProjectId}/sprints`),
        api.get(`/projects/${selectedProjectId}`)
      ]);
      setSprints(sprintsRes.data || []);
      setProject(projectRes.data);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
      toast.error('Failed to load sprints');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  const handleOpenDialog = (sprint = null) => {
    if (sprint) {
      setEditingSprint(sprint);
      setFormData({
        name: sprint.name,
        goal: sprint.goal || '',
        start_date: sprint.start_date?.split('T')[0] || '',
        end_date: sprint.end_date?.split('T')[0] || ''
      });
    } else {
      setEditingSprint(null);
      setFormData({
        name: '',
        goal: '',
        start_date: '',
        end_date: ''
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      if (editingSprint) {
        await api.put(`/projects/sprints/${editingSprint.id}`, formData);
        toast.success('Sprint updated');
      } else {
        await api.post('/projects/sprints', {
          ...formData,
          project_id: selectedProjectId
        });
        toast.success('Sprint created');
      }
      setShowDialog(false);
      fetchSprints();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save sprint');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sprint) => {
    if (!window.confirm(`Delete sprint "${sprint.name}"? Tasks will be unlinked but not deleted.`)) return;
    
    try {
      await api.delete(`/projects/sprints/${sprint.id}`);
      toast.success('Sprint deleted');
      fetchSprints();
    } catch (error) {
      toast.error('Failed to delete sprint');
    }
  };

  const handleStart = async (sprint) => {
    try {
      await api.post(`/projects/sprints/${sprint.id}/start`);
      toast.success('Sprint started');
      fetchSprints();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start sprint');
    }
  };

  const handleComplete = async (sprint) => {
    try {
      await api.post(`/projects/sprints/${sprint.id}/complete`);
      toast.success('Sprint completed');
      fetchSprints();
    } catch (error) {
      toast.error('Failed to complete sprint');
    }
  };

  const handleViewTasks = (sprint) => {
    navigate(`/projects/${selectedProjectId}?sprint=${sprint.id}`);
  };

  // Group sprints by status
  const activeSprint = sprints.find(s => s.status === 'active');
  const planningSprints = sprints.filter(s => s.status === 'planning');
  const completedSprints = sprints.filter(s => s.status === 'completed');

  return (
    <div className="p-6 bg-gradient-to-br from-[#FAF7F5] to-[#F5EBE0] min-h-screen" data-testid="sprints-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Sprint Management</h1>
          <p className="text-[#6B5D52]">Plan and track your agile sprints</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchSprints} className="border-[#D4BBA6]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {selectedProjectId && (
            <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Project Selector */}
      <Card className="border-[#E8D5C4] mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="text-[#4A3728]">Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[300px] border-[#D4BBA6]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_id} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {project && (
              <Badge variant="outline" className="border-[#D4BBA6]">
                {project.task_count} tasks
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <Card className="border-[#E8D5C4]">
          <CardContent className="py-12 text-center">
            <Zap className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#4A3728]">Select a Project</h3>
            <p className="text-[#6B5D52]">Choose a project to view and manage its sprints</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Sprint */}
          {activeSprint && (
            <div>
              <h2 className="text-lg font-semibold text-[#4A3728] mb-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-green-600" />
                Active Sprint
              </h2>
              <div className="max-w-md">
                <SprintCard
                  sprint={activeSprint}
                  onEdit={handleOpenDialog}
                  onDelete={handleDelete}
                  onStart={handleStart}
                  onComplete={handleComplete}
                  onViewTasks={handleViewTasks}
                />
              </div>
            </div>
          )}

          {/* Planning */}
          {planningSprints.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[#4A3728] mb-3 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                Planning ({planningSprints.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {planningSprints.map((sprint) => (
                  <SprintCard
                    key={sprint.id}
                    sprint={sprint}
                    onEdit={handleOpenDialog}
                    onDelete={handleDelete}
                    onStart={handleStart}
                    onComplete={handleComplete}
                    onViewTasks={handleViewTasks}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed - Hidden by default */}
          {completedSprints.length > 0 && (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompleted(!showCompleted)}
                className={`mb-3 border-[#D4BBA6] ${showCompleted ? 'bg-stone-100' : ''}`}
              >
                {showCompleted ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showCompleted ? 'Hide Completed' : `Show Completed (${completedSprints.length})`}
              </Button>
              
              {showCompleted && (
                <>
                  <h2 className="text-lg font-semibold text-[#4A3728] mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    Completed ({completedSprints.length})
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedSprints.map((sprint) => (
                      <SprintCard
                        key={sprint.id}
                        sprint={sprint}
                        onEdit={handleOpenDialog}
                        onDelete={handleDelete}
                        onStart={handleStart}
                        onComplete={handleComplete}
                        onViewTasks={handleViewTasks}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {sprints.length === 0 && (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Zap className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#4A3728]">No Sprints Yet</h3>
                <p className="text-[#6B5D52] mb-4">Create your first sprint to start planning</p>
                <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Sprint
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">
              {editingSprint ? 'Edit Sprint' : 'Create Sprint'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Sprint Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sprint 1"
                className="border-[#D4BBA6]"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Sprint Goal</Label>
              <Textarea
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="What do you want to achieve in this sprint?"
                className="border-[#D4BBA6]"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="border-[#D4BBA6]"
                />
              </div>
              <div>
                <Label className="text-[#4A3728]">End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="border-[#D4BBA6]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingSprint ? 'Update Sprint' : 'Create Sprint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
