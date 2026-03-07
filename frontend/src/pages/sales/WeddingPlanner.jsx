import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Heart,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const WEDDING_EVENTS = [
  { id: 'Engagement', label: 'Engagement', icon: '💍' },
  { id: 'Mehendi', label: 'Mehendi', icon: '🌿' },
  { id: 'Haldi', label: 'Haldi', icon: '🌼' },
  { id: 'Sangeet', label: 'Sangeet', icon: '🎵' },
  { id: 'Wedding', label: 'Wedding', icon: '💒' },
  { id: 'Reception', label: 'Reception', icon: '🎉' },
];

const OUTFIT_CATEGORIES = [
  'Saree', 'Lehenga', 'Anarkali', 'Sherwani', 'Suit', 'Indo-Western', 'Gown', 'Kurta Set'
];

const WEDDING_ROLES = ['Bride', 'Groom', 'Family Member', 'Guest'];

const WeddingPlannerPage = () => {
  const { api } = useAuth();
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [date, setDate] = useState(null);
  const [newPlan, setNewPlan] = useState({
    customer_id: '',
    wedding_date: '',
    wedding_location: '',
    role: '',
    events: [],
    outfit_plans: [],
    notes: '',
  });

  useEffect(() => {
    fetchPlans();
    fetchCustomers();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/wedding-plans');
      setPlans(response.data);
    } catch (error) {
      toast.error('Failed to fetch wedding plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers');
    }
  };

  const toggleEvent = (eventId) => {
    setNewPlan(prev => {
      const newEvents = prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId];
      
      // Add/remove outfit plan for event
      const newOutfitPlans = newEvents.map(e => {
        const existing = prev.outfit_plans.find(op => op.event === e);
        return existing || { event: e, category: '', budget: '', style_preference: '', notes: '' };
      });
      
      return { ...prev, events: newEvents, outfit_plans: newOutfitPlans };
    });
  };

  const updateOutfitPlan = (eventId, field, value) => {
    setNewPlan(prev => ({
      ...prev,
      outfit_plans: prev.outfit_plans.map(op =>
        op.event === eventId ? { ...op, [field]: value } : op
      )
    }));
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newPlan,
        wedding_date: date ? format(date, 'yyyy-MM-dd') : '',
        outfit_plans: newPlan.outfit_plans.map(op => ({
          ...op,
          budget: op.budget ? parseInt(op.budget) : 0
        }))
      };
      await api.post('/wedding-plans', payload);
      toast.success('Wedding plan created successfully');
      setIsAddOpen(false);
      setNewPlan({
        customer_id: '', wedding_date: '', wedding_location: '',
        role: '', events: [], outfit_plans: [], notes: ''
      });
      setDate(null);
      fetchPlans();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create wedding plan');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRoleColor = (role) => {
    const colors = {
      'Bride': 'bg-pink-100 text-pink-800',
      'Groom': 'bg-blue-100 text-blue-800',
      'Family Member': 'bg-purple-100 text-purple-800',
      'Guest': 'bg-green-100 text-green-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-8 space-y-6 animate-slide-in" data-testid="wedding-planner-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading text-foreground">Wedding Fashion Planner</h1>
          <p className="text-muted-foreground mt-1 font-body text-sm">Plan outfits for wedding events</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-plan-btn" className="rounded-sm uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Create Wedding Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPlan} className="space-y-6 mt-4">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Customer *</Label>
                <Select
                  value={newPlan.customer_id}
                  onValueChange={(value) => setNewPlan({ ...newPlan, customer_id: value })}
                >
                  <SelectTrigger data-testid="plan-customer-select" className="rounded-none">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Wedding Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Wedding Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-testid="plan-date-btn"
                        className="w-full justify-start text-left font-normal rounded-none"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Location</Label>
                  <Input
                    data-testid="plan-location-input"
                    className="rounded-none"
                    placeholder="e.g., Mumbai, Delhi"
                    value={newPlan.wedding_location}
                    onChange={(e) => setNewPlan({ ...newPlan, wedding_location: e.target.value })}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Role in Wedding *</Label>
                <Select
                  value={newPlan.role}
                  onValueChange={(value) => setNewPlan({ ...newPlan, role: value })}
                >
                  <SelectTrigger data-testid="plan-role-select" className="rounded-none">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEDDING_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Selection */}
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider">Wedding Events</Label>
                <div className="grid grid-cols-3 gap-3">
                  {WEDDING_EVENTS.map((event) => (
                    <div
                      key={event.id}
                      data-testid={`event-${event.id.toLowerCase()}`}
                      onClick={() => toggleEvent(event.id)}
                      className={`
                        p-4 border cursor-pointer transition-all text-center
                        ${newPlan.events.includes(event.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-gold'
                        }
                      `}
                    >
                      <div className="text-2xl mb-1">{event.icon}</div>
                      <div className="text-sm font-medium">{event.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outfit Plans for Selected Events */}
              {newPlan.events.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <Label className="text-xs uppercase tracking-wider">Outfit Planning</Label>
                  {newPlan.outfit_plans.map((outfit, idx) => (
                    <Card key={outfit.event} className="p-4 border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-gold" />
                        <span className="font-heading">{outfit.event}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Outfit Category</Label>
                          <Select
                            value={outfit.category}
                            onValueChange={(value) => updateOutfitPlan(outfit.event, 'category', value)}
                          >
                            <SelectTrigger className="rounded-none h-9">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {OUTFIT_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Budget (₹)</Label>
                          <Input
                            type="number"
                            className="rounded-none h-9"
                            placeholder="50000"
                            value={outfit.budget}
                            onChange={(e) => updateOutfitPlan(outfit.event, 'budget', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label className="text-xs">Style Preference</Label>
                          <Input
                            className="rounded-none h-9"
                            placeholder="e.g., Pastel colors, Heavy embroidery"
                            value={outfit.style_preference}
                            onChange={(e) => updateOutfitPlan(outfit.event, 'style_preference', e.target.value)}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Additional Notes</Label>
                <Textarea
                  data-testid="plan-notes-input"
                  className="rounded-none"
                  rows={3}
                  value={newPlan.notes}
                  onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                />
              </div>

              <Button
                type="submit"
                data-testid="submit-plan-btn"
                className="w-full rounded-sm uppercase tracking-wider text-xs"
                disabled={!newPlan.customer_id || !date || !newPlan.role}
              >
                Create Wedding Plan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wedding Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="wedding-plans-grid">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            data-testid={`wedding-plan-${plan.id}`}
            className="card-sharp cursor-pointer hover:border-gold transition-colors"
            onClick={() => setSelectedPlan(plan)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-heading text-lg">{plan.customer_name}</h3>
                <Badge className={`${getRoleColor(plan.role)} rounded-full text-xs mt-1`}>
                  {plan.role}
                </Badge>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarIcon className="w-4 h-4" />
                  {new Date(plan.wedding_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>

            {/* Location */}
            {plan.wedding_location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                {plan.wedding_location}
              </div>
            )}

            {/* Events */}
            <div className="flex flex-wrap gap-2 mb-4">
              {plan.events.map((event) => {
                const eventData = WEDDING_EVENTS.find(e => e.id === event);
                return (
                  <Badge key={event} variant="outline" className="rounded-full text-xs">
                    {eventData?.icon} {event}
                  </Badge>
                );
              })}
            </div>

            {/* Outfit Summary */}
            {plan.outfit_plans.length > 0 && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Outfit Budget</p>
                <div className="text-lg font-heading">
                  {formatCurrency(plan.outfit_plans.reduce((sum, op) => sum + (op.budget || 0), 0))}
                </div>
              </div>
            )}
          </Card>
        ))}
        {plans.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No wedding plans yet. Create your first wedding plan to get started.
          </div>
        )}
      </div>

      {/* Plan Details Modal */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Wedding Plan Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-heading">{selectedPlan.customer_name}</h2>
                  <Badge className={`${getRoleColor(selectedPlan.role)} rounded-full mt-2`}>
                    {selectedPlan.role}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Wedding Date</p>
                  <p className="text-lg font-heading">
                    {new Date(selectedPlan.wedding_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Location */}
              {selectedPlan.wedding_location && (
                <div className="flex items-center gap-2 p-4 bg-secondary/50">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-medium">{selectedPlan.wedding_location}</span>
                </div>
              )}

              {/* Events & Outfits */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Event Outfits</h3>
                {selectedPlan.outfit_plans.map((outfit) => {
                  const eventData = WEDDING_EVENTS.find(e => e.id === outfit.event);
                  return (
                    <Card key={outfit.event} className="p-4 border border-border">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{eventData?.icon}</div>
                          <div>
                            <h4 className="font-heading">{outfit.event}</h4>
                            <p className="text-sm text-muted-foreground">{outfit.category || 'Category not selected'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Budget</p>
                          <p className="font-heading text-lg">{formatCurrency(outfit.budget)}</p>
                        </div>
                      </div>
                      {outfit.style_preference && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">Style Preference</p>
                          <p className="text-sm">{outfit.style_preference}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Total Budget */}
              <div className="p-4 bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wider">Total Budget</span>
                  <span className="text-2xl font-heading">
                    {formatCurrency(selectedPlan.outfit_plans.reduce((sum, op) => sum + (op.budget || 0), 0))}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedPlan.notes && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{selectedPlan.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1 rounded-sm uppercase tracking-wider text-xs">
                  Edit Plan
                </Button>
                <Button className="flex-1 rounded-sm uppercase tracking-wider text-xs">
                  Schedule Styling
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WeddingPlannerPage;
