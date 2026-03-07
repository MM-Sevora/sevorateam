import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  FileText, Newspaper, Send, Plus, ExternalLink, Eye, RefreshCw, Search,
  User, Mail, Edit2, Trash2, ChevronUp, ChevronDown, Users, Sparkles,
  Target, Calendar, Play, Pause, CheckCircle, Clock, Zap, MailPlus,
  ListChecks, TrendingUp, ArrowRight, Copy, X
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  planning: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  distributed: 'bg-purple-100 text-purple-700',
  published: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-blue-100 text-blue-700',
  opened: 'bg-amber-100 text-amber-700',
  responded: 'bg-green-100 text-green-700',
  interested: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  identified: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
};

const SENTIMENT_COLORS = {
  positive: 'bg-green-100 text-green-700',
  neutral: 'bg-gray-100 text-gray-700',
  negative: 'bg-red-100 text-red-700',
};

const BEAT_OPTIONS = [
  'Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Business', 'Entertainment',
  'Travel', 'Food', 'Health', 'Sports', 'Politics', 'General'
];

const EDITOR_LEVELS = [
  { value: 'staff', label: 'Staff Writer' },
  { value: 'senior', label: 'Senior Writer' },
  { value: 'editor', label: 'Editor' },
  { value: 'senior_editor', label: 'Senior Editor' },
  { value: 'editor_in_chief', label: 'Editor-in-Chief' },
  { value: 'freelance', label: 'Freelance' },
];

const DigitalPRPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('media-database');
  const [loading, setLoading] = useState(true);
  
  // Media Database state
  const [journalists, setJournalists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBeat, setFilterBeat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  // PR Campaigns state
  const [prCampaigns, setPrCampaigns] = useState([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  
  // Press Releases state
  const [releases, setReleases] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [pitches, setPitches] = useState([]);
  
  // AI Discovery state
  const [discoveryBrief, setDiscoveryBrief] = useState({
    topic: '', industry: 'Fashion', publication_type: 'any', location: '',
    story_type: 'news', urgency: 'normal', key_messages: '', target_audience: '',
    additional_context: ''
  });
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  // Outreach state
  const [templates, setTemplates] = useState([]);
  const [scheduledOutreach, setScheduledOutreach] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [outreachStats, setOutreachStats] = useState(null);
  
  // Modals state
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [showAIPitchModal, setShowAIPitchModal] = useState(false);
  const [selectedJournalistForPitch, setSelectedJournalistForPitch] = useState(null);
  const [generatedPitch, setGeneratedPitch] = useState(null);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  
  // Forms
  const [newContact, setNewContact] = useState({
    name: '', email: '', phone: '', publication: '', publication_website: '',
    beat: 'Fashion', editor_level: 'staff', twitter_handle: '', linkedin_url: '',
    domain_authority: '', monthly_traffic: '', preferred_contact_method: 'email',
    city: '', country: 'India', notes: ''
  });
  
  const [newCampaign, setNewCampaign] = useState({
    name: '', objective: '', description: '', story_angle: '', key_messages: '',
    target_publications: '', target_beats: '', start_date: '', end_date: '',
    embargo_date: '', budget: ''
  });
  
  const [newRelease, setNewRelease] = useState({
    title: '', subtitle: '', body: '', boilerplate: '', target_publications: ''
  });
  
  const [newCoverage, setNewCoverage] = useState({
    title: '', publication: '', url: '', coverage_type: 'article', 
    sentiment: 'positive', published_date: '', reach: '', contact_id: ''
  });
  
  const [newPitch, setNewPitch] = useState({
    contact_id: '', subject: '', message: '', press_release_id: '', pr_campaign_id: ''
  });
  
  const [newTemplate, setNewTemplate] = useState({
    name: '', template_type: 'initial_pitch', subject: '', body: '', delay_days: 0
  });

  // Fetch functions
  const fetchJournalists = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/contacts', {
        params: { contact_type: 'journalist', limit: 200 }
      });
      setJournalists(response.data || []);
    } catch (error) {
      console.error('Failed to fetch journalists:', error);
    }
  }, [api]);

  const fetchPRCampaigns = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/pr/campaigns');
      setPrCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch PR campaigns:', error);
    }
  }, [api]);

  const fetchReleases = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/pr/releases');
      setReleases(response.data || []);
    } catch (error) {
      console.error('Failed to fetch releases:', error);
    }
  }, [api]);

  const fetchCoverage = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/pr/coverage');
      setCoverage(response.data || []);
    } catch (error) {
      console.error('Failed to fetch coverage:', error);
    }
  }, [api]);

  const fetchPitches = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/pr/pitches');
      setPitches(response.data || []);
    } catch (error) {
      console.error('Failed to fetch pitches:', error);
    }
  }, [api]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/outreach/templates');
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }, [api]);

  const fetchScheduledOutreach = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/outreach/scheduled', {
        params: { limit: 50 }
      });
      setScheduledOutreach(response.data || []);
    } catch (error) {
      console.error('Failed to fetch scheduled outreach:', error);
    }
  }, [api]);

  const fetchOutreachStats = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/outreach/stats');
      setOutreachStats(response.data);
    } catch (error) {
      console.error('Failed to fetch outreach stats:', error);
    }
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchJournalists(), fetchPRCampaigns(), fetchReleases(), 
        fetchCoverage(), fetchPitches(), fetchTemplates(),
        fetchScheduledOutreach(), fetchOutreachStats()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchJournalists, fetchPRCampaigns, fetchReleases, fetchCoverage, fetchPitches, fetchTemplates, fetchScheduledOutreach, fetchOutreachStats]);

  // Contact handlers
  const handleCreateContact = async () => {
    if (!newContact.name || !newContact.publication) {
      toast.error('Name and publication are required');
      return;
    }
    try {
      const data = {
        ...newContact,
        contact_type: 'journalist',
        domain_authority: newContact.domain_authority ? parseInt(newContact.domain_authority) : null,
        monthly_traffic: newContact.monthly_traffic ? parseInt(newContact.monthly_traffic) : null,
      };
      if (editingContact) {
        await api.put(`/marketing/v2/contacts/${editingContact.id}`, data);
        toast.success('Contact updated');
      } else {
        await api.post('/marketing/v2/contacts', data);
        toast.success('Contact added');
      }
      setShowAddContactModal(false);
      setEditingContact(null);
      resetContactForm();
      fetchJournalists();
    } catch (error) {
      toast.error('Failed to save contact');
    }
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setNewContact({
      name: contact.name || '', email: contact.email || '', phone: contact.phone || '',
      publication: contact.publication || '', publication_website: contact.publication_website || '',
      beat: contact.beat || 'Fashion', editor_level: contact.editor_level || 'staff',
      twitter_handle: contact.twitter_handle || '', linkedin_url: contact.linkedin_url || '',
      domain_authority: contact.domain_authority?.toString() || '',
      monthly_traffic: contact.monthly_traffic?.toString() || '',
      preferred_contact_method: contact.preferred_contact_method || 'email',
      city: contact.city || '', country: contact.country || 'India', notes: contact.notes || ''
    });
    setShowAddContactModal(true);
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await api.delete(`/marketing/v2/contacts/${contactId}`);
      toast.success('Contact deleted');
      fetchJournalists();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetContactForm = () => {
    setNewContact({
      name: '', email: '', phone: '', publication: '', publication_website: '',
      beat: 'Fashion', editor_level: 'staff', twitter_handle: '', linkedin_url: '',
      domain_authority: '', monthly_traffic: '', preferred_contact_method: 'email',
      city: '', country: 'India', notes: ''
    });
  };

  // PR Campaign handlers
  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.objective) {
      toast.error('Name and objective are required');
      return;
    }
    try {
      const data = {
        ...newCampaign,
        key_messages: newCampaign.key_messages.split(',').map(m => m.trim()).filter(Boolean),
        target_publications: newCampaign.target_publications.split(',').map(p => p.trim()).filter(Boolean),
        target_beats: newCampaign.target_beats.split(',').map(b => b.trim()).filter(Boolean),
        budget: newCampaign.budget ? parseFloat(newCampaign.budget) : 0
      };
      if (editingCampaign) {
        await api.put(`/marketing/v2/pr/campaigns/${editingCampaign.id}`, data);
        toast.success('Campaign updated');
      } else {
        await api.post('/marketing/v2/pr/campaigns', data);
        toast.success('Campaign created');
      }
      setShowCampaignModal(false);
      setEditingCampaign(null);
      resetCampaignForm();
      fetchPRCampaigns();
    } catch (error) {
      toast.error('Failed to save campaign');
    }
  };

  const resetCampaignForm = () => {
    setNewCampaign({
      name: '', objective: '', description: '', story_angle: '', key_messages: '',
      target_publications: '', target_beats: '', start_date: '', end_date: '',
      embargo_date: '', budget: ''
    });
  };

  // AI Discovery handler
  const handleAIDiscover = async () => {
    if (!discoveryBrief.topic) {
      toast.error('Please enter a story topic');
      return;
    }
    setIsDiscovering(true);
    try {
      const response = await api.post('/marketing/v2/pr/ai-discover', discoveryBrief);
      if (response.data.success) {
        setDiscoveryResults(response.data.data);
        toast.success('AI Discovery complete!');
      } else {
        toast.error(response.data.error || 'Discovery failed');
      }
    } catch (error) {
      toast.error('AI Discovery failed');
    } finally {
      setIsDiscovering(false);
    }
  };

  // AI Pitch generation
  const handleGenerateAIPitch = async (journalist) => {
    setSelectedJournalistForPitch(journalist);
    setGeneratingPitch(true);
    setShowAIPitchModal(true);
    try {
      const response = await api.post('/marketing/v2/pr/ai-generate-pitch', null, {
        params: { journalist_id: journalist.id, tone: 'professional' }
      });
      if (response.data.success) {
        setGeneratedPitch(response.data.data);
      } else {
        toast.error('Failed to generate pitch');
      }
    } catch (error) {
      toast.error('Failed to generate pitch');
    } finally {
      setGeneratingPitch(false);
    }
  };

  // Press Release handler
  const handleCreateRelease = async () => {
    if (!newRelease.title || !newRelease.body) {
      toast.error('Title and body are required');
      return;
    }
    try {
      const data = {
        ...newRelease,
        target_publications: newRelease.target_publications.split(',').map(p => p.trim()).filter(Boolean),
      };
      await api.post('/marketing/v2/pr/releases', data);
      toast.success('Press release created');
      setShowReleaseModal(false);
      setNewRelease({ title: '', subtitle: '', body: '', boilerplate: '', target_publications: '' });
      fetchReleases();
    } catch (error) {
      toast.error('Failed to create press release');
    }
  };

  // Coverage handler
  const handleRecordCoverage = async () => {
    if (!newCoverage.title || !newCoverage.publication || !newCoverage.url) {
      toast.error('Title, publication, and URL are required');
      return;
    }
    try {
      const data = {
        ...newCoverage,
        reach: newCoverage.reach ? parseInt(newCoverage.reach) : null,
        contact_id: newCoverage.contact_id || null,
      };
      await api.post('/marketing/v2/pr/coverage', data);
      toast.success('Coverage recorded');
      setShowCoverageModal(false);
      setNewCoverage({ title: '', publication: '', url: '', coverage_type: 'article', sentiment: 'positive', published_date: '', reach: '', contact_id: '' });
      fetchCoverage();
    } catch (error) {
      toast.error('Failed to record coverage');
    }
  };

  // Pitch handler
  const handleCreatePitch = async () => {
    if (!newPitch.contact_id || !newPitch.subject || !newPitch.message) {
      toast.error('Contact, subject, and message are required');
      return;
    }
    try {
      await api.post('/marketing/v2/pr/pitches', newPitch);
      toast.success('Pitch created');
      setShowPitchModal(false);
      setNewPitch({ contact_id: '', subject: '', message: '', press_release_id: '', pr_campaign_id: '' });
      fetchPitches();
    } catch (error) {
      toast.error('Failed to create pitch');
    }
  };

  // Template handler
  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) {
      toast.error('Name, subject, and body are required');
      return;
    }
    try {
      await api.post('/marketing/v2/outreach/templates', newTemplate);
      toast.success('Template created');
      setShowTemplateModal(false);
      setNewTemplate({ name: '', template_type: 'initial_pitch', subject: '', body: '', delay_days: 0 });
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  // Send outreach
  const handleSendOutreach = async (outreachId, useGraph = false) => {
    try {
      const response = await api.put(`/marketing/v2/outreach/scheduled/${outreachId}/send`, null, {
        params: { use_microsoft_graph: useGraph }
      });
      toast.success(response.data.message);
      fetchScheduledOutreach();
      fetchOutreachStats();
    } catch (error) {
      toast.error('Failed to send');
    }
  };

  // Helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatNumber = (num) => {
    if (!num) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filtered journalists
  const filteredJournalists = journalists
    .filter(j => {
      if (filterBeat !== 'all' && j.beat?.toLowerCase() !== filterBeat.toLowerCase()) return false;
      if (filterStatus !== 'all' && j.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return j.name?.toLowerCase().includes(query) || j.email?.toLowerCase().includes(query) || j.publication?.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = sortBy === 'score' ? (a.score || 0) : (a.domain_authority || 0);
      const bVal = sortBy === 'score' ? (b.score || 0) : (b.domain_authority || 0);
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  // Stats
  const stats = {
    totalContacts: journalists.length,
    totalCampaigns: prCampaigns.length,
    activeCampaigns: prCampaigns.filter(c => c.status === 'active').length,
    totalReleases: releases.length,
    totalCoverage: coverage.length,
    totalPitches: pitches.length,
    respondedPitches: pitches.filter(p => ['responded', 'interested'].includes(p.status)).length
  };

  return (
    <div className="p-8 space-y-6" data-testid="digital-pr-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Digital PR Platform</h1>
          <p className="text-[#5D4A3A] mt-1">AI-powered media discovery, campaigns, and outreach automation</p>
        </div>
        <Button onClick={() => { setLoading(true); Promise.all([fetchJournalists(), fetchPRCampaigns(), fetchReleases(), fetchCoverage(), fetchPitches(), fetchTemplates(), fetchScheduledOutreach(), fetchOutreachStats()]).then(() => setLoading(false)); }} variant="outline" className="border-[#E8D5C4]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{stats.totalContacts}</div>
                <div className="text-xs text-[#5D4A3A]">Media Contacts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{stats.activeCampaigns}/{stats.totalCampaigns}</div>
                <div className="text-xs text-[#5D4A3A]">Active Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{stats.totalReleases}</div>
                <div className="text-xs text-[#5D4A3A]">Press Releases</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{stats.totalCoverage}</div>
                <div className="text-xs text-[#5D4A3A]">Coverage</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{stats.respondedPitches}/{stats.totalPitches}</div>
                <div className="text-xs text-[#5D4A3A]">Responses</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5EDE5] flex-wrap">
          <TabsTrigger value="media-database"><Users className="w-4 h-4 mr-1" /> Database</TabsTrigger>
          <TabsTrigger value="ai-discovery"><Sparkles className="w-4 h-4 mr-1" /> AI Discovery</TabsTrigger>
          <TabsTrigger value="campaigns"><Target className="w-4 h-4 mr-1" /> Campaigns</TabsTrigger>
          <TabsTrigger value="releases"><FileText className="w-4 h-4 mr-1" /> Releases</TabsTrigger>
          <TabsTrigger value="outreach"><Zap className="w-4 h-4 mr-1" /> Outreach</TabsTrigger>
          <TabsTrigger value="coverage"><Newspaper className="w-4 h-4 mr-1" /> Coverage</TabsTrigger>
        </TabsList>

        {/* Media Database Tab */}
        <TabsContent value="media-database" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5D4A3A]" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-56 border-[#E8D5C4]" />
              </div>
              <Select value={filterBeat} onValueChange={setFilterBeat}>
                <SelectTrigger className="w-32 border-[#E8D5C4]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Beats</SelectItem>
                  {BEAT_OPTIONS.map(b => <SelectItem key={b} value={b.toLowerCase()}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 border-[#E8D5C4]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="identified">Identified</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={showAddContactModal} onOpenChange={(open) => { setShowAddContactModal(open); if (!open) { setEditingContact(null); resetContactForm(); } }}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-2" /> Add Contact</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Media Contact'}</DialogTitle>
                  <DialogDescription>Add journalist or media contact to your database</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2">
                    <Label>Name *</Label>
                    <Input value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={newContact.email} onChange={(e) => setNewContact({...newContact, email: e.target.value})} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={newContact.phone} onChange={(e) => setNewContact({...newContact, phone: e.target.value})} />
                  </div>
                  <div>
                    <Label>Publication *</Label>
                    <Input value={newContact.publication} onChange={(e) => setNewContact({...newContact, publication: e.target.value})} />
                  </div>
                  <div>
                    <Label>Beat</Label>
                    <Select value={newContact.beat} onValueChange={(v) => setNewContact({...newContact, beat: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{BEAT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={newContact.editor_level} onValueChange={(v) => setNewContact({...newContact, editor_level: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EDITOR_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Domain Authority (1-100)</Label>
                    <Input type="number" value={newContact.domain_authority} onChange={(e) => setNewContact({...newContact, domain_authority: e.target.value})} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={newContact.city} onChange={(e) => setNewContact({...newContact, city: e.target.value})} />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={newContact.country} onChange={(e) => setNewContact({...newContact, country: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={newContact.notes} onChange={(e) => setNewContact({...newContact, notes: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddContactModal(false)}>Cancel</Button>
                  <Button onClick={handleCreateContact} className="bg-amber-700 hover:bg-amber-800">{editingContact ? 'Update' : 'Add'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Contacts Table */}
          {filteredJournalists.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No contacts found</h3>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[#E8D5C4]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5EDE5]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase">Publication</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase">Beat</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase cursor-pointer" onClick={() => toggleSort('domain_authority')}>
                        DA {sortBy === 'domain_authority' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase cursor-pointer" onClick={() => toggleSort('score')}>
                        Score {sortBy === 'score' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#5D4A3A] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D5C4]">
                    {filteredJournalists.map((j) => (
                      <tr key={j.id} className="hover:bg-[#F5EDE5]/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-amber-700" />
                            </div>
                            <div>
                              <div className="font-medium text-[#4A3728]">{j.name}</div>
                              {j.email && <div className="text-xs text-[#5D4A3A]">{j.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#4A3728]">{j.publication || '-'}</div>
                          {j.editor_level && <div className="text-xs text-[#5D4A3A] capitalize">{j.editor_level.replace('_', ' ')}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">{j.beat || 'General'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{j.domain_authority ? `${j.domain_authority}/100` : '-'}</td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[j.status] || STATUS_COLORS.identified}>{j.status || 'identified'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">{j.score?.toFixed(1) || '0.0'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleGenerateAIPitch(j)} title="AI Pitch">
                              <Sparkles className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditContact(j)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(j.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* AI Discovery Tab */}
        <TabsContent value="ai-discovery" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#4A3728]">
                  <Sparkles className="w-5 h-5 text-purple-600" /> AI Discovery Brief
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Story Topic *</Label>
                  <Input value={discoveryBrief.topic} onChange={(e) => setDiscoveryBrief({...discoveryBrief, topic: e.target.value})} placeholder="e.g., Sustainable fashion collection launch" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Industry</Label>
                    <Select value={discoveryBrief.industry} onValueChange={(v) => setDiscoveryBrief({...discoveryBrief, industry: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{BEAT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Story Type</Label>
                    <Select value={discoveryBrief.story_type} onValueChange={(v) => setDiscoveryBrief({...discoveryBrief, story_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="review">Product Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Input value={discoveryBrief.target_audience} onChange={(e) => setDiscoveryBrief({...discoveryBrief, target_audience: e.target.value})} placeholder="e.g., Fashion-conscious millennials" />
                </div>
                <div>
                  <Label>Key Messages</Label>
                  <Textarea rows={2} value={discoveryBrief.key_messages} onChange={(e) => setDiscoveryBrief({...discoveryBrief, key_messages: e.target.value})} placeholder="Main points to convey..." />
                </div>
                <div>
                  <Label>Location Focus</Label>
                  <Input value={discoveryBrief.location} onChange={(e) => setDiscoveryBrief({...discoveryBrief, location: e.target.value})} placeholder="e.g., India, Mumbai" />
                </div>
                <Button onClick={handleAIDiscover} disabled={isDiscovering} className="w-full bg-purple-600 hover:bg-purple-700">
                  {isDiscovering ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Discovering...</> : <><Sparkles className="w-4 h-4 mr-2" /> Discover Journalists</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-[#4A3728]">Discovery Results</CardTitle>
              </CardHeader>
              <CardContent>
                {!discoveryResults ? (
                  <div className="py-12 text-center text-[#5D4A3A]">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-300" />
                    <p>Fill in the brief and click Discover to find matching journalists</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {discoveryResults.pr_insights && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-700 mb-2">PR Insights</h4>
                        {discoveryResults.pr_insights.story_angle_suggestions?.length > 0 && (
                          <div className="text-sm text-purple-600 mb-1">
                            <strong>Story Angles:</strong> {discoveryResults.pr_insights.story_angle_suggestions.join(', ')}
                          </div>
                        )}
                        {discoveryResults.pr_insights.timing_recommendations && (
                          <div className="text-sm text-purple-600">
                            <strong>Timing:</strong> {discoveryResults.pr_insights.timing_recommendations}
                          </div>
                        )}
                      </div>
                    )}
                    {discoveryResults.recommendations?.map((rec, idx) => {
                      const journalist = journalists.find(j => j.id === rec.journalist_id);
                      if (!journalist) return null;
                      return (
                        <div key={idx} className="p-4 border border-[#E8D5C4] rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-[#4A3728]">{journalist.name}</div>
                              <div className="text-sm text-[#5D4A3A]">{journalist.publication} • {journalist.beat}</div>
                            </div>
                            <Badge className={rec.match_score >= 80 ? 'bg-green-100 text-green-700' : rec.match_score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}>
                              {rec.match_score}% match
                            </Badge>
                          </div>
                          {rec.match_reasons?.length > 0 && (
                            <div className="text-sm text-green-600 mb-2">
                              {rec.match_reasons.map((r, i) => <span key={i} className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {r}</span>)}
                            </div>
                          )}
                          {rec.recommended_pitch_angle && (
                            <div className="text-sm text-[#5D4A3A] mb-2">
                              <strong>Pitch Angle:</strong> {rec.recommended_pitch_angle}
                            </div>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={() => handleGenerateAIPitch(journalist)}>
                              <Sparkles className="w-3 h-3 mr-1" /> Generate Pitch
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {discoveryResults.recommendations?.length === 0 && (
                      <p className="text-[#5D4A3A] text-center py-4">No matching journalists found. Try adjusting your brief.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCampaignModal} onOpenChange={(open) => { setShowCampaignModal(open); if (!open) { setEditingCampaign(null); resetCampaignForm(); } }}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-2" /> New Campaign</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCampaign ? 'Edit PR Campaign' : 'Create PR Campaign'}</DialogTitle>
                  <DialogDescription>Manage your PR outreach campaigns</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2">
                    <Label>Campaign Name *</Label>
                    <Input value={newCampaign.name} onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <Label>Objective *</Label>
                    <Input value={newCampaign.objective} onChange={(e) => setNewCampaign({...newCampaign, objective: e.target.value})} placeholder="e.g., Drive coverage for new collection" />
                  </div>
                  <div className="col-span-2">
                    <Label>Story Angle</Label>
                    <Textarea rows={2} value={newCampaign.story_angle} onChange={(e) => setNewCampaign({...newCampaign, story_angle: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <Label>Key Messages (comma-separated)</Label>
                    <Input value={newCampaign.key_messages} onChange={(e) => setNewCampaign({...newCampaign, key_messages: e.target.value})} />
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={newCampaign.start_date} onChange={(e) => setNewCampaign({...newCampaign, start_date: e.target.value})} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={newCampaign.end_date} onChange={(e) => setNewCampaign({...newCampaign, end_date: e.target.value})} />
                  </div>
                  <div>
                    <Label>Target Publications (comma-separated)</Label>
                    <Input value={newCampaign.target_publications} onChange={(e) => setNewCampaign({...newCampaign, target_publications: e.target.value})} />
                  </div>
                  <div>
                    <Label>Budget (₹)</Label>
                    <Input type="number" value={newCampaign.budget} onChange={(e) => setNewCampaign({...newCampaign, budget: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCampaignModal(false)}>Cancel</Button>
                  <Button onClick={handleCreateCampaign} className="bg-amber-700 hover:bg-amber-800">{editingCampaign ? 'Update' : 'Create'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {prCampaigns.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Target className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No PR campaigns yet</h3>
                <p className="text-[#5D4A3A]">Create your first campaign to organize outreach</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {prCampaigns.map(campaign => (
                <Card key={campaign.id} className="border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-[#4A3728]">{campaign.name}</h3>
                        <p className="text-sm text-[#5D4A3A]">{campaign.objective}</p>
                      </div>
                      <Badge className={STATUS_COLORS[campaign.status]}>{campaign.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="p-2 bg-[#F5EDE5] rounded">
                        <div className="text-lg font-bold text-[#4A3728]">{campaign.journalist_ids?.length || 0}</div>
                        <div className="text-xs text-[#5D4A3A]">Journalists</div>
                      </div>
                      <div className="p-2 bg-[#F5EDE5] rounded">
                        <div className="text-lg font-bold text-[#4A3728]">{campaign.pitch_count || 0}</div>
                        <div className="text-xs text-[#5D4A3A]">Pitches</div>
                      </div>
                      <div className="p-2 bg-[#F5EDE5] rounded">
                        <div className="text-lg font-bold text-[#4A3728]">{campaign.coverage_count || 0}</div>
                        <div className="text-xs text-[#5D4A3A]">Coverage</div>
                      </div>
                    </div>
                    {campaign.start_date && (
                      <div className="text-xs text-[#5D4A3A] flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Press Releases Tab */}
        <TabsContent value="releases" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showReleaseModal} onOpenChange={setShowReleaseModal}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-2" /> New Release</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Press Release</DialogTitle>
                  <DialogDescription>Write and distribute press releases</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={newRelease.title} onChange={e => setNewRelease({...newRelease, title: e.target.value})} />
                  </div>
                  <div>
                    <Label>Subtitle</Label>
                    <Input value={newRelease.subtitle} onChange={e => setNewRelease({...newRelease, subtitle: e.target.value})} />
                  </div>
                  <div>
                    <Label>Body *</Label>
                    <Textarea rows={6} value={newRelease.body} onChange={e => setNewRelease({...newRelease, body: e.target.value})} />
                  </div>
                  <div>
                    <Label>Target Publications (comma-separated)</Label>
                    <Input value={newRelease.target_publications} onChange={e => setNewRelease({...newRelease, target_publications: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowReleaseModal(false)}>Cancel</Button>
                  <Button onClick={handleCreateRelease} className="bg-amber-700 hover:bg-amber-800">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {releases.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No press releases yet</h3>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {releases.map(release => (
                <Card key={release.id} className="border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={STATUS_COLORS[release.status]}>{release.status}</Badge>
                          {release.coverage_count > 0 && <Badge variant="outline" className="bg-green-50"><Newspaper className="w-3 h-3 mr-1" />{release.coverage_count}</Badge>}
                        </div>
                        <h3 className="font-semibold text-[#4A3728] text-lg">{release.title}</h3>
                        {release.subtitle && <p className="text-[#5D4A3A] mt-1">{release.subtitle}</p>}
                        <p className="text-sm text-[#5D4A3A] mt-2 line-clamp-2">{release.body}</p>
                      </div>
                      <div className="text-sm text-[#5D4A3A]">{formatDate(release.created_at)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Outreach Tab */}
        <TabsContent value="outreach" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Stats */}
            <Card className="border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#5D4A3A]">Outreach Stats</CardTitle>
              </CardHeader>
              <CardContent>
                {outreachStats ? (
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-[#5D4A3A]">Scheduled</span><span className="font-bold text-purple-600">{outreachStats.outreach?.scheduled || 0}</span></div>
                    <div className="flex justify-between"><span className="text-[#5D4A3A]">Sent</span><span className="font-bold text-green-600">{outreachStats.outreach?.sent || 0}</span></div>
                    <div className="flex justify-between"><span className="text-[#5D4A3A]">Response Rate</span><span className="font-bold text-blue-600">{outreachStats.pitches?.response_rate?.toFixed(1) || 0}%</span></div>
                  </div>
                ) : <p className="text-[#5D4A3A]">Loading...</p>}
              </CardContent>
            </Card>

            {/* Templates */}
            <Card className="border-[#E8D5C4] col-span-2">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-[#5D4A3A]">Email Templates</CardTitle>
                <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Template</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Email Template</DialogTitle>
                      <DialogDescription>Reusable templates for outreach</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Template Name</Label>
                        <Input value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={newTemplate.template_type} onValueChange={(v) => setNewTemplate({...newTemplate, template_type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="initial_pitch">Initial Pitch</SelectItem>
                            <SelectItem value="follow_up_1">Follow-up 1</SelectItem>
                            <SelectItem value="follow_up_2">Follow-up 2</SelectItem>
                            <SelectItem value="thank_you">Thank You</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Subject</Label>
                        <Input value={newTemplate.subject} onChange={(e) => setNewTemplate({...newTemplate, subject: e.target.value})} placeholder="Use {{name}} for personalization" />
                      </div>
                      <div>
                        <Label>Body</Label>
                        <Textarea rows={5} value={newTemplate.body} onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})} placeholder="Use {{name}} for personalization" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
                      <Button onClick={handleCreateTemplate} className="bg-amber-700 hover:bg-amber-800">Create</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <p className="text-[#5D4A3A] text-center py-4">No templates yet</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {templates.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2 bg-[#F5EDE5] rounded">
                        <div>
                          <div className="font-medium text-[#4A3728]">{t.name}</div>
                          <div className="text-xs text-[#5D4A3A]">{t.template_type} • Used {t.usage_count}x</div>
                        </div>
                        <Badge variant="outline">{t.subject.substring(0, 30)}...</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scheduled Outreach */}
          <Card className="border-[#E8D5C4]">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">Scheduled Outreach</CardTitle>
            </CardHeader>
            <CardContent>
              {scheduledOutreach.length === 0 ? (
                <p className="text-[#5D4A3A] text-center py-8">No scheduled outreach</p>
              ) : (
                <div className="space-y-3">
                  {scheduledOutreach.slice(0, 10).map(o => (
                    <div key={o.id} className="flex items-center justify-between p-3 border border-[#E8D5C4] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-[#4A3728]">{o.contact_name}</div>
                          <div className="text-xs text-[#5D4A3A]">{o.subject}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={STATUS_COLORS[o.status]}>{o.status}</Badge>
                        <div className="text-xs text-[#5D4A3A]">{formatDate(o.scheduled_at)}</div>
                        {o.status === 'scheduled' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleSendOutreach(o.id, false)}>
                              <Send className="w-3 h-3 mr-1" /> Send
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCoverageModal} onOpenChange={setShowCoverageModal}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-2" /> Record Coverage</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Media Coverage</DialogTitle>
                  <DialogDescription>Track articles, mentions, and features</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={newCoverage.title} onChange={e => setNewCoverage({...newCoverage, title: e.target.value})} />
                  </div>
                  <div>
                    <Label>Publication *</Label>
                    <Input value={newCoverage.publication} onChange={e => setNewCoverage({...newCoverage, publication: e.target.value})} />
                  </div>
                  <div>
                    <Label>URL *</Label>
                    <Input value={newCoverage.url} onChange={e => setNewCoverage({...newCoverage, url: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={newCoverage.coverage_type} onValueChange={v => setNewCoverage({...newCoverage, coverage_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="mention">Mention</SelectItem>
                          <SelectItem value="feature">Feature</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sentiment</Label>
                      <Select value={newCoverage.sentiment} onValueChange={v => setNewCoverage({...newCoverage, sentiment: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Label>Date</Label>
                      <Input type="date" value={newCoverage.published_date} onChange={e => setNewCoverage({...newCoverage, published_date: e.target.value})} />
                    </div>
                    <div>
                      <Label>Reach</Label>
                      <Input type="number" value={newCoverage.reach} onChange={e => setNewCoverage({...newCoverage, reach: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCoverageModal(false)}>Cancel</Button>
                  <Button onClick={handleRecordCoverage} className="bg-amber-700 hover:bg-amber-800">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {coverage.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Newspaper className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No coverage recorded</h3>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {coverage.map(item => (
                <Card key={item.id} className="border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{item.coverage_type}</Badge>
                          <Badge className={SENTIMENT_COLORS[item.sentiment]}>{item.sentiment}</Badge>
                        </div>
                        <h3 className="font-medium text-[#4A3728]">{item.title}</h3>
                        <p className="text-sm text-[#5D4A3A]">{item.publication}</p>
                      </div>
                      <div className="text-right">
                        {item.reach && <div className="text-sm text-[#5D4A3A]"><Eye className="w-4 h-4 inline mr-1" />{formatNumber(item.reach)}</div>}
                        <div className="text-xs text-[#5D4A3A]">{formatDate(item.published_date)}</div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View <ExternalLink className="w-3 h-3 inline" /></a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Pitch Modal */}
      <Dialog open={showAIPitchModal} onOpenChange={setShowAIPitchModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>AI-Generated Pitch</DialogTitle>
            <DialogDescription>
              {selectedJournalistForPitch && `For ${selectedJournalistForPitch.name} at ${selectedJournalistForPitch.publication}`}
            </DialogDescription>
          </DialogHeader>
          {generatingPitch ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-4" />
              <p className="text-[#5D4A3A]">Generating personalized pitch...</p>
            </div>
          ) : generatedPitch ? (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-xs text-[#5D4A3A]">Subject</Label>
                <div className="p-3 bg-[#F5EDE5] rounded font-medium text-[#4A3728]">{generatedPitch.subject}</div>
              </div>
              {generatedPitch.opening_hook && (
                <div>
                  <Label className="text-xs text-[#5D4A3A]">Opening Hook</Label>
                  <div className="p-3 bg-purple-50 rounded text-purple-700">{generatedPitch.opening_hook}</div>
                </div>
              )}
              <div>
                <Label className="text-xs text-[#5D4A3A]">Message</Label>
                <div className="p-3 bg-[#F5EDE5] rounded text-[#4A3728] whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {generatedPitch.body || generatedPitch.message}
                </div>
              </div>
              {generatedPitch.call_to_action && (
                <div>
                  <Label className="text-xs text-[#5D4A3A]">Call to Action</Label>
                  <div className="p-3 bg-green-50 rounded text-green-700">{generatedPitch.call_to_action}</div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${generatedPitch.subject}\n\n${generatedPitch.body || generatedPitch.message}`);
                  toast.success('Copied to clipboard');
                }}>
                  <Copy className="w-4 h-4 mr-2" /> Copy
                </Button>
                <Button className="flex-1 bg-amber-700 hover:bg-amber-800" onClick={() => {
                  setNewPitch({
                    contact_id: selectedJournalistForPitch.id,
                    subject: generatedPitch.subject,
                    message: generatedPitch.body || generatedPitch.message,
                    press_release_id: '',
                    pr_campaign_id: ''
                  });
                  setShowAIPitchModal(false);
                  setShowPitchModal(true);
                }}>
                  <Send className="w-4 h-4 mr-2" /> Use This Pitch
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-[#5D4A3A] py-8 text-center">Failed to generate pitch</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Pitch Modal */}
      <Dialog open={showPitchModal} onOpenChange={setShowPitchModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Pitch</DialogTitle>
            <DialogDescription>Send outreach to journalist</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Journalist *</Label>
              <Select value={newPitch.contact_id} onValueChange={v => setNewPitch({...newPitch, contact_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select journalist" /></SelectTrigger>
                <SelectContent>
                  {journalists.map(j => <SelectItem key={j.id} value={j.id}>{j.name} - {j.publication}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject *</Label>
              <Input value={newPitch.subject} onChange={e => setNewPitch({...newPitch, subject: e.target.value})} />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea rows={6} value={newPitch.message} onChange={e => setNewPitch({...newPitch, message: e.target.value})} />
            </div>
            <div>
              <Label>Link to Press Release</Label>
              <Select value={newPitch.press_release_id} onValueChange={v => setNewPitch({...newPitch, press_release_id: v})}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {releases.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPitchModal(false)}>Cancel</Button>
            <Button onClick={handleCreatePitch} className="bg-amber-700 hover:bg-amber-800">Create Pitch</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DigitalPRPage;
