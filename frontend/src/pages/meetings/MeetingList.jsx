import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Search, Filter, Clock, Users, MapPin, Video,
  ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, Play,
  CheckCircle2, AlertCircle, Target, Folder, Building2, RefreshCw,
  FileText, ListTodo, BarChart3, Link2, Unlink, ExternalLink, XCircle,
  SkipForward, Square, CheckSquare, Download, CalendarClock, Loader2
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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

const meetingTypeColors = {
  okr_review: 'bg-purple-100 text-purple-700 border-purple-200',
  leadership_strategy: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  quarterly_business_review: 'bg-blue-100 text-blue-700 border-blue-200',
  department_weekly: 'bg-teal-100 text-teal-700 border-teal-200',
  department_monthly: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  project_kickoff: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sprint_planning: 'bg-green-100 text-green-700 border-green-200',
  project_review: 'bg-amber-100 text-amber-700 border-amber-200',
  sprint_retrospective: 'bg-orange-100 text-orange-700 border-orange-200',
  weekly_team_review: 'bg-rose-100 text-rose-700 border-rose-200',
  daily_standup: 'bg-pink-100 text-pink-700 border-pink-200',
  one_on_one: 'bg-violet-100 text-violet-700 border-violet-200',
  performance_discussion: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  general: 'bg-slate-100 text-slate-700 border-slate-200'
};

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  postponed: 'bg-slate-100 text-slate-700',
  skipped: 'bg-purple-100 text-purple-700'
};

