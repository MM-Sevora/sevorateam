import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Search, Filter, Clock, Users, MapPin, Video,
  ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, Play,
  CheckCircle2, AlertCircle, Target, Folder, Building2, RefreshCw,
  FileText, ListTodo, BarChart3
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
  postponed: 'bg-slate-100 text-slate-700'
};

// ============== MEETING CARD ==============
const MeetingCard = ({ meeting, onClick, onEdit, onDelete, onStart }) => {
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
      className="group hover:shadow-md transition-all duration-200 cursor-pointer border-[#E8D5C4] hover:border-[#D4BBA6] shadow-sm bg-white"
      onClick={() => onClick(meeting)}
      data-testid={`meeting-card-${meeting.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStart(meeting); }} className="cursor-pointer text-emerald-600">
                  <Play className="w-4 h-4 mr-2" /> Start Meeting
                </DropdownMenuItem>
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Get calendar range (current month)
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
      await Promise.all([fetchMeetings(), fetchDashboard(), fetchCalendarMeetings(startDate, endDate), fetchAnalytics()]);
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
        </div>
      </div>

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
    </div>
  );
};

export default MeetingList;
