import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, RefreshCw,
  Loader2, Clock, MapPin, Users, Video, Filter, Eye, EyeOff,
  CalendarDays, List, Check, Settings, ExternalLink,
  Target, ClipboardList, Mail, Building2, UserCheck
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { toast } from 'sonner';
import api from '../../lib/api';

const API = process.env.REACT_APP_BACKEND_URL;

// Event source colors and icons
const EVENT_SOURCES = {
  outlook: { label: 'Outlook Calendar', color: '#0078D4', bgColor: 'bg-blue-500', icon: CalendarIcon },
  meetings: { label: 'Internal Meetings', color: '#8B5CF6', bgColor: 'bg-violet-500', icon: Users },
  marketing: { label: 'Marketing Events', color: '#EC4899', bgColor: 'bg-pink-500', icon: Target },
  sourcing: { label: 'Sourcing Follow-ups', color: '#10B981', bgColor: 'bg-emerald-500', icon: UserCheck },
  tasks: { label: 'Task Deadlines', color: '#F59E0B', bgColor: 'bg-amber-500', icon: ClipboardList },
};

const UnifiedCalendarPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const msAccount = accounts[0];

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Source visibility toggles
  const [visibleSources, setVisibleSources] = useState({
    outlook: true,
    meetings: true,
    marketing: true,
    sourcing: true,
    tasks: true
  });

  // Microsoft connection
  const [msConnected, setMsConnected] = useState(false);
  const [msToken, setMsToken] = useState(null);

  // Check Microsoft connection
  useEffect(() => {
    const token = localStorage.getItem('ms_access_token');
    if (token) {
      setMsConnected(true);
      setMsToken(token);
    }
  }, []);

  // Fetch all events from different sources
  const fetchAllEvents = useCallback(async () => {
    setLoading(true);
    const allEvents = [];
    const startDate = startOfWeek(startOfMonth(currentDate));
    const endDate = endOfWeek(endOfMonth(currentDate));

    try {
      // 1. Fetch Outlook events
      if (visibleSources.outlook && msToken) {
        try {
          const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$top=100&$select=id,subject,start,end,location,isOnlineMeeting,onlineMeetingUrl`;
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${msToken}` }
          });
          if (response.ok) {
            const data = await response.json();
            (data.value || []).forEach(event => {
              allEvents.push({
                id: `outlook-${event.id}`,
                title: event.subject,
                start: new Date(event.start.dateTime + 'Z'),
                end: new Date(event.end.dateTime + 'Z'),
                source: 'outlook',
                location: event.location?.displayName,
                isOnline: event.isOnlineMeeting,
                meetingUrl: event.onlineMeetingUrl,
                originalId: event.id
              });
            });
          }
        } catch (e) {
          console.error('Failed to fetch Outlook events:', e);
        }
      }

      // 2. Fetch Internal Meetings
      if (visibleSources.meetings) {
        try {
          const response = await api.get(`/meetings?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`);
          (response.data || []).forEach(meeting => {
            allEvents.push({
              id: `meeting-${meeting.id}`,
              title: meeting.title,
              start: new Date(meeting.start_time),
              end: new Date(meeting.end_time),
              source: 'meetings',
              location: meeting.location,
              isOnline: !!meeting.meeting_link,
              meetingUrl: meeting.meeting_link,
              originalId: meeting.id,
              status: meeting.status
            });
          });
        } catch (e) {
          console.error('Failed to fetch internal meetings:', e);
        }
      }

      // 3. Fetch Marketing Events/Campaigns
      if (visibleSources.marketing) {
        try {
          const response = await api.get('/marketing/v2/unified-campaigns');
          (response.data || []).forEach(campaign => {
            if (campaign.start_date) {
              allEvents.push({
                id: `marketing-${campaign.id}`,
                title: campaign.name,
                start: new Date(campaign.start_date),
                end: campaign.end_date ? new Date(campaign.end_date) : new Date(campaign.start_date),
                source: 'marketing',
                originalId: campaign.id,
                status: campaign.status,
                type: campaign.campaign_type
              });
            }
          });
        } catch (e) {
          console.error('Failed to fetch marketing campaigns:', e);
        }
      }

      // 4. Fetch Sourcing Follow-ups
      if (visibleSources.sourcing) {
        try {
          const response = await api.get('/sourcing/campaigns/follow-ups');
          (response.data || []).forEach(followUp => {
            if (followUp.follow_up_date) {
              allEvents.push({
                id: `sourcing-${followUp.id}`,
                title: `Follow-up: ${followUp.entity_name || 'Contact'}`,
                start: new Date(followUp.follow_up_date),
                end: new Date(followUp.follow_up_date),
                source: 'sourcing',
                originalId: followUp.id,
                entityType: followUp.entity_type
              });
            }
          });
        } catch (e) {
          console.error('Failed to fetch sourcing follow-ups:', e);
        }
      }

      // 5. Fetch Task Deadlines
      if (visibleSources.tasks) {
        try {
          const response = await api.get('/tasks/paginated?page=1&page_size=100');
          (response.data?.tasks || response.data?.items || []).forEach(task => {
            if (task.due_date) {
              allEvents.push({
                id: `task-${task.id}`,
                title: task.title,
                start: new Date(task.due_date),
                end: new Date(task.due_date),
                source: 'tasks',
                originalId: task.id,
                priority: task.priority,
                status: task.status
              });
            }
          });
        } catch (e) {
          console.error('Failed to fetch tasks:', e);
        }
      }

      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load some calendar events');
    } finally {
      setLoading(false);
    }
  }, [currentDate, visibleSources, msToken]);

  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents]);

  // Navigation
  const navigatePrev = () => setCurrentDate(subMonths(currentDate, 1));
  const navigateNext = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Toggle source visibility
  const toggleSource = (source) => {
    setVisibleSources(prev => ({ ...prev, [source]: !prev[source] }));
  };

  // Get events for a specific day
  const getEventsForDay = (date) => {
    return events.filter(event => isSameDay(event.start, date));
  };

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Handle event click
  const handleEventClick = (event) => {
    switch (event.source) {
      case 'outlook':
        // Open in Outlook web
        window.open(`https://outlook.office.com/calendar/item/${event.originalId}`, '_blank');
        break;
      case 'meetings':
        navigate(`/meetings/${event.originalId}`);
        break;
      case 'marketing':
        navigate(`/marketing/campaigns`);
        break;
      case 'sourcing':
        navigate(`/sourcing/follow-ups`);
        break;
      case 'tasks':
        navigate(`/tasks`);
        break;
      default:
        break;
    }
  };

  // Events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className={embedded ? "space-y-4" : "p-6 space-y-6 bg-[#FAF8F5] min-h-screen"} data-testid="unified-calendar-page">
      {/* Header - Hide when embedded */}
      {!embedded && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Unified Calendar</h1>
          <p className="text-[#6B5D52] mt-1">All your events in one view</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Source Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-[#D4BBA6] gap-2">
                <Filter className="w-4 h-4" />
                Sources
                <Badge variant="secondary" className="ml-1">
                  {Object.values(visibleSources).filter(Boolean).length}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6] w-64">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Sources</p>
              </div>
              {Object.entries(EVENT_SOURCES).map(([key, source]) => (
                <DropdownMenuItem 
                  key={key} 
                  onClick={(e) => { e.preventDefault(); toggleSource(key); }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 w-full">
                    <Checkbox checked={visibleSources[key]} />
                    <div className={`w-3 h-3 rounded-full ${source.bgColor}`} />
                    <span className="flex-1">{source.label}</span>
                    {visibleSources[key] && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={fetchAllEvents} variant="outline" className="border-[#D4BBA6]" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      )}

      {/* Embedded mode controls */}
      {embedded && (
        <div className="px-6 pt-4 flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-[#D4BBA6] gap-2">
                <Filter className="w-4 h-4" />
                Sources
                <Badge variant="secondary" className="ml-1">
                  {Object.values(visibleSources).filter(Boolean).length}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-white border-[#D4BBA6] w-64">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Sources</p>
              </div>
              {Object.entries(EVENT_SOURCES).map(([key, source]) => (
                <DropdownMenuItem 
                  key={key} 
                  onClick={(e) => { e.preventDefault(); toggleSource(key); }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 w-full">
                    <Checkbox checked={visibleSources[key]} />
                    <div className={`w-3 h-3 rounded-full ${source.bgColor}`} />
                    <span className="flex-1">{source.label}</span>
                    {visibleSources[key] && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={fetchAllEvents} variant="outline" size="sm" className="border-[#D4BBA6]" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}

      {/* Source Legend */}
      <div className={`flex flex-wrap items-center gap-4 bg-white rounded-lg px-4 py-3 border border-[#E8E0D8] ${embedded ? 'mx-6' : ''}`}>
        <span className="text-sm font-medium text-[#6B5D52]">Legend:</span>
        {Object.entries(EVENT_SOURCES).map(([key, source]) => (
          visibleSources[key] && (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${source.bgColor}`} />
              <span className="text-sm text-[#4A3728]">{source.label}</span>
            </div>
          )
        ))}
      </div>

      {/* Calendar Controls */}
      <div className={`flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-[#E8E0D8] ${embedded ? 'mx-6' : ''}`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrev} className="border-[#D4BBA6]">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="border-[#D4BBA6]">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={navigateNext} className="border-[#D4BBA6]">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h2 className="text-xl font-semibold text-[#4A3728]">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="text-sm text-[#6B5D52]">
          {events.length} events this month
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`flex gap-6 ${embedded ? 'px-6 pb-6' : ''}`}>
        {/* Main Calendar */}
        <Card className="flex-1 border-[#E8E0D8]">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
              </div>
            ) : (
              <>
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-[#6B5D52] py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          min-h-[100px] p-1 border rounded-lg cursor-pointer transition-all
                          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                          ${isSelected ? 'ring-2 ring-violet-500 border-violet-500' : 'border-gray-100'}
                          ${isTodayDate ? 'bg-violet-50' : ''}
                          hover:border-violet-300
                        `}
                      >
                        <div className={`
                          text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                          ${isTodayDate ? 'bg-violet-600 text-white' : ''}
                          ${!isCurrentMonth ? 'text-gray-400' : 'text-[#4A3728]'}
                        `}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-0.5 max-h-[70px] overflow-y-auto">
                          {dayEvents.slice(0, 3).map(event => {
                            const source = EVENT_SOURCES[event.source];
                            return (
                              <TooltipProvider key={event.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                      className={`
                                        text-[10px] px-1 py-0.5 rounded truncate cursor-pointer
                                        ${source.bgColor} text-white
                                        hover:opacity-80 transition-opacity
                                      `}
                                    >
                                      {event.title}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      <p className="font-medium">{event.title}</p>
                                      <p className="text-xs text-gray-400">
                                        {format(event.start, 'h:mm a')} - {source.label}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-gray-500 text-center">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Side Panel - Selected Date Events */}
        <Card className="w-80 border-[#E8E0D8]">
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#4A3728] mb-4">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </h3>
            
            {selectedDate && selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-[#6B5D52]">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No events on this day</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {selectedDateEvents.map(event => {
                  const source = EVENT_SOURCES[event.source];
                  const SourceIcon = source.icon;
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${source.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <SourceIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#4A3728] truncate group-hover:text-violet-600 transition-colors">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-[#6B5D52]" />
                            <span className="text-xs text-[#6B5D52]">
                              {format(event.start, 'h:mm a')}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="w-3 h-3 text-[#6B5D52]" />
                              <span className="text-xs text-[#6B5D52] truncate">
                                {event.location}
                              </span>
                            </div>
                          )}
                          <Badge 
                            variant="outline" 
                            className="mt-2 text-[10px]"
                            style={{ borderColor: source.color, color: source.color }}
                          >
                            {source.label}
                          </Badge>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UnifiedCalendarPage;
