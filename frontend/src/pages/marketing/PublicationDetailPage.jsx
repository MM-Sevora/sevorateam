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
import { toast } from 'sonner';
import { 
  ArrowLeft, RefreshCw, Save, Building2, Globe, Users, TrendingUp,
  Mail, Phone, ExternalLink, Edit2, Plus, Send, Newspaper, DollarSign,
  Target, CheckCircle, Clock, XCircle, Eye, Trash2, MessageSquare, User
} from 'lucide-react';

const BEAT_OPTIONS = ['Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Business', 'Entertainment', 'Startup', 'Luxury', 'Travel', 'Food'];

const PITCH_STATUS = [
  { id: 'identified', label: 'Identified', color: 'bg-gray-100 text-gray-700' },
  { id: 'pitch_prepared', label: 'Pitch Prepared', color: 'bg-blue-100 text-blue-700' },
  { id: 'pitch_sent', label: 'Pitch Sent', color: 'bg-purple-100 text-purple-700' },
  { id: 'follow_up', label: 'Follow Up', color: 'bg-amber-100 text-amber-700' },
  { id: 'responded', label: 'Responded', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'interested', label: 'Interested', color: 'bg-green-100 text-green-700' },
  { id: 'story_in_progress', label: 'Story in Progress', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'published', label: 'Published', color: 'bg-green-600 text-white' },
  { id: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
];

const COVERAGE_TYPES = [
  { value: 'article', label: 'Article' },
  { value: 'mention', label: 'Mention' },
  { value: 'feature', label: 'Feature' },
  { value: 'interview', label: 'Interview' },
  { value: 'review', label: 'Review' },
];

const TIER_CONFIG = {
  tier_1: { label: 'Tier 1', color: 'bg-purple-100 text-purple-700', description: 'Top national/international' },
  tier_2: { label: 'Tier 2', color: 'bg-blue-100 text-blue-700', description: 'Major regional/industry' },
  tier_3: { label: 'Tier 3', color: 'bg-green-100 text-green-700', description: 'Niche/specialized' },
  tier_4: { label: 'Tier 4', color: 'bg-gray-100 text-gray-700', description: 'Local/emerging' },
};

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-gray-100 text-gray-700' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  dormant: { label: 'Dormant', color: 'bg-yellow-100 text-yellow-700' },
  vip: { label: 'VIP', color: 'bg-purple-100 text-purple-700' },
};

