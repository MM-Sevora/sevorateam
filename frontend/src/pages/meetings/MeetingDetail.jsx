import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Users, Target, Folder, Building2,
  Plus, Trash2, ArrowLeft, Save, Video, FileText, Link as LinkIcon,
  Play, CheckCircle2, AlertCircle, Edit, MoreVertical, MessageSquare,
  ListTodo, RefreshCw, ChevronRight, ExternalLink, Copy, Check,
  PauseCircle, XCircle, ArrowRight, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const meetingTypeLabels = {
  okr_review: 'OKR Review',
  leadership_strategy: 'Leadership Strategy',
  quarterly_business_review: 'Quarterly Business Review',
  department_weekly: 'Department Weekly',
  department_monthly: 'Department Monthly',
  project_kickoff: 'Project Kickoff',
  sprint_planning: 'Sprint Planning',
  project_review: 'Project Review',
  sprint_retrospective: 'Sprint Retrospective',
  weekly_team_review: 'Weekly Team Review',
  daily_standup: 'Daily Standup',
  one_on_one: 'One-on-One',
  performance_discussion: 'Performance Discussion',
  general: 'General'
};

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  postponed: 'bg-slate-100 text-slate-700 border-slate-200'
};

const priorityColors = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-700'
};

const actionItemStatusColors = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  converted_to_task: 'bg-purple-100 text-purple-700'
};

