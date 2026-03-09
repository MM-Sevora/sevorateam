import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Target, Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye,
  Loader2, Flag, Calendar, User, ChevronRight, ArrowLeft, Building2,
  AlertTriangle, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
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
  at_risk: 'bg-amber-100 text-amber-700',
  delayed: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700'
};

const priorityColors = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-stone-100 text-stone-600'
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const ObjectiveCard = ({ objective, onEdit, onDelete, onClick }) => (
  <Card 
    className="border-[#E8D5C4] hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
    onClick={() => onClick(objective)}
  >
    <CardContent className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            objective.status === 'delayed' || objective.status === 'at_risk' 
              ? 'bg-red-100' : 'bg-purple-100'
          }`}>
            <Target className={`w-5 h-5 ${
              objective.status === 'delayed' || objective.status === 'at_risk'
                ? 'text-red-600' : 'text-purple-600'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-[#4A3728] line-clamp-1">{objective.title}</h3>
            <div className="flex items-center gap-2 text-xs text-[#6B5D52]">
              <span>{objective.quarter_name}</span>
              <span>•</span>
              <span>{objective.fiscal_year_name}</span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(objective); }}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(objective); }} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {objective.description && (
        <p className="text-sm text-[#6B5D52] mb-3 line-clamp-2">{objective.description}</p>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge variant="outline" className={statusColors[objective.status]}>
          {objective.status === 'at_risk' && <AlertTriangle className="w-3 h-3 mr-1" />}
          {objective.status?.replace('_', ' ')}
        </Badge>
        <Badge variant="outline" className={priorityColors[objective.priority]}>
          {objective.priority}
        </Badge>
        {objective.department && (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
            <Building2 className="w-3 h-3 mr-1" />
            {objective.department}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#6B5D52]">
          <span>{objective.linked_projects_count || 0} linked projects</span>
          <span>{objective.progress?.toFixed(0) || 0}% complete</span>
        </div>
        <Progress value={objective.progress || 0} className="h-2" />
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8D5C4]">
        <div className="flex items-center gap-4 text-xs text-[#6B5D52]">
          {objective.owner_name && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {objective.owner_name}
            </span>
          )}
          {objective.target_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Due {formatDate(objective.target_date)}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-[#9C8C74]" />
      </div>
    </CardContent>
  </Card>
);

export default function Objectives() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [objectives, setObjectives] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [goals, setGoals] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [search, setSearch] = useState('');
  const [filterFY, setFilterFY] = useState(searchParams.get('fiscal_year_id') || 'all');
  const [filterQuarter, setFilterQuarter] = useState(searchParams.get('quarter') || 'all');
  const [filterGoal, setFilterGoal] = useState(searchParams.get('strategic_goal_id') || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingObj, setEditingObj] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    strategic_goal_id: '',
    fiscal_year_id: '',
    quarter_id: '',
    department: '',
    owner_id: '',
    sponsor_id: '',
    priority: 'medium',
    status: 'planning',
    start_date: '',
    target_date: ''
  });

  const fetchObjectives = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      let url = `${API}/api/goals/objectives?`;
      if (filterFY !== 'all') url += `fiscal_year_id=${filterFY}&`;
      if (filterQuarter !== 'all') {
        // Find quarter ID by name
        const quarter = quarters.find(q => q.name === filterQuarter);
        if (quarter) url += `quarter_id=${quarter.id}&`;
      }
      if (filterGoal !== 'all') url += `strategic_goal_id=${filterGoal}&`;
      if (filterStatus !== 'all') url += `status=${filterStatus}&`;
      if (filterDept !== 'all') url += `department=${filterDept}&`;
      if (search) url += `search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setObjectives(data);
      }
    } catch (error) {
      console.error('Failed to fetch objectives:', error);
      toast.error('Failed to load objectives');
    } finally {
      setLoading(false);
    }
  }, [filterFY, filterQuarter, filterGoal, filterStatus, filterDept, search, quarters]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [fyRes, goalsRes, usersRes, deptsRes] = await Promise.all([
        fetch(`${API}/api/goals/fiscal-years`, { headers }),
        fetch(`${API}/api/goals/strategic-goals`, { headers }),
        fetch(`${API}/api/goals/users`, { headers }),
        fetch(`${API}/api/goals/departments`, { headers })
      ]);

      if (fyRes.ok) {
        const data = await fyRes.json();
        setFiscalYears(data);
        // Set quarters from active FY
        const activeFY = data.find(fy => fy.status === 'active');
        if (activeFY?.quarters) {
          setQuarters(activeFY.quarters);
        }
      }
      if (goalsRes.ok) setGoals(await goalsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (deptsRes.ok) setDepartments(await deptsRes.json());
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  // Update quarters when fiscal year changes
  useEffect(() => {
    if (filterFY !== 'all') {
      const fy = fiscalYears.find(f => f.id === filterFY);
      if (fy?.quarters) setQuarters(fy.quarters);
    }
  }, [filterFY, fiscalYears]);

  const handleOpenModal = (obj = null) => {
    if (obj) {
      setEditingObj(obj);
      setFormData({
        title: obj.title,
        description: obj.description || '',
        strategic_goal_id: obj.strategic_goal_id,
        fiscal_year_id: obj.fiscal_year_id,
        quarter_id: obj.quarter_id,
        department: obj.department || '',
        owner_id: obj.owner_id || '',
        sponsor_id: obj.sponsor_id || '',
        priority: obj.priority,
        status: obj.status,
        start_date: obj.start_date?.split('T')[0] || '',
        target_date: obj.target_date?.split('T')[0] || ''
      });
    } else {
      setEditingObj(null);
      const activeFY = fiscalYears.find(fy => fy.status === 'active');
      setFormData({
        title: '',
        description: '',
        strategic_goal_id: filterGoal !== 'all' ? filterGoal : '',
        fiscal_year_id: activeFY?.id || '',
        quarter_id: '',
        department: '',
        owner_id: '',
        sponsor_id: '',
        priority: 'medium',
        status: 'planning',
        start_date: '',
        target_date: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Objective title is required');
      return;
    }
    if (!formData.strategic_goal_id || !formData.fiscal_year_id || !formData.quarter_id) {
      toast.error('Please select strategic goal, fiscal year, and quarter');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const method = editingObj ? 'PUT' : 'POST';
      const url = editingObj 
        ? `${API}/api/goals/objectives/${editingObj.id}`
        : `${API}/api/goals/objectives`;

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingObj ? 'Objective updated' : 'Objective created');
        setShowModal(false);
        fetchObjectives();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to save objective');
      }
    } catch (error) {
      console.error('Failed to save objective:', error);
      toast.error('Failed to save objective');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (obj) => {
    if (!window.confirm(`Are you sure you want to delete "${obj.title}"?`)) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/objectives/${obj.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Objective deleted');
        fetchObjectives();
      } else {
        toast.error('Failed to delete objective');
      }
    } catch (error) {
      console.error('Failed to delete objective:', error);
      toast.error('Failed to delete objective');
    }
  };

  const handleClick = (obj) => {
    // Navigate to objective detail page
    navigate(`/goals/objectives/${obj.id}`);
  };

  // Get quarters for selected fiscal year in form
  const formQuarters = formData.fiscal_year_id 
    ? fiscalYears.find(fy => fy.id === formData.fiscal_year_id)?.quarters || []
    : [];

  return (
    <div className="p-6 space-y-6" data-testid="objectives-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/goals')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#4A3728]">Objectives</h1>
            <p className="text-[#6B5D52]">Quarterly objectives aligned to strategic goals</p>
          </div>
        </div>
        <Button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={goals.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Objective
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
                  placeholder="Search objectives..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-[#D4BBA6]"
                />
              </div>
            </div>
            <Select value={filterGoal} onValueChange={setFilterGoal}>
              <SelectTrigger className="w-[180px] border-[#D4BBA6]">
                <SelectValue placeholder="Strategic Goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                {goals.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
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
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[140px] border-[#D4BBA6]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Objectives Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : objectives.length === 0 ? (
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-[#D4BBA6] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#4A3728] mb-2">No Objectives</h3>
            <p className="text-[#6B5D52] mb-6">
              {goals.length === 0 
                ? 'Create strategic goals first to start defining objectives.'
                : 'Create your first objective to start tracking quarterly execution.'
              }
            </p>
            {goals.length > 0 && (
              <Button 
                onClick={() => handleOpenModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Objective
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {objectives.map(obj => (
            <ObjectiveCard 
              key={obj.id} 
              objective={obj}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              onClick={handleClick}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#4A3728]">
              <Target className="w-5 h-5 text-purple-600" />
              {editingObj ? 'Edit Objective' : 'New Objective'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[#4A3728]">Objective Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Launch Marketplace MVP"
                className="mt-1.5 border-[#D4BBA6]"
              />
            </div>

            <div>
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the objective..."
                className="mt-1.5 border-[#D4BBA6] min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Strategic Goal *</Label>
                <Select 
                  value={formData.strategic_goal_id} 
                  onValueChange={(v) => setFormData({ ...formData, strategic_goal_id: v })}
                >
                  <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {goals.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#4A3728]">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(v) => setFormData({ ...formData, department: v })}
                >
                  <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                    <SelectValue placeholder="Select dept" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Fiscal Year *</Label>
                <Select 
                  value={formData.fiscal_year_id} 
                  onValueChange={(v) => setFormData({ ...formData, fiscal_year_id: v, quarter_id: '' })}
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
                <Label className="text-[#4A3728]">Quarter *</Label>
                <Select 
                  value={formData.quarter_id} 
                  onValueChange={(v) => setFormData({ ...formData, quarter_id: v })}
                  disabled={!formData.fiscal_year_id}
                >
                  <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {formQuarters.map(q => (
                      <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <Label className="text-[#4A3728]">Sponsor</Label>
                <Select 
                  value={formData.sponsor_id} 
                  onValueChange={(v) => setFormData({ ...formData, sponsor_id: v })}
                >
                  <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                    <SelectValue placeholder="Select sponsor" />
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
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1.5 border-[#D4BBA6]"
                />
              </div>
              <div>
                <Label className="text-[#4A3728]">Target Date</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="mt-1.5 border-[#D4BBA6]"
                />
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
              {editingObj ? 'Save Changes' : 'Create Objective'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
