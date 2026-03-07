import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MoreVertical,
  MessageSquare,
  User,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const LEAD_SOURCES = [
  'Instagram Ads', 'Facebook Ads', 'Influencer', 'Event', 'QR Code',
  'Salon', 'Wedding Planner', 'Website', 'App', 'Mall Activation',
  'Residential Popup', 'Boutique Partner', 'Hoarding', 'WhatsApp Ads', 'Referral'
];

const PIPELINE_STAGES = [
  'New Lead', 'Contacted', 'Styling Session Scheduled', 'Styling Completed',
  'Trial / Selection', 'Order Confirmed', 'Closed Lost'
];

const getStageColor = (stage) => {
  const colors = {
    'New Lead': 'bg-blue-100 text-blue-800',
    'Contacted': 'bg-yellow-100 text-yellow-800',
    'Styling Session Scheduled': 'bg-purple-100 text-purple-800',
    'Styling Completed': 'bg-indigo-100 text-indigo-800',
    'Trial / Selection': 'bg-orange-100 text-orange-800',
    'Order Confirmed': 'bg-emerald-100 text-emerald-800',
    'Closed Lost': 'bg-red-100 text-red-800',
  };
  return colors[stage] || 'bg-gray-100 text-gray-800';
};

const LeadsPage = () => {
  const { api } = useAuth();
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
    source_details: '',
    occasion: '',
    city: '',
    notes: '',
    campaign_id: '',
    partner_id: '',
  });

  useEffect(() => {
    fetchLeads();
    fetchUsers();
    fetchCampaigns();
    fetchPartners();
  }, [search, filterSource, filterStage]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterSource) params.append('source', filterSource);
      if (filterStage) params.append('stage', filterStage);
      
      const response = await api.get(`/leads?${params.toString()}`);
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/campaigns?status=Active');
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to fetch campaigns');
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await api.get('/partners?status=Active');
      setPartners(response.data);
    } catch (error) {
      console.error('Failed to fetch partners');
    }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newLead,
        campaign_id: newLead.campaign_id || null,
        partner_id: newLead.partner_id || null,
      };
      await api.post('/leads', payload);
      toast.success('Lead created successfully');
      setIsAddOpen(false);
      setNewLead({ name: '', phone: '', email: '', source: '', source_details: '', occasion: '', city: '', notes: '', campaign_id: '', partner_id: '' });
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create lead');
    }
  };

  const handleUpdateStage = async (leadId, stage) => {
    try {
      await api.put(`/leads/${leadId}`, { stage });
      toast.success('Lead stage updated');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleAssignLead = async (leadId, userId) => {
    try {
      await api.put(`/leads/${leadId}`, { assigned_to: userId });
      toast.success('Lead assigned successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to assign lead');
    }
  };

  const handleSendWhatsApp = async (leadId) => {
    try {
      await api.post('/whatsapp/send', { lead_id: leadId });
      toast.success('WhatsApp message queued');
    } catch (error) {
      toast.error('Failed to send WhatsApp');
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <div className="p-8 space-y-6 animate-slide-in" data-testid="leads-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1 font-body text-sm">Manage and track your leads pipeline</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-lead-btn" className="rounded-sm uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Add New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddLead} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Name *</Label>
                  <Input
                    data-testid="lead-name-input"
                    className="rounded-none"
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Phone *</Label>
                  <Input
                    data-testid="lead-phone-input"
                    className="rounded-none"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Email</Label>
                <Input
                  data-testid="lead-email-input"
                  type="email"
                  className="rounded-none"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Source *</Label>
                  <Select
                    value={newLead.source}
                    onValueChange={(value) => setNewLead({ ...newLead, source: value })}
                  >
                    <SelectTrigger data-testid="lead-source-select" className="rounded-none">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">City</Label>
                  <Input
                    data-testid="lead-city-input"
                    className="rounded-none"
                    value={newLead.city}
                    onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Occasion</Label>
                <Input
                  data-testid="lead-occasion-input"
                  className="rounded-none"
                  placeholder="e.g., Wedding, Reception, Engagement"
                  value={newLead.occasion}
                  onChange={(e) => setNewLead({ ...newLead, occasion: e.target.value })}
                />
              </div>
              {/* Campaign Selection */}
              {campaigns.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Campaign (Optional)</Label>
                  <Select
                    value={newLead.campaign_id || 'none'}
                    onValueChange={(value) => setNewLead({ ...newLead, campaign_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger data-testid="lead-campaign-select" className="rounded-none">
                      <SelectValue placeholder="Link to campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Campaign</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name} ({campaign.campaign_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Link lead to an active marketing campaign</p>
                </div>
              )}
              {/* Partner Selection */}
              {partners.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Partner (Optional)</Label>
                  <Select
                    value={newLead.partner_id || 'none'}
                    onValueChange={(value) => setNewLead({ ...newLead, partner_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger data-testid="lead-partner-select" className="rounded-none">
                      <SelectValue placeholder="Link to partner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Partner</SelectItem>
                      {partners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.id}>
                          {partner.name} ({partner.partner_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Link lead to salon/boutique partnership</p>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Notes</Label>
                <Textarea
                  data-testid="lead-notes-input"
                  className="rounded-none"
                  rows={3}
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                />
              </div>
              <Button type="submit" data-testid="submit-lead-btn" className="w-full rounded-sm uppercase tracking-wider text-xs">
                Create Lead
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="card-sharp">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="search-leads-input"
                className="pl-10 rounded-none"
                placeholder="Search by name, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Select value={filterSource || 'all'} onValueChange={(v) => setFilterSource(v === 'all' ? '' : v)}>
            <SelectTrigger data-testid="filter-source" className="w-[180px] rounded-none">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStage || 'all'} onValueChange={(v) => setFilterStage(v === 'all' ? '' : v)}>
            <SelectTrigger data-testid="filter-stage" className="w-[180px] rounded-none">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Leads Table */}
      <Card className="card-sharp" data-testid="leads-table">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="table-header-editorial text-left pb-4">Lead</th>
                <th className="table-header-editorial text-left pb-4">Contact</th>
                <th className="table-header-editorial text-left pb-4">Source</th>
                <th className="table-header-editorial text-left pb-4">Stage</th>
                <th className="table-header-editorial text-left pb-4">Assigned To</th>
                <th className="table-header-editorial text-left pb-4">Created</th>
                <th className="table-header-editorial text-right pb-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} data-testid={`lead-row-${lead.id}`} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-secondary flex items-center justify-center text-sm font-semibold">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        {lead.occasion && (
                          <p className="text-xs text-muted-foreground">{lead.occasion}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {lead.phone}
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <Badge variant="outline" className="rounded-full text-xs">
                      {lead.source}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <Select
                      value={lead.stage}
                      onValueChange={(value) => handleUpdateStage(lead.id, value)}
                    >
                      <SelectTrigger className="w-[180px] rounded-none h-8 text-xs">
                        <Badge className={`${getStageColor(lead.stage)} rounded-full text-xs`}>
                          {lead.stage}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGES.map((stage) => (
                          <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-4">
                    <Select
                      value={lead.assigned_to || 'unassigned'}
                      onValueChange={(value) => value !== 'unassigned' && handleAssignLead(lead.id, value)}
                    >
                      <SelectTrigger className="w-[150px] rounded-none h-8 text-xs">
                        <SelectValue placeholder="Unassigned">
                          {lead.assigned_to_name || 'Unassigned'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSendWhatsApp(lead.id)}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Send WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                          <User className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No leads found. Create your first lead to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lead Details Modal */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Lead Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary flex items-center justify-center text-white text-2xl font-heading">
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-heading">{selectedLead.name}</h3>
                  <Badge className={`${getStageColor(selectedLead.stage)} rounded-full`}>
                    {selectedLead.stage}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedLead.phone}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedLead.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Source</p>
                  <p className="font-medium">{selectedLead.source}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">City</p>
                  <p className="font-medium">{selectedLead.city || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Occasion</p>
                  <p className="font-medium">{selectedLead.occasion || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{selectedLead.assigned_to_name || 'Unassigned'}</p>
                </div>
              </div>
              {selectedLead.notes && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{selectedLead.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-sm uppercase tracking-wider text-xs"
                  onClick={() => handleSendWhatsApp(selectedLead.id)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button className="flex-1 rounded-sm uppercase tracking-wider text-xs">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Convert to Customer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LeadsPage;