const MeetingDetail = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState(null);
  const [previousContext, setPreviousContext] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showActionItemModal, setShowActionItemModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [selectedActionItem, setSelectedActionItem] = useState(null);
  
  // Form states
  const [noteForm, setNoteForm] = useState({ topic: '', notes: '', related_goal_id: '', related_project_id: '' });
  const [actionItemForm, setActionItemForm] = useState({ title: '', description: '', assigned_to: '', deadline: '', priority: 'medium', linked_project_id: '' });
  const [convertForm, setConvertForm] = useState({ project_id: '', module_id: '' });
  const [minutesForm, setMinutesForm] = useState({ summary: '', key_discussions: '', decisions: '', next_steps: '' });
  
  // Options
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [goals, setGoals] = useState([]);

  const fetchMeeting = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meetingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setMeeting(await res.json());
      } else {
        toast.error('Meeting not found');
        navigate('/meetings');
      }
    } catch (error) {
      console.error('Error fetching meeting:', error);
      toast.error('Error loading meeting');
    }
  }, [meetingId, navigate]);

  const fetchPreviousContext = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meetingId}/previous-context`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setPreviousContext(await res.json());
      }
    } catch (error) {
      console.error('Error fetching previous context:', error);
    }
  }, [meetingId]);

  const fetchOptions = async () => {
    const token = localStorage.getItem('sevora_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [usersRes, projectsRes, goalsRes] = await Promise.all([
        fetch(`${API}/api/users`, { headers }),
        fetch(`${API}/api/projects`, { headers }),
        fetch(`${API}/api/strategic-goals`, { headers })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (goalsRes.ok) setGoals(await goalsRes.json());
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMeeting(), fetchPreviousContext(), fetchOptions()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMeeting, fetchPreviousContext]);

  // Meeting Status Actions
  const handleStartMeeting = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meetingId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success('Meeting started');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Error starting meeting');
    }
  };

  const handleCompleteMeeting = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meetingId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success('Meeting completed');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Error completing meeting');
    }
  };

  // Discussion Notes
  const handleAddNote = async () => {
    if (!noteForm.topic || !noteForm.notes) {
      toast.error('Please fill in topic and notes');
      return;
    }

    try {
      const token = localStorage.getItem('sevora_token');
      const params = new URLSearchParams({
        topic: noteForm.topic,
        notes: noteForm.notes
      });
      if (noteForm.related_goal_id) params.append('related_goal_id', noteForm.related_goal_id);
      if (noteForm.related_project_id) params.append('related_project_id', noteForm.related_project_id);

      const res = await fetch(`${API}/api/meetings/${meetingId}/notes?${params}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Note added');
        setShowNoteModal(false);
        setNoteForm({ topic: '', notes: '', related_goal_id: '', related_project_id: '' });
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Error adding note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meetingId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Note deleted');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Error deleting note');
    }
  };

  // Action Items
  const handleAddActionItem = async () => {
    if (!actionItemForm.title) {
      toast.error('Please enter action item title');
      return;
    }

    try {
      const token = localStorage.getItem('sevora_token');
      const params = new URLSearchParams({ title: actionItemForm.title });
      if (actionItemForm.description) params.append('description', actionItemForm.description);
      if (actionItemForm.assigned_to) params.append('assigned_to', actionItemForm.assigned_to);
      if (actionItemForm.deadline) params.append('deadline', actionItemForm.deadline);
      if (actionItemForm.priority) params.append('priority', actionItemForm.priority);
      if (actionItemForm.linked_project_id) params.append('linked_project_id', actionItemForm.linked_project_id);

      const res = await fetch(`${API}/api/meetings/${meetingId}/action-items?${params}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Action item added');
        setShowActionItemModal(false);
        setActionItemForm({ title: '', description: '', assigned_to: '', deadline: '', priority: 'medium', linked_project_id: '' });
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Error adding action item');
    }
  };

  const handleUpdateActionItemStatus = async (actionItemId, status) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meetingId}/action-items/${actionItemId}?status=${status}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Status updated');
        fetchMeeting();
      }
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  const handleConvertToTask = async () => {
    if (!selectedActionItem) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const params = new URLSearchParams();
      if (convertForm.project_id) params.append('project_id', convertForm.project_id);
      if (convertForm.module_id) params.append('module_id', convertForm.module_id);

      const res = await fetch(`${API}/api/meetings/${meetingId}/action-items/${selectedActionItem.id}/convert-to-task?${params}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const result = await res.json();
        toast.success('Action item converted to task');
        setShowConvertModal(false);
        setSelectedActionItem(null);
        setConvertForm({ project_id: '', module_id: '' });
        fetchMeeting();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Error converting to task');
      }
    } catch (error) {
      toast.error('Error converting to task');
    }
  };

  // Meeting Minutes
  const handleGenerateMinutes = async (autoGenerate = false) => {
    try {
      const token = localStorage.getItem('sevora_token');
      
      if (autoGenerate) {
        const res = await fetch(`${API}/api/meetings/${meetingId}/minutes/generate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          toast.success('Meeting minutes generated');
          fetchMeeting();
        }
      } else {
        const res = await fetch(`${API}/api/meetings/${meetingId}/minutes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            meeting_id: meetingId,
            summary: minutesForm.summary,
            key_discussions: minutesForm.key_discussions,
            decisions: minutesForm.decisions,
            next_steps: minutesForm.next_steps,
            auto_generated: false
          })
        });

        if (res.ok) {
          toast.success('Meeting minutes saved');
          setShowMinutesModal(false);
          setMinutesForm({ summary: '', key_discussions: '', decisions: '', next_steps: '' });
        }
      }
    } catch (error) {
      toast.error('Error saving minutes');
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meeting) return null;

  return (
    <div className="p-8 space-y-6" data-testid="meeting-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/meetings')}
            className="text-[#4A3728] mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={statusColors[meeting.status]}>
                {meeting.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="bg-[#F5EBE0] text-[#5D4A3A]">
                {meetingTypeLabels[meeting.meeting_type] || meeting.meeting_type}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-[#4A3728]">{meeting.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-[#5D4A3A]">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDateTime(meeting.start_time)}
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {meeting.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {meeting.participants?.length || 0} participants
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {meeting.status === 'scheduled' && (
            <Button onClick={handleStartMeeting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Play className="w-4 h-4 mr-2" />
              Start Meeting
            </Button>
          )}
          {meeting.status === 'in_progress' && (
            <Button onClick={handleCompleteMeeting} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Meeting
            </Button>
          )}
          {meeting.status === 'completed' && (
            <Button onClick={() => setShowMinutesModal(true)} variant="outline" className="border-[#D4BBA6]">
              <FileText className="w-4 h-4 mr-2" />
              Meeting Minutes
            </Button>
          )}
          <Button variant="outline" className="border-[#D4BBA6]" onClick={() => navigate(`/meetings/${meetingId}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Linked Items */}
      {(meeting.linked_project_name || meeting.linked_goal_name || meeting.department_name) && (
        <div className="flex flex-wrap gap-2">
          {meeting.linked_project_name && (
            <Badge variant="outline" className="bg-[#F5EBE0] text-[#5D4A3A] border-[#D4BBA6] px-3 py-1">
              <Folder className="w-3.5 h-3.5 mr-1.5" />
              {meeting.linked_project_name}
            </Badge>
          )}
          {meeting.linked_goal_name && (
            <Badge variant="outline" className="bg-[#F5EBE0] text-[#5D4A3A] border-[#D4BBA6] px-3 py-1">
              <Target className="w-3.5 h-3.5 mr-1.5" />
              {meeting.linked_goal_name}
            </Badge>
          )}
          {meeting.department_name && (
            <Badge variant="outline" className="bg-[#F5EBE0] text-[#5D4A3A] border-[#D4BBA6] px-3 py-1">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              {meeting.department_name}
            </Badge>
          )}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#F5EBE0] p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white px-6">
            Overview
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-white px-6">
            Discussion Notes
            {meeting.discussion_notes?.length > 0 && (
              <Badge className="ml-2 bg-[#4A3728] text-white text-xs">{meeting.discussion_notes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions" className="data-[state=active]:bg-white px-6">
            Action Items
            {meeting.action_items?.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white text-xs">{meeting.action_items.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="previous" className="data-[state=active]:bg-white px-6">
            Previous Context
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agenda */}
            <Card className="bg-white border-[#E8D5C4] shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#4A3728] text-base flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Meeting Agenda
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.agenda?.length > 0 ? (
                  <div className="space-y-3">
                    {meeting.agenda.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-start gap-3 p-3 bg-[#F5EBE0] rounded-lg">
                        <Badge variant="outline" className="bg-white mt-0.5">{idx + 1}</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-[#4A3728]">{item.title}</p>
                          {item.presenter_name && (
                            <p className="text-xs text-[#6B5D52] mt-1">Presenter: {item.presenter_name}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-white text-[#6B5D52]">
                          {item.duration_minutes} min
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#6B5D52] text-center py-4">No agenda items</p>
                )}
              </CardContent>
            </Card>

            {/* Participants */}
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#4A3728] text-base flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants ({meeting.participants?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.participants?.length > 0 ? (
                  <div className="space-y-2">
                    {meeting.participants.map((p, idx) => (
                      <div key={p.user_id || idx} className="flex items-center gap-3 p-2 bg-[#F5EBE0] rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-[#4A3728] text-white flex items-center justify-center text-sm font-medium">
                          {p.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#4A3728] truncate">{p.name}</p>
                          <p className="text-xs text-[#6B5D52] capitalize">{p.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#6B5D52] text-center py-4">No participants</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {meeting.description && (
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#4A3728] text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#5D4A3A] whitespace-pre-wrap">{meeting.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Pre-read Documents */}
          {meeting.pre_read_documents?.length > 0 && (
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#4A3728] text-base flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Pre-Read Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {meeting.pre_read_documents.map((doc, idx) => (
                    <a
                      key={doc.id || idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-[#F5EBE0] rounded-lg hover:bg-[#E8D5C4] transition-colors"
                    >
                      <FileText className="w-5 h-5 text-[#4A3728]" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#4A3728] truncate">{doc.title}</p>
                        <p className="text-xs text-[#6B5D52] capitalize">{doc.file_type}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#6B5D52]" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Discussion Notes Tab */}
        <TabsContent value="notes" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-[#4A3728]">Discussion Notes</h3>
            <Button size="sm" onClick={() => setShowNoteModal(true)} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>

          {meeting.discussion_notes?.length > 0 ? (
            <div className="space-y-4">
              {meeting.discussion_notes.map((note, idx) => (
                <Card key={note.id || idx} className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-[#4A3728]">{note.topic}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-[#5D4A3A] whitespace-pre-wrap mb-3">{note.notes}</p>
                    <div className="flex flex-wrap gap-2">
                      {note.related_goal_name && (
                        <Badge variant="outline" className="bg-[#F5EBE0] text-[#5D4A3A]">
                          <Target className="w-3 h-3 mr-1" />
                          {note.related_goal_name}
                        </Badge>
                      )}
                      {note.related_project_name && (
                        <Badge variant="outline" className="bg-[#F5EBE0] text-[#5D4A3A]">
                          <Folder className="w-3 h-3 mr-1" />
                          {note.related_project_name}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                <h3 className="font-semibold text-[#4A3728] mb-1">No Discussion Notes</h3>
                <p className="text-[#6B5D52] text-sm mb-4">Capture key discussion points during the meeting</p>
                <Button size="sm" onClick={() => setShowNoteModal(true)} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Note
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-[#4A3728]">Action Items</h3>
            <Button size="sm" onClick={() => setShowActionItemModal(true)} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Action Item
            </Button>
          </div>

          {meeting.action_items?.length > 0 ? (
            <div className="space-y-3">
              {meeting.action_items.map((item, idx) => (
                <Card key={item.id || idx} className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={actionItemStatusColors[item.status]}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={priorityColors[item.priority]}>
                            {item.priority}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-[#4A3728]">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-[#5D4A3A] mt-1">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#6B5D52]">
                          {item.assigned_to_name && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {item.assigned_to_name}
                            </span>
                          )}
                          {item.deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.deadline)}
                            </span>
                          )}
                          {item.linked_project_name && (
                            <span className="flex items-center gap-1">
                              <Folder className="w-3 h-3" />
                              {item.linked_project_name}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
                          {item.status !== 'completed' && item.status !== 'converted_to_task' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateActionItemStatus(item.id, 'in_progress')}
                                className="cursor-pointer"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Mark In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateActionItemStatus(item.id, 'completed')}
                                className="cursor-pointer text-emerald-600"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#E8D5C4]" />
                              <DropdownMenuItem 
                                onClick={() => { setSelectedActionItem(item); setShowConvertModal(true); }}
                                className="cursor-pointer text-purple-600"
                              >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Convert to Task
                              </DropdownMenuItem>
                            </>
                          )}
                          {item.converted_task_id && (
                            <DropdownMenuItem 
                              onClick={() => navigate(`/projects/tasks/${item.converted_task_id}`)}
                              className="cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Task
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <ListTodo className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                <h3 className="font-semibold text-[#4A3728] mb-1">No Action Items</h3>
                <p className="text-[#6B5D52] text-sm mb-4">Track follow-up tasks from this meeting</p>
                <Button size="sm" onClick={() => setShowActionItemModal(true)} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Action Item
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Previous Context Tab */}
        <TabsContent value="previous" className="mt-6 space-y-4">
          {previousContext?.previous_meeting_id ? (
            <div className="space-y-6">
              {/* Previous Meeting Info */}
              <Card className="bg-white border-[#E8D5C4] shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#4A3728] text-base">Previous Meeting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                    <div>
                      <p className="font-semibold text-[#4A3728]">{previousContext.previous_meeting_title}</p>
                      <p className="text-sm text-[#6B5D52]">{formatDate(previousContext.previous_meeting_date)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/meetings/${previousContext.previous_meeting_id}`)}
                      className="border-[#D4BBA6]"
                    >
                      View Meeting
                    </Button>
                  </div>
                  {previousContext.previous_summary && (
                    <p className="mt-3 text-[#5D4A3A]">{previousContext.previous_summary}</p>
                  )}
                </CardContent>
              </Card>

              {/* Action Items Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Completed ({previousContext.completed_action_items?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {previousContext.completed_action_items?.length > 0 ? (
                      <div className="space-y-2">
                        {previousContext.completed_action_items.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="text-sm text-[#5D4A3A] flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span className="line-through opacity-60">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6B5D52]">No completed items</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Pending ({previousContext.pending_action_items?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {previousContext.pending_action_items?.length > 0 ? (
                      <div className="space-y-2">
                        {previousContext.pending_action_items.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="text-sm text-[#5D4A3A] flex items-start gap-2">
                            <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <span>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6B5D52]">No pending items</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4] shadow-sm border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      Overdue ({previousContext.overdue_action_items?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {previousContext.overdue_action_items?.length > 0 ? (
                      <div className="space-y-2">
                        {previousContext.overdue_action_items.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="text-sm text-red-600 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6B5D52]">No overdue items</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <RefreshCw className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                <h3 className="font-semibold text-[#4A3728] mb-1">No Previous Meeting</h3>
                <p className="text-[#6B5D52] text-sm">This appears to be the first meeting of this type</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Add Discussion Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Topic *</Label>
              <Input
                value={noteForm.topic}
                onChange={(e) => setNoteForm({ ...noteForm, topic: e.target.value })}
                placeholder="Discussion topic"
                className="border-[#D4BBA6]"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Notes *</Label>
              <Textarea
                value={noteForm.notes}
                onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })}
                placeholder="Key points discussed..."
                className="border-[#D4BBA6] min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Related Goal</Label>
                <Select value={noteForm.related_goal_id || 'none'} onValueChange={(v) => setNoteForm({ ...noteForm, related_goal_id: v === 'none' ? '' : v })}>
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="none">None</SelectItem>
                    {goals.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#4A3728]">Related Project</Label>
                <Select value={noteForm.related_project_id || 'none'} onValueChange={(v) => setNoteForm({ ...noteForm, related_project_id: v === 'none' ? '' : v })}>
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="none">None</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteModal(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleAddNote} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Action Item Modal */}
      <Dialog open={showActionItemModal} onOpenChange={setShowActionItemModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Add Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Title *</Label>
              <Input
                value={actionItemForm.title}
                onChange={(e) => setActionItemForm({ ...actionItemForm, title: e.target.value })}
                placeholder="Action item title"
                className="border-[#D4BBA6]"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea
                value={actionItemForm.description}
                onChange={(e) => setActionItemForm({ ...actionItemForm, description: e.target.value })}
                placeholder="Additional details..."
                className="border-[#D4BBA6]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Assigned To</Label>
                <Select value={actionItemForm.assigned_to || 'none'} onValueChange={(v) => setActionItemForm({ ...actionItemForm, assigned_to: v === 'none' ? '' : v })}>
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#4A3728]">Deadline</Label>
                <Input
                  type="date"
                  value={actionItemForm.deadline}
                  onChange={(e) => setActionItemForm({ ...actionItemForm, deadline: e.target.value })}
                  className="border-[#D4BBA6]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Priority</Label>
                <Select value={actionItemForm.priority} onValueChange={(v) => setActionItemForm({ ...actionItemForm, priority: v })}>
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#4A3728]">Linked Project</Label>
                <Select value={actionItemForm.linked_project_id || 'none'} onValueChange={(v) => setActionItemForm({ ...actionItemForm, linked_project_id: v === 'none' ? '' : v })}>
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="none">None</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionItemModal(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleAddActionItem} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
              Add Action Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Task Modal */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Convert to Task</DialogTitle>
            <DialogDescription className="text-[#6B5D52]">
              This will create a new task in Project Management from this action item.
            </DialogDescription>
          </DialogHeader>
          {selectedActionItem && (
            <div className="space-y-4">
              <div className="p-3 bg-[#F5EBE0] rounded-lg">
                <p className="font-medium text-[#4A3728]">{selectedActionItem.title}</p>
                {selectedActionItem.description && (
                  <p className="text-sm text-[#6B5D52] mt-1">{selectedActionItem.description}</p>
                )}
              </div>
              <div>
                <Label className="text-[#4A3728]">Target Project</Label>
                <Select value={convertForm.project_id || selectedActionItem.linked_project_id || 'none'} onValueChange={(v) => setConvertForm({ ...convertForm, project_id: v === 'none' ? '' : v })}>
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="none">No Project (Standalone Task)</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConvertModal(false); setSelectedActionItem(null); }} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleConvertToTask} className="bg-purple-600 hover:bg-purple-700 text-white">
              <ArrowRight className="w-4 h-4 mr-2" />
              Convert to Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Minutes Modal */}
      <Dialog open={showMinutesModal} onOpenChange={setShowMinutesModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Meeting Minutes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleGenerateMinutes(true)}
                className="border-[#D4BBA6]"
              >
                <Zap className="w-4 h-4 mr-2" />
                Auto-Generate
              </Button>
            </div>
            <div>
              <Label className="text-[#4A3728]">Summary</Label>
              <Textarea
                value={minutesForm.summary}
                onChange={(e) => setMinutesForm({ ...minutesForm, summary: e.target.value })}
                placeholder="Brief meeting summary..."
                className="border-[#D4BBA6]"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Key Discussions</Label>
              <Textarea
                value={minutesForm.key_discussions}
                onChange={(e) => setMinutesForm({ ...minutesForm, key_discussions: e.target.value })}
                placeholder="Main topics and points discussed..."
                className="border-[#D4BBA6] min-h-[100px]"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Decisions Made</Label>
              <Textarea
                value={minutesForm.decisions}
                onChange={(e) => setMinutesForm({ ...minutesForm, decisions: e.target.value })}
                placeholder="Key decisions taken..."
                className="border-[#D4BBA6]"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Next Steps</Label>
              <Textarea
                value={minutesForm.next_steps}
                onChange={(e) => setMinutesForm({ ...minutesForm, next_steps: e.target.value })}
                placeholder="Follow-up actions and next steps..."
                className="border-[#D4BBA6]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMinutesModal(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={() => handleGenerateMinutes(false)} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
              <Save className="w-4 h-4 mr-2" />
              Save Minutes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingDetail;
