import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  Loader2, Plus, Calendar, Flag, CheckCircle2, Clock, AlertTriangle,
  MoreVertical, Edit, Trash2, RefreshCw, Target, ChevronRight, Link2,
  Eye, EyeOff, Archive
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import api from '../../lib/api';
import { format, isPast, differenceInDays } from 'date-fns';

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  missed: { label: 'Missed', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle }
};

const MilestoneCard = ({ milestone, onEdit, onDelete, onComplete }) => {
  const StatusIcon = statusConfig[milestone.status]?.icon || Flag;
  const daysRemaining = differenceInDays(new Date(milestone.due_date), new Date());
  const isOverdue = isPast(new Date(milestone.due_date)) && !['completed', 'missed'].includes(milestone.status);

  return (
    <Card className={`border-[#E8D5C4] ${milestone.status === 'in_progress' ? 'ring-2 ring-amber-200' : ''}`}
          data-testid={`milestone-card-${milestone.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={statusConfig[milestone.status]?.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[milestone.status]?.label}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
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
              <DropdownMenuItem onClick={() => onEdit(milestone)}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              {!['completed', 'missed'].includes(milestone.status) && (
                <DropdownMenuItem onClick={() => onComplete(milestone)}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Complete
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(milestone)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <Flag className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#4A3728] text-lg">{milestone.name}</h3>
            {milestone.project_name && (
              <p className="text-sm text-[#6B5D52]">{milestone.project_name}</p>
            )}
          </div>
        </div>

        {milestone.description && (
          <p className="text-sm text-[#6B5D52] mb-3 line-clamp-2">{milestone.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-[#8B7355] mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
          </span>
          {!['completed', 'missed'].includes(milestone.status) && (
            <span className={`flex items-center gap-1 ${daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 3 ? 'text-amber-600' : ''}`}>
              <Clock className="w-3 h-3" />
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d remaining`}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#6B5D52] flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              {milestone.linked_tasks_completed}/{milestone.linked_tasks_count} linked tasks
            </span>
            <span className="text-[#4A3728] font-medium">{milestone.progress}%</span>
          </div>
          <Progress value={milestone.progress} className="h-2" />
        </div>

        {milestone.completed_at && (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed on {format(new Date(milestone.completed_at), 'MMM d, yyyy')}
            {milestone.completed_by_name && ` by ${milestone.completed_by_name}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function MilestonesPage() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    due_date: '',
    linked_task_ids: []
  });

  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get('/projects/list');
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  const fetchMilestones = useCallback(async () => {
    if (!selectedProjectId) {
      setMilestones([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const [milestonesRes, tasksRes] = await Promise.all([
        api.get(`/projects/${selectedProjectId}/milestones`),
        api.get(`/projects/${selectedProjectId}/tasks`)
      ]);
      setMilestones(milestonesRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleOpenDialog = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setFormData({
        name: milestone.name,
        description: milestone.description || '',
        due_date: milestone.due_date?.split('T')[0] || '',
        linked_task_ids: milestone.linked_task_ids || []
      });
    } else {
      setEditingMilestone(null);
      setFormData({
        name: '',
        description: '',
        due_date: '',
        linked_task_ids: []
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.due_date) {
      toast.error('Please fill in required fields');
      return;
    }
    
    setSaving(true);
    try {
      if (editingMilestone) {
        await api.put(`/projects/milestones/${editingMilestone.id}`, formData);
        toast.success('Milestone updated');
      } else {
        await api.post('/projects/milestones', {
          ...formData,
          project_id: selectedProjectId
        });
        toast.success('Milestone created');
      }
      setShowDialog(false);
      fetchMilestones();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save milestone');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (milestone) => {
    if (!window.confirm(`Delete milestone "${milestone.name}"?`)) return;
    
    try {
      await api.delete(`/projects/milestones/${milestone.id}`);
      toast.success('Milestone deleted');
      fetchMilestones();
    } catch (error) {
      toast.error('Failed to delete milestone');
    }
  };

  const handleComplete = async (milestone) => {
    try {
      await api.put(`/projects/milestones/${milestone.id}`, { status: 'completed' });
      toast.success('Milestone marked complete');
      fetchMilestones();
    } catch (error) {
      toast.error('Failed to complete milestone');
    }
  };

  const toggleTaskLink = (taskId) => {
    setFormData(prev => ({
      ...prev,
      linked_task_ids: prev.linked_task_ids.includes(taskId)
        ? prev.linked_task_ids.filter(id => id !== taskId)
        : [...prev.linked_task_ids, taskId]
    }));
  };

  // Group milestones
  const upcomingMilestones = milestones.filter(m => m.status === 'upcoming' || m.status === 'in_progress');
  const completedMilestones = milestones.filter(m => m.status === 'completed');
  const missedMilestones = milestones.filter(m => m.status === 'missed');

  return (
    <div className="p-6 bg-gradient-to-br from-[#FAF7F5] to-[#F5EBE0] min-h-screen" data-testid="milestones-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Project Milestones</h1>
          <p className="text-[#6B5D52]">Track key deliverables and phase gates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchMilestones} className="border-[#D4BBA6]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {selectedProjectId && (
            <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Milestone
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
          </div>
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <Card className="border-[#E8D5C4]">
          <CardContent className="py-12 text-center">
            <Flag className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#4A3728]">Select a Project</h3>
            <p className="text-[#6B5D52]">Choose a project to view and manage its milestones</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming & In Progress */}
          {upcomingMilestones.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[#4A3728] mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-600" />
                Active & Upcoming ({upcomingMilestones.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingMilestones.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    onEdit={handleOpenDialog}
                    onDelete={handleDelete}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed - Hidden by default */}
          {(completedMilestones.length > 0 || missedMilestones.length > 0) && (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompleted(!showCompleted)}
                className={`mb-3 border-[#D4BBA6] ${showCompleted ? 'bg-stone-100' : ''}`}
              >
                {showCompleted ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showCompleted ? 'Hide Completed/Missed' : `Show Completed/Missed (${completedMilestones.length + missedMilestones.length})`}
              </Button>
              
              {showCompleted && completedMilestones.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold text-[#4A3728] mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Completed ({completedMilestones.length})
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {completedMilestones.map((milestone) => (
                      <MilestoneCard
                        key={milestone.id}
                        milestone={milestone}
                        onEdit={handleOpenDialog}
                        onDelete={handleDelete}
                        onComplete={handleComplete}
                      />
                    ))}
                  </div>
                </>
              )}

              {showCompleted && missedMilestones.length > 0 && (
                <>
                  <h2 className="text-lg font-semibold text-[#4A3728] mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Missed ({missedMilestones.length})
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {missedMilestones.map((milestone) => (
                      <MilestoneCard
                        key={milestone.id}
                        milestone={milestone}
                        onEdit={handleOpenDialog}
                        onDelete={handleDelete}
                        onComplete={handleComplete}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {milestones.length === 0 && (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Flag className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#4A3728]">No Milestones Yet</h3>
                <p className="text-[#6B5D52] mb-4">Create milestones to track key deliverables</p>
                <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Milestone
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">
              {editingMilestone ? 'Edit Milestone' : 'Create Milestone'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Milestone Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Phase 1 Complete"
                className="border-[#D4BBA6]"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this milestone represent?"
                className="border-[#D4BBA6]"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Due Date *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="border-[#D4BBA6] w-[200px]"
              />
            </div>
            
            {/* Link Tasks */}
            <div>
              <Label className="text-[#4A3728]">Link Tasks ({formData.linked_task_ids.length} selected)</Label>
              <p className="text-xs text-[#6B5D52] mb-2">Tasks linked to this milestone will contribute to its progress</p>
              <div className="border border-[#E8D5C4] rounded-lg max-h-[200px] overflow-y-auto">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => toggleTaskLink(task.id)}
                      className={`p-2 border-b border-[#E8D5C4] last:border-0 cursor-pointer flex items-center gap-2 hover:bg-[#F5EBE0] ${
                        formData.linked_task_ids.includes(task.id) ? 'bg-teal-50' : ''
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border ${
                        formData.linked_task_ids.includes(task.id) 
                          ? 'bg-teal-600 border-teal-600' 
                          : 'border-[#D4BBA6]'
                      } flex items-center justify-center`}>
                        {formData.linked_task_ids.includes(task.id) && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm text-[#4A3728] flex-1">{task.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {task.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-[#8B7355] text-sm">
                    No tasks in this project yet
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingMilestone ? 'Update Milestone' : 'Create Milestone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
