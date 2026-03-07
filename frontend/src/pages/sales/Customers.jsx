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
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  User,
  Wallet,
  History,
  Calendar,
  Heart
} from 'lucide-react';

const STYLE_OPTIONS = [
  'Traditional', 'Contemporary', 'Fusion', 'Minimalist', 'Maximalist',
  'Elegant', 'Bold', 'Classic', 'Bohemian', 'Glamorous'
];

const CustomersPage = () => {
  const { api } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    budget_min: '',
    budget_max: '',
    preferred_styles: [],
    occasion_type: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    try {
      const params = search ? `?search=${search}` : '';
      const response = await api.get(`/customers${params}`);
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newCustomer,
        budget_min: newCustomer.budget_min ? parseInt(newCustomer.budget_min) : null,
        budget_max: newCustomer.budget_max ? parseInt(newCustomer.budget_max) : null,
      };
      await api.post('/customers', payload);
      toast.success('Customer profile created');
      setIsAddOpen(false);
      setNewCustomer({
        name: '', phone: '', email: '', city: '',
        budget_min: '', budget_max: '', preferred_styles: [],
        occasion_type: '', notes: ''
      });
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create customer');
    }
  };

  const toggleStyle = (style) => {
    setNewCustomer(prev => ({
      ...prev,
      preferred_styles: prev.preferred_styles.includes(style)
        ? prev.preferred_styles.filter(s => s !== style)
        : [...prev.preferred_styles, style]
    }));
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-8 space-y-6 animate-slide-in" data-testid="customers-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1 font-body text-sm">Manage customer profiles and preferences</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-customer-btn" className="rounded-sm uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Create Customer Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCustomer} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Name *</Label>
                  <Input
                    data-testid="customer-name-input"
                    className="rounded-none"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Phone *</Label>
                  <Input
                    data-testid="customer-phone-input"
                    className="rounded-none"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Email</Label>
                  <Input
                    data-testid="customer-email-input"
                    type="email"
                    className="rounded-none"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">City</Label>
                  <Input
                    data-testid="customer-city-input"
                    className="rounded-none"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Min Budget (₹)</Label>
                  <Input
                    data-testid="customer-budget-min-input"
                    type="number"
                    className="rounded-none"
                    placeholder="20000"
                    value={newCustomer.budget_min}
                    onChange={(e) => setNewCustomer({ ...newCustomer, budget_min: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Max Budget (₹)</Label>
                  <Input
                    data-testid="customer-budget-max-input"
                    type="number"
                    className="rounded-none"
                    placeholder="100000"
                    value={newCustomer.budget_max}
                    onChange={(e) => setNewCustomer({ ...newCustomer, budget_max: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Occasion Type</Label>
                <Select
                  value={newCustomer.occasion_type}
                  onValueChange={(value) => setNewCustomer({ ...newCustomer, occasion_type: value })}
                >
                  <SelectTrigger data-testid="customer-occasion-select" className="rounded-none">
                    <SelectValue placeholder="Select occasion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wedding">Wedding</SelectItem>
                    <SelectItem value="Reception">Reception</SelectItem>
                    <SelectItem value="Engagement">Engagement</SelectItem>
                    <SelectItem value="Festival">Festival</SelectItem>
                    <SelectItem value="Party">Party</SelectItem>
                    <SelectItem value="Corporate">Corporate Event</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Style Preferences</Label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((style) => (
                    <Badge
                      key={style}
                      variant={newCustomer.preferred_styles.includes(style) ? 'default' : 'outline'}
                      className={`cursor-pointer rounded-full transition-colors ${
                        newCustomer.preferred_styles.includes(style)
                          ? 'bg-primary'
                          : 'hover:bg-secondary'
                      }`}
                      onClick={() => toggleStyle(style)}
                    >
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Notes</Label>
                <Textarea
                  data-testid="customer-notes-input"
                  className="rounded-none"
                  rows={3}
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                />
              </div>
              <Button type="submit" data-testid="submit-customer-btn" className="w-full rounded-sm uppercase tracking-wider text-xs">
                Create Profile
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="card-sharp">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="search-customers-input"
            className="pl-10 rounded-none"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="customers-grid">
        {customers.map((customer) => (
          <Card
            key={customer.id}
            data-testid={`customer-card-${customer.id}`}
            className="card-sharp cursor-pointer hover:border-gold transition-colors"
            onClick={() => setSelectedCustomer(customer)}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary flex items-center justify-center text-white text-xl font-heading shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-lg truncate">{customer.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Phone className="w-3 h-3" />
                  {customer.phone}
                </div>
                {customer.city && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {customer.city}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              {(customer.budget_min || customer.budget_max) && (
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="w-4 h-4 text-gold" />
                  <span>Budget: {formatCurrency(customer.budget_min)} - {formatCurrency(customer.budget_max)}</span>
                </div>
              )}
              {customer.occasion_type && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{customer.occasion_type}</span>
                </div>
              )}
              {customer.preferred_styles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customer.preferred_styles.slice(0, 3).map((style) => (
                    <Badge key={style} variant="outline" className="rounded-full text-xs">
                      {style}
                    </Badge>
                  ))}
                  {customer.preferred_styles.length > 3 && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      +{customer.preferred_styles.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">{customer.total_orders}</span> orders
              </div>
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">{formatCurrency(customer.total_spent)}</span> spent
              </div>
            </div>
          </Card>
        ))}
        {customers.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No customers found. Create your first customer profile to get started.
          </div>
        )}
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Customer Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Header */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-primary flex items-center justify-center text-white text-3xl font-heading">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-heading">{selectedCustomer.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" /> {selectedCustomer.phone}
                    </span>
                    {selectedCustomer.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {selectedCustomer.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{selectedCustomer.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Occasion Type</p>
                  <p className="font-medium">{selectedCustomer.occasion_type || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Budget Range</p>
                  <p className="font-medium">
                    {formatCurrency(selectedCustomer.budget_min)} - {formatCurrency(selectedCustomer.budget_max)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Orders</p>
                  <p className="font-medium">{selectedCustomer.total_orders}</p>
                </div>
              </div>

              {/* Style Preferences */}
              {selectedCustomer.preferred_styles.length > 0 && (
                <div className="pt-6 border-t border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Style Preferences</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.preferred_styles.map((style) => (
                      <Badge key={style} className="bg-primary rounded-full">
                        <Heart className="w-3 h-3 mr-1" /> {style}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Journey History */}
              <div className="pt-6 border-t border-border">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" /> Journey History
                </p>
                {selectedCustomer.journey_history.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCustomer.journey_history.map((entry, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                        <div>
                          <p className="font-medium">{entry.action}</p>
                          <p className="text-muted-foreground text-xs">
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No journey history recorded yet</p>
                )}
              </div>

              {/* Notes */}
              {selectedCustomer.notes && (
                <div className="pt-6 border-t border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-border">
                <Button variant="outline" className="flex-1 rounded-sm uppercase tracking-wider text-xs">
                  Edit Profile
                </Button>
                <Button className="flex-1 rounded-sm uppercase tracking-wider text-xs">
                  Create Wedding Plan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CustomersPage;
