import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Target, ArrowLeft, Edit, Flag, Calendar, User, Building2, Clock,
  Plus, Trash2, AlertTriangle, CheckCircle2, FolderKanban, TrendingUp,
  Loader2, BarChart3, MessageSquare, ChevronRight, Video, Users, CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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

const unitLabels = {
  number: '',
  percentage: '%',
  currency: '$',
  milestone: ''
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Key Result Card Component
const KeyResultCard = ({ kr, onEdit, onDelete }) => {
  const progressColor = kr.progress >= 100 ? 'bg-emerald-500' : kr.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500';
  
  return (
    <div className="p-4 bg-[#FDF8F3] rounded-lg border border-[#E8D5C4]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-[#4A3728]">{kr.title}</h4>
          <p className="text-xs text-[#6B5D52] mt-1">
            {kr.unit_type === 'milestone' ? (
              <span>{kr.current_value >= kr.target_value ? 'Completed' : 'In Progress'}</span>
            ) : (
              <span>
                {kr.unit_type === 'currency' && '$'}{kr.current_value}{kr.unit_type === 'percentage' && '%'} 
                {' / '}
                {kr.unit_type === 'currency' && '$'}{kr.target_value}{kr.unit_type === 'percentage' && '%'}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={kr.progress >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}>
            {kr.progress.toFixed(0)}%
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => onEdit(kr)} className="h-8 w-8 p-0">
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(kr)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <Progress value={kr.progress} className={`h-2 ${progressColor}`} />
    </div>
  );
};

// Linked Project Card Component
const LinkedProjectCard = ({ project, onClick }) => (
  <div 
    className="p-4 bg-white rounded-lg border border-[#E8D5C4] hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
          <FolderKanban className="w-4 h-4 text-rose-600" />
        </div>
        <div>
          <h4 className="font-medium text-[#4A3728] text-sm">{project.name}</h4>
          <Badge variant="outline" className="text-[10px] mt-0.5">{project.project_id}</Badge>
        </div>
      </div>
      <Badge variant="outline" className={statusColors[project.status] || statusColors.planning}>
        {project.status?.replace('_', ' ')}
      </Badge>
    </div>
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-[#6B5D52] mb-1">
        <span>{project.completed_task_count || 0}/{project.task_count || 0} tasks</span>
        <span>{project.progress?.toFixed(0) || 0}%</span>
      </div>
      <Progress value={project.progress || 0} className="h-1.5" />
    </div>
    <div className="flex items-center justify-between mt-2 text-xs text-[#6B5D52]">
      {project.owner_name && (
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" /> {project.owner_name}
        </span>
      )}
      <ChevronRight className="w-4 h-4" />
    </div>
  </div>
);

// Progress Update Card Component
const UpdateCard = ({ update }) => (
  <div className="flex gap-4 p-4 bg-[#FDF8F3] rounded-lg border border-[#E8D5C4]">
    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
      <TrendingUp className="w-5 h-5 text-indigo-600" />
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#4A3728]">{update.progress}% Progress</span>
          {update.blockers && (
            <Badge variant="outline" className="bg-red-50 text-red-600 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" /> Blocker
            </Badge>
          )}
        </div>
        <span className="text-xs text-[#6B5D52]">{formatDateTime(update.created_at)}</span>
      </div>
      {update.note && <p className="text-sm text-[#6B5D52] mb-2">{update.note}</p>}
      {update.blockers && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
          <strong>Blocker:</strong> {update.blockers}
        </p>
      )}
      <p className="text-xs text-[#9C8C74] mt-2">Updated by {update.updated_by_name || 'System'}</p>
    </div>
  </div>
);

export default function ObjectiveDetail() {
  const { objectiveId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [objective, setObjective] = useState(null);
  const [keyResults, setKeyResults] = useState([]);
  const [linkedProjects, setLinkedProjects] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [relatedMeetings, setRelatedMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Key Result Modal
  const [showKRModal, setShowKRModal] = useState(false);
  const [editingKR, setEditingKR] = useState(null);
  const [krFormData, setKRFormData] = useState({
    title: '',
    target_value: '',
    current_value: '0',
    unit_type: 'number',
    status: 'active'
  });
  const [savingKR, setSavingKR] = useState(false);

  // Progress Update Modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    progress: '',
    note: '',
    blockers: ''
  });
  const [savingUpdate, setSavingUpdate] = useState(false);

  const fetchObjective = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/objectives/${objectiveId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setObjective(data);
      } else {
        toast.error('Objective not found');
        navigate('/goals/objectives');
      }
    } catch (error) {
      console.error('Failed to fetch objective:', error);
      toast.error('Failed to load objective');
    }
  }, [objectiveId, navigate]);

  const fetchKeyResults = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/key-results?objective_id=${objectiveId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setKeyResults(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch key results:', error);
    }
  }, [objectiveId]);

  const fetchLinkedProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/projects/list?linked_objective_id=${objectiveId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLinkedProjects(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch linked projects:', error);
    }
  }, [objectiveId]);

  const fetchUpdates = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/objectives/${objectiveId}/updates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUpdates(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch updates:', error);
    }
  }, [objectiveId]);

  const fetchRelatedMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings?objective_id=${objectiveId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRelatedMeetings(Array.isArray(data) ? data : data.meetings || []);
      }
    } catch (error) {
      console.error('Failed to fetch related meetings:', error);
    } finally {
      setLoadingMeetings(false);
    }
  }, [objectiveId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchObjective();
      await Promise.all([fetchKeyResults(), fetchLinkedProjects(), fetchUpdates(), fetchRelatedMeetings()]);
      setLoading(false);
    };
    loadData();
  }, [fetchObjective, fetchKeyResults, fetchLinkedProjects, fetchUpdates, fetchRelatedMeetings]);

  // Key Result handlers
  const handleOpenKRModal = (kr = null) => {
    if (kr) {
      setEditingKR(kr);
      setKRFormData({
        title: kr.title,
        target_value: kr.target_value.toString(),
        current_value: kr.current_value.toString(),
        unit_type: kr.unit_type,
        status: kr.status
      });
    } else {
      setEditingKR(null);
      setKRFormData({
        title: '',
        target_value: '',
        current_value: '0',
        unit_type: 'number',
        status: 'active'
      });
    }
    setShowKRModal(true);
  };

  const handleSaveKR = async () => {
    if (!krFormData.title || !krFormData.target_value) {
      toast.error('Title and target value are required');
      return;
    }

    setSavingKR(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const method = editingKR ? 'PUT' : 'POST';
      const url = editingKR
        ? `${API}/api/goals/key-results/${editingKR.id}`
        : `${API}/api/goals/key-results`;

      const payload = {
        ...krFormData,
        objective_id: objectiveId,
        target_value: parseFloat(krFormData.target_value),
        current_value: parseFloat(krFormData.current_value || 0)
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingKR ? 'Key result updated' : 'Key result created');
        setShowKRModal(false);
        fetchKeyResults();
      } else {
        toast.error('Failed to save key result');
      }
    } catch (error) {
      console.error('Failed to save key result:', error);
      toast.error('Failed to save key result');
    } finally {
      setSavingKR(false);
    }
  };

  const handleDeleteKR = async (kr) => {
    if (!window.confirm(`Delete key result "${kr.title}"?`)) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/key-results/${kr.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Key result deleted');
        fetchKeyResults();
      } else {
        toast.error('Failed to delete key result');
      }
    } catch (error) {
      toast.error('Failed to delete key result');
    }
  };

  // Progress Update handlers
  const handleSaveUpdate = async () => {
    if (!updateFormData.progress) {
      toast.error('Progress percentage is required');
      return;
    }

    setSavingUpdate(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/objectives/${objectiveId}/updates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          objective_id: objectiveId,
          progress: parseFloat(updateFormData.progress),
          note: updateFormData.note || null,
          blockers: updateFormData.blockers || null
        })
      });

      if (res.ok) {
        toast.success('Progress updated');
        setShowUpdateModal(false);
        setUpdateFormData({ progress: '', note: '', blockers: '' });
        fetchObjective();
        fetchUpdates();
      } else {
        toast.error('Failed to save update');
      }
    } catch (error) {
      toast.error('Failed to save update');
    } finally {
      setSavingUpdate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!objective) {
    return (
      <div className="p-6 text-center">
        <Target className="w-16 h-16 text-[#D4BBA6] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#4A3728]">Objective not found</h2>
        <Button onClick={() => navigate('/goals/objectives')} className="mt-4">
          Back to Objectives
        </Button>
      </div>
    );
  }

  const krProgress = keyResults.length > 0
    ? keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length
    : 0;

  const projectProgress = linkedProjects.length > 0
    ? linkedProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / linkedProjects.length
    : 0;

  return (
    <div className="p-6 space-y-6" data-testid="objective-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/goals/objectives')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#4A3728]">{objective.title}</h1>
              <Badge variant="outline" className={statusColors[objective.status]}>
                {objective.status === 'at_risk' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {objective.status?.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={priorityColors[objective.priority]}>
                {objective.priority}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-[#6B5D52]">
              <span className="flex items-center gap-1">
                <Flag className="w-4 h-4" />
                {objective.strategic_goal_title}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {objective.quarter_name} - {objective.fiscal_year_name}
              </span>
              {objective.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {objective.department}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/meetings/new?objective_id=${objectiveId}&type=okr_review`)}
            className="border-violet-300 text-violet-700 hover:bg-violet-50"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Schedule Meeting
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setUpdateFormData({ progress: objective.progress?.toString() || '', note: '', blockers: '' });
              setShowUpdateModal(true);
            }}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Update Progress
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4">
            <p className="text-sm text-[#6B5D52] mb-1">Overall Progress</p>
            <p className="text-3xl font-bold text-indigo-600">{objective.progress?.toFixed(0) || 0}%</p>
            <Progress value={objective.progress || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4">
            <p className="text-sm text-[#6B5D52] mb-1">Key Results</p>
            <p className="text-3xl font-bold text-purple-600">{keyResults.length}</p>
            <p className="text-xs text-[#9C8C74] mt-1">{krProgress.toFixed(0)}% avg progress</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4">
            <p className="text-sm text-[#6B5D52] mb-1">Linked Projects</p>
            <p className="text-3xl font-bold text-rose-600">{linkedProjects.length}</p>
            <p className="text-xs text-[#9C8C74] mt-1">{projectProgress.toFixed(0)}% avg progress</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4">
            <p className="text-sm text-[#6B5D52] mb-1">Target Date</p>
            <p className="text-lg font-semibold text-[#4A3728]">{formatDate(objective.target_date)}</p>
            {objective.owner_name && (
              <p className="text-xs text-[#9C8C74] mt-1 flex items-center gap-1">
                <User className="w-3 h-3" /> {objective.owner_name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5EBE0]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="key-results">Key Results ({keyResults.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({linkedProjects.length})</TabsTrigger>
          <TabsTrigger value="meetings">Meetings ({relatedMeetings.length})</TabsTrigger>
          <TabsTrigger value="updates">Updates ({updates.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Description */}
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A3728]">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#6B5D52]">
                  {objective.description || 'No description provided.'}
                </p>
                <div className="mt-4 pt-4 border-t border-[#E8D5C4] grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#9C8C74]">Owner</p>
                    <p className="text-[#4A3728] font-medium">{objective.owner_name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-[#9C8C74]">Sponsor</p>
                    <p className="text-[#4A3728] font-medium">{objective.sponsor_name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-[#9C8C74]">Start Date</p>
                    <p className="text-[#4A3728] font-medium">{formatDate(objective.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-[#9C8C74]">Target Date</p>
                    <p className="text-[#4A3728] font-medium">{formatDate(objective.target_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Results Summary */}
            <Card className="border-[#E8D5C4]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-[#4A3728]">Key Results</CardTitle>
                <Button size="sm" onClick={() => handleOpenKRModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent>
                {keyResults.length === 0 ? (
                  <div className="text-center py-8 text-[#6B5D52]">
                    <BarChart3 className="w-12 h-12 text-[#D4BBA6] mx-auto mb-2" />
                    <p>No key results defined</p>
                    <p className="text-xs mt-1">Add measurable outcomes to track progress</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {keyResults.slice(0, 3).map(kr => (
                      <KeyResultCard key={kr.id} kr={kr} onEdit={handleOpenKRModal} onDelete={handleDeleteKR} />
                    ))}
                    {keyResults.length > 3 && (
                      <Button variant="ghost" className="w-full text-indigo-600" onClick={() => setActiveTab('key-results')}>
                        View all {keyResults.length} key results
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Updates */}
          {updates.length > 0 && (
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A3728]">Recent Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {updates.slice(0, 3).map((update, idx) => (
                    <UpdateCard key={idx} update={update} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Key Results Tab */}
        <TabsContent value="key-results" className="mt-4">
          <Card className="border-[#E8D5C4]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-[#4A3728]">Key Results</CardTitle>
                <CardDescription>Measurable outcomes that define success</CardDescription>
              </div>
              <Button onClick={() => handleOpenKRModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Key Result
              </Button>
            </CardHeader>
            <CardContent>
              {keyResults.length === 0 ? (
                <div className="text-center py-12 text-[#6B5D52]">
                  <BarChart3 className="w-16 h-16 text-[#D4BBA6] mx-auto mb-3" />
                  <h3 className="font-semibold text-[#4A3728]">No Key Results</h3>
                  <p className="text-sm mt-1">Define measurable outcomes to track objective progress</p>
                  <Button onClick={() => handleOpenKRModal()} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Create First Key Result
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keyResults.map(kr => (
                    <KeyResultCard key={kr.id} kr={kr} onEdit={handleOpenKRModal} onDelete={handleDeleteKR} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-4">
          <Card className="border-[#E8D5C4]">
            <CardHeader>
              <CardTitle className="text-lg text-[#4A3728]">Linked Projects</CardTitle>
              <CardDescription>Projects contributing to this objective's completion</CardDescription>
            </CardHeader>
            <CardContent>
              {linkedProjects.length === 0 ? (
                <div className="text-center py-12 text-[#6B5D52]">
                  <FolderKanban className="w-16 h-16 text-[#D4BBA6] mx-auto mb-3" />
                  <h3 className="font-semibold text-[#4A3728]">No Linked Projects</h3>
                  <p className="text-sm mt-1">Link projects to this objective from the Projects page</p>
                  <Button onClick={() => navigate('/projects')} variant="outline" className="mt-4">
                    Go to Projects
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {linkedProjects.map(project => (
                    <LinkedProjectCard 
                      key={project.id} 
                      project={project}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="mt-4">
          <Card className="border-[#E8D5C4]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <Video className="w-5 h-5 text-violet-600" />
                  Related Meetings
                  {relatedMeetings.length > 0 && (
                    <Badge className="bg-violet-100 text-violet-700 ml-2">{relatedMeetings.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>Meetings linked to this objective</CardDescription>
              </div>
              <Button
                onClick={() => navigate(`/meetings/new?objective_id=${objectiveId}&type=okr_review`)}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMeetings ? (
                <div className="text-center py-8 text-[#6B5D52]">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  Loading meetings...
                </div>
              ) : relatedMeetings.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 mx-auto text-[#D4BBA6] mb-3" />
                  <h3 className="font-semibold text-[#4A3728]">No Meetings Yet</h3>
                  <p className="text-sm text-[#6B5D52] mt-1">Schedule a meeting to discuss this objective</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/meetings/new?objective_id=${objectiveId}&type=okr_review`)}
                    className="mt-4 border-[#D4BBA6]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule First Meeting
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedMeetings.map(meeting => (
                    <div 
                      key={meeting.id}
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
                      className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg hover:bg-[#EDE3D8] cursor-pointer transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-[#4A3728]">{meeting.title}</p>
                        <div className="flex items-center gap-3 text-xs text-[#6B5D52] mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(meeting.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(meeting.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {meeting.participant_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {meeting.participant_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        meeting.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {meeting.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="mt-4">
          <Card className="border-[#E8D5C4]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-[#4A3728]">Progress Updates</CardTitle>
                <CardDescription>History of progress changes and blockers</CardDescription>
              </div>
              <Button onClick={() => setShowUpdateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Update
              </Button>
            </CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <div className="text-center py-12 text-[#6B5D52]">
                  <MessageSquare className="w-16 h-16 text-[#D4BBA6] mx-auto mb-3" />
                  <h3 className="font-semibold text-[#4A3728]">No Updates Yet</h3>
                  <p className="text-sm mt-1">Add progress updates to track objective execution</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map((update, idx) => (
                    <UpdateCard key={idx} update={update} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Key Result Modal */}
      <Dialog open={showKRModal} onOpenChange={setShowKRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#4A3728]">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              {editingKR ? 'Edit Key Result' : 'New Key Result'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[#4A3728]">Key Result Title *</Label>
              <Input
                value={krFormData.title}
                onChange={(e) => setKRFormData({ ...krFormData, title: e.target.value })}
                placeholder="e.g., Onboard 50 brands"
                className="mt-1.5 border-[#D4BBA6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Target Value *</Label>
                <Input
                  type="number"
                  value={krFormData.target_value}
                  onChange={(e) => setKRFormData({ ...krFormData, target_value: e.target.value })}
                  placeholder="50"
                  className="mt-1.5 border-[#D4BBA6]"
                />
              </div>
              <div>
                <Label className="text-[#4A3728]">Current Value</Label>
                <Input
                  type="number"
                  value={krFormData.current_value}
                  onChange={(e) => setKRFormData({ ...krFormData, current_value: e.target.value })}
                  placeholder="0"
                  className="mt-1.5 border-[#D4BBA6]"
                />
              </div>
            </div>

            <div>
              <Label className="text-[#4A3728]">Unit Type</Label>
              <Select 
                value={krFormData.unit_type} 
                onValueChange={(v) => setKRFormData({ ...krFormData, unit_type: v })}
              >
                <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number (e.g., 50 brands)</SelectItem>
                  <SelectItem value="percentage">Percentage (e.g., 80%)</SelectItem>
                  <SelectItem value="currency">Currency (e.g., $10,000)</SelectItem>
                  <SelectItem value="milestone">Milestone (e.g., Launch done)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKRModal(false)}>Cancel</Button>
            <Button onClick={handleSaveKR} disabled={savingKR} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {savingKR && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingKR ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Update Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#4A3728]">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Update Progress
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[#4A3728]">Progress Percentage *</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={updateFormData.progress}
                onChange={(e) => setUpdateFormData({ ...updateFormData, progress: e.target.value })}
                placeholder="e.g., 45"
                className="mt-1.5 border-[#D4BBA6]"
              />
            </div>

            <div>
              <Label className="text-[#4A3728]">Update Note</Label>
              <Textarea
                value={updateFormData.note}
                onChange={(e) => setUpdateFormData({ ...updateFormData, note: e.target.value })}
                placeholder="Describe progress made..."
                className="mt-1.5 border-[#D4BBA6] min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-[#4A3728] text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Blockers (if any)
              </Label>
              <Textarea
                value={updateFormData.blockers}
                onChange={(e) => setUpdateFormData({ ...updateFormData, blockers: e.target.value })}
                placeholder="Describe any blockers or issues..."
                className="mt-1.5 border-[#D4BBA6] min-h-[60px] border-red-200 focus:border-red-400"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateModal(false)}>Cancel</Button>
            <Button onClick={handleSaveUpdate} disabled={savingUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {savingUpdate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
