import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flag, Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye,
  Loader2, Target, Calendar, User, ChevronRight, ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { RichTextEditor } from '../../components/ui/rich-text-editor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  planning: 'bg-stone-100 text-stone-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-stone-100 text-stone-500'
};

const priorityColors = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-stone-100 text-stone-600'
};

const GoalCard = ({ goal, onEdit, onDelete, onView, onScheduleMeeting }) => (
  <Card className="border-[#E8D5C4] hover:shadow-md hover:border-indigo-300 transition-all">
    <CardContent className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Flag className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[#4A3728] line-clamp-1">{goal.title}</h3>
            <p className="text-xs text-[#6B5D52]">{goal.fiscal_year_name}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(goal)}>
              <Eye className="w-4 h-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleMeeting(goal)}>
              <Calendar className="w-4 h-4 mr-2" /> Schedule Meeting
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(goal)}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(goal)} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {goal.description && (
        <p className="text-sm text-[#6B5D52] mb-3 line-clamp-2" dangerouslySetInnerHTML={{ __html: goal.description.replace(/<[^>]*>/g, ' ').slice(0, 100) + '...' }} />
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge variant="outline" className={statusColors[goal.status]}>
          {goal.status?.replace('_', ' ')}
        </Badge>
        <Badge variant="outline" className={priorityColors[goal.priority]}>
          {goal.priority}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#6B5D52]">
          <span>{goal.objectives_count} objectives</span>
          <span>{goal.objectives_completed} completed</span>
        </div>
        <Progress value={goal.progress} className="h-2" />
        <p className="text-xs text-right text-indigo-600 font-medium">{goal.progress?.toFixed(0) || 0}%</p>
      </div>

      {goal.owner_name && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8D5C4]">
          <User className="w-3.5 h-3.5 text-[#6B5D52]" />
          <span className="text-xs text-[#6B5D52]">{goal.owner_name}</span>
        </div>
      )}

      <Button 
        variant="ghost" 
        className="w-full mt-3 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
        onClick={() => onView(goal)}
      >
        View Objectives <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </CardContent>
  </Card>
);

export default function StrategicGoals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterFY, setFilterFY] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fiscal_year_id: '',
    owner_id: '',
    priority: 'medium',
    status: 'planning'
  });

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      let url = `${API}/api/goals/strategic-goals?`;
      if (filterFY !== 'all') url += `fiscal_year_id=${filterFY}&`;
      if (filterStatus !== 'all') url += `status=${filterStatus}&`;
      if (filterPriority !== 'all') url += `priority=${filterPriority}&`;
      if (search) url += `search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
      toast.error('Failed to load strategic goals');
    } finally {
      setLoading(false);
    }
  }, [filterFY, filterStatus, filterPriority, search]);

  const fetchFiscalYears = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/fiscal-years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiscalYears(data);
      }
    } catch (error) {
      console.error('Failed to fetch fiscal years:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchFiscalYears();
    fetchUsers();
  }, [fetchFiscalYears, fetchUsers]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleOpenModal = (goal = null) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        title: goal.title,
        description: goal.description || '',
        fiscal_year_id: goal.fiscal_year_id,
        owner_id: goal.owner_id || '',
        priority: goal.priority,
        status: goal.status
      });
    } else {
      setEditingGoal(null);
      setFormData({
        title: '',
        description: '',
        fiscal_year_id: fiscalYears.find(fy => fy.status === 'active')?.id || fiscalYears[0]?.id || '',
        owner_id: '',
        priority: 'medium',
        status: 'planning'
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Goal title is required');
      return;
    }
    if (!formData.fiscal_year_id) {
      toast.error('Please select a fiscal year');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const method = editingGoal ? 'PUT' : 'POST';
      const url = editingGoal 
        ? `${API}/api/goals/strategic-goals/${editingGoal.id}`
        : `${API}/api/goals/strategic-goals`;

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingGoal ? 'Goal updated successfully' : 'Goal created successfully');
        setShowModal(false);
        fetchGoals();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to save goal');
      }
    } catch (error) {
      console.error('Failed to save goal:', error);
      toast.error('Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Are you sure you want to archive "${goal.title}"?`)) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/strategic-goals/${goal.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Goal archived successfully');
        fetchGoals();
      } else {
        toast.error('Failed to archive goal');
      }
    } catch (error) {
      console.error('Failed to delete goal:', error);
      toast.error('Failed to archive goal');
    }
  };

  const handleView = (goal) => {
    navigate(`/goals/objectives?strategic_goal_id=${goal.id}`);
  };

  const handleScheduleMeeting = (goal) => {
    navigate(`/meetings/new?goal_id=${goal.id}&type=okr_review`);
  };

  return (
    <div className="p-6 space-y-6" data-testid="strategic-goals-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/goals')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#4A3728]">Strategic Goals</h1>
            <p className="text-[#6B5D52]">Define and track company-wide strategic priorities</p>
          </div>
        </div>
        <Button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={fiscalYears.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5D52]" />
                <Input
                  placeholder="Search goals..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-[#D4BBA6]"
                />
              </div>
            </div>
            <Select value={filterFY} onValueChange={setFilterFY}>
              <SelectTrigger className="w-[160px] border-[#D4BBA6]">
                <SelectValue placeholder="Fiscal Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {fiscalYears.map(fy => (
                  <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] border-[#D4BBA6]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px] border-[#D4BBA6]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Goals Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <Flag className="w-16 h-16 text-[#D4BBA6] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#4A3728] mb-2">No Strategic Goals</h3>
            <p className="text-[#6B5D52] mb-6">
              {fiscalYears.length === 0 
                ? 'Create a fiscal year first to start defining goals.'
                : 'Create your first strategic goal to start tracking company priorities.'
              }
            </p>
            {fiscalYears.length > 0 && (
              <Button 
                onClick={() => handleOpenModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Goal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => (
            <GoalCard 
              key={goal.id} 
              goal={goal}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              onView={handleView}
              onScheduleMeeting={handleScheduleMeeting}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#4A3728]">
              <Flag className="w-5 h-5 text-indigo-600" />
              {editingGoal ? 'Edit Strategic Goal' : 'New Strategic Goal'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[#4A3728]">Goal Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Build Sevora Fashion Platform"
                className="mt-1.5 border-[#D4BBA6]"
              />
            </div>

            <div>
              <Label className="text-[#4A3728]">Description</Label>
              <RichTextEditor
                content={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder="Describe the strategic goal..."
                minHeight="100px"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Fiscal Year *</Label>
                <Select 
                  value={formData.fiscal_year_id} 
                  onValueChange={(v) => setFormData({ ...formData, fiscal_year_id: v })}
                >
                  <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalYears.map(fy => (
                      <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#4A3728]">Owner</Label>
                <Select 
                  value={formData.owner_id} 
                  onValueChange={(v) => setFormData({ ...formData, owner_id: v })}
                >
                  <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#4A3728]">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
