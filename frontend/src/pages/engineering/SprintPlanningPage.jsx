import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Calendar, ChevronRight, Users, Target, Plus, Play, CheckCircle2,
  ArrowRight, ArrowLeft, GripVertical, Layers, Bug, BookOpen, CheckSquare, Zap,
  Clock, TrendingUp, AlertTriangle, Edit3, User, Hash, X, Loader2,
  AlertCircle, FileText, BarChart3, Settings, UserCircle, Trash2
} from 'lucide-react';

const EngineeringSprintPlanningPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [backlogItems, setBacklogItems] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [sprintTasks, setSprintTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverArea, setDragOverArea] = useState(null);
  
  // Inline editing state
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ story_points: '', assigned_to: '' });
  
  // Capacity planning
  const [capacityModal, setCapacityModal] = useState(false);
  const [teamCapacity, setTeamCapacity] = useState({});
  
  // Review & Start Sprint modal
  const [reviewModal, setReviewModal] = useState(false);
  const [startingSprintId, setStartingSprintId] = useState(null);
  
  // Create Sprint modal
  const [createSprintModal, setCreateSprintModal] = useState(false);
  const [sprintForm, setSprintForm] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: ''
  });
  const [savingSprint, setSavingSprint] = useState(false);
  
  // Selected items for bulk actions
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Sprint Configuration state
  const [sprintConfig, setSprintConfig] = useState(null);
  const [configModal, setConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    sprint_length: '2_weeks',
    custom_length_days: 14,
    auto_assignment_mode: 'role_based',
    role_weight: 0.4,
    skills_weight: 0.3,
    workload_weight: 0.3,
    track_story_points: true,
    track_hours: true,
    default_story_point_to_hours: 4.0
  });
  const [savingConfig, setSavingConfig] = useState(false);
  
  // Team member capacity modal
  const [teamMemberModal, setTeamMemberModal] = useState(false);
  const [teamMemberForm, setTeamMemberForm] = useState({
    user_id: '',
    role: 'frontend',
    skills: [],
    story_points_capacity: 10,
    hours_capacity: 40,
    story_point_to_hours_ratio: 4.0
  });

  const issueTypeIcons = {
    epic: <Layers className="w-4 h-4 text-purple-600" />,
    story: <BookOpen className="w-4 h-4 text-green-600" />,
    task: <CheckSquare className="w-4 h-4 text-blue-600" />,
    bug: <Bug className="w-4 h-4 text-red-600" />,
    subtask: <CheckSquare className="w-4 h-4 text-gray-500" />,
    improvement: <Zap className="w-4 h-4 text-amber-600" />
  };

  const priorityColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  };

  // Fetch functions
  const fetchProject = useCallback(async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  }, [api, projectId]);

  const fetchSprints = useCallback(async () => {
    try {
      const response = await api.get(`/projects/${projectId}/sprints`);
      const sprintList = response.data || [];
      setSprints(sprintList);
      
      // Select active sprint or first planning sprint
      const active = sprintList.find(s => s.status === 'active');
      const planning = sprintList.find(s => s.status === 'planning');
      setSelectedSprint(active || planning || sprintList[0] || null);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  }, [api, projectId]);

  const fetchBacklog = useCallback(async () => {
    try {
      // Use the new backlog API that properly filters server-side
      const response = await api.get(`/projects/${projectId}/backlog`);
      const data = response.data || {};
      setBacklogItems(data.backlog_items || []);
    } catch (error) {
      console.error('Failed to fetch backlog:', error);
      // Fallback to old method
      try {
        const response = await api.get(`/projects/${projectId}/tasks`);
        const allTasks = response.data || [];
        const backlog = allTasks.filter(t => !t.sprint_id && t.status !== 'completed' && t.status !== 'approved');
        setBacklogItems(backlog);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }, [api, projectId]);

  const fetchSprintTasks = useCallback(async () => {
    if (!selectedSprint) {
      setSprintTasks([]);
      return;
    }
    try {
      const response = await api.get(`/projects/sprints/${selectedSprint.id}/tasks`);
      setSprintTasks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch sprint tasks:', error);
      setSprintTasks([]);
    }
  }, [api, selectedSprint]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      const users = response.data || [];
      setTeamMembers(users);
      
      // Initialize capacity for each member (default 40 hours/sprint)
      const capacity = {};
      users.forEach(u => {
        capacity[u.id] = 40;
      });
      setTeamCapacity(capacity);
    } catch (error) {
      console.error('Failed to fetch team:', error);
    }
  }, [api]);

  const fetchSprintConfig = useCallback(async () => {
    try {
      const response = await api.get(`/projects/${projectId}/sprint-config`);
      const config = response.data;
      setSprintConfig(config);
      
      // Update form with config values
      setConfigForm({
        sprint_length: config.sprint_length || '2_weeks',
        custom_length_days: config.custom_length_days || 14,
        auto_assignment_mode: config.auto_assignment_mode || 'role_based',
        role_weight: config.role_weight || 0.4,
        skills_weight: config.skills_weight || 0.3,
        workload_weight: config.workload_weight || 0.3,
        track_story_points: config.track_story_points !== false,
        track_hours: config.track_hours !== false,
        default_story_point_to_hours: config.default_story_point_to_hours || 4.0
      });
      
      // Update team capacity from config
      if (config.team_members && config.team_members.length > 0) {
        const capacity = {};
        config.team_members.forEach(m => {
          capacity[m.user_id] = m.hours_capacity;
        });
        setTeamCapacity(prev => ({ ...prev, ...capacity }));
      }
    } catch (error) {
      console.error('Failed to fetch sprint config:', error);
    }
  }, [api, projectId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProject(), fetchSprints(), fetchBacklog(), fetchTeamMembers(), fetchSprintConfig()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProject, fetchSprints, fetchBacklog, fetchTeamMembers, fetchSprintConfig]);

  useEffect(() => {
    fetchSprintTasks();
  }, [fetchSprintTasks]);

  // Drag and Drop handlers
  const handleDragStart = (e, item, source) => {
    setDraggedItem({ ...item, source });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e, area) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverArea(area);
  };

  const handleDragLeave = () => {
    setDragOverArea(null);
  };

  const handleDrop = async (e, targetArea) => {
    e.preventDefault();
    setDragOverArea(null);
    
    if (!draggedItem) return;
    
    const { source } = draggedItem;
    
    if (source === targetArea) {
      setDraggedItem(null);
      return;
    }
    
    try {
      if (targetArea === 'sprint' && selectedSprint) {
        // Use the new move-from-backlog API
        const response = await api.post(`/projects/sprints/${selectedSprint.id}/move-from-backlog`, {
          task_ids: [draggedItem.id],
          auto_assign: false
        });
        
        if (response.data.warnings && response.data.warnings.length > 0) {
          toast.warning(response.data.warnings.join(', '));
        } else {
          toast.success(`Added to sprint (${response.data.moved_count} task, ${response.data.subtasks_moved} subtasks)`);
        }
      } else if (targetArea === 'backlog') {
        // Use the new remove-to-backlog API
        await api.post(`/projects/sprints/${draggedItem.sprint_id}/remove-to-backlog`, [draggedItem.id]);
        toast.success('Moved to backlog');
      }
      
      await Promise.all([fetchBacklog(), fetchSprintTasks()]);
    } catch (error) {
      console.error('Move failed:', error);
      toast.error('Failed to move item');
    }
    
    setDraggedItem(null);
  };

  // Save Sprint Configuration
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.post(`/projects/${projectId}/sprint-config`, {
        project_id: projectId,
        ...configForm
      });
      toast.success('Sprint configuration saved');
      setConfigModal(false);
      fetchSprintConfig();
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // Add team member capacity
  const handleAddTeamMember = async () => {
    try {
      await api.post(`/projects/${projectId}/sprint-config/team-member`, teamMemberForm);
      toast.success('Team member added');
      setTeamMemberModal(false);
      setTeamMemberForm({
        user_id: '',
        role: 'frontend',
        skills: [],
        story_points_capacity: 10,
        hours_capacity: 40,
        story_point_to_hours_ratio: 4.0
      });
      fetchSprintConfig();
    } catch (error) {
      toast.error('Failed to add team member');
    }
  };

  // Remove team member capacity
  const handleRemoveTeamMember = async (userId) => {
    try {
      await api.delete(`/projects/${projectId}/sprint-config/team-member/${userId}`);
      toast.success('Team member removed');
      fetchSprintConfig();
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  // Move selected items to sprint
  const handleBulkMoveToSprint = async () => {
    if (!selectedSprint || selectedItems.length === 0) {
      toast.error('Select items and a sprint');
      return;
    }
    
    try {
      const response = await api.post(`/projects/sprints/${selectedSprint.id}/move-from-backlog`, {
        task_ids: selectedItems,
        auto_assign: configForm.auto_assignment_mode !== 'manual'
      });
      
      if (response.data.warnings && response.data.warnings.length > 0) {
        toast.warning(response.data.warnings.join(', '));
      }
      
      toast.success(`Moved ${response.data.moved_count} items to sprint`);
      setSelectedItems([]);
      await Promise.all([fetchBacklog(), fetchSprintTasks()]);
    } catch (error) {
      toast.error('Failed to move items');
    }
  };

  // Click-based move handlers
  const handleMoveToSprint = async (taskId) => {
    if (!selectedSprint) {
      toast.error('Select a sprint first');
      return;
    }
    
    try {
      await api.put(`/projects/tasks/${taskId}`, { sprint_id: selectedSprint.id });
      toast.success('Added to sprint');
      await Promise.all([fetchBacklog(), fetchSprintTasks()]);
    } catch (error) {
      toast.error('Failed to add to sprint');
    }
  };

  const handleRemoveFromSprint = async (taskId) => {
    try {
      await api.put(`/projects/tasks/${taskId}`, { sprint_id: null });
      toast.success('Moved to backlog');
      await Promise.all([fetchBacklog(), fetchSprintTasks()]);
    } catch (error) {
      toast.error('Failed to remove from sprint');
    }
  };

  // Inline editing handlers
  const startEditing = (task) => {
    setEditingTask(task.id);
    setEditForm({
      story_points: task.story_points?.toString() || '',
      assigned_to: task.assigned_to || ''
    });
  };

  const cancelEditing = () => {
    setEditingTask(null);
    setEditForm({ story_points: '', assigned_to: '' });
  };

  const saveInlineEdit = async (taskId) => {
    try {
      const updates = {};
      if (editForm.story_points !== '') {
        updates.story_points = parseInt(editForm.story_points) || 0;
      }
      if (editForm.assigned_to) {
        updates.assigned_to = editForm.assigned_to;
      }
      
      if (Object.keys(updates).length > 0) {
        await api.put(`/projects/tasks/${taskId}`, updates);
        toast.success('Task updated');
        await Promise.all([fetchBacklog(), fetchSprintTasks()]);
      }
      
      cancelEditing();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  // Sprint actions
  const handleCreateSprint = async () => {
    if (!sprintForm.name || !sprintForm.start_date || !sprintForm.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSavingSprint(true);
    try {
      await api.post('/projects/sprints', {
        ...sprintForm,
        project_id: projectId
      });
      toast.success('Sprint created');
      setCreateSprintModal(false);
      setSprintForm({ name: '', goal: '', start_date: '', end_date: '' });
      await fetchSprints();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create sprint');
    } finally {
      setSavingSprint(false);
    }
  };

  const openReviewModal = (sprintId) => {
    setStartingSprintId(sprintId);
    setReviewModal(true);
  };

  const handleStartSprint = async () => {
    if (!startingSprintId) return;
    
    try {
      await api.post(`/projects/sprints/${startingSprintId}/start`);
      toast.success('Sprint started!');
      setReviewModal(false);
      setStartingSprintId(null);
      await fetchSprints();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start sprint');
    }
  };

  // Calculate metrics
  const sprintPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const totalCapacity = Object.values(teamCapacity).reduce((sum, h) => sum + h, 0);
  const capacityInPoints = Math.round(totalCapacity / 4); // 4 hours per story point
  const capacityUsed = capacityInPoints > 0 ? Math.min(100, Math.round((sprintPoints / capacityInPoints) * 100)) : 0;
  const backlogPoints = backlogItems.reduce((sum, t) => sum + (t.story_points || 0), 0);
  
  // Sprint review metrics
  const getSprintReviewData = () => {
    const sprint = sprints.find(s => s.id === startingSprintId);
    if (!sprint) return null;
    
    const tasks = startingSprintId === selectedSprint?.id ? sprintTasks : [];
    const storyCount = tasks.filter(t => t.issue_type === 'story').length;
    const taskCount = tasks.filter(t => t.issue_type === 'task').length;
    const bugCount = tasks.filter(t => t.issue_type === 'bug').length;
    const unassignedCount = tasks.filter(t => !t.assigned_to).length;
    const noEstimateCount = tasks.filter(t => !t.story_points).length;
    const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
    
    return {
      sprint,
      tasks,
      storyCount,
      taskCount,
      bugCount,
      unassignedCount,
      noEstimateCount,
      totalPoints,
      totalItems: tasks.length
    };
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64" data-testid="sprint-planning-loading">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const reviewData = getSprintReviewData();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="engineering-sprint-planning-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="hover:text-violet-600 cursor-pointer" onClick={() => navigate('/engineering')}>
              Engineering
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="hover:text-violet-600 cursor-pointer" onClick={() => navigate(`/projects/${projectId}`)}>
              {project?.name}
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Sprint Planning</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-violet-600" />
            Sprint Planning
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Select 
            value={selectedSprint?.id || ''} 
            onValueChange={(v) => setSelectedSprint(sprints.find(s => s.id === v))}
          >
            <SelectTrigger className="w-48" data-testid="sprint-selector">
              <SelectValue placeholder="Select Sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    {s.status === 'active' && <Play className="w-3 h-3 text-green-500" />}
                    {s.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                    {s.status === 'planning' && <Edit3 className="w-3 h-3 text-blue-500" />}
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => setCapacityModal(true)} data-testid="team-capacity-btn">
            <Users className="w-4 h-4 mr-2" /> Capacity
          </Button>
          
          <Button variant="outline" onClick={() => setConfigModal(true)} data-testid="sprint-config-btn">
            <Target className="w-4 h-4 mr-2" /> Settings
          </Button>
          
          <Button variant="outline" onClick={() => setCreateSprintModal(true)} data-testid="create-sprint-btn">
            <Plus className="w-4 h-4 mr-2" /> New Sprint
          </Button>
          
          {selectedSprint?.status === 'planning' && (
            <Button 
              onClick={() => openReviewModal(selectedSprint.id)} 
              className="bg-green-600 hover:bg-green-700"
              data-testid="start-sprint-btn"
            >
              <Play className="w-4 h-4 mr-2" /> Start Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Sprint Info & Capacity Cards */}
      {selectedSprint && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Sprint Duration</p>
                  <p className="text-sm font-semibold">
                    {new Date(selectedSprint.start_date).toLocaleDateString()} - {new Date(selectedSprint.end_date).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Planned Points</p>
                  <p className="text-2xl font-bold text-violet-600">{sprintPoints}</p>
                </div>
                <Target className="w-8 h-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-500">Capacity</p>
                  <p className="text-lg font-semibold">{sprintPoints} / {capacityInPoints} pts</p>
                </div>
                <TrendingUp className={`w-8 h-8 ${capacityUsed > 100 ? 'text-red-200' : capacityUsed > 80 ? 'text-amber-200' : 'text-green-200'}`} />
              </div>
              <Progress 
                value={capacityUsed} 
                className={`h-2 ${capacityUsed > 100 ? '[&>div]:bg-red-500' : capacityUsed > 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`} 
              />
              {capacityUsed > 100 && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Over capacity!
                </p>
              )}
              {capacityUsed > 80 && capacityUsed <= 100 && (
                <p className="text-xs text-amber-600 mt-1">Near capacity</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Team Hours</p>
                  <p className="text-2xl font-bold">{totalCapacity}h</p>
                </div>
                <Clock className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sprint Goal */}
      {selectedSprint?.goal && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-violet-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-violet-900">Sprint Goal</p>
                <p className="text-sm text-violet-700">{selectedSprint.goal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Planning Area - Two Columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Backlog Column */}
        <Card 
          className={`transition-all ${dragOverArea === 'backlog' ? 'ring-2 ring-violet-400 bg-violet-50' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'backlog')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'backlog')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-600" />
              Backlog ({backlogItems.length} items, {backlogPoints} pts)
            </CardTitle>
            {selectedItems.length > 0 && (
              <Button size="sm" onClick={handleBulkMoveToSprint} data-testid="bulk-add-btn">
                <ArrowRight className="w-4 h-4 mr-1" /> Add {selectedItems.length} to Sprint
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-2 max-h-[500px] overflow-y-auto" data-testid="backlog-list">
            {backlogItems.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Backlog is empty</p>
                <p className="text-xs mt-1">All items are in sprints or completed</p>
              </div>
            ) : (
              <div className="space-y-1">
                {backlogItems.map(item => (
                  <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, 'backlog')}
                    className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 group cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-200 ${
                      draggedItem?.id === item.id ? 'opacity-50' : ''
                    }`}
                    data-testid={`backlog-item-${item.id}`}
                  >
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                    />
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                    {issueTypeIcons[item.issue_type] || issueTypeIcons.task}
                    <span 
                      className="flex-1 text-sm font-medium truncate cursor-pointer hover:text-violet-600"
                      onClick={() => navigate(`/projects/${projectId}?task=${item.id}`)}
                    >
                      {item.name}
                    </span>
                    
                    {/* Inline edit mode */}
                    {editingTask === item.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={editForm.assigned_to}
                          onValueChange={(v) => setEditForm({ ...editForm, assigned_to: v })}
                        >
                          <SelectTrigger className="w-28 h-7 text-xs">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name?.split(' ')[0]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={editForm.story_points}
                          onChange={(e) => setEditForm({ ...editForm, story_points: e.target.value })}
                          placeholder="SP"
                          className="w-14 h-7 text-xs text-center"
                          min={0}
                          max={100}
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveInlineEdit(item.id)}>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEditing}>
                          <X className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {item.assigned_to_name && (
                          <Badge variant="outline" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            {item.assigned_to_name.split(' ')[0]}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {item.story_points || '-'} pts
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                          data-testid={`edit-task-${item.id}`}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-violet-600"
                          onClick={(e) => { e.stopPropagation(); handleMoveToSprint(item.id); }}
                          data-testid={`move-to-sprint-${item.id}`}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sprint Scope Column */}
        <Card 
          className={`transition-all ${dragOverArea === 'sprint' ? 'ring-2 ring-green-400 bg-green-50' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'sprint')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'sprint')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              {selectedSprint?.name || 'Select a Sprint'} ({sprintTasks.length} items, {sprintPoints} pts)
              {selectedSprint?.status === 'active' && (
                <Badge className="bg-green-100 text-green-700 ml-2">Active</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[500px] overflow-y-auto" data-testid="sprint-scope-list">
            {!selectedSprint ? (
              <div className="py-8 text-center text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Select a sprint to start planning</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => setCreateSprintModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Create Sprint
                </Button>
              </div>
            ) : sprintTasks.length === 0 ? (
              <div className="py-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No items in sprint</p>
                <p className="text-xs mt-1">Drag items from backlog or click the arrow</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sprintTasks.map(task => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task, 'sprint')}
                    className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 group cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-200 ${
                      draggedItem?.id === task.id ? 'opacity-50' : ''
                    }`}
                    data-testid={`sprint-item-${task.id}`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                    {issueTypeIcons[task.issue_type] || issueTypeIcons.task}
                    <span 
                      className="flex-1 text-sm font-medium truncate cursor-pointer hover:text-violet-600"
                      onClick={() => navigate(`/projects/${projectId}?task=${task.id}`)}
                    >
                      {task.name}
                    </span>
                    
                    {/* Inline edit mode */}
                    {editingTask === task.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={editForm.assigned_to}
                          onValueChange={(v) => setEditForm({ ...editForm, assigned_to: v })}
                        >
                          <SelectTrigger className="w-28 h-7 text-xs">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name?.split(' ')[0]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={editForm.story_points}
                          onChange={(e) => setEditForm({ ...editForm, story_points: e.target.value })}
                          placeholder="SP"
                          className="w-14 h-7 text-xs text-center"
                          min={0}
                          max={100}
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveInlineEdit(task.id)}>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEditing}>
                          <X className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {task.assigned_to_name ? (
                          <Badge variant="outline" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            {task.assigned_to_name.split(' ')[0]}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                            Unassigned
                          </Badge>
                        )}
                        <Badge className="bg-violet-100 text-violet-700 text-xs">
                          {task.story_points || '-'} pts
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation(); startEditing(task); }}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          onClick={(e) => { e.stopPropagation(); handleRemoveFromSprint(task.id); }}
                          data-testid={`remove-from-sprint-${task.id}`}
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Capacity Modal */}
      <Dialog open={capacityModal} onOpenChange={setCapacityModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Team Capacity</DialogTitle>
            <DialogDescription>Set available hours per team member for this sprint</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {teamMembers.slice(0, 15).map(member => (
              <div key={member.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm font-medium text-violet-600">
                    {member.name?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{member.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={teamCapacity[member.id] || 0}
                    onChange={(e) => setTeamCapacity({
                      ...teamCapacity,
                      [member.id]: parseInt(e.target.value) || 0
                    })}
                    className="w-20 h-8 text-center"
                    min={0}
                    max={80}
                  />
                  <span className="text-sm text-gray-500">hrs</span>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t flex items-center justify-between">
              <span className="font-medium">Total Capacity</span>
              <span className="text-lg font-bold">{totalCapacity} hours</span>
            </div>
            <p className="text-xs text-gray-500">
              ≈ {capacityInPoints} story points (assuming 4 hours/point)
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCapacityModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sprint Modal */}
      <Dialog open={createSprintModal} onOpenChange={setCreateSprintModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Sprint</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Sprint Name *</Label>
              <Input
                value={sprintForm.name}
                onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                placeholder="e.g., Sprint 1"
              />
            </div>
            <div>
              <Label>Sprint Goal</Label>
              <Textarea
                value={sprintForm.goal}
                onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                placeholder="What do you want to achieve in this sprint?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={sprintForm.start_date}
                  onChange={(e) => setSprintForm({ ...sprintForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={sprintForm.end_date}
                  onChange={(e) => setSprintForm({ ...sprintForm, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateSprintModal(false)}>Cancel</Button>
            <Button onClick={handleCreateSprint} disabled={savingSprint} className="bg-violet-600 hover:bg-violet-700">
              {savingSprint && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review & Start Sprint Modal */}
      <Dialog open={reviewModal} onOpenChange={setReviewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-600" />
              Review & Start Sprint
            </DialogTitle>
            <DialogDescription>Review sprint details before starting</DialogDescription>
          </DialogHeader>
          
          {reviewData && (
            <div className="space-y-4">
              {/* Sprint Info */}
              <div className="p-4 bg-violet-50 rounded-lg">
                <h3 className="font-semibold text-violet-900">{reviewData.sprint.name}</h3>
                {reviewData.sprint.goal && (
                  <p className="text-sm text-violet-700 mt-1">{reviewData.sprint.goal}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-violet-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(reviewData.sprint.start_date).toLocaleDateString()} - {new Date(reviewData.sprint.end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{reviewData.totalItems}</p>
                    <p className="text-xs text-gray-500">Total Items</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-violet-600">{reviewData.totalPoints}</p>
                    <p className="text-xs text-gray-500">Story Points</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-gray-600">{capacityInPoints}</p>
                    <p className="text-xs text-gray-500">Team Capacity</p>
                  </CardContent>
                </Card>
              </div>

              {/* Item Breakdown */}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-green-600" />
                  {reviewData.storyCount} Stories
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  {reviewData.taskCount} Tasks
                </span>
                <span className="flex items-center gap-1">
                  <Bug className="w-4 h-4 text-red-600" />
                  {reviewData.bugCount} Bugs
                </span>
              </div>

              {/* Warnings */}
              {(reviewData.unassignedCount > 0 || reviewData.noEstimateCount > 0 || reviewData.totalPoints > capacityInPoints) && (
                <div className="space-y-2">
                  {reviewData.unassignedCount > 0 && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
                      <AlertCircle className="w-4 h-4" />
                      {reviewData.unassignedCount} item(s) are unassigned
                    </div>
                  )}
                  {reviewData.noEstimateCount > 0 && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
                      <AlertCircle className="w-4 h-4" />
                      {reviewData.noEstimateCount} item(s) have no estimate
                    </div>
                  )}
                  {reviewData.totalPoints > capacityInPoints && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                      <AlertTriangle className="w-4 h-4" />
                      Sprint is over capacity ({reviewData.totalPoints} pts vs {capacityInPoints} pts available)
                    </div>
                  )}
                </div>
              )}

              {reviewData.totalItems === 0 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded">
                  <AlertCircle className="w-4 h-4" />
                  No items in sprint. Add items from backlog before starting.
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewModal(false)}>Cancel</Button>
            <Button 
              onClick={handleStartSprint} 
              className="bg-green-600 hover:bg-green-700"
              disabled={reviewData?.totalItems === 0}
              data-testid="confirm-start-sprint-btn"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sprint Configuration Modal */}
      <Dialog open={configModal} onOpenChange={setConfigModal}>
        <DialogContent className="max-w-2xl" data-testid="sprint-config-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-600" />
              Sprint Configuration
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Sprint Length */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sprint Length</Label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: '1_week', label: '1 Week' },
                  { value: '2_weeks', label: '2 Weeks' },
                  { value: '3_weeks', label: '3 Weeks' },
                  { value: '4_weeks', label: '4 Weeks' },
                  { value: 'custom', label: 'Custom' }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={configForm.sprint_length === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfigForm(prev => ({ ...prev, sprint_length: option.value }))}
                    className={configForm.sprint_length === option.value ? 'bg-violet-600' : ''}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {configForm.sprint_length === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={configForm.custom_length_days}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, custom_length_days: parseInt(e.target.value) || 14 }))}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">days</span>
                </div>
              )}
            </div>

            {/* Auto-Assignment Mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Task Auto-Assignment</Label>
              <Select 
                value={configForm.auto_assignment_mode}
                onValueChange={(v) => setConfigForm(prev => ({ ...prev, auto_assignment_mode: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role_based">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      Role-Based (Match task type to member role)
                    </div>
                  </SelectItem>
                  <SelectItem value="skills_based">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Skills-Based (Match task labels to member skills)
                    </div>
                  </SelectItem>
                  <SelectItem value="workload">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Workload-Balanced (Distribute evenly)
                    </div>
                  </SelectItem>
                  <SelectItem value="combined">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Combined (Use all factors with weights)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {configForm.auto_assignment_mode === 'combined' && (
                <div className="grid grid-cols-3 gap-4 mt-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-xs text-gray-500">Role Weight</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={configForm.role_weight}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, role_weight: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Skills Weight</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={configForm.skills_weight}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, skills_weight: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Workload Weight</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={configForm.workload_weight}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, workload_weight: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Velocity Tracking */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Velocity Tracking</Label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.track_story_points}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, track_story_points: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Story Points</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.track_hours}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, track_hours: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Hours</span>
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-500">Conversion Ratio: 1 Story Point =</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={16}
                  step={0.5}
                  value={configForm.default_story_point_to_hours}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, default_story_point_to_hours: parseFloat(e.target.value) || 4 }))}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">hours</span>
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Team Capacity</Label>
                <Button size="sm" variant="outline" onClick={() => setTeamMemberModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Member
                </Button>
              </div>
              
              {sprintConfig?.team_members?.length > 0 ? (
                <div className="space-y-2">
                  {sprintConfig.team_members.map(member => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                          <UserCircle className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.user_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 capitalize">{member.role?.replace('_', '/')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{member.story_points_capacity} pts</p>
                          <p className="text-xs text-gray-500">{member.hours_capacity} hrs</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveTeamMember(member.user_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-3 bg-violet-50 rounded-lg">
                    <p className="text-sm font-medium text-violet-700">
                      Total Team Capacity: {sprintConfig.total_team_capacity_points} Story Points / {sprintConfig.total_team_capacity_hours} Hours
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No team members configured</p>
                  <p className="text-xs text-gray-400 mt-1">Add team members to track capacity</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigModal(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig} className="bg-violet-600 hover:bg-violet-700">
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Modal */}
      <Dialog open={teamMemberModal} onOpenChange={setTeamMemberModal}>
        <DialogContent data-testid="team-member-modal">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select 
                value={teamMemberForm.user_id}
                onValueChange={(v) => setTeamMemberForm(prev => ({ ...prev, user_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers
                    .filter(u => !sprintConfig?.team_members?.some(m => m.user_id === u.id))
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Primary Role</Label>
              <Select 
                value={teamMemberForm.role}
                onValueChange={(v) => setTeamMemberForm(prev => ({ ...prev, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ui_ux">UI/UX Designer</SelectItem>
                  <SelectItem value="frontend">Frontend Developer</SelectItem>
                  <SelectItem value="backend">Backend Developer</SelectItem>
                  <SelectItem value="fullstack">Full Stack Developer</SelectItem>
                  <SelectItem value="qa">QA Engineer</SelectItem>
                  <SelectItem value="devops">DevOps Engineer</SelectItem>
                  <SelectItem value="tech_lead">Tech Lead</SelectItem>
                  <SelectItem value="pm">Project Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Story Points Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={teamMemberForm.story_points_capacity}
                  onChange={(e) => setTeamMemberForm(prev => ({ ...prev, story_points_capacity: parseInt(e.target.value) || 10 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hours Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  max={80}
                  value={teamMemberForm.hours_capacity}
                  onChange={(e) => setTeamMemberForm(prev => ({ ...prev, hours_capacity: parseInt(e.target.value) || 40 }))}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamMemberModal(false)}>Cancel</Button>
            <Button onClick={handleAddTeamMember} disabled={!teamMemberForm.user_id}>
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EngineeringSprintPlanningPage;
