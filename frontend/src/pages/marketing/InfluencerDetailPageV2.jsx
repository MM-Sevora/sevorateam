import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { 
  ArrowLeft, RefreshCw, Save, User, Globe, Users, TrendingUp,
  Mail, Phone, ExternalLink, Edit2, Plus, Send, Film, DollarSign,
  Target, CheckCircle, Clock, XCircle, Eye, Trash2, Instagram, Youtube,
  Heart, Image, MessageSquare, Calendar, MapPin, Star
} from 'lucide-react';

const TIER_CONFIG = {
  nano: { label: 'Nano', color: 'bg-gray-100 text-gray-700', range: '1K-10K' },
  micro: { label: 'Micro', color: 'bg-blue-100 text-blue-700', range: '10K-50K' },
  mid: { label: 'Mid', color: 'bg-green-100 text-green-700', range: '50K-500K' },
  macro: { label: 'Macro', color: 'bg-purple-100 text-purple-700', range: '500K-1M' },
  mega: { label: 'Mega', color: 'bg-amber-100 text-amber-700', range: '1M+' },
};

const STATUS_CONFIG = {
  identified: { label: 'Identified', color: 'bg-gray-100 text-gray-700' },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  negotiating: { label: 'Negotiating', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700' },
};

const CONTENT_STATUS = [
  { id: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { id: 'submitted', label: 'Submitted', color: 'bg-amber-100 text-amber-700' },
  { id: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
  { id: 'published', label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
];

const INDUSTRIES = ['Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Food', 'Travel', 'Fitness', 'Parenting', 'Finance', 'Entertainment'];

const InfluencerDetailPage = () => {
  const { influencerId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [influencer, setInfluencer] = useState(null);
  
  // Related data
  const [campaigns, setCampaigns] = useState([]);
  const [assignedCampaigns, setAssignedCampaigns] = useState([]);
  const [content, setContent] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [payments, setPayments] = useState([]);
  
  // Modals
  const [showContentModal, setShowContentModal] = useState(false);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Forms
  const [newContent, setNewContent] = useState({ type: 'post', platform: 'instagram', description: '', due_date: '', campaign_id: '' });
  const [newOutreach, setNewOutreach] = useState({ channel: 'email', subject: '', message: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', description: '', due_date: '', status: 'pending' });
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  // Fetch influencer details
  const fetchInfluencer = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/marketing/v2/contacts/${influencerId}`);
      setInfluencer(response.data);
    } catch (error) {
      toast.error('Failed to load influencer');
      navigate('/marketing/influencers');
    } finally {
      setLoading(false);
    }
  }, [api, influencerId, navigate]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await api.get('/marketing/campaigns');
      setCampaigns(response.data || []);
      // Filter campaigns where this influencer is assigned
      const assigned = (response.data || []).filter(c => 
        c.influencer_ids?.includes(influencerId) || c.influencer_id === influencerId
      );
      setAssignedCampaigns(assigned);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  }, [api, influencerId]);

  // Fetch content/deliverables
  const fetchContent = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/influencers/${influencerId}/content`).catch(() => ({ data: [] }));
      setContent(response.data || []);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    }
  }, [api, influencerId]);

  // Fetch outreach history
  const fetchOutreach = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${influencerId}/communications`).catch(() => ({ data: [] }));
      setOutreach(response.data || []);
    } catch (error) {
      console.error('Failed to fetch outreach:', error);
    }
  }, [api, influencerId]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/influencers/${influencerId}/payments`).catch(() => ({ data: [] }));
      setPayments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  }, [api, influencerId]);

  useEffect(() => {
    fetchInfluencer();
    fetchCampaigns();
    fetchContent();
    fetchOutreach();
    fetchPayments();
  }, [fetchInfluencer, fetchCampaigns, fetchContent, fetchOutreach, fetchPayments]);

  // Handlers
  const handleAssignToCampaign = async () => {
    if (!selectedCampaignId) { toast.error('Select a campaign'); return; }
    try {
      await api.post(`/marketing/campaigns/${selectedCampaignId}/influencers/${influencerId}`);
      toast.success('Assigned to campaign');
      setShowAssignModal(false);
      setSelectedCampaignId('');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to assign');
    }
  };

  const handleCreateContent = async () => {
    if (!newContent.type || !newContent.platform) {
      toast.error('Type and platform required');
      return;
    }
    try {
      await api.post(`/marketing/v2/influencers/${influencerId}/content`, {
        ...newContent,
        influencer_id: influencerId,
        status: 'pending'
      });
      toast.success('Content deliverable added');
      setShowContentModal(false);
      setNewContent({ type: 'post', platform: 'instagram', description: '', due_date: '', campaign_id: '' });
      fetchContent();
    } catch (error) {
      toast.error('Failed to add content');
    }
  };

  const handleSendOutreach = async () => {
    if (!newOutreach.subject || !newOutreach.message) {
      toast.error('Subject and message required');
      return;
    }
    try {
      await api.post(`/marketing/v2/contacts/${influencerId}/communications`, {
        ...newOutreach,
        contact_id: influencerId,
        direction: 'outbound'
      });
      toast.success('Outreach sent');
      setShowOutreachModal(false);
      setNewOutreach({ channel: 'email', subject: '', message: '' });
      fetchOutreach();
    } catch (error) {
      toast.error('Failed to send');
    }
  };

  const handleCreatePayment = async () => {
    if (!newPayment.amount) {
      toast.error('Amount required');
      return;
    }
    try {
      await api.post(`/marketing/v2/influencers/${influencerId}/payments`, {
        ...newPayment,
        influencer_id: influencerId,
        amount: parseFloat(newPayment.amount)
      });
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      setNewPayment({ amount: '', description: '', due_date: '', status: 'pending' });
      fetchPayments();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.put(`/marketing/v2/contacts/${influencerId}`, { status: newStatus });
      toast.success('Status updated');
      fetchInfluencer();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const formatNum = (n) => {
    if (!n) return '-';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getContentStatusConfig = (status) => CONTENT_STATUS.find(s => s.id === status) || CONTENT_STATUS[0];

  if (loading || !influencer) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[influencer.tier] || TIER_CONFIG.micro;
  const statusConfig = STATUS_CONFIG[influencer.status] || STATUS_CONFIG.identified;

  // Stats calculations
  const totalContent = content.length;
  const publishedContent = content.filter(c => c.status === 'published').length;
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="p-8 bg-gray-50 min-h-screen" data-testid="influencer-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/influencers')} className="h-10 w-10 p-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Influencer Profile</p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900">{influencer.name}</h1>
            <Badge className={tierConfig.color}>{tierConfig.label}</Badge>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
        </div>
        <Select value={influencer.status} onValueChange={handleUpdateStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Update Status" /></SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchInfluencer}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatNum(influencer.followers)}</div>
                <div className="text-xs text-gray-500 uppercase">Followers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{influencer.engagement_rate?.toFixed(1) || 0}%</div>
                <div className="text-xs text-gray-500 uppercase">Engagement</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{assignedCampaigns.length}</div>
                <div className="text-xs text-gray-500 uppercase">Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Film className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{publishedContent}/{totalContent}</div>
                <div className="text-xs text-gray-500 uppercase">Content</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</div>
                <div className="text-xs text-gray-500 uppercase">Paid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalPending)}</div>
                <div className="text-xs text-gray-500 uppercase">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Influencer Journey Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <User className="w-4 h-4 mr-2" />Overview
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <Target className="w-4 h-4 mr-2" />Campaigns ({assignedCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <Film className="w-4 h-4 mr-2" />Content ({content.length})
          </TabsTrigger>
          <TabsTrigger value="outreach" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <Send className="w-4 h-4 mr-2" />Outreach ({outreach.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <DollarSign className="w-4 h-4 mr-2" />Payments ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-3 gap-6">
            {/* Profile Info */}
            <Card className="bg-white border-gray-200 col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Industry</Label>
                    <p className="font-medium capitalize">{influencer.industry || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Primary Platform</Label>
                    <p className="font-medium capitalize flex items-center gap-2">
                      {influencer.primary_platform === 'instagram' ? <Instagram className="w-4 h-4 text-pink-500" /> : <Youtube className="w-4 h-4 text-red-500" />}
                      {influencer.primary_platform || 'Instagram'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Location</Label>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {[influencer.city, influencer.state].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Avg Likes</Label>
                    <p className="font-medium">{formatNum(influencer.avg_likes)}</p>
                  </div>
                </div>
                {influencer.bio && (
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Bio</Label>
                    <p className="text-gray-700">{influencer.bio}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs uppercase text-gray-500 mb-2 block">Content Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {(influencer.content_type || influencer.content_types?.split(',') || []).map((type, i) => (
                      <Badge key={i} variant="outline">{type.trim()}</Badge>
                    ))}
                    {!(influencer.content_type?.length || influencer.content_types) && <span className="text-gray-400">-</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact & Rates */}
            <div className="space-y-6">
              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-600" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {influencer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${influencer.email}`} className="text-amber-600 hover:underline">{influencer.email}</a>
                    </div>
                  )}
                  {influencer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{influencer.phone}</span>
                    </div>
                  )}
                  {influencer.instagram_handle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram className="w-4 h-4 text-pink-500" />
                      <a href={`https://instagram.com/${influencer.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                        @{influencer.instagram_handle}
                      </a>
                    </div>
                  )}
                  {influencer.youtube_handle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Youtube className="w-4 h-4 text-red-500" />
                      <span>@{influencer.youtube_handle}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    Rates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Post</span>
                    <span className="font-medium">{formatCurrency(influencer.rate_per_post)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Reel</span>
                    <span className="font-medium">{formatCurrency(influencer.rate_per_reel)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Story</span>
                    <span className="font-medium">{formatCurrency(influencer.rate_per_story)}</span>
                  </div>
                  {influencer.accepts_barter && (
                    <Badge variant="outline" className="mt-2">Accepts Barter</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Assigned Campaigns</CardTitle>
              <Button 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setShowAssignModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />Assign to Campaign
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-mono text-[10px] uppercase">Campaign</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Budget</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Duration</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Not assigned to any campaigns yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignedCampaigns.map(campaign => (
                      <TableRow key={campaign.id} className="hover:bg-amber-50/50">
                        <TableCell>
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{campaign.objective}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                            campaign.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(campaign.budget)}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {campaign.start_date || '-'} → {campaign.end_date || '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/marketing/campaign/${campaign.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          <div className="space-y-4">
            {/* Content Funnel */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Pending', count: content.filter(c => c.status === 'pending').length, color: 'bg-gray-100 text-gray-700' },
                { label: 'In Progress', count: content.filter(c => c.status === 'in_progress').length, color: 'bg-blue-100 text-blue-700' },
                { label: 'Submitted', count: content.filter(c => ['submitted', 'approved'].includes(c.status)).length, color: 'bg-amber-100 text-amber-700' },
                { label: 'Published', count: content.filter(c => c.status === 'published').length, color: 'bg-green-100 text-green-700' },
              ].map((stat, i) => (
                <Card key={i} className="bg-white border-gray-200">
                  <CardContent className="p-4 text-center">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${stat.color} mb-2`}>{stat.count}</div>
                    <div className="text-xs text-gray-500 uppercase">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Content Deliverables</CardTitle>
                <Button 
                  size="sm" 
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => setShowContentModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />Add Deliverable
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="font-mono text-[10px] uppercase">Type</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Platform</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Description</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Due Date</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {content.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No content deliverables yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      content.map(item => {
                        const statusConfig = getContentStatusConfig(item.status);
                        return (
                          <TableRow key={item.id} className="hover:bg-amber-50/50">
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{item.type}</Badge>
                            </TableCell>
                            <TableCell className="capitalize">{item.platform}</TableCell>
                            <TableCell className="text-gray-600 max-w-[200px] truncate">{item.description || '-'}</TableCell>
                            <TableCell>
                              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">{item.due_date || '-'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Outreach Tab */}
        <TabsContent value="outreach">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Outreach History</CardTitle>
              <Button 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setShowOutreachModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />New Outreach
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-mono text-[10px] uppercase">Channel</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Subject</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Message</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outreach.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No outreach history yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    outreach.map(item => (
                      <TableRow key={item.id} className="hover:bg-amber-50/50">
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{item.channel || 'Email'}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.subject || '-'}</TableCell>
                        <TableCell className="text-gray-600 max-w-[300px] truncate">{item.message}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Payment History</CardTitle>
              <Button 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setShowPaymentModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />Record Payment
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-mono text-[10px] uppercase">Amount</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Description</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Due Date</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No payments recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map(payment => (
                      <TableRow key={payment.id} className="hover:bg-amber-50/50">
                        <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell className="text-gray-600">{payment.description || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                            payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{payment.due_date || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign to Campaign Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              Assign to Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Select Campaign *</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose campaign" /></SelectTrigger>
                <SelectContent>
                  {campaigns.filter(c => !assignedCampaigns.find(ac => ac.id === c.id)).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssignToCampaign} className="bg-amber-600 hover:bg-amber-700 text-white">
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Content Modal */}
      <Dialog open={showContentModal} onOpenChange={setShowContentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-500" />
              Add Content Deliverable
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Type *</Label>
                <Select value={newContent.type} onValueChange={(v) => setNewContent({ ...newContent, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Static Post</SelectItem>
                    <SelectItem value="reel">Reel / Short</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="video">YouTube Video</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Platform *</Label>
                <Select value={newContent.platform} onValueChange={(v) => setNewContent({ ...newContent, platform: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Description</Label>
              <Textarea 
                value={newContent.description}
                onChange={(e) => setNewContent({ ...newContent, description: e.target.value })}
                placeholder="Content requirements..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Due Date</Label>
              <Input 
                type="date"
                value={newContent.due_date}
                onChange={(e) => setNewContent({ ...newContent, due_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowContentModal(false)}>Cancel</Button>
            <Button onClick={handleCreateContent} className="bg-amber-600 hover:bg-amber-700 text-white">
              Add Deliverable
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Outreach Modal */}
      <Dialog open={showOutreachModal} onOpenChange={setShowOutreachModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500" />
              Send Outreach to {influencer.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Channel</Label>
              <Select value={newOutreach.channel} onValueChange={(v) => setNewOutreach({ ...newOutreach, channel: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="instagram_dm">Instagram DM</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Subject *</Label>
              <Input 
                value={newOutreach.subject}
                onChange={(e) => setNewOutreach({ ...newOutreach, subject: e.target.value })}
                placeholder="Message subject"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Message *</Label>
              <Textarea 
                value={newOutreach.message}
                onChange={(e) => setNewOutreach({ ...newOutreach, message: e.target.value })}
                placeholder="Your message..."
                className="mt-1"
                rows={6}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowOutreachModal(false)}>Cancel</Button>
            <Button onClick={handleSendOutreach} className="bg-amber-600 hover:bg-amber-700 text-white">
              Send Outreach
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Amount (₹) *</Label>
              <Input 
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                placeholder="e.g., 50000"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Description</Label>
              <Input 
                value={newPayment.description}
                onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                placeholder="Payment for reel content"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Status</Label>
                <Select value={newPayment.status} onValueChange={(v) => setNewPayment({ ...newPayment, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Due Date</Label>
                <Input 
                  type="date"
                  value={newPayment.due_date}
                  onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button onClick={handleCreatePayment} className="bg-amber-600 hover:bg-amber-700 text-white">
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfluencerDetailPage;
