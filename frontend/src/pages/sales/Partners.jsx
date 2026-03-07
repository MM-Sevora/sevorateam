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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus,
  MapPin,
  Phone,
  Mail,
  User,
  Users,
  TrendingUp,
  Percent,
  MoreVertical,
  Store,
  Scissors,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const PARTNER_STATUSES = [
  { value: 'Active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'Inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  { value: 'Pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
];

const PartnersPage = () => {
  const { api } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [newPartner, setNewPartner] = useState({
    name: '',
    partner_type: 'Salon',
    address: '',
    city: '',
    area: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    commission_percent: '',
    notes: '',
    status: 'Active',
  });

  useEffect(() => {
    fetchPartners();
  }, [activeTab]);

  const fetchPartners = async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('partner_type', activeTab);
      }
      params.append('status', 'Active');
      
      const response = await api.get(`/partners?${params.toString()}`);
      setPartners(response.data);
    } catch (error) {
      toast.error('Failed to fetch partners');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartner = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newPartner,
        commission_percent: newPartner.commission_percent ? parseFloat(newPartner.commission_percent) : null,
      };
      await api.post('/partners', payload);
      toast.success('Partner added successfully');
      setIsAddOpen(false);
      resetForm();
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add partner');
    }
  };

  const handleUpdateStatus = async (partnerId, newStatus) => {
    try {
      await api.put(`/partners/${partnerId}`, { status: newStatus });
      toast.success('Partner status updated');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to update partner');
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!window.confirm('Are you sure you want to delete this partner?')) return;
    try {
      await api.delete(`/partners/${partnerId}`);
      toast.success('Partner deleted');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to delete partner');
    }
  };

  const resetForm = () => {
    setNewPartner({
      name: '', partner_type: 'Salon', address: '', city: '', area: '',
      contact_person: '', contact_phone: '', contact_email: '',
      commission_percent: '', notes: '', status: 'Active',
    });
  };

  const getStatusColor = (status) => {
    const found = PARTNER_STATUSES.find(s => s.value === status);
    return found?.color || 'bg-gray-100 text-gray-800';
  };

  const salons = partners.filter(p => p.partner_type === 'Salon');
  const boutiques = partners.filter(p => p.partner_type === 'Boutique');
  const displayPartners = activeTab === 'all' ? partners : activeTab === 'Salon' ? salons : boutiques;

  const totalLeads = partners.reduce((sum, p) => sum + p.leads_count, 0);
  const totalConversions = partners.reduce((sum, p) => sum + p.conversions, 0);

  return (
    <div className="p-8 space-y-6 animate-slide-in" data-testid="partners-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading text-foreground">Marketing Partnerships</h1>
          <p className="text-muted-foreground mt-1 font-body text-sm">Manage salon and boutique partnerships</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-partner-btn" className="rounded-sm uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4 mr-2" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Add Partner</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPartner} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Partner Name *</Label>
                <Input
                  data-testid="partner-name-input"
                  className="rounded-none"
                  placeholder="e.g., Lakme Salon - Bandra"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Partner Type *</Label>
                <Select
                  value={newPartner.partner_type}
                  onValueChange={(value) => setNewPartner({ ...newPartner, partner_type: value })}
                >
                  <SelectTrigger data-testid="partner-type-select" className="rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Salon">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4" />
                        Salon
                      </div>
                    </SelectItem>
                    <SelectItem value="Boutique">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Boutique
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">City *</Label>
                  <Input
                    data-testid="partner-city-input"
                    className="rounded-none"
                    placeholder="e.g., Mumbai"
                    value={newPartner.city}
                    onChange={(e) => setNewPartner({ ...newPartner, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Area/Locality</Label>
                  <Input
                    data-testid="partner-area-input"
                    className="rounded-none"
                    placeholder="e.g., Bandra West"
                    value={newPartner.area}
                    onChange={(e) => setNewPartner({ ...newPartner, area: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Full Address</Label>
                <Input
                  data-testid="partner-address-input"
                  className="rounded-none"
                  placeholder="Full address"
                  value={newPartner.address}
                  onChange={(e) => setNewPartner({ ...newPartner, address: e.target.value })}
                />
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Contact Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider">Contact Person</Label>
                    <Input
                      data-testid="partner-contact-person-input"
                      className="rounded-none"
                      placeholder="Name"
                      value={newPartner.contact_person}
                      onChange={(e) => setNewPartner({ ...newPartner, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider">Phone</Label>
                    <Input
                      data-testid="partner-contact-phone-input"
                      className="rounded-none"
                      placeholder="+91..."
                      value={newPartner.contact_phone}
                      onChange={(e) => setNewPartner({ ...newPartner, contact_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label className="text-xs uppercase tracking-wider">Email</Label>
                  <Input
                    data-testid="partner-contact-email-input"
                    type="email"
                    className="rounded-none"
                    placeholder="email@partner.com"
                    value={newPartner.contact_email}
                    onChange={(e) => setNewPartner({ ...newPartner, contact_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Commission %</Label>
                <Input
                  data-testid="partner-commission-input"
                  type="number"
                  step="0.1"
                  className="rounded-none"
                  placeholder="e.g., 10"
                  value={newPartner.commission_percent}
                  onChange={(e) => setNewPartner({ ...newPartner, commission_percent: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Notes</Label>
                <Textarea
                  data-testid="partner-notes-input"
                  className="rounded-none"
                  rows={2}
                  placeholder="Additional notes..."
                  value={newPartner.notes}
                  onChange={(e) => setNewPartner({ ...newPartner, notes: e.target.value })}
                />
              </div>

              <Button
                type="submit"
                data-testid="submit-partner-btn"
                className="w-full rounded-sm uppercase tracking-wider text-xs"
                disabled={!newPartner.name || !newPartner.city}
              >
                Add Partner
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-heading">{partners.length}</p>
              <p className="text-xs text-muted-foreground">Total Partners</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-heading">{salons.length}</p>
              <p className="text-xs text-muted-foreground">Salons</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-heading">{boutiques.length}</p>
              <p className="text-xs text-muted-foreground">Boutiques</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-heading">{totalLeads}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="rounded-none bg-secondary/50">
          <TabsTrigger value="all" className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-white">
            All Partners
          </TabsTrigger>
          <TabsTrigger value="Salon" className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-white">
            <Scissors className="w-4 h-4 mr-2" />
            Salons
          </TabsTrigger>
          <TabsTrigger value="Boutique" className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-white">
            <Store className="w-4 h-4 mr-2" />
            Boutiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Partners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="partners-grid">
            {displayPartners.map((partner) => (
              <Card key={partner.id} data-testid={`partner-card-${partner.id}`} className="card-sharp">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 flex items-center justify-center ${
                      partner.partner_type === 'Salon' ? 'bg-pink-100' : 'bg-purple-100'
                    }`}>
                      {partner.partner_type === 'Salon' ? (
                        <Scissors className="w-6 h-6 text-pink-600" />
                      ) : (
                        <Store className="w-6 h-6 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-heading text-lg">{partner.name}</h3>
                      <Badge variant="outline" className="rounded-full text-xs">
                        {partner.partner_type}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUpdateStatus(partner.id, 'Inactive')}>
                        Mark Inactive
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeletePartner(partner.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status */}
                <Badge className={`${getStatusColor(partner.status)} rounded-full mb-4`}>
                  {partner.status}
                </Badge>

                {/* Location */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{[partner.area, partner.city].filter(Boolean).join(', ')}</span>
                  </div>
                  {partner.contact_person && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{partner.contact_person}</span>
                    </div>
                  )}
                  {partner.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{partner.contact_phone}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-lg font-heading">{partner.leads_count}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div>
                    <p className="text-lg font-heading">{partner.conversions}</p>
                    <p className="text-xs text-muted-foreground">Conversions</p>
                  </div>
                  <div>
                    <p className="text-lg font-heading">
                      {partner.commission_percent ? `${partner.commission_percent}%` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Commission</p>
                  </div>
                </div>
              </Card>
            ))}
            {displayPartners.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No {activeTab === 'all' ? 'partners' : activeTab.toLowerCase() + 's'} found. Add your first partner to start tracking.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnersPage;