const PublicationDetailPage = () => {
  const { publicationId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [publication, setPublication] = useState(null);
  
  // Related data
  const [journalists, setJournalists] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [advertorials, setAdvertorials] = useState([]);
  const [advertorialStats, setAdvertorialStats] = useState({});
  
  // Modals
  const [showJournalistModal, setShowJournalistModal] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [showAdvertorialModal, setShowAdvertorialModal] = useState(false);
  const [selectedJournalist, setSelectedJournalist] = useState(null);
  
  // Forms
  const [newJournalist, setNewJournalist] = useState({ name: '', email: '', role: '', beat: 'Fashion', phone: '' });
  const [newPitch, setNewPitch] = useState({ contact_id: '', subject: '', message: '', pr_campaign_id: '' });
  const [newCoverage, setNewCoverage] = useState({ title: '', url: '', coverage_type: 'article', sentiment: 'positive', author: '', published_date: '', estimated_reach: '' });
  const [newAdvertorial, setNewAdvertorial] = useState({ 
    advertorial_type: 'sponsored_article', 
    title: '', 
    description: '', 
    proposed_amount: '', 
    journalist_id: '',
    campaign_id: '',
    publish_date: '',
    deliverables: '',
    requirements: ''
  });

  // Fetch publication details
  const fetchPublication = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/marketing/v2/publications/${publicationId}`);
      setPublication(response.data);
    } catch (error) {
      toast.error('Failed to load publication');
      navigate('/marketing/publications');
    } finally {
      setLoading(false);
    }
  }, [api, publicationId, navigate]);

  // Fetch journalists at this publication
  const fetchJournalists = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/publications/${publicationId}/journalists`);
      setJournalists(response.data || []);
    } catch (error) {
      console.error('Failed to fetch journalists:', error);
    }
  }, [api, publicationId]);

  // Fetch pitches to journalists at this publication
  const fetchPitches = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/pr/pitches');
      // Filter pitches to journalists at this publication
      const journalistIds = journalists.map(j => j.id);
      const filteredPitches = (response.data || []).filter(p => journalistIds.includes(p.contact_id));
      setPitches(filteredPitches);
    } catch (error) {
      console.error('Failed to fetch pitches:', error);
    }
  }, [api, journalists]);

  // Fetch coverage from this publication
  const fetchCoverage = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/publications/${publicationId}/coverage`);
      setCoverage(response.data || []);
    } catch (error) {
      console.error('Failed to fetch coverage:', error);
    }
  }, [api, publicationId]);

  // Fetch PR campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/pr/campaigns');
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchPublication();
    fetchJournalists();
    fetchCampaigns();
  }, [fetchPublication, fetchJournalists, fetchCampaigns]);

  useEffect(() => {
    if (journalists.length > 0) {
      fetchPitches();
    }
    fetchCoverage();
  }, [journalists, fetchPitches, fetchCoverage]);

  // Handlers
  const handleAddJournalist = async () => {
    if (!newJournalist.name) { toast.error('Name required'); return; }
    try {
      await api.post('/marketing/v2/contacts', {
        ...newJournalist,
        contact_type: 'journalist',
        publication: publication.name,
        publication_id: publicationId
      });
      toast.success('Journalist added');
      setShowJournalistModal(false);
      setNewJournalist({ name: '', email: '', role: '', beat: 'Fashion', phone: '' });
      fetchJournalists();
    } catch (error) {
      toast.error('Failed to add journalist');
    }
  };

  const handleCreatePitch = async () => {
    if (!newPitch.contact_id || !newPitch.subject || !newPitch.message) {
      toast.error('All fields required');
      return;
    }
    try {
      await api.post('/marketing/v2/pr/pitches', newPitch);
      toast.success('Pitch created');
      setShowPitchModal(false);
      setNewPitch({ contact_id: '', subject: '', message: '', pr_campaign_id: '' });
      fetchPitches();
    } catch (error) {
      toast.error('Failed to create pitch');
    }
  };

  const handleRecordCoverage = async () => {
    if (!newCoverage.title || !newCoverage.url) {
      toast.error('Title and URL required');
      return;
    }
    try {
      await api.post('/marketing/v2/pr/coverage', {
        ...newCoverage,
        publication: publication.name,
        reach: newCoverage.estimated_reach ? parseInt(newCoverage.estimated_reach) : null
      });
      toast.success('Coverage recorded');
      setShowCoverageModal(false);
      setNewCoverage({ title: '', url: '', coverage_type: 'article', sentiment: 'positive', author: '', published_date: '', estimated_reach: '' });
      fetchCoverage();
    } catch (error) {
      toast.error('Failed to record coverage');
    }
  };

  const handleUpdatePitchStatus = async (pitchId, status) => {
    try {
      await api.put(`/marketing/v2/pr/pitches/${pitchId}/status`, null, { params: { status } });
      toast.success('Status updated');
      fetchPitches();
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

  const getPitchStatusConfig = (status) => PITCH_STATUS.find(s => s.id === status) || PITCH_STATUS[0];

  if (loading || !publication) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[publication.tier] || TIER_CONFIG.tier_2;
  const statusConfig = STATUS_CONFIG[publication.relationship_status] || STATUS_CONFIG.new;

  // Stats calculations
  const totalPitches = pitches.length;
  const respondedPitches = pitches.filter(p => ['responded', 'interested', 'story_in_progress', 'published'].includes(p.status)).length;
  const responseRate = totalPitches > 0 ? Math.round((respondedPitches / totalPitches) * 100) : 0;
  const totalReach = coverage.reduce((sum, c) => sum + (c.reach || 0), 0);

  return (
    <div className="p-8 bg-gray-50 min-h-screen" data-testid="publication-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/publications')} className="h-10 w-10 p-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Publication Profile</p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900">{publication.name}</h1>
            <Badge className={tierConfig.color}>{tierConfig.label}</Badge>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={fetchPublication}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{journalists.length}</div>
                <div className="text-xs text-gray-500 uppercase">Journalists</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalPitches}</div>
                <div className="text-xs text-gray-500 uppercase">Pitches Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{responseRate}%</div>
                <div className="text-xs text-gray-500 uppercase">Response Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{coverage.length}</div>
                <div className="text-xs text-gray-500 uppercase">Coverages</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatNum(totalReach)}</div>
                <div className="text-xs text-gray-500 uppercase">Total Reach</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{publication.domain_authority || '-'}</div>
                <div className="text-xs text-gray-500 uppercase">Domain Auth</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PR Journey Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
            <Building2 className="w-4 h-4 mr-2" />Overview
          </TabsTrigger>
          <TabsTrigger value="journalists" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
            <Users className="w-4 h-4 mr-2" />Journalists ({journalists.length})
          </TabsTrigger>
          <TabsTrigger value="outreach" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
            <Send className="w-4 h-4 mr-2" />Outreach ({pitches.length})
          </TabsTrigger>
          <TabsTrigger value="coverage" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
            <Newspaper className="w-4 h-4 mr-2" />Coverage ({coverage.length})
          </TabsTrigger>
          <TabsTrigger value="paid" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
            <DollarSign className="w-4 h-4 mr-2" />Paid PR
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-3 gap-6">
            {/* Publication Info */}
            <Card className="bg-white border-gray-200 col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  Publication Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Type</Label>
                    <p className="font-medium capitalize">{publication.publication_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Website</Label>
                    {publication.website ? (
                      <a href={publication.website} target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline flex items-center gap-1">
                        <Globe className="w-4 h-4" />{publication.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : <p className="text-gray-400">-</p>}
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Monthly Traffic</Label>
                    <p className="font-medium">{formatNum(publication.monthly_traffic)}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Readership</Label>
                    <p className="font-medium">{formatNum(publication.monthly_readership)}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Social Followers</Label>
                    <p className="font-medium">{formatNum(publication.social_followers)}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Audience</Label>
                    <p className="font-medium">{publication.audience_demographics || '-'}</p>
                  </div>
                </div>
                {publication.description && (
                  <div>
                    <Label className="text-xs uppercase text-gray-500">Description</Label>
                    <p className="text-gray-700">{publication.description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs uppercase text-gray-500 mb-2 block">Beats Covered</Label>
                  <div className="flex flex-wrap gap-2">
                    {(publication.beats_covered || []).map(beat => (
                      <Badge key={beat} variant="outline">{beat}</Badge>
                    ))}
                    {(publication.beats_covered || []).length === 0 && <span className="text-gray-400">-</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact & Rates */}
            <div className="space-y-6">
              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {publication.general_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">General:</span>
                      <a href={`mailto:${publication.general_email}`} className="text-purple-600 hover:underline">{publication.general_email}</a>
                    </div>
                  )}
                  {publication.editorial_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Editorial:</span>
                      <a href={`mailto:${publication.editorial_email}`} className="text-purple-600 hover:underline">{publication.editorial_email}</a>
                    </div>
                  )}
                  {publication.pr_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">PR:</span>
                      <a href={`mailto:${publication.pr_email}`} className="text-purple-600 hover:underline">{publication.pr_email}</a>
                    </div>
                  )}
                  {publication.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{publication.phone}</span>
                    </div>
                  )}
                  {publication.instagram_handle && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Instagram:</span>
                      <span className="text-purple-600">@{publication.instagram_handle}</span>
                    </div>
                  )}
                  {publication.twitter_handle && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Twitter:</span>
                      <span className="text-purple-600">@{publication.twitter_handle}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    Paid PR Rates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Advertorial</span>
                    <span className="font-medium">{formatCurrency(publication.advertorial_rate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sponsored Content</span>
                    <span className="font-medium">{formatCurrency(publication.sponsored_content_rate)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Journalists Tab */}
        <TabsContent value="journalists">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Journalists at {publication.name}</CardTitle>
              <Button 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => setShowJournalistModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />Add Journalist
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-mono text-[10px] uppercase">Name</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Role</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Beat</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Email</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalists.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No journalists added yet. Add your first contact at this publication.
                      </TableCell>
                    </TableRow>
                  ) : (
                    journalists.map(journalist => (
                      <TableRow key={journalist.id} className="hover:bg-purple-50/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="font-medium">{journalist.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{journalist.role || journalist.editor_level || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{journalist.beat || 'General'}</Badge>
                        </TableCell>
                        <TableCell>
                          {journalist.email ? (
                            <a href={`mailto:${journalist.email}`} className="text-purple-600 hover:underline text-sm">{journalist.email}</a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPitchStatusConfig(journalist.status).color}>
                            {getPitchStatusConfig(journalist.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedJournalist(journalist);
                                setNewPitch({ ...newPitch, contact_id: journalist.id });
                                setShowPitchModal(true);
                              }}
                              title="Create Pitch"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="View Profile">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outreach Tab */}
        <TabsContent value="outreach">
          <div className="space-y-4">
            {/* Pitch Funnel */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Pitch Sent', count: pitches.filter(p => p.status === 'pitch_sent').length, color: 'bg-purple-100 text-purple-700' },
                { label: 'Responded', count: pitches.filter(p => ['responded', 'interested'].includes(p.status)).length, color: 'bg-cyan-100 text-cyan-700' },
                { label: 'In Progress', count: pitches.filter(p => p.status === 'story_in_progress').length, color: 'bg-amber-100 text-amber-700' },
                { label: 'Published', count: pitches.filter(p => p.status === 'published').length, color: 'bg-green-100 text-green-700' },
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
                <CardTitle className="text-sm">Pitch History</CardTitle>
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => setShowPitchModal(true)}
                  disabled={journalists.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />New Pitch
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="font-mono text-[10px] uppercase">Subject</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Journalist</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase">Date</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase w-[150px]">Update Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pitches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No pitches sent yet. {journalists.length === 0 ? 'Add a journalist first.' : 'Create your first pitch!'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      pitches.map(pitch => {
                        const journalist = journalists.find(j => j.id === pitch.contact_id);
                        const statusConfig = getPitchStatusConfig(pitch.status);
                        return (
                          <TableRow key={pitch.id} className="hover:bg-purple-50/50">
                            <TableCell>
                              <div className="font-medium">{pitch.subject}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[300px]">{pitch.message}</div>
                            </TableCell>
                            <TableCell>{journalist?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">
                              {pitch.created_at ? new Date(pitch.created_at).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Select value={pitch.status} onValueChange={(v) => handleUpdatePitchStatus(pitch.id, v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {PITCH_STATUS.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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

        {/* Coverage Tab */}
        <TabsContent value="coverage">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Media Coverage from {publication.name}</CardTitle>
              <Button 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => setShowCoverageModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />Record Coverage
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-mono text-[10px] uppercase">Title</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Type</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Author</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Sentiment</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Reach</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Date</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coverage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No coverage recorded yet. Record your first media mention!
                      </TableCell>
                    </TableRow>
                  ) : (
                    coverage.map(item => (
                      <TableRow key={item.id} className="hover:bg-purple-50/50">
                        <TableCell>
                          <div className="font-medium">{item.title}</div>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />View Article
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{item.coverage_type}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{item.author || item.contact_name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            item.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                            item.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {item.sentiment}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatNum(item.reach)}</TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {item.published_date || (item.created_at ? new Date(item.created_at).toLocaleDateString() : '-')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
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

        {/* Paid PR Tab */}
        <TabsContent value="paid">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Paid PR Collaborations</CardTitle>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />New Paid Placement
              </Button>
            </CardHeader>
            <CardContent className="py-12 text-center text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="mb-2">No paid PR collaborations with {publication.name}</p>
              <p className="text-sm">Track advertorials, sponsored content, and display ads</p>
              {(publication.advertorial_rate || publication.sponsored_content_rate) && (
                <div className="mt-4 text-sm">
                  <p className="text-gray-600">Available Rates:</p>
                  {publication.advertorial_rate && <p>Advertorial: {formatCurrency(publication.advertorial_rate)}</p>}
                  {publication.sponsored_content_rate && <p>Sponsored Content: {formatCurrency(publication.sponsored_content_rate)}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Journalist Modal */}
      <Dialog open={showJournalistModal} onOpenChange={setShowJournalistModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-purple-500" />
              Add Journalist at {publication.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Name *</Label>
              <Input 
                value={newJournalist.name}
                onChange={(e) => setNewJournalist({ ...newJournalist, name: e.target.value })}
                placeholder="Full name"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Email</Label>
                <Input 
                  type="email"
                  value={newJournalist.email}
                  onChange={(e) => setNewJournalist({ ...newJournalist, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Phone</Label>
                <Input 
                  value={newJournalist.phone}
                  onChange={(e) => setNewJournalist({ ...newJournalist, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Role</Label>
                <Input 
                  value={newJournalist.role}
                  onChange={(e) => setNewJournalist({ ...newJournalist, role: e.target.value })}
                  placeholder="Fashion Editor"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Beat</Label>
                <Select value={newJournalist.beat} onValueChange={(v) => setNewJournalist({ ...newJournalist, beat: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BEAT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowJournalistModal(false)}>Cancel</Button>
            <Button onClick={handleAddJournalist} className="bg-purple-600 hover:bg-purple-700 text-white">
              Add Journalist
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Pitch Modal */}
      <Dialog open={showPitchModal} onOpenChange={setShowPitchModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-500" />
              Create Pitch {selectedJournalist ? `for ${selectedJournalist.name}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Journalist *</Label>
              <Select value={newPitch.contact_id} onValueChange={(v) => setNewPitch({ ...newPitch, contact_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select journalist" /></SelectTrigger>
                <SelectContent>
                  {journalists.map(j => <SelectItem key={j.id} value={j.id}>{j.name} - {j.role || j.beat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Campaign (Optional)</Label>
              <Select value={newPitch.pr_campaign_id} onValueChange={(v) => setNewPitch({ ...newPitch, pr_campaign_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Link to campaign" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No campaign</SelectItem>
                  {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Subject *</Label>
              <Input 
                value={newPitch.subject}
                onChange={(e) => setNewPitch({ ...newPitch, subject: e.target.value })}
                placeholder="Pitch subject line"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Message *</Label>
              <Textarea 
                value={newPitch.message}
                onChange={(e) => setNewPitch({ ...newPitch, message: e.target.value })}
                placeholder="Your pitch message..."
                className="mt-1"
                rows={6}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowPitchModal(false)}>Cancel</Button>
            <Button onClick={handleCreatePitch} className="bg-purple-600 hover:bg-purple-700 text-white">
              Create Pitch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Coverage Modal */}
      <Dialog open={showCoverageModal} onOpenChange={setShowCoverageModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-purple-500" />
              Record Coverage from {publication.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Title *</Label>
              <Input 
                value={newCoverage.title}
                onChange={(e) => setNewCoverage({ ...newCoverage, title: e.target.value })}
                placeholder="Article/mention title"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">URL *</Label>
              <Input 
                value={newCoverage.url}
                onChange={(e) => setNewCoverage({ ...newCoverage, url: e.target.value })}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Type</Label>
                <Select value={newCoverage.coverage_type} onValueChange={(v) => setNewCoverage({ ...newCoverage, coverage_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COVERAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Sentiment</Label>
                <Select value={newCoverage.sentiment} onValueChange={(v) => setNewCoverage({ ...newCoverage, sentiment: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Author</Label>
                <Input 
                  value={newCoverage.author}
                  onChange={(e) => setNewCoverage({ ...newCoverage, author: e.target.value })}
                  placeholder="Journalist name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Published Date</Label>
                <Input 
                  type="date"
                  value={newCoverage.published_date}
                  onChange={(e) => setNewCoverage({ ...newCoverage, published_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Estimated Reach</Label>
              <Input 
                type="number"
                value={newCoverage.estimated_reach}
                onChange={(e) => setNewCoverage({ ...newCoverage, estimated_reach: e.target.value })}
                placeholder="e.g., 500000"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowCoverageModal(false)}>Cancel</Button>
            <Button onClick={handleRecordCoverage} className="bg-purple-600 hover:bg-purple-700 text-white">
              Record Coverage
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicationDetailPage;
