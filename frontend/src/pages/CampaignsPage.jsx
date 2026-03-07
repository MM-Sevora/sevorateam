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
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const CAMPAIGN_TYPES = [
  { value: 'Mall Activation', label: 'Mall Activation' },
  { value: 'Residential Popup', label: 'Residential Popup' },
  { value: 'Wedding Expo', label: 'Wedding Expo' },
  { value: 'Fashion Event', label: 'Fashion Event' },
  { value: 'Salon Partnership', label: 'Salon Partnership' },
  { value: 'Boutique Partnership', label: 'Boutique Partnership' },
  { value: 'Influencer Campaign', label: 'Influencer Campaign' },
  { value: 'Digital Ads', label: 'Digital Ads' },
  { value: 'Hoarding', label: 'Hoarding' },
  { value: 'Other', label: 'Other' },
];

const CAMPAIGN_STATUSES = [
  { value: 'Planned', label: 'Planned', color: 'bg-blue-100 text-blue-800' },
  { value: 'Active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'Completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const CampaignsPage = () => {
  const { api } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    campaign_type: '',
    location: '',
    venue: '',
    start_date: '',
    end_date: '',
    budget: '',
    target_leads: '',
    description: '',
    status: 'Planned',
  });

  useEffect(() => {
    fetchCampaigns();
  }, [filterStatus, filterType]);

  const fetchCampaigns = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('campaign_type', filterType);
      
      const response = await api.get(`/campaigns?${params.toString()}`);
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCampaign = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newCampaign,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        budget: newCampaign.budget ? parseFloat(newCampaign.budget) : null,
        target_leads: newCampaign.target_leads ? parseInt(newCampaign.target_leads) : null,
      };
      await api.post('/campaigns', payload);
      toast.success('Campaign created successfully');
      setIsAddOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create campaign');
    }
  };

  const handleUpdateStatus = async (campaignId, newStatus) => {
    try {
      await api.put(`/campaigns/${campaignId}`, { status: newStatus });
      toast.success('Campaign status updated');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.delete(`/campaigns/${campaignId}`);
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const resetForm = () => {
    setNewCampaign({
      name: '', campaign_type: '', location: '', venue: '',
      start_date: '', end_date: '', budget: '', target_leads: '',
      description: '', status: 'Planned',
    });
    setStartDate(null);
    setEndDate(null);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const found = CAMPAIGN_STATUSES.find(s => s.value === status);
    return found?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-8 space-y-6 animate-slide-in" data-testid="campaigns-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1 font-body text-sm">Manage marketing campaigns and track performance</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-campaign-btn" className="rounded-sm uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Create Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCampaign} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Campaign Name *</Label>
                <Input
                  data-testid="campaign-name-input"
                  className="rounded-none"
                  placeholder="e.g., Phoenix Mall Mumbai - Jan 2026"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Campaign Type *</Label>
                <Select
                  value={newCampaign.campaign_type}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, campaign_type: value })}
                >
                  <SelectTrigger data-testid="campaign-type-select" className="rounded-none">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">City/Location</Label>
                  <Input
                    data-testid="campaign-location-input"
                    className="rounded-none"
                    placeholder="e.g., Mumbai"
                    value={newCampaign.location}
                    onChange={(e) => setNewCampaign({ ...newCampaign, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Venue</Label>
                  <Input
                    data-testid="campaign-venue-input"
                    className="rounded-none"
                    placeholder="e.g., Phoenix Mall"
                    value={newCampaign.venue}
                    onChange={(e) => setNewCampaign({ ...newCampaign, venue: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-testid="campaign-start-date-btn"
                        className="w-full justify-start text-left font-normal rounded-none"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-testid="campaign-end-date-btn"
                        className="w-full justify-start text-left font-normal rounded-none"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Budget (₹)</Label>
                  <Input
                    data-testid="campaign-budget-input"
                    type="number"
                    className="rounded-none"
                    placeholder="50000"
                    value={newCampaign.budget}
                    onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Target Leads</Label>
                  <Input
                    data-testid="campaign-target-input"
                    type="number"
                    className="rounded-none"
                    placeholder="100"
                    value={newCampaign.target_leads}
                    onChange={(e) => setNewCampaign({ ...newCampaign, target_leads: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Description</Label>
                <Textarea
                  data-testid="campaign-description-input"
                  className="rounded-none"
                  rows={3}
                  placeholder="Campaign details, goals, notes..."
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                />
              </div>

              <Button
                type="submit"
                data-testid="submit-campaign-btn"
                className="w-full rounded-sm uppercase tracking-wider text-xs"
                disabled={!newCampaign.name || !newCampaign.campaign_type || !startDate}
              >
                Create Campaign
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="card-sharp">
        <div className="flex flex-wrap gap-4">
          <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger data-testid="filter-campaign-status" className="w-[180px] rounded-none">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {CAMPAIGN_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType || 'all'} onValueChange={(v) => setFilterType(v === 'all' ? '' : v)}>
            <SelectTrigger data-testid="filter-campaign-type" className="w-[180px] rounded-none">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CAMPAIGN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="campaigns-grid">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} data-testid={`campaign-card-${campaign.id}`} className="card-sharp">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-heading text-lg">{campaign.name}</h3>
                <Badge variant="outline" className="rounded-full text-xs mt-1">
                  {campaign.campaign_type}
                </Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleUpdateStatus(campaign.id, 'Active')}>
                    Mark Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleUpdateStatus(campaign.id, 'Completed')}>
                    Mark Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => handleDeleteCampaign(campaign.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status */}
            <Badge className={`${getStatusColor(campaign.status)} rounded-full mb-4`}>
              {campaign.status}
            </Badge>

            {/* Location & Date */}
            <div className="space-y-2 mb-4">
              {(campaign.location || campaign.venue) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{[campaign.venue, campaign.location].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {new Date(campaign.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {campaign.end_date && ` - ${new Date(campaign.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-lg font-heading">{campaign.leads_count}</p>
                  <p className="text-xs text-muted-foreground">Leads</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-lg font-heading">{campaign.conversions}</p>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </div>
              </div>
            </div>

            {/* Budget & Target */}
            {(campaign.budget || campaign.target_leads) && (
              <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-border">
                {campaign.budget && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gold" />
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(campaign.budget)}</p>
                      <p className="text-xs text-muted-foreground">Budget</p>
                    </div>
                  </div>
                )}
                {campaign.target_leads && (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">{campaign.target_leads}</p>
                      <p className="text-xs text-muted-foreground">Target</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            {campaign.target_leads > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round((campaign.leads_count / campaign.target_leads) * 100)}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min((campaign.leads_count / campaign.target_leads) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
        ))}
        {campaigns.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No campaigns found. Create your first campaign to track marketing activities.
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignsPage;
