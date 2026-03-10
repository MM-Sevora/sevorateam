import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { format, parseISO } from 'date-fns';
import {
  Calendar as CalendarIcon, ArrowLeft, Clock, MapPin, Users, Video,
  Edit, Trash2, Loader2, ExternalLink, Mail, User, Check, X,
  Building2, Link as LinkIcon
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';
import { calendarRequest } from '../../authConfig';

const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';

// Response status colors
const RESPONSE_COLORS = {
  accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Check },
  declined: { bg: 'bg-red-100', text: 'text-red-700', icon: X },
  tentativelyAccepted: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  none: { bg: 'bg-gray-100', text: 'text-gray-700', icon: User },
};

export default function TeamsEventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
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

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        const data = await callGraphAPI(`/me/events/${eventId}`);
        setEvent(data);
      } catch (error) {
        console.error('Failed to fetch event:', error);
        toast.error('Failed to load event details');
        navigate('/teams/calendar');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, callGraphAPI, navigate]);

  // Open edit modal
  const openEditModal = () => {
    if (!event) return;

    const startDate = parseISO(event.start.dateTime || event.start.date);
    const endDate = parseISO(event.end.dateTime || event.end.date);

    setEventForm({
      subject: event.subject || '',
      start_date: format(startDate, 'yyyy-MM-dd'),
      start_time: event.isAllDay ? '00:00' : format(startDate, 'HH:mm'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      end_time: event.isAllDay ? '23:59' : format(endDate, 'HH:mm'),
      location: event.location?.displayName || '',
      body: event.body?.content || '',
      isOnlineMeeting: event.isOnlineMeeting || false,
      isAllDay: event.isAllDay || false,
    });
    setShowEditModal(true);
  };

  // Save event
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

      const updatedEvent = await callGraphAPI(`/me/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(eventData),
      });

      setEvent({ ...event, ...updatedEvent });
      setShowEditModal(false);
      toast.success('Event updated');
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error('Failed to update event');
    } finally {
      setSavingEvent(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    setDeleting(true);
    try {
      await callGraphAPI(`/me/events/${eventId}`, {
        method: 'DELETE',
      });
      toast.success('Event deleted');
      navigate('/teams/calendar');
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Format event time
  const formatEventTime = () => {
    if (!event) return '';
    if (event.isAllDay) return 'All day';

    const start = parseISO(event.start.dateTime);
    const end = parseISO(event.end.dateTime);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  // Format event date
  const formatEventDate = () => {
    if (!event) return '';
    const start = parseISO(event.start.dateTime || event.start.date);
    const end = parseISO(event.end.dateTime || event.end.date);

    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return format(start, 'EEEE, MMMM d, yyyy');
    }
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  // Get attendee response color
  const getResponseColor = (status) => {
    return RESPONSE_COLORS[status] || RESPONSE_COLORS.none;
  };

  // Get initials
  const getInitials = (name, email) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0];
    }
    return email ? email[0].toUpperCase() : '?';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-180px)]">
        <CalendarIcon className="w-16 h-16 text-[#D4BBA6] mb-4" />
        <h2 className="text-xl font-semibold text-[#4A3728]">Event not found</h2>
        <Button
          onClick={() => navigate('/teams/calendar')}
          variant="outline"
          className="mt-4 border-[#D4BBA6]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Calendar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="teams-event-detail">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/teams/calendar')}
            className="text-[#4A3728]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={openEditModal}
            className="border-[#D4BBA6]"
            data-testid="edit-event-btn"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="border-red-200 text-red-600 hover:bg-red-50"
            data-testid="delete-event-btn"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Event Details Card */}
      <Card className="border-[#E8D5C4] shadow-lg">
        <CardHeader className="pb-4 bg-gradient-to-r from-violet-50 to-violet-100/50 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {event.isOnlineMeeting && (
                  <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                    <Video className="w-3 h-3 mr-1" />
                    Teams Meeting
                  </Badge>
                )}
                {event.isAllDay && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">All Day</Badge>
                )}
              </div>
              <CardTitle className="text-2xl text-[#4A3728]">{event.subject}</CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Date & Time */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-medium text-[#4A3728]">{formatEventDate()}</h3>
              <p className="text-[#6B5D52] flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4" />
                {formatEventTime()}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location?.displayName && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A3728]">Location</h3>
                <p className="text-[#6B5D52]">{event.location.displayName}</p>
              </div>
            </div>
          )}

          {/* Teams Meeting Link */}
          {event.isOnlineMeeting && event.onlineMeeting?.joinUrl && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A3728]">Join Meeting</h3>
                <a
                  href={event.onlineMeeting.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                  <LinkIcon className="w-4 h-4" />
                  Teams Meeting Link
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Organizer */}
          {event.organizer && (
            <>
              <Separator className="bg-[#E8D5C4]" />
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-[#4A3728]">Organizer</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-sm">
                        {getInitials(
                          event.organizer.emailAddress?.name,
                          event.organizer.emailAddress?.address
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-[#4A3728]">
                        {event.organizer.emailAddress?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-[#6B5D52]">{event.organizer.emailAddress?.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <>
              <Separator className="bg-[#E8D5C4]" />
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-[#4A3728]">
                    Attendees ({event.attendees.length})
                  </h3>
                  <div className="mt-3 space-y-2">
                    {event.attendees.map((attendee, index) => {
                      const responseColor = getResponseColor(attendee.status?.response);
                      const ResponseIcon = responseColor.icon;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#F5EBE0]/50"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm">
                                {getInitials(
                                  attendee.emailAddress?.name,
                                  attendee.emailAddress?.address
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-[#4A3728]">
                                {attendee.emailAddress?.name || attendee.emailAddress?.address}
                              </p>
                              <p className="text-xs text-[#6B5D52]">
                                {attendee.emailAddress?.address}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${responseColor.bg} ${responseColor.text} border-0`}>
                            <ResponseIcon className="w-3 h-3 mr-1" />
                            {attendee.status?.response || 'Pending'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Description */}
          {event.body?.content && (
            <>
              <Separator className="bg-[#E8D5C4]" />
              <div>
                <h3 className="font-medium text-[#4A3728] mb-2">Description</h3>
                <div
                  className="prose prose-sm max-w-none text-[#6B5D52]"
                  dangerouslySetInnerHTML={{ __html: event.body.content }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Event Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <Edit className="w-5 h-5 text-violet-600" />
              Edit Event
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
                  onCheckedChange={(checked) =>
                    setEventForm({ ...eventForm, isOnlineMeeting: checked })
                  }
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
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              disabled={savingEvent || !eventForm.subject.trim()}
              className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white"
            >
              {savingEvent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Event'
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
            Are you sure you want to delete "{event.subject}"? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-[#D4BBA6]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteEvent}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
