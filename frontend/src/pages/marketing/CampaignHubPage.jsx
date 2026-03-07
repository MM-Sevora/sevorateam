import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { 
  Calendar, List, ChevronLeft, ChevronRight, Plus, Target, Users, DollarSign,
  Clock, Play, Pause, CheckCircle2, TrendingUp, Filter, Search, RefreshCw,
  CalendarDays, LayoutGrid, GanttChartSquare, MoreHorizontal, ExternalLink
} from 'lucide-react';

const STATUS_CONFIG = {
  planning: { label: 'Planning', icon: Clock, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  active: { label: 'Active', icon: Play, color: 'bg-green-100 text-green-700 border-green-200' },
  paused: { label: 'Paused', icon: Pause, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-gray-100 text-gray-700 border-gray-200' }
};

const CAMPAIGN_TYPES = {
  influencer: { label: 'Influencer', color: 'bg-purple-100 text-purple-700' },
  pr: { label: 'PR', color: 'bg-blue-100 text-blue-700' },
  mixed: { label: 'Mixed', color: 'bg-emerald-100 text-emerald-700' }
};

const PR_CAMPAIGN_TYPES = [
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'brand_announcement', label: 'Brand Announcement' },
  { value: 'event_promotion', label: 'Event Promotion' },
  { value: 'thought_leadership', label: 'Thought Leadership' },
  { value: 'industry_story', label: 'Industry Story' }
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CampaignHubPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [view, setView] = useState('list'); // list, calendar, timeline
  const [campaigns, setCampaigns] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // influencer, pr, mixed
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  
  // New campaign modal
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '', objective: 'awareness', budget: 0, start_date: '', end_date: '', target_market: '', description: '',
    campaign_type: 'influencer', // influencer, pr, mixed
    pr_campaign_type: '', // For PR: product_launch, brand_announcement, etc.
    target_media: '' // For PR campaigns
  });

  // PR Campaigns state
  const [prCampaigns, setPrCampaigns] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Use the unified campaigns API
      const campaignsRes = await api.get('/marketing/v2/unified-campaigns');
      
      setCampaigns(campaignsRes.data || []);
      
      // Separate PR campaigns for state
      const prCampaignsList = (campaignsRes.data || []).filter(c => c.campaign_type === 'pr');
      setPrCampaigns(prCampaignsList);
      
      // Generate milestones from campaigns
      const allMilestones = [];
      (campaignsRes.data || []).forEach(campaign => {
        if (campaign.start_date) {
          allMilestones.push({
            id: `start-${campaign.id}`,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            title: `${campaign.name} - Start`,
            date: campaign.start_date,
            type: 'campaign_start',
            status: campaign.status
          });
        }
        if (campaign.end_date) {
          allMilestones.push({
            id: `end-${campaign.id}`,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            title: `${campaign.name} - End`,
            date: campaign.end_date,
            type: 'campaign_end',
            status: campaign.status
          });
        }
      });
      setMilestones(allMilestones);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) {
      toast.error('Campaign name is required');
      return;
    }
    try {
      if (newCampaign.campaign_type === 'pr') {
        // Create PR campaign
        const prData = {
          name: newCampaign.name,
          objective: newCampaign.objective,
          description: newCampaign.description,
          start_date: newCampaign.start_date,
          end_date: newCampaign.end_date,
          budget: newCampaign.budget,
          key_messages: [],
          target_publications: newCampaign.target_media ? newCampaign.target_media.split(',').map(s => s.trim()) : [],
          target_beats: []
        };
        await api.post('/marketing/v2/pr/campaigns', prData);
      } else {
        // Create Influencer/Event campaign
        await api.post('/marketing/campaigns', {
          ...newCampaign,
          campaign_type: newCampaign.campaign_type
        });
      }
      toast.success('Campaign created!');
      setShowNewCampaign(false);
      setNewCampaign({ name: '', objective: 'awareness', budget: 0, start_date: '', end_date: '', target_market: '', description: '', campaign_type: 'influencer', pr_campaign_type: '', target_media: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const getItemsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const items = [];
    
    // Add campaign milestones
    milestones.forEach(m => {
      if (m.date === dateStr) {
        items.push({ ...m, itemType: 'milestone' });
      }
    });
    
    // Check if date falls within campaign range
    campaigns.forEach(c => {
      if (c.start_date && c.end_date) {
        const start = new Date(c.start_date);
        const end = new Date(c.end_date);
        if (date >= start && date <= end) {
          items.push({
            id: `range-${c.id}-${dateStr}`,
            campaign_id: c.id,
            campaign_name: c.name,
            title: c.name,
            type: 'campaign_range',
            status: c.status,
            itemType: 'range'
          });
        }
      }
    });
    
    return items;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.objective?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.campaign_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalInfluencers = campaigns.filter(c => c.campaign_type === 'influencer').reduce((sum, c) => sum + (c.influencer_count || 0), 0);
  const prCampaignCount = campaigns.filter(c => c.campaign_type === 'pr').length;

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const days = [];
    
    // Empty cells for days before the month starts
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateItems = getItemsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();
      
      days.push(
        <div 
          key={day}
          className={`h-24 border border-gray-100 p-1 hover:bg-gray-50 cursor-pointer overflow-hidden ${isToday ? 'bg-amber-50 border-amber-200' : ''}`}
          onClick={() => { setSelectedDate(date); setShowDateModal(true); }}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-amber-600' : 'text-gray-700'}`}>{day}</div>
          <div className="space-y-0.5">
            {dateItems.slice(0, 3).map((item, idx) => (
              <div 
                key={idx}
                className={`text-xs px-1 py-0.5 rounded truncate ${
                  item.type === 'campaign_start' ? 'bg-green-100 text-green-700' :
                  item.type === 'campaign_end' ? 'bg-red-100 text-red-700' :
                  'bg-blue-50 text-blue-600'
                }`}
              >
                {item.title}
              </div>
            ))}
            {dateItems.length > 3 && (
              <div className="text-xs text-gray-400">+{dateItems.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" data-testid="campaign-hub-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Campaign Management</p>
          <h1 className="text-3xl font-semibold text-gray-900">Campaign Hub</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex">
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className={view === 'list' ? 'bg-[#c4a35a] text-white' : ''}
            >
              <LayoutGrid className="w-4 h-4 mr-1" /> List
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('calendar')}
              className={view === 'calendar' ? 'bg-[#c4a35a] text-white' : ''}
            >
              <CalendarDays className="w-4 h-4 mr-1" /> Calendar
            </Button>
            <Button
              variant={view === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('timeline')}
              className={view === 'timeline' ? 'bg-[#c4a35a] text-white' : ''}
            >
              <GanttChartSquare className="w-4 h-4 mr-1" /> Timeline
            </Button>
          </div>
          
          <Button onClick={() => setShowNewCampaign(true)} className="bg-[#c4a35a] hover:bg-[#b39349] text-white" data-testid="new-campaign-btn">
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards - Gradient Style */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 uppercase tracking-wider">Campaigns</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{campaigns.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total campaigns</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 uppercase tracking-wider">Active</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{activeCampaigns}</p>
                <p className="text-xs text-gray-500 mt-1">Running now</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Play className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Influencers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalInfluencers}</p>
                <p className="text-xs text-gray-500 mt-1">Assigned</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 uppercase tracking-wider">Budget</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalBudget)}</p>
                <p className="text-xs text-gray-500 mt-1">Total allocated</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List View */}
      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200"
                data-testid="search-campaigns"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="influencer">Influencer</SelectItem>
                <SelectItem value="pr">PR</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-gray-600">
              Showing <span className="font-medium text-gray-900">{filteredCampaigns.length}</span> of {campaigns.length} campaigns
            </span>
          </div>

          {/* Campaign Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[280px]">Campaign</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px]">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px]">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[120px]">Budget</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px]">Spent</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[80px]">Progress</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px]">Team</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[150px]">Duration</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100">
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium">No campaigns found</p>
                      <p className="text-gray-400 text-sm mt-1">Create your first campaign to get started</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map(campaign => {
                    const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.planning;
                    const StatusIcon = statusCfg.icon;
                    const typeCfg = CAMPAIGN_TYPES[campaign.campaign_type] || CAMPAIGN_TYPES.influencer;
                    const progress = campaign.budget > 0 ? Math.min((campaign.spent / campaign.budget) * 100, 100) : 0;
                    const isPR = campaign.campaign_type === 'pr';
                    
                    return (
                      <TableRow 
                        key={campaign.id}
                        className="cursor-pointer hover:bg-amber-50/50 transition-colors group"
                        onClick={() => isPR ? navigate(`/marketing/pr?campaign=${campaign.id}`) : navigate(`/marketing/campaign/${campaign.id}`)}
                          data-testid={`campaign-row-${campaign.id}`}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">{campaign.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{campaign.objective}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${typeCfg.color}`}>{typeCfg.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusCfg.color} text-xs`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(campaign.budget)}</TableCell>
                          <TableCell className="text-amber-600 font-medium">{formatCurrency(campaign.spent || 0)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                <div 
                                  className="bg-amber-500 h-1.5 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Users className="w-3 h-3" />
                              {isPR ? (campaign.journalist_ids?.length || 0) : (campaign.influencer_count || 0)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {campaign.start_date || '-'} → {campaign.end_date || '-'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                isPR ? navigate(`/marketing/pr?campaign=${campaign.id}`) : navigate(`/marketing/campaign/${campaign.id}`);
                              }}
                            >
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
          </div>
        </>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-100" /> Start</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-100" /> End</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-100" /> Active</span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 border border-gray-200 rounded-lg overflow-hidden">
              {renderCalendar()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline View */}
      {view === 'timeline' && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GanttChartSquare className="w-5 h-5 text-amber-500" />
              Campaign Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns.filter(c => c.start_date && c.end_date).map(campaign => {
                const start = new Date(campaign.start_date);
                const end = new Date(campaign.end_date);
                const today = new Date();
                const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                const elapsedDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
                const progress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
                const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.planning;
                
                return (
                  <div 
                    key={campaign.id}
                    className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/marketing/campaign/${campaign.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                        <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{campaign.start_date}</span>
                        <span>→</span>
                        <span>{campaign.end_date}</span>
                      </div>
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`absolute h-full rounded-full transition-all ${
                          campaign.status === 'completed' ? 'bg-gray-400' :
                          campaign.status === 'active' ? 'bg-green-500' :
                          campaign.status === 'paused' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-3">
                        <span className="text-xs font-medium text-white drop-shadow">{campaign.name}</span>
                        <span className="text-xs text-gray-600">{Math.round(progress)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span><Users className="w-3 h-3 inline mr-1" />{campaign.influencer_count || 0} influencers</span>
                      <span><DollarSign className="w-3 h-3 inline mr-1" />{formatCurrency(campaign.budget)} budget</span>
                      <span><TrendingUp className="w-3 h-3 inline mr-1" />{formatCurrency(campaign.spent)} spent</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Campaign Modal */}
      <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
        <DialogContent className="max-w-lg" data-testid="new-campaign-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              Create New Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">CAMPAIGN TYPE *</Label>
              <Select value={newCampaign.campaign_type} onValueChange={v => setNewCampaign(prev => ({ ...prev, campaign_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="influencer">Influencer Campaign</SelectItem>
                  <SelectItem value="pr">PR Campaign</SelectItem>
                  <SelectItem value="mixed">Mixed Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">CAMPAIGN NAME *</Label>
              <Input 
                value={newCampaign.name}
                onChange={e => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Summer Collection 2026"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">OBJECTIVE</Label>
                <Select value={newCampaign.objective} onValueChange={v => setNewCampaign(prev => ({ ...prev, objective: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awareness">Brand Awareness</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="launch">Product Launch</SelectItem>
                    {newCampaign.campaign_type === 'pr' && (
                      <>
                        <SelectItem value="media_coverage">Media Coverage</SelectItem>
                        <SelectItem value="thought_leadership">Thought Leadership</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">BUDGET (₹)</Label>
                <Input 
                  type="number"
                  value={newCampaign.budget}
                  onChange={e => setNewCampaign(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
            {newCampaign.campaign_type === 'pr' && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">TARGET MEDIA (comma-separated)</Label>
                <Input 
                  value={newCampaign.target_media}
                  onChange={e => setNewCampaign(prev => ({ ...prev, target_media: e.target.value }))}
                  placeholder="Vogue, Elle, Femina"
                  className="mt-1"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">START DATE</Label>
                <Input 
                  type="date"
                  value={newCampaign.start_date}
                  onChange={e => setNewCampaign(prev => ({ ...prev, start_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">END DATE</Label>
                <Input 
                  type="date"
                  value={newCampaign.end_date}
                  onChange={e => setNewCampaign(prev => ({ ...prev, end_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            {newCampaign.campaign_type !== 'pr' && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">TARGET MARKET</Label>
                <Input 
                  value={newCampaign.target_market}
                  onChange={e => setNewCampaign(prev => ({ ...prev, target_market: e.target.value }))}
                  placeholder="Urban Women 25-35"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">DESCRIPTION</Label>
              <Input 
                value={newCampaign.description}
                onChange={e => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Campaign description..."
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowNewCampaign(false)}>Cancel</Button>
            <Button onClick={handleCreateCampaign} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
              <Plus className="w-4 h-4 mr-2" /> Create Campaign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Date Detail Modal */}
      <Dialog open={showDateModal} onOpenChange={setShowDateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedDate && getItemsForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No campaigns on this date</p>
            ) : (
              <div className="space-y-2">
                {selectedDate && getItemsForDate(selectedDate).map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                      item.type === 'campaign_start' ? 'border-green-200 bg-green-50' :
                      item.type === 'campaign_end' ? 'border-red-200 bg-red-50' :
                      'border-blue-200 bg-blue-50'
                    }`}
                    onClick={() => {
                      if (item.campaign_id) {
                        navigate(`/marketing/campaign/${item.campaign_id}`);
                        setShowDateModal(false);
                      }
                    }}
                  >
                    <div className="font-medium">{item.title}</div>
                    {item.campaign_name && <div className="text-sm text-gray-500">{item.campaign_name}</div>}
                    <Badge className="mt-2 capitalize">{item.type?.replace('_', ' ') || 'Campaign'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignHubPage;
