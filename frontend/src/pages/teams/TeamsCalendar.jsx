import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, RefreshCw,
  Loader2, Clock, MapPin, Users, Video, MoreVertical, Trash2, Edit,
  CalendarDays, List, LayoutGrid, LogIn, LogOut, ChevronDown
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { calendarRequest } from '../../authConfig';

const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';

// Event colors based on category
const EVENT_COLORS = {
  default: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
  meeting: { bg: 'bg-violet-100', border: 'border-violet-400', text: 'text-violet-800' },
  focus: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
  personal: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-800' },
  travel: { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800' },
};

export default function TeamsCalendar() {
  const navigate = useNavigate();
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = accounts[0];

  // State
  const [connected, setConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [msLoginLoading, setMsLoginLoading] = useState(false);

  // Create/Edit Event Modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    subject: '',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '10:00',
    location: '',
    body: '',
    isOnlineMeeting: false,
    isAllDay: false,
  });

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(null);

  // Check calendar connection
  useEffect(() => {
    const checkConnection = async () => {
      setCheckingConnection(true);
      if (accounts.length > 0) {
        try {
          const silentRequest = {
            scopes: ['Calendars.ReadWrite'],
            account: accounts[0],
          };
          await instance.acquireTokenSilent(silentRequest);
          setConnected(true);
        } catch (error) {
          console.log('Calendar connection check failed:', error.message);
          setConnected(false);
        }
      } else {
        setConnected(false);
      }
      setCheckingConnection(false);
    };

    if (inProgress === 'none') {
      checkConnection();
    }
  }, [accounts, instance, inProgress]);

  // Get access token
  const getAccessToken = useCallback(async () => {
    if (!account) return null;

    try {
      const response = await instance.acquireTokenSilent({
        ...calendarRequest,
        account: account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const response = await instance.acquireTokenPopup(calendarRequest);
          return response.accessToken;
        } catch (popupError) {
          console.error('Failed to acquire token:', popupError);
          return null;
        }
      }
      console.error('Token error:', error);
      return null;
    }
  }, [instance, account]);

  // Microsoft Graph API call helper
  const callGraphAPI = useCallback(
    async (endpoint, options = {}) => {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Please sign in with Microsoft');
        return null;
      }

      const response = await fetch(`${GRAPH_ENDPOINT}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'API call failed');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }

      return true;
    },
    [getAccessToken]
  );

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    if (!connected) return;

    setLoading(true);
    try {
      // Calculate date range based on view
      let startDate, endDate;
      if (view === 'month') {
        startDate = startOfWeek(startOfMonth(currentDate));
        endDate = endOfWeek(endOfMonth(currentDate));
      } else if (view === 'week') {
        startDate = startOfWeek(currentDate);
        endDate = endOfWeek(currentDate);
      } else {
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
      }

      const url = `/me/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$top=100&$orderby=start/dateTime&$select=id,subject,start,end,location,bodyPreview,isOnlineMeeting,onlineMeetingUrl,organizer,attendees,categories,isAllDay`;

      const data = await callGraphAPI(url);
      setEvents(data?.value || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load calendar events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [connected, currentDate, view, callGraphAPI]);

  useEffect(() => {
    if (connected) {
      fetchEvents();
    }
  }, [connected, fetchEvents]);

  // Handle Microsoft login
  const handleMicrosoftLogin = async () => {
    setMsLoginLoading(true);
    try {
      sessionStorage.setItem('msalRedirectPath', window.location.pathname);
      sessionStorage.setItem('msalLoginType', 'calendar');
      await instance.loginRedirect(calendarRequest);
    } catch (error) {
      console.error('Login error:', error);
      setMsLoginLoading(false);
      toast.error('Failed to connect to Microsoft');
    }
  };

  // Handle Microsoft logout
  const handleMicrosoftLogout = async () => {
    try {
      await instance.logoutPopup();
      setEvents([]);
      setConnected(false);
      toast.success('Signed out from Microsoft');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Sync/Refresh events
  const handleSync = async () => {
    setSyncing(true);
    await fetchEvents();
    setSyncing(false);
    toast.success('Calendar refreshed');
  };

  // Navigate calendar
  const navigatePrev = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const navigateNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Open create event modal
  const openCreateModal = (date = null) => {
    const targetDate = date || new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    setEditingEvent(null);
    setEventForm({
      subject: '',
      start_date: dateStr,
      start_time: '09:00',
      end_date: dateStr,
      end_time: '10:00',
      location: '',
      body: '',
      isOnlineMeeting: false,
      isAllDay: false,
    });
    setShowEventModal(true);
  };

  // Open edit event modal
  const openEditModal = (event) => {
    const startDate = parseISO(event.start.dateTime || event.start.date);
    const endDate = parseISO(event.end.dateTime || event.end.date);

    setEditingEvent(event);
    setEventForm({
      subject: event.subject || '',
      start_date: format(startDate, 'yyyy-MM-dd'),
      start_time: event.isAllDay ? '00:00' : format(startDate, 'HH:mm'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      end_time: event.isAllDay ? '23:59' : format(endDate, 'HH:mm'),
      location: event.location?.displayName || '',
      body: event.bodyPreview || '',
      isOnlineMeeting: event.isOnlineMeeting || false,
      isAllDay: event.isAllDay || false,
    });
    setShowEventModal(true);
  };

  // Save event (create or update)
  const handleSaveEvent = async () => {
    if (!eventForm.subject.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    setSavingEvent(true);
    try {
      const eventData = {
        subject: eventForm.subject,
        body: {
          contentType: 'text',
          content: eventForm.body,
        },
        start: {
          dateTime: eventForm.isAllDay
            ? `${eventForm.start_date}T00:00:00`
            : `${eventForm.start_date}T${eventForm.start_time}:00`,
          timeZone: 'UTC',
        },
        end: {
          dateTime: eventForm.isAllDay
            ? `${eventForm.end_date}T23:59:59`
            : `${eventForm.end_date}T${eventForm.end_time}:00`,
          timeZone: 'UTC',
        },
        isAllDay: eventForm.isAllDay,
        isOnlineMeeting: eventForm.isOnlineMeeting,
        onlineMeetingProvider: eventForm.isOnlineMeeting ? 'teamsForBusiness' : undefined,
      };

      if (eventForm.location) {
        eventData.location = { displayName: eventForm.location };
      }

      if (editingEvent) {
        // Update existing event
        await callGraphAPI(`/me/events/${editingEvent.id}`, {
          method: 'PATCH',
          body: JSON.stringify(eventData),
        });
        toast.success('Event updated');
      } else {
        // Create new event
        await callGraphAPI('/me/events', {
          method: 'POST',
          body: JSON.stringify(eventData),
        });
        toast.success('Event created');
      }

      setShowEventModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error(`Failed to ${editingEvent ? 'update' : 'create'} event`);
    } finally {
      setSavingEvent(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;

    try {
      await callGraphAPI(`/me/events/${deletingEvent.id}`, {
        method: 'DELETE',
      });
      toast.success('Event deleted');
      setShowDeleteConfirm(false);
      setDeletingEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event');
    }
  };

  // Get event color
  const getEventColor = (event) => {
    if (event.categories?.includes('Focus time')) return EVENT_COLORS.focus;
    if (event.categories?.includes('Personal')) return EVENT_COLORS.personal;
    if (event.categories?.includes('Travel')) return EVENT_COLORS.travel;
    if (event.isOnlineMeeting) return EVENT_COLORS.meeting;
    return EVENT_COLORS.default;
  };

  // Get events for a specific day
  const getEventsForDay = (date) => {
    return events.filter((event) => {
      const eventStart = parseISO(event.start.dateTime || event.start.date);
      return isSameDay(eventStart, date);
    });
  };

  // Format event time
  const formatEventTime = (event) => {
    if (event.isAllDay) return 'All day';
    const start = parseISO(event.start.dateTime);
    const end = parseISO(event.end.dateTime);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-[#F5EBE0] border-b border-[#E8D5C4]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <div key={dayName} className="py-3 text-center text-sm font-medium text-[#4A3728]">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="divide-y divide-[#E8D5C4]">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 divide-x divide-[#E8D5C4]">
              {week.map((day, dayIdx) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[120px] p-1 cursor-pointer hover:bg-[#F5EBE0]/50 transition-colors ${
                      !isCurrentMonth ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => openCreateModal(day)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${
                          isToday
                            ? 'bg-violet-600 text-white font-bold'
                            : isCurrentMonth
                            ? 'text-[#4A3728]'
                            : 'text-gray-400'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const color = getEventColor(event);
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/teams/calendar/${event.id}`);
                            }}
                            className={`text-xs px-1.5 py-0.5 rounded truncate ${color.bg} ${color.text} hover:opacity-80 cursor-pointer`}
                          >
                            {event.subject}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-[#6B5D52] px-1.5">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-8 bg-[#F5EBE0] border-b border-[#E8D5C4]">
          <div className="py-3 px-2 text-center text-sm font-medium text-[#4A3728]"></div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`py-3 text-center ${isSameDay(day, new Date()) ? 'bg-violet-100' : ''}`}
            >
              <div className="text-sm font-medium text-[#4A3728]">{format(day, 'EEE')}</div>
              <div
                className={`text-lg ${
                  isSameDay(day, new Date()) ? 'text-violet-600 font-bold' : 'text-[#6B5D52]'
                }`}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <ScrollArea className="h-[600px]">
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-[#E8D5C4]/50">
                <div className="py-3 px-2 text-xs text-[#6B5D52] text-right">
                  {hour === 0 ? '' : format(new Date().setHours(hour, 0), 'h a')}
                </div>
                {days.map((day) => {
                  const dayEvents = getEventsForDay(day).filter((event) => {
                    if (event.isAllDay) return hour === 0;
                    const eventStart = parseISO(event.start.dateTime);
                    return eventStart.getHours() === hour;
                  });

                  return (
                    <div
                      key={day.toISOString()}
                      className="min-h-[48px] border-l border-[#E8D5C4]/50 p-1 hover:bg-[#F5EBE0]/30 cursor-pointer"
                      onClick={() => openCreateModal(day)}
                    >
                      {dayEvents.map((event) => {
                        const color = getEventColor(event);
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/teams/calendar/${event.id}`);
                            }}
                            className={`text-xs px-1.5 py-1 rounded ${color.bg} ${color.text} ${color.border} border-l-2 mb-1 hover:opacity-80 cursor-pointer`}
                          >
                            <div className="font-medium truncate">{event.subject}</div>
                            {!event.isAllDay && (
                              <div className="text-[10px] opacity-75">{formatEventTime(event)}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // Render day/agenda view
  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const isToday = isSameDay(currentDate, new Date());

    return (
      <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden">
        {/* Day header */}
        <div className={`p-4 border-b border-[#E8D5C4] ${isToday ? 'bg-violet-50' : 'bg-[#F5EBE0]'}`}>
          <div className="text-center">
            <div className="text-sm text-[#6B5D52]">{format(currentDate, 'EEEE')}</div>
            <div className={`text-3xl font-bold ${isToday ? 'text-violet-600' : 'text-[#4A3728]'}`}>
              {format(currentDate, 'd')}
            </div>
            <div className="text-sm text-[#6B5D52]">{format(currentDate, 'MMMM yyyy')}</div>
          </div>
        </div>

        {/* Events list */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : dayEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
              <p className="text-[#6B5D52]">No events scheduled</p>
              <Button
                onClick={() => openCreateModal(currentDate)}
                variant="outline"
                className="mt-4 border-[#D4BBA6]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((event) => {
                const color = getEventColor(event);
                return (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/teams/calendar/${event.id}`)}
                    className={`p-4 rounded-lg ${color.bg} ${color.border} border-l-4 cursor-pointer hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium ${color.text}`}>{event.subject}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-[#6B5D52]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatEventTime(event)}
                          </span>
                          {event.location?.displayName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.location.displayName}
                            </span>
                          )}
                          {event.isOnlineMeeting && (
                            <span className="flex items-center gap-1 text-violet-600">
                              <Video className="w-4 h-4" />
                              Teams Meeting
                            </span>
                          )}
                        </div>
                        {event.bodyPreview && (
                          <p className="mt-2 text-sm text-[#6B5D52] line-clamp-2">{event.bodyPreview}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4 text-[#6B5D52]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(event);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingEvent(event);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (inProgress !== 'none' || checkingConnection) {
    return (
      <div className="h-[calc(100vh-180px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-2" />
          <p className="text-[#6B5D52]">Checking calendar connection...</p>
        </div>
      </div>
    );
  }

  // Not connected view
  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto p-6" data-testid="teams-calendar-login">
        <Card className="border-[#E8D5C4] shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl flex items-center justify-center shadow-lg">
              <CalendarIcon className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl text-[#4A3728]">Microsoft Calendar</CardTitle>
            <p className="text-[#6B5D52] mt-2">Connect your Outlook calendar to view and manage events</p>
          </CardHeader>
          <CardContent className="text-center space-y-6 pt-4">
            <div className="bg-gradient-to-r from-[#F5EBE0] to-[#FDF8F3] rounded-xl p-5 text-left border border-[#E8D5C4]">
              <h4 className="font-semibold text-[#4A3728] mb-3">What you can do:</h4>
              <ul className="text-sm text-[#6B5D52] space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                  </div>
                  View calendar in monthly, weekly, or daily view
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-emerald-600" />
                  </div>
                  Create, edit, and delete calendar events
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Video className="w-4 h-4 text-emerald-600" />
                  </div>
                  Schedule Teams meetings with video conferencing
                </li>
              </ul>
            </div>

            <Button
              onClick={handleMicrosoftLogin}
              disabled={msLoginLoading}
              className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white px-10 py-6 text-lg shadow-lg"
              data-testid="microsoft-calendar-login-btn"
            >
              {msLoginLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Connect Microsoft Calendar
                </>
              )}
            </Button>

            <p className="text-xs text-[#9C8C74]">
              You'll be redirected to Microsoft to authorize the connection
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected view
  return (
    <div className="p-6 space-y-6" data-testid="teams-calendar-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Teams Calendar</h1>
          <p className="text-[#6B5D52] mt-1">Manage your Outlook calendar events</p>
        </div>
        <div className="flex items-center gap-3">
          {/* User info */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-[#D4BBA6] gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-violet-700 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {account?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm text-[#4A3728] max-w-32 truncate hidden sm:block">
                  {account?.username || 'User'}
                </span>
                <ChevronDown className="w-4 h-4 text-[#6B5D52]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
              <div className="px-3 py-2 border-b">
                <p className="font-medium text-[#4A3728]">{account?.name || 'Microsoft User'}</p>
                <p className="text-sm text-[#6B5D52]">{account?.username}</p>
              </div>
              <DropdownMenuItem onClick={handleMicrosoftLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleSync} variant="outline" className="border-[#D4BBA6]" disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button
            onClick={() => openCreateModal()}
            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white"
            data-testid="create-event-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
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
          <h2 className="text-xl font-semibold text-[#4A3728] ml-4">
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' &&
              `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
            {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-[#F5EBE0] p-1 rounded-lg">
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('month')}
            className={view === 'month' ? 'bg-white shadow-sm' : ''}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            Month
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('week')}
            className={view === 'week' ? 'bg-white shadow-sm' : ''}
          >
            <CalendarDays className="w-4 h-4 mr-1" />
            Week
          </Button>
          <Button
            variant={view === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('day')}
            className={view === 'day' ? 'bg-white shadow-sm' : ''}
          >
            <List className="w-4 h-4 mr-1" />
            Day
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      ) : (
        <>
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </>
      )}

      {/* Create/Edit Event Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-violet-600" />
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Event Title *</Label>
              <Input
                value={eventForm.subject}
                onChange={(e) => setEventForm({ ...eventForm, subject: e.target.value })}
                placeholder="Enter event title"
                className="border-[#D4BBA6]"
                data-testid="event-title-input"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={eventForm.isAllDay}
                  onCheckedChange={(checked) => setEventForm({ ...eventForm, isAllDay: checked })}
                />
                <Label className="text-[#4A3728]">All day</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={eventForm.isOnlineMeeting}
                  onCheckedChange={(checked) => setEventForm({ ...eventForm, isOnlineMeeting: checked })}
                />
                <Label className="text-[#4A3728]">Teams meeting</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Start Date *</Label>
                <Input
                  type="date"
                  value={eventForm.start_date}
                  onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                  className="border-[#D4BBA6]"
                />
              </div>
              {!eventForm.isAllDay && (
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">Start Time</Label>
                  <Input
                    type="time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    className="border-[#D4BBA6]"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#4A3728]">End Date *</Label>
                <Input
                  type="date"
                  value={eventForm.end_date}
                  onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                  className="border-[#D4BBA6]"
                />
              </div>
              {!eventForm.isAllDay && (
                <div className="space-y-2">
                  <Label className="text-[#4A3728]">End Time</Label>
                  <Input
                    type="time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    className="border-[#D4BBA6]"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[#4A3728]">Location</Label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="Add location"
                className="border-[#D4BBA6]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea
                value={eventForm.body}
                onChange={(e) => setEventForm({ ...eventForm, body: e.target.value })}
                placeholder="Add description"
                rows={3}
                className="border-[#D4BBA6] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEventModal(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              disabled={savingEvent || !eventForm.subject.trim()}
              className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white"
              data-testid="save-event-btn"
            >
              {savingEvent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Event
            </DialogTitle>
          </DialogHeader>
          <p className="text-[#6B5D52]">
            Are you sure you want to delete "{deletingEvent?.subject}"? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleDeleteEvent} className="bg-red-600 hover:bg-red-700 text-white">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
