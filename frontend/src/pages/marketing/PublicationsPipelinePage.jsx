import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import api from '../../lib/api';
import {
  Building2, Search, RefreshCw, MoreHorizontal, Mail, MessageSquare,
  DollarSign, ChevronRight, Send, Clock, CheckCircle2, FileText,
  XCircle, Newspaper, Trash2, Phone, ArrowRight, Plus, Eye, Edit2,
  TrendingUp, Target, ExternalLink, Globe, Users
} from 'lucide-react';

// PR/Publication Pipeline stages
const PIPELINE_STAGES = [
  { 
    id: 'pitched', 
    label: 'Pitched', 
    icon: Send,
    gradient: 'from-slate-600 to-slate-700',
    cardAccent: 'border-l-slate-500',
    lightBg: 'bg-slate-50',
    textColor: 'text-slate-700'
  },
  { 
    id: 'interested', 
    label: 'Interested', 
    icon: MessageSquare,
    gradient: 'from-blue-500 to-blue-600',
    cardAccent: 'border-l-blue-500',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  { 
    id: 'interview_scheduled', 
    label: 'Interview/Meeting', 
    icon: Clock,
    gradient: 'from-violet-500 to-purple-600',
    cardAccent: 'border-l-violet-500',
    lightBg: 'bg-violet-50',
    textColor: 'text-violet-700'
  },
  { 
    id: 'content_review', 
    label: 'Content Review', 
    icon: FileText,
    gradient: 'from-amber-500 to-orange-500',
    cardAccent: 'border-l-amber-500',
    lightBg: 'bg-amber-50',
    textColor: 'text-amber-700'
  },
  { 
    id: 'approved', 
    label: 'Approved', 
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-green-600',
    cardAccent: 'border-l-emerald-500',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-700'
  },
  { 
    id: 'published', 
    label: 'Published', 
    icon: Newspaper,
    gradient: 'from-cyan-500 to-teal-500',
    cardAccent: 'border-l-cyan-500',
    lightBg: 'bg-cyan-50',
    textColor: 'text-cyan-700'
  },
  { 
    id: 'declined', 
    label: 'Declined', 
    icon: XCircle,
    gradient: 'from-red-500 to-rose-600',
    cardAccent: 'border-l-red-500',
    lightBg: 'bg-red-50',
    textColor: 'text-red-700'
  }
];

const PITCH_TYPES = [
  { value: 'press_release', label: 'Press Release' },
  { value: 'story_pitch', label: 'Story Pitch' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'interview_request', label: 'Interview Request' },
  { value: 'event_coverage', label: 'Event Coverage' },
  { value: 'sponsored_content', label: 'Sponsored Content' },
  { value: 'thought_leadership', label: 'Thought Leadership' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
];

export default function PublicationsPipelinePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pitches, setPitches] = useState([]);
  const [publications, setPublications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPitch, setEditingPitch] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    publication_id: '',
    journalist_name: '',
    journalist_email: '',
    pitch_type: 'story_pitch',
    subject: '',
    description: '',
    target_date: '',
    priority: 'medium',
    stage: 'pitched',
    notes: ''
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pitched: 0,
    interested: 0,
    published: 0,
    success_rate: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch pitches
      const pitchesRes = await api.get('/marketing/v3/publications/pitches');
      setPitches(pitchesRes.data || []);

      // Fetch publications for dropdown
      const pubsRes = await api.get('/marketing/v2/publications?limit=100');
      setPublications(pubsRes.data.publications || pubsRes.data || []);

      // Calculate stats
      const allPitches = pitchesRes.data || [];
      const published = allPitches.filter(p => p.stage === 'published').length;
      const declined = allPitches.filter(p => p.stage === 'declined').length;
      const completed = published + declined;
      
      setStats({
        total: allPitches.length,
        pitched: allPitches.filter(p => p.stage === 'pitched').length,
        interested: allPitches.filter(p => ['interested', 'interview_scheduled', 'content_review', 'approved'].includes(p.stage)).length,
        published,
        success_rate: completed > 0 ? Math.round((published / completed) * 100) : 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreatePitch = async () => {
    if (!formData.publication_id || !formData.subject) {
      toast.error('Please select a publication and enter a subject');
      return;
    }

    try {
      const response = await api.post('/marketing/v3/publications/pitches', formData);
      if (response.data) {
        toast.success('Pitch created successfully');
        setShowAddDialog(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create pitch');
    }
  };

  const handleUpdatePitch = async () => {
    if (!editingPitch) return;

    try {
      await api.put(`/marketing/v3/publications/pitches/${editingPitch.id}`, formData);
      toast.success('Pitch updated');
      setEditingPitch(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to update pitch');
    }
  };

  const handleMoveStage = async (pitchId, newStage) => {
    try {
      await api.put(`/marketing/v3/publications/pitches/${pitchId}`, { stage: newStage });
      toast.success(`Moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  const handleDeletePitch = async (pitchId) => {
    if (!window.confirm('Delete this pitch?')) return;
    
    try {
      await api.delete(`/marketing/v3/publications/pitches/${pitchId}`);
      toast.success('Pitch deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete pitch');
    }
  };

  const resetForm = () => {
    setFormData({
      publication_id: '',
      journalist_name: '',
      journalist_email: '',
      pitch_type: 'story_pitch',
      subject: '',
      description: '',
      target_date: '',
      priority: 'medium',
      stage: 'pitched',
      notes: ''
    });
  };

  const openEditDialog = (pitch) => {
    setEditingPitch(pitch);
    setFormData({
      publication_id: pitch.publication_id || '',
      journalist_name: pitch.journalist_name || '',
      journalist_email: pitch.journalist_email || '',
      pitch_type: pitch.pitch_type || 'story_pitch',
      subject: pitch.subject || '',
      description: pitch.description || '',
      target_date: pitch.target_date || '',
      priority: pitch.priority || 'medium',
      stage: pitch.stage || 'pitched',
      notes: pitch.notes || ''
    });
    setShowAddDialog(true);
  };

  // Filter pitches by search
  const filteredPitches = pitches.filter(pitch => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pitch.subject?.toLowerCase().includes(query) ||
      pitch.publication_name?.toLowerCase().includes(query) ||
      pitch.journalist_name?.toLowerCase().includes(query)
    );
  });

  // Group pitches by stage
  const pitchesByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = filteredPitches.filter(p => p.stage === stage.id);
    return acc;
  }, {});

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="p-6 space-y-6" data-testid="publications-pipeline-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Publications Pipeline
          </h1>
          <p className="text-gray-500">Track PR pitches and media coverage</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => { resetForm(); setEditingPitch(null); setShowAddDialog(true); }} data-testid="new-pitch-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Pitch
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Pitches</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Awaiting Response</p>
            <p className="text-2xl font-bold text-slate-600">{stats.pitched}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.interested}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-2xl font-bold text-green-600">{stats.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Success Rate</p>
            <p className="text-2xl font-bold text-purple-600">{stats.success_rate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search pitches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => {
          const StageIcon = stage.icon;
          const stagePitches = pitchesByStage[stage.id] || [];
          
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              {/* Stage Header */}
              <div className={`p-3 rounded-t-lg bg-gradient-to-r ${stage.gradient} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StageIcon className="w-4 h-4" />
                    <span className="font-medium">{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {stagePitches.length}
                  </Badge>
                </div>
              </div>
              
              {/* Stage Cards */}
              <div className={`${stage.lightBg} rounded-b-lg p-2 min-h-[400px] space-y-2`}>
                {stagePitches.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No pitches
                  </div>
                ) : (
                  stagePitches.map(pitch => (
                    <PitchCard
                      key={pitch.id}
                      pitch={pitch}
                      stage={stage}
                      onEdit={() => openEditDialog(pitch)}
                      onDelete={() => handleDeletePitch(pitch.id)}
                      onMoveStage={handleMoveStage}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Pitch Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPitch ? 'Edit Pitch' : 'New Pitch'}</DialogTitle>
            <DialogDescription>
              {editingPitch ? 'Update pitch details' : 'Create a new PR pitch'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Publication *</Label>
              <Select 
                value={formData.publication_id} 
                onValueChange={(v) => setFormData({...formData, publication_id: v})}
              >
                <SelectTrigger data-testid="publication-select">
                  <SelectValue placeholder="Select publication" />
                </SelectTrigger>
                <SelectContent>
                  {publications.map(pub => (
                    <SelectItem key={pub.id} value={pub.id}>{pub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Journalist Name</Label>
              <Input
                value={formData.journalist_name}
                onChange={(e) => setFormData({...formData, journalist_name: e.target.value})}
                placeholder="Contact person"
              />
            </div>

            <div className="space-y-2">
              <Label>Journalist Email</Label>
              <Input
                type="email"
                value={formData.journalist_email}
                onChange={(e) => setFormData({...formData, journalist_email: e.target.value})}
                placeholder="email@publication.com"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Subject / Headline *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Pitch subject line"
                data-testid="pitch-subject-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Pitch Type</Label>
              <Select 
                value={formData.pitch_type} 
                onValueChange={(v) => setFormData({...formData, pitch_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PITCH_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({...formData, priority: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({...formData, target_date: e.target.value})}
              />
            </div>

            {editingPitch && (
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select 
                  value={formData.stage} 
                  onValueChange={(v) => setFormData({...formData, stage: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Pitch details..."
                rows={3}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Internal notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setEditingPitch(null); }}>
              Cancel
            </Button>
            <Button onClick={editingPitch ? handleUpdatePitch : handleCreatePitch} data-testid="save-pitch-btn">
              {editingPitch ? 'Update Pitch' : 'Create Pitch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Pitch Card Component
function PitchCard({ pitch, stage, onEdit, onDelete, onMoveStage, formatDate }) {
  const priorityConfig = PRIORITY_OPTIONS.find(p => p.value === pitch.priority);
  const pitchTypeLabel = PITCH_TYPES.find(t => t.value === pitch.pitch_type)?.label || pitch.pitch_type;

  // Get next stages for quick move
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
  const nextStages = PIPELINE_STAGES.slice(currentIndex + 1).filter(s => s.id !== 'declined');

  return (
    <Card className={`border-l-4 ${stage.cardAccent} hover:shadow-md transition-shadow`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{pitch.subject}</p>
            <p className="text-xs text-gray-500 truncate">{pitch.publication_name}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {nextStages.map(nextStage => (
                <DropdownMenuItem 
                  key={nextStage.id}
                  onClick={() => onMoveStage(pitch.id, nextStage.id)}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Move to {nextStage.label}
                </DropdownMenuItem>
              ))}
              {stage.id !== 'declined' && (
                <DropdownMenuItem onClick={() => onMoveStage(pitch.id, 'declined')}>
                  <XCircle className="w-4 h-4 mr-2 text-red-500" />
                  Mark Declined
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">{pitchTypeLabel}</Badge>
          {priorityConfig && (
            <Badge className={`text-xs ${priorityConfig.color}`}>{priorityConfig.label}</Badge>
          )}
        </div>

        {pitch.journalist_name && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            <span className="truncate">{pitch.journalist_name}</span>
          </div>
        )}

        {pitch.target_date && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Target: {formatDate(pitch.target_date)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