// ============== MEETING CARD ==============
const MeetingCard = ({ meeting, onClick, onEdit, onDelete, onStart, onCancel, onSkip, selectable, selected, onToggleSelect }) => {
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card 
      className={`group hover:shadow-md transition-all duration-200 cursor-pointer border-[#E8D5C4] hover:border-[#D4BBA6] shadow-sm bg-white ${selected ? 'ring-2 ring-blue-500 border-blue-300' : ''}`}
      onClick={() => !selectable && onClick(meeting)}
      data-testid={`meeting-card-${meeting.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Checkbox for bulk selection */}
            {selectable && (
              <div 
                className="mt-0.5 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onToggleSelect(meeting.id, e); }}
              >
                {selected ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-[#8B7355] hover:text-blue-600" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0" onClick={() => selectable && onClick(meeting)}>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`text-xs ${meetingTypeColors[meeting.meeting_type] || meetingTypeColors.general}`}>
                  {meetingTypeLabels[meeting.meeting_type] || meeting.meeting_type}
                </Badge>
                <Badge variant="outline" className={`text-xs ${statusColors[meeting.status]}`}>
                  {meeting.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-[#4A3728] line-clamp-1">{meeting.title}</h3>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4 text-[#5D4A3A]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(meeting); }} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              {meeting.status === 'scheduled' && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStart(meeting); }} className="cursor-pointer text-emerald-600">
                    <Play className="w-4 h-4 mr-2" /> Start Meeting
                  </DropdownMenuItem>
                  {/* Skip option - only for recurring meetings */}
                  {meeting.recurrence_type && meeting.recurrence_type !== 'none' && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSkip(meeting); }} className="cursor-pointer text-blue-600">
                      <SkipForward className="w-4 h-4 mr-2" /> Skip This Week
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCancel(meeting); }} className="cursor-pointer text-amber-600">
                    <XCircle className="w-4 h-4 mr-2" /> Cancel Meeting
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="bg-[#E8D5C4]" />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(meeting); }} className="cursor-pointer text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meeting Info */}
        <div className="space-y-2 text-sm text-[#5D4A3A]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#6B5D52]" />
            <span>{formatDate(meeting.start_time)}</span>
            <Clock className="w-4 h-4 text-[#6B5D52] ml-2" />
            <span>{formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}</span>
          </div>
          
          {meeting.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#6B5D52]" />
              <span className="truncate">{meeting.location}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6B5D52]" />
            <span>{meeting.participant_count} participants</span>
            {meeting.organizer_name && (
              <span className="text-[#9C8C74]">• Organized by {meeting.organizer_name}</span>
            )}
          </div>
        </div>

        {/* Linked Items */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {meeting.recurrence_type && meeting.recurrence_type !== 'none' && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              <RefreshCw className="w-3 h-3 mr-1" />
              {meeting.recurrence_type.charAt(0).toUpperCase() + meeting.recurrence_type.slice(1)}
            </Badge>
          )}
          {meeting.linked_project_name && (
            <Badge variant="outline" className="text-xs bg-[#F5EBE0] text-[#5D4A3A] border-[#D4BBA6]">
              <Folder className="w-3 h-3 mr-1" />
              {meeting.linked_project_name}
            </Badge>
          )}
          {meeting.linked_goal_name && (
            <Badge variant="outline" className="text-xs bg-[#F5EBE0] text-[#5D4A3A] border-[#D4BBA6]">
              <Target className="w-3 h-3 mr-1" />
              {meeting.linked_goal_name}
            </Badge>
          )}
          {meeting.department_name && (
            <Badge variant="outline" className="text-xs bg-[#F5EBE0] text-[#5D4A3A] border-[#D4BBA6]">
              <Building2 className="w-3 h-3 mr-1" />
              {meeting.department_name}
            </Badge>
          )}
          {meeting.has_action_items && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              <ListTodo className="w-3 h-3 mr-1" />
              Action Items
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============== MAIN COMPONENT ==============
const MeetingList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [calendarMeetings, setCalendarMeetings] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [filters, setFilters] = useState({
    search: '',
    meeting_type: 'all',
    status: 'all'
  });
  
  // MS Calendar state
  const [msCalendarStatus, setMsCalendarStatus] = useState(null);
  const [showMsCalendarModal, setShowMsCalendarModal] = useState(false);
  const [connectingToMs, setConnectingToMs] = useState(false);
  const [syncingFromOutlook, setSyncingFromOutlook] = useState(false);
  
  // Bulk selection state
  const [selectedMeetings, setSelectedMeetings] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkRescheduleModal, setShowBulkRescheduleModal] = useState(false);
  const [bulkRescheduleForm, setBulkRescheduleForm] = useState({ days_offset: 1, reason: '' });
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const params = new URLSearchParams();
      
      if (filters.meeting_type !== 'all') params.append('meeting_type', filters.meeting_type);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const res = await fetch(`${API}/api/meetings?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setMeetings(await res.json());
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  }, [filters]);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/dashboard/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setDashboard(await res.json());
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchCalendarMeetings = async (startDate, endDate) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/calendar?start_date=${startDate}&end_date=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCalendarMeetings(data.map(m => ({
          id: m.id,
          title: m.title,
          start: m.start,
          end: m.end,
          backgroundColor: meetingTypeColors[m.meeting_type]?.includes('bg-purple') ? '#8B5CF6' :
                          meetingTypeColors[m.meeting_type]?.includes('bg-blue') ? '#3B82F6' :
                          meetingTypeColors[m.meeting_type]?.includes('bg-emerald') ? '#10B981' :
                          meetingTypeColors[m.meeting_type]?.includes('bg-amber') ? '#F59E0B' :
                          meetingTypeColors[m.meeting_type]?.includes('bg-rose') ? '#F43F5E' :
                          '#6B7280',
          borderColor: 'transparent',
          extendedProps: {
            meeting_type: m.meeting_type,
            status: m.status,
            location: m.location,
            organizer_name: m.organizer_name,
            participant_count: m.participant_count,
            linked_project_name: m.linked_project_name
          }
        })));
      }
    } catch (error) {
      console.error('Error fetching calendar meetings:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/analytics/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchMsCalendarStatus = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/ms-calendar/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setMsCalendarStatus(await res.json());
      }
    } catch (error) {
      console.error('Error fetching MS Calendar status:', error);
    }
  };

  const handleConnectMsCalendar = async () => {
    setConnectingToMs(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/ms-calendar/connect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ready' && data.auth_url) {
          // Open OAuth URL in new window
          window.open(data.auth_url, '_blank', 'width=600,height=700');
          toast.info('Complete the Microsoft login in the popup window');
          // Poll for connection status
          const pollInterval = setInterval(async () => {
            const statusRes = await fetch(`${API}/api/meetings/ms-calendar/status`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (statusRes.ok) {
              const status = await statusRes.json();
              if (status.is_connected) {
                clearInterval(pollInterval);
                setMsCalendarStatus(status);
                setShowMsCalendarModal(false);
                toast.success(`Connected to Outlook as ${status.ms_email}`);
              }
            }
          }, 3000);
          // Stop polling after 2 minutes
          setTimeout(() => clearInterval(pollInterval), 120000);
        } else if (data.status === 'not_configured') {
          toast.error('Microsoft Calendar integration is not configured');
        }
      }
    } catch (error) {
      toast.error('Error connecting to Microsoft Calendar');
    } finally {
      setConnectingToMs(false);
    }
  };

  const handleDisconnectMsCalendar = async () => {
    if (!window.confirm('Disconnect from Microsoft Calendar?')) return;
    
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/ms-calendar/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setMsCalendarStatus({ is_connected: false, sync_status: 'not_connected' });
        toast.success('Disconnected from Microsoft Calendar');
      }
    } catch (error) {
      toast.error('Error disconnecting');
    }
  };

  const handleSyncFromOutlook = async () => {
    if (!msCalendarStatus?.is_connected) {
      toast.error('Please connect your Outlook calendar first');
      return;
    }
    
    setSyncingFromOutlook(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/ms-calendar/sync-from-outlook`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (data.status === 'success') {
        if (data.synced_count > 0) {
          toast.success(`Synced ${data.synced_count} meeting(s) from Outlook`);
          // Show changes in detail
          data.changes.forEach(change => {
            console.log(`Meeting "${change.meeting_title}":`, change.changes);
          });
          // Refresh meetings list
          fetchMeetings();
          fetchDashboard();
        } else {
          toast.info('All meetings are already in sync');
        }
        // Update last sync time
        fetchMsCalendarStatus();
      } else if (data.error === 'token_expired') {
        toast.error('Microsoft token expired. Please reconnect your Outlook calendar.');
      } else {
        toast.error(data.message || 'Failed to sync from Outlook');
      }
    } catch (error) {
      console.error('Error syncing from Outlook:', error);
      toast.error('Error syncing from Outlook');
    } finally {
      setSyncingFromOutlook(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Get calendar range (current month)
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
      await Promise.all([fetchMeetings(), fetchDashboard(), fetchCalendarMeetings(startDate, endDate), fetchAnalytics(), fetchMsCalendarStatus()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMeetings]);

  const handleMeetingClick = (meeting) => {
    navigate(`/meetings/${meeting.id}`);
  };

  const handleEdit = (meeting) => {
    navigate(`/meetings/${meeting.id}/edit`);
  };

  const handleDelete = async (meeting) => {
    if (!window.confirm(`Delete "${meeting.title}"?`)) return;
    
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meeting.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success('Meeting deleted');
        fetchMeetings();
        fetchDashboard();
      } else {
        toast.error('Failed to delete meeting');
      }
    } catch (error) {
      toast.error('Error deleting meeting');
    }
  };

  const handleStart = async (meeting) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meeting.id}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success('Meeting started');
        fetchMeetings();
        navigate(`/meetings/${meeting.id}`);
      } else {
        toast.error('Failed to start meeting');
      }
    } catch (error) {
      toast.error('Error starting meeting');
    }
  };

  const handleCancel = async (meeting) => {
    if (!window.confirm(`Cancel "${meeting.title}"?`)) return;
    
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meeting.id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success('Meeting cancelled');
        fetchMeetings();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to cancel meeting');
      }
    } catch (error) {
      toast.error('Error cancelling meeting');
    }
  };

  const handleSkip = async (meeting) => {
    if (!window.confirm(`Skip "${meeting.title}"? The next occurrence will be created automatically.`)) return;
    
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/${meeting.id}/skip`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const result = await res.json();
        toast.success('Meeting skipped');
        if (result.next_recurring_meeting_id) {
          toast.info('Next occurrence created');
        }
        fetchMeetings();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to skip meeting');
      }
    } catch (error) {
      toast.error('Error skipping meeting');
    }
  };

  // ============== BULK ACTIONS ==============
  const toggleMeetingSelection = (meetingId, e) => {
    e?.stopPropagation();
    const newSelected = new Set(selectedMeetings);
    if (newSelected.has(meetingId)) {
      newSelected.delete(meetingId);
    } else {
      newSelected.add(meetingId);
    }
    setSelectedMeetings(newSelected);
  };

  const toggleSelectAll = () => {
    const currentMeetings = activeTab === 'upcoming' ? upcomingMeetings : 
                           activeTab === 'past' ? pastMeetings : myMeetings;
    if (selectedMeetings.size === currentMeetings.length) {
      setSelectedMeetings(new Set());
    } else {
      setSelectedMeetings(new Set(currentMeetings.map(m => m.id)));
    }
  };

  const clearSelection = () => {
    setSelectedMeetings(new Set());
    setBulkMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedMeetings.size === 0) return;
    if (!window.confirm(`Delete ${selectedMeetings.size} meeting(s)?`)) return;
    
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/bulk/delete`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ meeting_ids: Array.from(selectedMeetings) })
      });
      
      if (res.ok) {
        const result = await res.json();
        toast.success(`${result.deleted_count} meeting(s) deleted`);
        clearSelection();
        fetchMeetings();
        fetchDashboard();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to delete meetings');
      }
    } catch (error) {
      toast.error('Error deleting meetings');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedMeetings.size === 0) return;
    if (!window.confirm(`Cancel ${selectedMeetings.size} meeting(s)?`)) return;
    
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/bulk/cancel`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ meeting_ids: Array.from(selectedMeetings) })
      });
      
      if (res.ok) {
        const result = await res.json();
        toast.success(`${result.cancelled_count} meeting(s) cancelled`);
        clearSelection();
        fetchMeetings();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to cancel meetings');
      }
    } catch (error) {
      toast.error('Error cancelling meetings');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReschedule = async () => {
    if (selectedMeetings.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/bulk/reschedule`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          meeting_ids: Array.from(selectedMeetings),
          days_offset: parseInt(bulkRescheduleForm.days_offset),
          reason: bulkRescheduleForm.reason
        })
      });
      
      if (res.ok) {
        const result = await res.json();
        toast.success(`${result.rescheduled_count} meeting(s) rescheduled by ${result.days_offset} day(s)`);
        clearSelection();
        setShowBulkRescheduleModal(false);
        setBulkRescheduleForm({ days_offset: 1, reason: '' });
        fetchMeetings();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to reschedule meetings');
      }
    } catch (error) {
      toast.error('Error rescheduling meetings');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkExport = async (format = 'csv') => {
    if (selectedMeetings.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/bulk/export?format=${format}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ meeting_ids: Array.from(selectedMeetings) })
      });
      
      if (res.ok) {
        if (format === 'csv') {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `meetings_export_${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `meetings_export_${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
        toast.success(`${selectedMeetings.size} meeting(s) exported as ${format.toUpperCase()}`);
      } else {
        toast.error('Failed to export meetings');
      }
    } catch (error) {
      toast.error('Error exporting meetings');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCalendarEventClick = (info) => {
    navigate(`/meetings/${info.event.id}`);
  };

  const handleCalendarDateChange = (dateInfo) => {
    fetchCalendarMeetings(dateInfo.startStr, dateInfo.endStr);
  };

  // Filter meetings by tab
  const now = new Date().toISOString();
  const upcomingMeetings = meetings.filter(m => m.start_time > now && m.status === 'scheduled');
  const pastMeetings = meetings.filter(m => m.start_time <= now || m.status === 'completed');
  const myMeetings = meetings; // In a real app, filter by user's meetings

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8" data-testid="meetings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Meetings & Reviews</h1>
          <p className="text-[#5D4A3A] mt-1">Schedule and manage meetings linked to goals and projects</p>
        </div>
        <div className="flex gap-2">
          {/* MS Calendar Connection Button */}
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowMsCalendarModal(true)}
            className={`border-[#D4BBA6] hover:bg-[#F5EBE0] ${msCalendarStatus?.is_connected ? 'text-emerald-600 border-emerald-300 bg-emerald-50' : 'text-[#4A3728]'}`}
            data-testid="ms-calendar-btn"
          >
            {msCalendarStatus?.is_connected ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Outlook Connected
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Connect Outlook
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => navigate('/meetings/templates')}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
            data-testid="templates-btn"
          >
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </Button>
          {/* Sync from Outlook Button */}
          {msCalendarStatus?.is_connected && (
            <Button 
              variant="outline"
              size="sm"
              onClick={handleSyncFromOutlook}
              disabled={syncingFromOutlook}
              className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
              data-testid="sync-outlook-btn"
            >
              {syncingFromOutlook ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Sync from Outlook
            </Button>
          )}
          <Button 
            variant="outline"
            size="sm"
            onClick={() => { fetchMeetings(); fetchDashboard(); }}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm"
            onClick={() => navigate('/meetings/new')}
            className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
            data-testid="create-meeting-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Meeting
          </Button>
          {/* Bulk Mode Toggle */}
          <Button 
            variant="outline"
            size="sm"
            onClick={() => { setBulkMode(!bulkMode); if (bulkMode) clearSelection(); }}
            className={`border-[#D4BBA6] ${bulkMode ? 'bg-blue-50 text-blue-700 border-blue-300' : 'text-[#4A3728] hover:bg-[#F5EBE0]'}`}
            data-testid="bulk-mode-btn"
          >
            {bulkMode ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {bulkMode && selectedMeetings.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-blue-700 font-medium">
              {selectedMeetings.size} meeting(s) selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="text-blue-600 hover:bg-blue-100"
            >
              {selectedMeetings.size === (activeTab === 'upcoming' ? upcomingMeetings : activeTab === 'past' ? pastMeetings : myMeetings).length 
                ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-blue-600 hover:bg-blue-100"
            >
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {/* Reschedule */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkRescheduleModal(true)}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              disabled={bulkActionLoading}
            >
              <CalendarClock className="w-4 h-4 mr-2" />
              Reschedule
            </Button>
            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkExport('csv')}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              disabled={bulkActionLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            {/* Cancel */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCancel}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
              disabled={bulkActionLoading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel All
            </Button>
            {/* Delete */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="border-red-300 text-red-700 hover:bg-red-50"
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete All
            </Button>
          </div>
        </div>
      )}

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-[#E8D5C4] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#5D4A3A] text-sm">Today's Meetings</p>
                  <p className="text-3xl font-bold text-[#4A3728] mt-1">{dashboard.meetings_today}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8D5C4] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#5D4A3A] text-sm">Upcoming</p>
                  <p className="text-3xl font-bold text-[#4A3728] mt-1">{dashboard.upcoming_meetings}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8D5C4] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#5D4A3A] text-sm">Action Items</p>
                  <p className="text-3xl font-bold text-[#4A3728] mt-1">{dashboard.pending_action_items}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ListTodo className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8D5C4] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#5D4A3A] text-sm">Overdue Items</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{dashboard.overdue_action_items}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-[#F5EBE0] p-1">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-white px-6">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-white px-6">
              Past
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-white px-6">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white px-6">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8C74]" />
              <Input
                placeholder="Search meetings..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 w-[200px] border-[#D4BBA6]"
              />
            </div>
            <Select value={filters.meeting_type} onValueChange={(v) => setFilters({ ...filters, meeting_type: v })}>
              <SelectTrigger className="w-[160px] border-[#D4BBA6]">
                <SelectValue placeholder="Meeting Type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="project_review">Project Review</SelectItem>
                <SelectItem value="sprint_planning">Sprint Planning</SelectItem>
                <SelectItem value="daily_standup">Daily Standup</SelectItem>
                <SelectItem value="one_on_one">One-on-One</SelectItem>
                <SelectItem value="okr_review">OKR Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingMeetings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={handleMeetingClick}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStart={handleStart}
                  onCancel={handleCancel}
                  onSkip={handleSkip}
                  selectable={bulkMode}
                  selected={selectedMeetings.has(meeting.id)}
                  onToggleSelect={toggleMeetingSelection}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="py-16 text-center">
                <Calendar className="w-16 h-16 mx-auto text-[#D4BBA6] mb-4" />
                <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No Upcoming Meetings</h3>
                <p className="text-[#6B5D52] mb-4">Schedule your first meeting to get started</p>
                <Button 
                  onClick={() => navigate('/meetings/new')}
                  className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Past Tab */}
        <TabsContent value="past" className="space-y-4">
          {pastMeetings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={handleMeetingClick}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStart={handleStart}
                  onCancel={handleCancel}
                  onSkip={handleSkip}
                  selectable={bulkMode}
                  selected={selectedMeetings.has(meeting.id)}
                  onToggleSelect={toggleMeetingSelection}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="py-16 text-center">
                <Calendar className="w-16 h-16 mx-auto text-[#D4BBA6] mb-4" />
                <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No Past Meetings</h3>
                <p className="text-[#6B5D52]">Completed meetings will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-4">
              <style>{`
                .fc {
                  --fc-border-color: #E8D5C4;
                  --fc-button-bg-color: #4A3728;
                  --fc-button-border-color: #4A3728;
                  --fc-button-hover-bg-color: #3A2A1E;
                  --fc-button-hover-border-color: #3A2A1E;
                  --fc-button-active-bg-color: #2D1F16;
                  --fc-button-active-border-color: #2D1F16;
                  --fc-today-bg-color: #F5EBE0;
                }
                .fc .fc-toolbar-title {
                  color: #4A3728;
                  font-weight: 600;
                }
                .fc .fc-col-header-cell-cushion {
                  color: #5D4A3A;
                  font-weight: 500;
                }
                .fc .fc-daygrid-day-number {
                  color: #4A3728;
                }
                .fc .fc-event {
                  border-radius: 4px;
                  font-size: 12px;
                  padding: 2px 4px;
                  cursor: pointer;
                }
                .fc .fc-event:hover {
                  opacity: 0.9;
                }
                .fc .fc-daygrid-event-dot {
                  display: none;
                }
                .fc .fc-timegrid-slot-label {
                  color: #6B5D52;
                }
              `}</style>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek'
                }}
                events={calendarMeetings}
                eventClick={handleCalendarEventClick}
                datesSet={handleCalendarDateChange}
                height="auto"
                dayMaxEvents={3}
                eventDisplay="block"
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  meridiem: 'short'
                }}
                eventContent={(eventInfo) => (
                  <div className="truncate px-1">
                    <span className="font-medium">{eventInfo.timeText}</span>
                    <span className="ml-1">{eventInfo.event.title}</span>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[#5D4A3A] text-sm">Total Meetings</p>
                    <p className="text-2xl font-bold text-[#4A3728] mt-1">{analytics.total_meetings}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[#5D4A3A] text-sm">Total Decisions</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{analytics.total_decisions}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[#5D4A3A] text-sm">Action Items</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{analytics.total_action_items}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[#5D4A3A] text-sm">Items Completed</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{analytics.action_items_completed}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[#5D4A3A] text-sm">Completion Rate</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{analytics.completion_rate}%</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Meetings by Month */}
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] text-base flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Meetings by Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.meetings_by_month?.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.meetings_by_month.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-sm text-[#5D4A3A] w-20">{item.month}</span>
                            <div className="flex-1 bg-[#F5EBE0] rounded-full h-4 overflow-hidden">
                              <div 
                                className="bg-[#4A3728] h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (item.count / Math.max(...analytics.meetings_by_month.map(m => m.count))) * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-[#4A3728] w-8">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B5D52] text-center py-4">No data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Meetings by Type */}
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] text-base flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Meetings by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.meetings_by_type?.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.meetings_by_type.slice(0, 8).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-[#F5EBE0] rounded-lg">
                            <Badge variant="outline" className={meetingTypeColors[item.type] || 'bg-slate-100'}>
                              {meetingTypeLabels[item.type] || item.type}
                            </Badge>
                            <span className="font-medium text-[#4A3728]">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B5D52] text-center py-4">No data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Meetings by Department */}
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] text-base flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Meetings by Department
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.meetings_by_department?.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.meetings_by_department.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-[#F5EBE0] rounded-lg">
                            <span className="text-[#4A3728] font-medium">{item.department_name}</span>
                            <span className="font-bold text-[#4A3728]">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B5D52] text-center py-4">No department data</p>
                    )}
                  </CardContent>
                </Card>

                {/* Top Organizers */}
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] text-base flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Top Organizers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.top_organizers?.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.top_organizers.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-[#F5EBE0] rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#4A3728] text-white flex items-center justify-center text-sm font-medium">
                                {item.name?.charAt(0) || '?'}
                              </div>
                              <span className="text-[#4A3728] font-medium">{item.name}</span>
                            </div>
                            <Badge variant="outline" className="bg-white">
                              {item.meetings_organized} meetings
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B5D52] text-center py-4">No organizer data</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="py-16 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-[#D4BBA6] mb-4" />
                <h3 className="text-lg font-semibold text-[#4A3728] mb-2">Loading Analytics...</h3>
                <p className="text-[#6B5D52]">Please wait while we gather your meeting data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* MS Calendar Connection Modal */}
      <Dialog open={showMsCalendarModal} onOpenChange={setShowMsCalendarModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Microsoft Outlook Calendar
            </DialogTitle>
            <DialogDescription className="text-[#6B5D52]">
              {msCalendarStatus?.is_connected 
                ? 'Your calendar is connected. Meetings can be synced to Outlook.'
                : 'Connect your Outlook calendar to sync meetings automatically.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {msCalendarStatus?.is_connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="font-medium text-emerald-800">Connected</p>
                    <p className="text-sm text-emerald-700">{msCalendarStatus.ms_email}</p>
                  </div>
                </div>
                
                {msCalendarStatus.last_sync_at && (
                  <p className="text-sm text-[#6B5D52]">
                    Last synced: {new Date(msCalendarStatus.last_sync_at).toLocaleString()}
                  </p>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDisconnectMsCalendar}
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowMsCalendarModal(false)}
                    className="flex-1 border-[#D4BBA6]"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-[#F5EBE0] rounded-lg">
                  <Calendar className="w-8 h-8 text-[#4A3728]" />
                  <div>
                    <p className="font-medium text-[#4A3728]">Not Connected</p>
                    <p className="text-sm text-[#5D4A3A]">Click below to connect your Outlook account</p>
                  </div>
                </div>
                
                <div className="text-sm text-[#6B5D52] space-y-1">
                  <p>✓ Sync meetings to your Outlook calendar</p>
                  <p>✓ Send calendar invites to participants</p>
                  <p>✓ Keep calendars in sync automatically</p>
                </div>
                
                <Button
                  onClick={handleConnectMsCalendar}
                  disabled={connectingToMs}
                  className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white"
                >
                  {connectingToMs ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect with Microsoft
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Reschedule Modal */}
      <Dialog open={showBulkRescheduleModal} onOpenChange={setShowBulkRescheduleModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-600" />
              Bulk Reschedule
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
              Rescheduling <strong>{selectedMeetings.size}</strong> meeting(s)
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Move meetings by (days)</Label>
              <Select 
                value={bulkRescheduleForm.days_offset.toString()} 
                onValueChange={(v) => setBulkRescheduleForm({ ...bulkRescheduleForm, days_offset: parseInt(v) })}
              >
                <SelectTrigger className="border-[#D4BBA6]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-7">1 week earlier</SelectItem>
                  <SelectItem value="-1">1 day earlier</SelectItem>
                  <SelectItem value="1">1 day later</SelectItem>
                  <SelectItem value="2">2 days later</SelectItem>
                  <SelectItem value="3">3 days later</SelectItem>
                  <SelectItem value="7">1 week later</SelectItem>
                  <SelectItem value="14">2 weeks later</SelectItem>
                  <SelectItem value="30">1 month later</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Reason (optional)</Label>
              <Textarea
                value={bulkRescheduleForm.reason}
                onChange={(e) => setBulkRescheduleForm({ ...bulkRescheduleForm, reason: e.target.value })}
                placeholder="Why are these meetings being rescheduled?"
                className="border-[#D4BBA6] min-h-[80px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkRescheduleModal(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkReschedule}
              disabled={bulkActionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {bulkActionLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rescheduling...</>
              ) : (
                <><CalendarClock className="w-4 h-4 mr-2" />Reschedule All</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingList;
