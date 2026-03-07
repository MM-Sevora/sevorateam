import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Calendar, MapPin, Users, DollarSign, Plus, Clock, 
  PartyPopper, Mic, Video, ShoppingBag, RefreshCw
} from 'lucide-react';

const EVENT_TYPES = [
  { value: 'brand_launch', label: 'Brand Launch', icon: PartyPopper, color: 'bg-purple-100 text-purple-700' },
  { value: 'press_event', label: 'Press Event', icon: Mic, color: 'bg-blue-100 text-blue-700' },
  { value: 'influencer_meetup', label: 'Influencer Meetup', icon: Users, color: 'bg-pink-100 text-pink-700' },
  { value: 'fashion_show', label: 'Fashion Show', icon: ShoppingBag, color: 'bg-amber-100 text-amber-700' },
  { value: 'webinar', label: 'Webinar', icon: Video, color: 'bg-green-100 text-green-700' },
  { value: 'product_launch', label: 'Product Launch', icon: ShoppingBag, color: 'bg-rose-100 text-rose-700' },
  { value: 'other', label: 'Other', icon: Calendar, color: 'bg-gray-100 text-gray-700' },
];

const STATUS_COLORS = {
  planning: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const EventsPage = () => {
  const { api } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [newEvent, setNewEvent] = useState({
    name: '',
    event_type: 'brand_launch',
    description: '',
    venue: '',
    address: '',
    city: '',
    start_date: '',
    end_date: '',
    budget: '',
    max_attendees: '',
    registration_required: false,
    notes: '',
  });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('event_type', filterType);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const response = await api.get(`/marketing/v2/events?${params.toString()}`);
      setEvents(response.data || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [api, filterType, filterStatus]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreateEvent = async () => {
    try {
      const data = {
        ...newEvent,
        budget: parseFloat(newEvent.budget) || 0,
        max_attendees: newEvent.max_attendees ? parseInt(newEvent.max_attendees) : null,
      };
      await api.post('/marketing/v2/events', data);
      toast.success('Event created');
      setShowAddModal(false);
      setNewEvent({
        name: '', event_type: 'brand_launch', description: '', venue: '', address: '',
        city: '', start_date: '', end_date: '', budget: '', max_attendees: '',
        registration_required: false, notes: '',
      });
      fetchEvents();
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => `₹${amount?.toLocaleString('en-IN') || 0}`;

  const getEventTypeConfig = (type) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[6];

  // Stats
  const upcomingEvents = events.filter(e => e.status === 'planning' || e.status === 'confirmed').length;
  const totalBudget = events.reduce((sum, e) => sum + (e.budget || 0), 0);
  const totalAttendees = events.reduce((sum, e) => sum + (e.confirmed_attendees || 0), 0);

  return (
    <div className="p-8 space-y-6" data-testid="events-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Events</h1>
          <p className="text-[#5D4A3A] mt-1">Brand launches, press events, influencer meetups</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-amber-700 hover:bg-amber-800">
              <Plus className="w-4 h-4 mr-2" /> New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Event Name *</Label>
                <Input value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} placeholder="Spring Collection Launch" />
              </div>
              <div className="col-span-2">
                <Label>Event Type</Label>
                <Select value={newEvent.event_type} onValueChange={v => setNewEvent({...newEvent, event_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="Event description..." />
              </div>
              <div>
                <Label>Venue</Label>
                <Input value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} placeholder="The Grand Hyatt" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={newEvent.city} onChange={e => setNewEvent({...newEvent, city: e.target.value})} placeholder="Mumbai" />
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={newEvent.start_date} onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={newEvent.end_date} onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} />
              </div>
              <div>
                <Label>Budget (₹)</Label>
                <Input type="number" value={newEvent.budget} onChange={e => setNewEvent({...newEvent, budget: e.target.value})} placeholder="500000" />
              </div>
              <div>
                <Label>Max Attendees</Label>
                <Input type="number" value={newEvent.max_attendees} onChange={e => setNewEvent({...newEvent, max_attendees: e.target.value})} placeholder="150" />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input value={newEvent.notes} onChange={e => setNewEvent({...newEvent, notes: e.target.value})} placeholder="Additional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleCreateEvent} className="bg-amber-700 hover:bg-amber-800">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{events.length}</div>
                <div className="text-sm text-[#5D4A3A]">Total Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{upcomingEvents}</div>
                <div className="text-sm text-[#5D4A3A]">Upcoming</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{totalAttendees}</div>
                <div className="text-sm text-[#5D4A3A]">Attendees</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{formatCurrency(totalBudget)}</div>
                <div className="text-sm text-[#5D4A3A]">Total Budget</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] border-[#E8D5C4]">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {EVENT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px] border-[#E8D5C4]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchEvents} className="border-[#E8D5C4]">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-[#4A3728]" /></div>
      ) : events.length === 0 ? (
        <Card className="border-[#E8D5C4]">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
            <h3 className="font-medium text-[#4A3728]">No events yet</h3>
            <p className="text-[#5D4A3A]">Create your first event</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map(event => {
            const typeConfig = getEventTypeConfig(event.event_type);
            const TypeIcon = typeConfig.icon;
            return (
              <Card key={event.id} className="border-[#E8D5C4] hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                      <TypeIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={STATUS_COLORS[event.status]}>{event.status}</Badge>
                        <Badge variant="outline">{typeConfig.label}</Badge>
                      </div>
                      <h3 className="font-semibold text-[#4A3728]">{event.name}</h3>
                      {event.venue && (
                        <p className="text-sm text-[#5D4A3A] flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {event.venue}{event.city && `, ${event.city}`}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-[#5D4A3A]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(event.start_date)}
                        </span>
                        {event.max_attendees && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {event.confirmed_attendees || 0}/{event.max_attendees}
                          </span>
                        )}
                        {event.budget > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> {formatCurrency(event.budget)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
