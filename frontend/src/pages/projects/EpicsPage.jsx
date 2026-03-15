import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { 
  Plus, Layers, Target, Calendar, User, Clock, Edit2, Trash2,
  ChevronRight, AlertCircle, Bug, BookOpen, CheckCircle2, MoreVertical,
  TrendingUp
} from 'lucide-react';

const EpicsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  
  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingEpic, setEditingEpic] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    color: '#8B5CF6',
    start_date: '',
    target_date: ''
  });
  const [saving, setSaving] = useState(false);
  
  const colorOptions = [
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EF4444', label: 'Red' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#6366F1', label: 'Indigo' },
    { value: '#14B8A6', label: 'Teal' },
  ];

  const fetchProject = useCallback(async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  }, [api, projectId]);

  const fetchEpics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/engineering/projects/${projectId}/epics`);
      setEpics(response.data || []);
    } catch (error) {
      toast.error('Failed to load epics');
    } finally {
      setLoading(false);
    }
  }, [api, projectId]);

  useEffect(() => {
    fetchProject();
    fetchEpics();
  }, [fetchProject, fetchEpics]);

  const handleOpenCreate = () => {
    setEditingEpic(null);
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      color: '#8B5CF6',
      start_date: '',
      target_date: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (epic) => {
    setEditingEpic(epic);
    setFormData({
      name: epic.name,
      description: epic.description || '',
      priority: epic.priority,
      color: epic.color,
      start_date: epic.start_date ? epic.start_date.split('T')[0] : '',
      target_date: epic.target_date ? epic.target_date.split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Epic name is required');
      return;
    }
    
    setSaving(true);
    try {
      if (editingEpic) {
        await api.put(`/engineering/epics/${editingEpic.id}`, formData);
        toast.success('Epic updated');
      } else {
        await api.post(`/engineering/projects/${projectId}/epics`, formData);
        toast.success('Epic created');
      }
      setShowModal(false);
      fetchEpics();
    } catch (error) {
      toast.error('Failed to save epic');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (epicId) => {
    if (!confirm('Delete this epic? All linked issues will be unlinked.')) return;
    
    try {
      await api.delete(`/engineering/epics/${epicId}`);
      toast.success('Epic deleted');
      fetchEpics();
    } catch (error) {
      toast.error('Failed to delete epic');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      todo: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      done: 'bg-green-100 text-green-700'
    };
    return colors[status] || colors.todo;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="epics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span 
              className="hover:text-blue-600 cursor-pointer"
              onClick={() => navigate('/projects/list')}
            >
              Projects
            </span>
            <ChevronRight className="w-4 h-4" />
            <span 
              className="hover:text-blue-600 cursor-pointer"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              {project?.name || 'Project'}
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Epics</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-600" />
            Epics
          </h1>
          <p className="text-gray-500 mt-1">
            Manage large features and initiatives
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-purple-600 hover:bg-purple-700" data-testid="create-epic-btn">
          <Plus className="w-4 h-4 mr-2" /> Create Epic
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Epics</p>
                <p className="text-2xl font-bold">{epics.length}</p>
              </div>
              <Layers className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold">{epics.filter(e => e.status === 'in_progress').length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold">{epics.filter(e => e.status === 'done').length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Story Points</p>
                <p className="text-2xl font-bold">{epics.reduce((sum, e) => sum + e.total_story_points, 0)}</p>
              </div>
              <Target className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Epics List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading epics...</div>
      ) : epics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No epics yet</h3>
            <p className="text-gray-500 mt-1 mb-4">
              Create your first epic to organize related stories and tasks
            </p>
            <Button onClick={handleOpenCreate} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" /> Create Epic
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {epics.map(epic => (
            <Card 
              key={epic.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              data-testid={`epic-card-${epic.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Color indicator */}
                  <div 
                    className="w-2 h-full min-h-[80px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: epic.color }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {epic.name}
                          <Badge className={getStatusColor(epic.status)}>
                            {epic.status.replace('_', ' ')}
                          </Badge>
                        </h3>
                        {epic.description && (
                          <p className="text-gray-600 mt-1 line-clamp-2">{epic.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={getPriorityColor(epic.priority)}>
                          {epic.priority}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(epic)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={(e) => { e.stopPropagation(); handleDelete(epic.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{epic.progress_percent}%</span>
                      </div>
                      <Progress value={epic.progress_percent} className="h-2" />
                    </div>

                    {/* Meta info */}
                    <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{epic.story_ids?.length || 0} Stories</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{epic.task_ids?.length || 0} Tasks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bug className="w-4 h-4" />
                        <span>{epic.bug_ids?.length || 0} Bugs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span>{epic.completed_story_points}/{epic.total_story_points} pts</span>
                      </div>
                      {epic.owner_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{epic.owner_name}</span>
                        </div>
                      )}
                      {epic.target_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due {new Date(epic.target_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEpic ? 'Edit Epic' : 'Create Epic'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Epic name"
                data-testid="epic-name-input"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the epic..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
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
              
              <div>
                <Label>Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(v) => setFormData({ ...formData, color: v })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.color }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>
            </div>

            {editingEpic && (
              <div>
                <Label>Status</Label>
                <Select
                  value={editingEpic.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="save-epic-btn"
            >
              {saving ? 'Saving...' : (editingEpic ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EpicsPage;
