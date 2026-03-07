import React, { useState, useEffect, useCallback } from 'react';
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
  Target, CheckCircle, Zap, Copy, Heart, FolderOpen, Bell, Columns,
  MessageSquare, Link, Download, AlertCircle, Archive, Image, Video
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700', planning: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700', paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700',
  sent: 'bg-blue-100 text-blue-700', opened: 'bg-amber-100 text-amber-700',
  responded: 'bg-green-100 text-green-700', interested: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700', identified: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700', failed: 'bg-red-100 text-red-700',
  prospect: 'bg-gray-100 text-gray-700', researching: 'bg-blue-100 text-blue-700',
  replied: 'bg-amber-100 text-amber-700', negotiating: 'bg-orange-100 text-orange-700',
  published: 'bg-teal-100 text-teal-700',
};

const PIPELINE_STAGES = [
  { id: 'prospect', name: 'Prospect', color: 'bg-gray-200' },
  { id: 'researching', name: 'Researching', color: 'bg-blue-200' },
  { id: 'contacted', name: 'Contacted', color: 'bg-purple-200' },
  { id: 'replied', name: 'Replied', color: 'bg-amber-200' },
  { id: 'interested', name: 'Interested', color: 'bg-green-200' },
  { id: 'confirmed', name: 'Confirmed', color: 'bg-emerald-200' },
  { id: 'published', name: 'Published', color: 'bg-teal-200' },
  { id: 'declined', name: 'Declined', color: 'bg-red-200' },
];

const BEAT_OPTIONS = ['Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Business', 'Entertainment', 'Travel', 'Food', 'Health', 'General'];
const EDITOR_LEVELS = [
  { value: 'staff', label: 'Staff Writer' }, { value: 'senior', label: 'Senior Writer' },
  { value: 'editor', label: 'Editor' }, { value: 'editor_in_chief', label: 'Editor-in-Chief' },
];

const DigitalPRPage = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('media-database');
  const [loading, setLoading] = useState(true);
  
  // Core data
  const [journalists, setJournalists] = useState([]);
  const [prCampaigns, setPrCampaigns] = useState([]);
  const [releases, setReleases] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [scheduledOutreach, setScheduledOutreach] = useState([]);
  
  // Phase 5: Relationship CRM
  const [interactions, setInteractions] = useState([]);
  const [selectedContactHistory, setSelectedContactHistory] = useState(null);
  
  // Phase 8: Press Kits
  const [pressKitAssets, setPressKitAssets] = useState([]);
  const [pressKits, setPressKits] = useState([]);
  
  // Phase 9: Alerts & Monitoring
  const [alerts, setAlerts] = useState([]);
  const [alertTriggers, setAlertTriggers] = useState([]);
  const [monitoringStats, setMonitoringStats] = useState(null);
  
  // Phase 10: Pipeline
  const [pipelineBoard, setPipelineBoard] = useState([]);
  const [pipelineStats, setPipelineStats] = useState(null);
  
  // AI Discovery
  const [discoveryBrief, setDiscoveryBrief] = useState({ topic: '', industry: 'Fashion', story_type: 'news', target_audience: '', key_messages: '' });
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  // Search/Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBeat, setFilterBeat] = useState('all');
  
  // Modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showPressKitModal, setShowPressKitModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  
  // Forms
  const [newContact, setNewContact] = useState({ name: '', email: '', publication: '', beat: 'Fashion', editor_level: 'staff', city: '', notes: '' });
  const [newCampaign, setNewCampaign] = useState({ name: '', objective: '', description: '', target_publications: '', start_date: '', end_date: '' });
  const [newRelease, setNewRelease] = useState({ title: '', subtitle: '', body: '', target_publications: '' });
  const [newTemplate, setNewTemplate] = useState({ name: '', template_type: 'initial_pitch', subject: '', body: '', delay_days: 0 });
  const [newAsset, setNewAsset] = useState({ name: '', asset_type: 'logo', file_url: '', description: '', category: '', is_public: true });
  const [newAlert, setNewAlert] = useState({ name: '', alert_type: 'brand_mention', keywords: '', sources: '', priority: 'medium' });
  const [newInteraction, setNewInteraction] = useState({ contact_id: '', interaction_type: 'email', subject: '', notes: '', outcome: 'neutral' });
  const [newPressKit, setNewPressKit] = useState({ name: '', description: '', asset_ids: [] });

  // Fetch functions
  const fetchJournalists = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/contacts', { params: { contact_type: 'journalist', limit: 200 } }); setJournalists(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchCampaigns = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/pr/campaigns'); setPrCampaigns(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchReleases = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/pr/releases'); setReleases(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchCoverage = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/pr/coverage'); setCoverage(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchPitches = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/pr/pitches'); setPitches(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchTemplates = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/outreach/templates'); setTemplates(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchScheduled = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/outreach/scheduled', { params: { limit: 50 } }); setScheduledOutreach(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchAssets = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/press-kits/assets'); setPressKitAssets(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchPressKits = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/press-kits'); setPressKits(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchAlerts = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/monitoring/alerts'); setAlerts(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchTriggers = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/monitoring/triggers', { params: { limit: 20 } }); setAlertTriggers(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchMonitoringStats = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/monitoring/stats'); setMonitoringStats(r.data); } catch (e) { console.error(e); }
  }, [api]);
  const fetchPipeline = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/pipeline/board'); setPipelineBoard(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  const fetchPipelineStats = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/pipeline/stats'); setPipelineStats(r.data); } catch (e) { console.error(e); }
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchJournalists(), fetchCampaigns(), fetchReleases(), fetchCoverage(), fetchPitches(), fetchTemplates(), fetchScheduled(), fetchAssets(), fetchPressKits(), fetchAlerts(), fetchTriggers(), fetchMonitoringStats(), fetchPipeline(), fetchPipelineStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchJournalists, fetchCampaigns, fetchReleases, fetchCoverage, fetchPitches, fetchTemplates, fetchScheduled, fetchAssets, fetchPressKits, fetchAlerts, fetchTriggers, fetchMonitoringStats, fetchPipeline, fetchPipelineStats]);

  // Handlers
  const handleCreateContact = async () => {
    if (!newContact.name || !newContact.publication) { toast.error('Name and publication required'); return; }
    try {
      await api.post('/marketing/v2/contacts', { ...newContact, contact_type: 'journalist' });
      toast.success('Contact added'); setShowContactModal(false); setNewContact({ name: '', email: '', publication: '', beat: 'Fashion', editor_level: 'staff', city: '', notes: '' }); fetchJournalists();
    } catch (e) { toast.error('Failed'); }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.objective) { toast.error('Name and objective required'); return; }
    try {
      await api.post('/marketing/v2/pr/campaigns', { ...newCampaign, target_publications: newCampaign.target_publications.split(',').map(s => s.trim()).filter(Boolean) });
      toast.success('Campaign created'); setShowCampaignModal(false); setNewCampaign({ name: '', objective: '', description: '', target_publications: '', start_date: '', end_date: '' }); fetchCampaigns();
    } catch (e) { toast.error('Failed'); }
  };

  const handleCreateRelease = async () => {
    if (!newRelease.title || !newRelease.body) { toast.error('Title and body required'); return; }
    try {
      await api.post('/marketing/v2/pr/releases', { ...newRelease, target_publications: newRelease.target_publications.split(',').map(s => s.trim()).filter(Boolean) });
      toast.success('Release created'); setShowReleaseModal(false); setNewRelease({ title: '', subtitle: '', body: '', target_publications: '' }); fetchReleases();
    } catch (e) { toast.error('Failed'); }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) { toast.error('All fields required'); return; }
    try {
      await api.post('/marketing/v2/outreach/templates', newTemplate);
      toast.success('Template created'); setShowTemplateModal(false); setNewTemplate({ name: '', template_type: 'initial_pitch', subject: '', body: '', delay_days: 0 }); fetchTemplates();
    } catch (e) { toast.error('Failed'); }
  };

  const handleCreateAsset = async () => {
    if (!newAsset.name || !newAsset.file_url) { toast.error('Name and URL required'); return; }
    try {
      await api.post('/marketing/v2/press-kits/assets', newAsset);
      toast.success('Asset added'); setShowAssetModal(false); setNewAsset({ name: '', asset_type: 'logo', file_url: '', description: '', category: '', is_public: true }); fetchAssets();
    } catch (e) { toast.error('Failed'); }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.name || !newAlert.keywords) { toast.error('Name and keywords required'); return; }
    try {
      await api.post('/marketing/v2/monitoring/alerts', { ...newAlert, keywords: newAlert.keywords.split(',').map(s => s.trim()).filter(Boolean), sources: newAlert.sources ? newAlert.sources.split(',').map(s => s.trim()).filter(Boolean) : [] });
      toast.success('Alert created'); setShowAlertModal(false); setNewAlert({ name: '', alert_type: 'brand_mention', keywords: '', sources: '', priority: 'medium' }); fetchAlerts();
    } catch (e) { toast.error('Failed'); }
  };

  const handleCreateInteraction = async () => {
    if (!newInteraction.contact_id || !newInteraction.notes) { toast.error('Contact and notes required'); return; }
    try {
      await api.post('/marketing/v2/relationships/interactions', newInteraction);
      toast.success('Interaction logged'); setShowInteractionModal(false); setNewInteraction({ contact_id: '', interaction_type: 'email', subject: '', notes: '', outcome: 'neutral' }); fetchJournalists();
    } catch (e) { toast.error('Failed'); }
  };

  const handleCreatePressKit = async () => {
    if (!newPressKit.name) { toast.error('Name required'); return; }
    try {
      await api.post('/marketing/v2/press-kits', newPressKit);
      toast.success('Press kit created'); setShowPressKitModal(false); setNewPressKit({ name: '', description: '', asset_ids: [] }); fetchPressKits();
    } catch (e) { toast.error('Failed'); }
  };

  const handleMovePipelineStage = async (contactId, stage) => {
    try {
      await api.put(`/marketing/v2/pipeline/contacts/${contactId}/stage`, null, { params: { stage } });
      toast.success('Moved to ' + stage); fetchPipeline(); fetchPipelineStats();
    } catch (e) { toast.error('Failed'); }
  };

  const handleAIDiscover = async () => {
    if (!discoveryBrief.topic) { toast.error('Enter a topic'); return; }
    setIsDiscovering(true);
    try {
      const r = await api.post('/marketing/v2/pr/ai-discover', discoveryBrief);
      if (r.data.success) { setDiscoveryResults(r.data.data); toast.success('Discovery complete!'); }
      else { toast.error(r.data.error || 'Failed'); }
    } catch (e) { toast.error('Failed'); }
    finally { setIsDiscovering(false); }
  };

  const handleViewContactHistory = async (contact) => {
    try {
      const r = await api.get(`/marketing/v2/relationships/contacts/${contact.id}/history`);
      setSelectedContactHistory(r.data);
      setSelectedContact(contact);
    } catch (e) { toast.error('Failed to load history'); }
  };

  // Helpers
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';
  const formatNum = (n) => { if (!n) return '-'; if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`; if (n >= 1000) return `${(n/1000).toFixed(1)}K`; return n; };

  const filteredJournalists = journalists.filter(j => {
    if (filterBeat !== 'all' && j.beat?.toLowerCase() !== filterBeat.toLowerCase()) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return j.name?.toLowerCase().includes(q) || j.publication?.toLowerCase().includes(q); }
    return true;
  });

  const stats = {
    contacts: journalists.length, campaigns: prCampaigns.length, releases: releases.length,
    coverage: coverage.length, pitches: pitches.length, assets: pressKitAssets.length,
    alerts: alerts.filter(a => a.is_active).length, unreadTriggers: alertTriggers.filter(t => !t.is_read).length
  };

  return (
    <div className="p-6 space-y-5" data-testid="digital-pr-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Digital PR Platform</h1>
          <p className="text-sm text-[#5D4A3A]">Complete PR management with AI discovery, campaigns, and outreach</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm"><RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {[{ icon: Users, label: 'Contacts', value: stats.contacts, color: 'blue' },
          { icon: Target, label: 'Campaigns', value: stats.campaigns, color: 'purple' },
          { icon: FileText, label: 'Releases', value: stats.releases, color: 'amber' },
          { icon: Newspaper, label: 'Coverage', value: stats.coverage, color: 'green' },
          { icon: Send, label: 'Pitches', value: stats.pitches, color: 'emerald' },
          { icon: FolderOpen, label: 'Assets', value: stats.assets, color: 'orange' },
          { icon: Bell, label: 'Alerts', value: stats.alerts, color: 'red' },
          { icon: AlertCircle, label: 'Unread', value: stats.unreadTriggers, color: 'rose' }
        ].map((s, i) => (
          <Card key={i} className="border-[#E8D5C4]">
            <CardContent className="py-3 px-3 flex items-center gap-2">
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
              <div><div className="text-lg font-bold text-[#4A3728]">{s.value}</div><div className="text-xs text-[#5D4A3A]">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5EDE5] flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="media-database" className="text-xs"><Users className="w-3 h-3 mr-1" />Database</TabsTrigger>
          <TabsTrigger value="ai-discovery" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />AI Discovery</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs"><Target className="w-3 h-3 mr-1" />Campaigns</TabsTrigger>
          <TabsTrigger value="releases" className="text-xs"><FileText className="w-3 h-3 mr-1" />Releases</TabsTrigger>
          <TabsTrigger value="outreach" className="text-xs"><Zap className="w-3 h-3 mr-1" />Outreach</TabsTrigger>
          <TabsTrigger value="relationships" className="text-xs"><Heart className="w-3 h-3 mr-1" />Relationships</TabsTrigger>
          <TabsTrigger value="press-kits" className="text-xs"><FolderOpen className="w-3 h-3 mr-1" />Press Kits</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs"><Bell className="w-3 h-3 mr-1" />Monitoring</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs"><Columns className="w-3 h-3 mr-1" />Pipeline</TabsTrigger>
          <TabsTrigger value="coverage" className="text-xs"><Newspaper className="w-3 h-3 mr-1" />Coverage</TabsTrigger>
        </TabsList>

        {/* Media Database */}
        <TabsContent value="media-database" className="space-y-4">
          <div className="flex gap-3 items-center justify-between flex-wrap">
            <div className="flex gap-2">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5D4A3A]" /><Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-48 h-9" /></div>
              <Select value={filterBeat} onValueChange={setFilterBeat}><SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Beats</SelectItem>{BEAT_OPTIONS.map(b => <SelectItem key={b} value={b.toLowerCase()}>{b}</SelectItem>)}</SelectContent></Select>
            </div>
            <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
              <DialogTrigger asChild><Button size="sm" className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-1" />Add Contact</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Add Media Contact</DialogTitle><DialogDescription>Add journalist to database</DialogDescription></DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-3">
                  <div className="col-span-2"><Label>Name *</Label><Input value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} /></div>
                  <div><Label>Email</Label><Input value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} /></div>
                  <div><Label>Publication *</Label><Input value={newContact.publication} onChange={e => setNewContact({...newContact, publication: e.target.value})} /></div>
                  <div><Label>Beat</Label><Select value={newContact.beat} onValueChange={v => setNewContact({...newContact, beat: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BEAT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>City</Label><Input value={newContact.city} onChange={e => setNewContact({...newContact, city: e.target.value})} /></div>
                  <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={newContact.notes} onChange={e => setNewContact({...newContact, notes: e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowContactModal(false)}>Cancel</Button><Button onClick={handleCreateContact} className="bg-amber-700 hover:bg-amber-800">Add</Button></div>
              </DialogContent>
            </Dialog>
          </div>
          {filteredJournalists.length === 0 ? <Card className="border-[#E8D5C4]"><CardContent className="py-10 text-center"><Users className="w-10 h-10 mx-auto text-[#5D4A3A] mb-3" /><p className="text-[#5D4A3A]">No contacts found</p></CardContent></Card> : (
            <Card className="border-[#E8D5C4]"><div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-[#F5EDE5]"><tr><th className="px-3 py-2 text-left text-xs font-medium text-[#5D4A3A]">Contact</th><th className="px-3 py-2 text-left text-xs font-medium text-[#5D4A3A]">Publication</th><th className="px-3 py-2 text-left text-xs font-medium text-[#5D4A3A]">Beat</th><th className="px-3 py-2 text-left text-xs font-medium text-[#5D4A3A]">Status</th><th className="px-3 py-2 text-left text-xs font-medium text-[#5D4A3A]">Score</th><th className="px-3 py-2 text-right text-xs font-medium text-[#5D4A3A]">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#E8D5C4]">{filteredJournalists.slice(0, 50).map(j => (
                <tr key={j.id} className="hover:bg-[#F5EDE5]/50">
                  <td className="px-3 py-2"><div className="font-medium text-[#4A3728]">{j.name}</div>{j.email && <div className="text-xs text-[#5D4A3A]">{j.email}</div>}</td>
                  <td className="px-3 py-2 text-[#4A3728]">{j.publication || '-'}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{j.beat || 'General'}</Badge></td>
                  <td className="px-3 py-2"><Badge className={`text-xs ${STATUS_COLORS[j.pipeline_stage || j.status] || STATUS_COLORS.prospect}`}>{j.pipeline_stage || j.status || 'prospect'}</Badge></td>
                  <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{j.relationship_score || 0}</span></td>
                  <td className="px-3 py-2 text-right"><div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => handleViewContactHistory(j)} title="History"><Heart className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { setNewInteraction({...newInteraction, contact_id: j.id}); setShowInteractionModal(true); }} title="Log"><MessageSquare className="w-3 h-3" /></Button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div></Card>
          )}
        </TabsContent>

        {/* AI Discovery */}
        <TabsContent value="ai-discovery" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600" />AI Discovery Brief</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Story Topic *</Label><Input value={discoveryBrief.topic} onChange={e => setDiscoveryBrief({...discoveryBrief, topic: e.target.value})} placeholder="e.g., Sustainable fashion launch" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Industry</Label><Select value={discoveryBrief.industry} onValueChange={v => setDiscoveryBrief({...discoveryBrief, industry: v})}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{BEAT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs">Story Type</Label><Select value={discoveryBrief.story_type} onValueChange={v => setDiscoveryBrief({...discoveryBrief, story_type: v})}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="news">News</SelectItem><SelectItem value="feature">Feature</SelectItem><SelectItem value="interview">Interview</SelectItem></SelectContent></Select></div>
                </div>
                <div><Label className="text-xs">Target Audience</Label><Input value={discoveryBrief.target_audience} onChange={e => setDiscoveryBrief({...discoveryBrief, target_audience: e.target.value})} placeholder="e.g., Fashion-conscious millennials" /></div>
                <div><Label className="text-xs">Key Messages</Label><Textarea rows={2} value={discoveryBrief.key_messages} onChange={e => setDiscoveryBrief({...discoveryBrief, key_messages: e.target.value})} /></div>
                <Button onClick={handleAIDiscover} disabled={isDiscovering} className="w-full bg-purple-600 hover:bg-purple-700">{isDiscovering ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Discovering...</> : <><Sparkles className="w-4 h-4 mr-2" />Discover Journalists</>}</Button>
              </CardContent>
            </Card>
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2"><CardTitle className="text-sm">Discovery Results</CardTitle></CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {!discoveryResults ? <div className="py-10 text-center text-[#5D4A3A]"><Sparkles className="w-10 h-10 mx-auto mb-3 text-purple-200" /><p>Fill brief and click Discover</p></div> : (
                  <div className="space-y-3">
                    {discoveryResults.pr_insights && <div className="p-3 bg-purple-50 rounded text-sm"><strong className="text-purple-700">PR Insights:</strong><p className="text-purple-600 mt-1">{discoveryResults.pr_insights.timing_recommendations}</p></div>}
                    {discoveryResults.recommendations?.map((rec, i) => {
                      const j = journalists.find(x => x.id === rec.journalist_id);
                      if (!j) return null;
                      return <div key={i} className="p-3 border border-[#E8D5C4] rounded">
                        <div className="flex justify-between items-start mb-2"><div><div className="font-medium text-[#4A3728]">{j.name}</div><div className="text-xs text-[#5D4A3A]">{j.publication}</div></div><Badge className={rec.match_score >= 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>{rec.match_score}%</Badge></div>
                        {rec.recommended_pitch_angle && <p className="text-xs text-[#5D4A3A]"><strong>Pitch:</strong> {rec.recommended_pitch_angle}</p>}
                      </div>;
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end"><Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
            <DialogTrigger asChild><Button size="sm" className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-1" />New Campaign</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Create PR Campaign</DialogTitle></DialogHeader>
              <div className="space-y-3 py-3">
                <div><Label>Name *</Label><Input value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} /></div>
                <div><Label>Objective *</Label><Input value={newCampaign.objective} onChange={e => setNewCampaign({...newCampaign, objective: e.target.value})} /></div>
                <div><Label>Description</Label><Textarea rows={2} value={newCampaign.description} onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3"><div><Label>Start Date</Label><Input type="date" value={newCampaign.start_date} onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})} /></div><div><Label>End Date</Label><Input type="date" value={newCampaign.end_date} onChange={e => setNewCampaign({...newCampaign, end_date: e.target.value})} /></div></div>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCampaignModal(false)}>Cancel</Button><Button onClick={handleCreateCampaign} className="bg-amber-700 hover:bg-amber-800">Create</Button></div>
            </DialogContent>
          </Dialog></div>
          {prCampaigns.length === 0 ? <Card className="border-[#E8D5C4]"><CardContent className="py-10 text-center"><Target className="w-10 h-10 mx-auto text-[#5D4A3A] mb-3" /><p className="text-[#5D4A3A]">No campaigns yet</p></CardContent></Card> : (
            <div className="grid md:grid-cols-2 gap-4">{prCampaigns.map(c => (
              <Card key={c.id} className="border-[#E8D5C4]"><CardContent className="p-4">
                <div className="flex justify-between items-start mb-2"><h3 className="font-semibold text-[#4A3728]">{c.name}</h3><Badge className={STATUS_COLORS[c.status]}>{c.status}</Badge></div>
                <p className="text-sm text-[#5D4A3A] mb-3">{c.objective}</p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">{[{ label: 'Journalists', value: c.journalist_ids?.length || 0 }, { label: 'Pitches', value: c.pitch_count || 0 }, { label: 'Coverage', value: c.coverage_count || 0 }].map((s, i) => <div key={i} className="p-2 bg-[#F5EDE5] rounded"><div className="font-bold text-[#4A3728]">{s.value}</div><div className="text-[#5D4A3A]">{s.label}</div></div>)}</div>
              </CardContent></Card>
            ))}</div>
          )}
        </TabsContent>

        {/* Press Releases */}
        <TabsContent value="releases" className="space-y-4">
          <div className="flex justify-end"><Dialog open={showReleaseModal} onOpenChange={setShowReleaseModal}>
            <DialogTrigger asChild><Button size="sm" className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-1" />New Release</Button></DialogTrigger>
            <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Create Press Release</DialogTitle></DialogHeader>
              <div className="space-y-3 py-3">
                <div><Label>Title *</Label><Input value={newRelease.title} onChange={e => setNewRelease({...newRelease, title: e.target.value})} /></div>
                <div><Label>Subtitle</Label><Input value={newRelease.subtitle} onChange={e => setNewRelease({...newRelease, subtitle: e.target.value})} /></div>
                <div><Label>Body *</Label><Textarea rows={5} value={newRelease.body} onChange={e => setNewRelease({...newRelease, body: e.target.value})} /></div>
                <div><Label>Target Publications (comma-separated)</Label><Input value={newRelease.target_publications} onChange={e => setNewRelease({...newRelease, target_publications: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowReleaseModal(false)}>Cancel</Button><Button onClick={handleCreateRelease} className="bg-amber-700 hover:bg-amber-800">Create</Button></div>
            </DialogContent>
          </Dialog></div>
          {releases.length === 0 ? <Card className="border-[#E8D5C4]"><CardContent className="py-10 text-center"><FileText className="w-10 h-10 mx-auto text-[#5D4A3A] mb-3" /><p className="text-[#5D4A3A]">No press releases</p></CardContent></Card> : (
            <div className="space-y-3">{releases.map(r => (
              <Card key={r.id} className="border-[#E8D5C4]"><CardContent className="p-4">
                <div className="flex justify-between items-start"><div><Badge className={`mb-2 ${STATUS_COLORS[r.status]}`}>{r.status}</Badge><h3 className="font-semibold text-[#4A3728]">{r.title}</h3>{r.subtitle && <p className="text-sm text-[#5D4A3A]">{r.subtitle}</p>}</div><span className="text-xs text-[#5D4A3A]">{formatDate(r.created_at)}</span></div>
              </CardContent></Card>
            ))}</div>
          )}
        </TabsContent>

        {/* Outreach */}
        <TabsContent value="outreach" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2"><CardTitle className="text-sm">Templates</CardTitle></CardHeader>
              <CardContent>
                <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
                  <DialogTrigger asChild><Button size="sm" variant="outline" className="w-full mb-3"><Plus className="w-3 h-3 mr-1" />New Template</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-3">
                      <div><Label>Name</Label><Input value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} /></div>
                      <div><Label>Type</Label><Select value={newTemplate.template_type} onValueChange={v => setNewTemplate({...newTemplate, template_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="initial_pitch">Initial Pitch</SelectItem><SelectItem value="follow_up_1">Follow-up 1</SelectItem><SelectItem value="follow_up_2">Follow-up 2</SelectItem></SelectContent></Select></div>
                      <div><Label>Subject</Label><Input value={newTemplate.subject} onChange={e => setNewTemplate({...newTemplate, subject: e.target.value})} placeholder="Use {{name}}" /></div>
                      <div><Label>Body</Label><Textarea rows={4} value={newTemplate.body} onChange={e => setNewTemplate({...newTemplate, body: e.target.value})} /></div>
                    </div>
                    <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button><Button onClick={handleCreateTemplate} className="bg-amber-700 hover:bg-amber-800">Create</Button></div>
                  </DialogContent>
                </Dialog>
                {templates.length === 0 ? <p className="text-center text-[#5D4A3A] text-sm py-4">No templates</p> : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">{templates.map(t => <div key={t.id} className="p-2 bg-[#F5EDE5] rounded text-xs"><div className="font-medium">{t.name}</div><div className="text-[#5D4A3A]">{t.template_type}</div></div>)}</div>
                )}
              </CardContent>
            </Card>
            <Card className="border-[#E8D5C4] col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm">Scheduled Outreach</CardTitle></CardHeader>
              <CardContent>{scheduledOutreach.length === 0 ? <p className="text-center text-[#5D4A3A] text-sm py-8">No scheduled outreach</p> : (
                <div className="space-y-2 max-h-60 overflow-y-auto">{scheduledOutreach.slice(0, 10).map(o => (
                  <div key={o.id} className="flex items-center justify-between p-2 border border-[#E8D5C4] rounded">
                    <div><div className="font-medium text-sm text-[#4A3728]">{o.contact_name}</div><div className="text-xs text-[#5D4A3A]">{o.subject}</div></div>
                    <div className="flex items-center gap-2"><Badge className={`text-xs ${STATUS_COLORS[o.status]}`}>{o.status}</Badge><span className="text-xs text-[#5D4A3A]">{formatDate(o.scheduled_at)}</span></div>
                  </div>
                ))}</div>
              )}</CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Relationships (Phase 5) */}
        <TabsContent value="relationships" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Top Relationships</CardTitle>
              <Dialog open={showInteractionModal} onOpenChange={setShowInteractionModal}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" />Log Interaction</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Log Interaction</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-3">
                    <div><Label>Contact *</Label><Select value={newInteraction.contact_id} onValueChange={v => setNewInteraction({...newInteraction, contact_id: v})}><SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger><SelectContent>{journalists.slice(0, 50).map(j => <SelectItem key={j.id} value={j.id}>{j.name} - {j.publication}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Type</Label><Select value={newInteraction.interaction_type} onValueChange={v => setNewInteraction({...newInteraction, interaction_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="call">Call</SelectItem><SelectItem value="meeting">Meeting</SelectItem><SelectItem value="pitch">Pitch</SelectItem><SelectItem value="note">Note</SelectItem></SelectContent></Select></div>
                    <div><Label>Subject</Label><Input value={newInteraction.subject} onChange={e => setNewInteraction({...newInteraction, subject: e.target.value})} /></div>
                    <div><Label>Notes *</Label><Textarea rows={3} value={newInteraction.notes} onChange={e => setNewInteraction({...newInteraction, notes: e.target.value})} /></div>
                    <div><Label>Outcome</Label><Select value={newInteraction.outcome} onValueChange={v => setNewInteraction({...newInteraction, outcome: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="positive">Positive</SelectItem><SelectItem value="neutral">Neutral</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowInteractionModal(false)}>Cancel</Button><Button onClick={handleCreateInteraction} className="bg-amber-700 hover:bg-amber-800">Log</Button></div>
                </DialogContent>
              </Dialog>
            </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">{journalists.filter(j => j.relationship_score > 0).sort((a, b) => (b.relationship_score || 0) - (a.relationship_score || 0)).slice(0, 10).map(j => (
                  <div key={j.id} className="flex items-center justify-between p-2 border border-[#E8D5C4] rounded cursor-pointer hover:bg-[#F5EDE5]" onClick={() => handleViewContactHistory(j)}>
                    <div><div className="font-medium text-sm text-[#4A3728]">{j.name}</div><div className="text-xs text-[#5D4A3A]">{j.publication}</div></div>
                    <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-red-400" /><span className="font-bold text-[#4A3728]">{j.relationship_score || 0}</span></div>
                  </div>
                ))}</div>
              </CardContent>
            </Card>
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2"><CardTitle className="text-sm">Contact History</CardTitle></CardHeader>
              <CardContent>{!selectedContactHistory ? <p className="text-center text-[#5D4A3A] text-sm py-10">Select a contact to view history</p> : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  <div className="p-3 bg-[#F5EDE5] rounded"><div className="font-medium text-[#4A3728]">{selectedContactHistory.contact?.name}</div><div className="text-xs text-[#5D4A3A]">{selectedContactHistory.contact?.publication}</div>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-center text-xs">{[{ l: 'Score', v: selectedContactHistory.relationship_score }, { l: 'Interactions', v: selectedContactHistory.stats?.total_interactions }, { l: 'Pitches', v: selectedContactHistory.stats?.total_pitches }, { l: 'Coverage', v: selectedContactHistory.stats?.total_coverage }].map((s, i) => <div key={i}><div className="font-bold">{s.v}</div><div className="text-[#5D4A3A]">{s.l}</div></div>)}</div>
                  </div>
                  {selectedContactHistory.interactions?.slice(0, 10).map((int, i) => <div key={i} className="p-2 border border-[#E8D5C4] rounded text-xs"><div className="flex justify-between"><Badge variant="outline">{int.interaction_type}</Badge><span className="text-[#5D4A3A]">{formatDate(int.created_at)}</span></div><p className="mt-1 text-[#4A3728]">{int.notes}</p></div>)}
                </div>
              )}</CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Press Kits (Phase 8) */}
        <TabsContent value="press-kits" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Assets Library</CardTitle>
              <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" />Add Asset</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Add Press Kit Asset</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-3">
                    <div><Label>Name *</Label><Input value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} /></div>
                    <div><Label>Type</Label><Select value={newAsset.asset_type} onValueChange={v => setNewAsset({...newAsset, asset_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="logo">Logo</SelectItem><SelectItem value="product_image">Product Image</SelectItem><SelectItem value="founder_bio">Founder Bio</SelectItem><SelectItem value="company_fact_sheet">Fact Sheet</SelectItem><SelectItem value="video">Video</SelectItem><SelectItem value="presentation">Presentation</SelectItem></SelectContent></Select></div>
                    <div><Label>File URL *</Label><Input value={newAsset.file_url} onChange={e => setNewAsset({...newAsset, file_url: e.target.value})} placeholder="https://..." /></div>
                    <div><Label>Description</Label><Textarea rows={2} value={newAsset.description} onChange={e => setNewAsset({...newAsset, description: e.target.value})} /></div>
                    <div><Label>Category</Label><Input value={newAsset.category} onChange={e => setNewAsset({...newAsset, category: e.target.value})} placeholder="e.g., Products, Company" /></div>
                  </div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAssetModal(false)}>Cancel</Button><Button onClick={handleCreateAsset} className="bg-amber-700 hover:bg-amber-800">Add</Button></div>
                </DialogContent>
              </Dialog>
            </CardHeader>
              <CardContent>{pressKitAssets.length === 0 ? <p className="text-center text-[#5D4A3A] text-sm py-8">No assets yet</p> : (
                <div className="space-y-2 max-h-60 overflow-y-auto">{pressKitAssets.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2 border border-[#E8D5C4] rounded">
                    <div className="flex items-center gap-2">{a.asset_type === 'video' ? <Video className="w-4 h-4 text-purple-600" /> : <Image className="w-4 h-4 text-blue-600" />}<div><div className="font-medium text-sm text-[#4A3728]">{a.name}</div><div className="text-xs text-[#5D4A3A]">{a.asset_type} {a.category && `• ${a.category}`}</div></div></div>
                    <a href={a.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 text-[#5D4A3A]" /></a>
                  </div>
                ))}</div>
              )}</CardContent>
            </Card>
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Press Kits</CardTitle>
              <Dialog open={showPressKitModal} onOpenChange={setShowPressKitModal}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" />Create Kit</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Create Press Kit</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-3">
                    <div><Label>Name *</Label><Input value={newPressKit.name} onChange={e => setNewPressKit({...newPressKit, name: e.target.value})} /></div>
                    <div><Label>Description</Label><Textarea rows={2} value={newPressKit.description} onChange={e => setNewPressKit({...newPressKit, description: e.target.value})} /></div>
                    <div><Label>Select Assets</Label><div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">{pressKitAssets.map(a => (
                      <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newPressKit.asset_ids.includes(a.id)} onChange={e => { if (e.target.checked) setNewPressKit({...newPressKit, asset_ids: [...newPressKit.asset_ids, a.id]}); else setNewPressKit({...newPressKit, asset_ids: newPressKit.asset_ids.filter(id => id !== a.id)}); }} />{a.name}</label>
                    ))}</div></div>
                  </div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowPressKitModal(false)}>Cancel</Button><Button onClick={handleCreatePressKit} className="bg-amber-700 hover:bg-amber-800">Create</Button></div>
                </DialogContent>
              </Dialog>
            </CardHeader>
              <CardContent>{pressKits.length === 0 ? <p className="text-center text-[#5D4A3A] text-sm py-8">No press kits</p> : (
                <div className="space-y-2">{pressKits.map(k => (
                  <div key={k.id} className="p-3 border border-[#E8D5C4] rounded">
                    <div className="flex justify-between items-start mb-2"><h4 className="font-medium text-[#4A3728]">{k.name}</h4><Badge variant="outline">{k.asset_ids?.length || 0} assets</Badge></div>
                    {k.description && <p className="text-xs text-[#5D4A3A] mb-2">{k.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-[#5D4A3A]"><span><Eye className="w-3 h-3 inline mr-1" />{k.view_count} views</span><span><Download className="w-3 h-3 inline mr-1" />{k.download_count} downloads</span>{k.share_url && <a href={k.share_url} className="text-blue-600"><Link className="w-3 h-3 inline mr-1" />Share</a>}</div>
                  </div>
                ))}</div>
              )}</CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring (Phase 9) */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2"><CardTitle className="text-sm">Monitoring Stats</CardTitle></CardHeader>
              <CardContent>{monitoringStats ? (
                <div className="space-y-2 text-sm">{[{ l: 'Active Alerts', v: monitoringStats.alerts?.active, c: 'text-green-600' }, { l: 'Total Triggers', v: monitoringStats.triggers?.total, c: 'text-blue-600' }, { l: 'Unread', v: monitoringStats.triggers?.unread, c: 'text-red-600' }, { l: 'Positive', v: monitoringStats.triggers?.positive, c: 'text-emerald-600' }, { l: 'Negative', v: monitoringStats.triggers?.negative, c: 'text-rose-600' }].map((s, i) => <div key={i} className="flex justify-between"><span className="text-[#5D4A3A]">{s.l}</span><span className={`font-bold ${s.c}`}>{s.v || 0}</span></div>)}</div>
              ) : <p className="text-[#5D4A3A] text-sm">Loading...</p>}</CardContent>
            </Card>
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Alerts</CardTitle>
              <Dialog open={showAlertModal} onOpenChange={setShowAlertModal}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" />New Alert</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Create Monitoring Alert</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-3">
                    <div><Label>Name *</Label><Input value={newAlert.name} onChange={e => setNewAlert({...newAlert, name: e.target.value})} /></div>
                    <div><Label>Type</Label><Select value={newAlert.alert_type} onValueChange={v => setNewAlert({...newAlert, alert_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="brand_mention">Brand Mention</SelectItem><SelectItem value="keyword">Keyword</SelectItem><SelectItem value="competitor">Competitor</SelectItem><SelectItem value="journalist">Journalist</SelectItem></SelectContent></Select></div>
                    <div><Label>Keywords * (comma-separated)</Label><Input value={newAlert.keywords} onChange={e => setNewAlert({...newAlert, keywords: e.target.value})} placeholder="brand name, product, etc." /></div>
                    <div><Label>Sources (comma-separated)</Label><Input value={newAlert.sources} onChange={e => setNewAlert({...newAlert, sources: e.target.value})} placeholder="Vogue, Elle, etc." /></div>
                    <div><Label>Priority</Label><Select value={newAlert.priority} onValueChange={v => setNewAlert({...newAlert, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAlertModal(false)}>Cancel</Button><Button onClick={handleCreateAlert} className="bg-amber-700 hover:bg-amber-800">Create</Button></div>
                </DialogContent>
              </Dialog>
            </CardHeader>
              <CardContent>{alerts.length === 0 ? <p className="text-center text-[#5D4A3A] text-sm py-4">No alerts</p> : (
                <div className="space-y-2 max-h-40 overflow-y-auto">{alerts.map(a => (
                  <div key={a.id} className="p-2 border border-[#E8D5C4] rounded text-xs">
                    <div className="flex justify-between items-center"><span className="font-medium text-[#4A3728]">{a.name}</span><Badge variant="outline" className={a.is_active ? 'bg-green-50' : 'bg-gray-50'}>{a.is_active ? 'Active' : 'Paused'}</Badge></div>
                    <div className="text-[#5D4A3A] mt-1">{a.keywords?.join(', ')}</div>
                  </div>
                ))}</div>
              )}</CardContent>
            </Card>
            <Card className="border-[#E8D5C4]"><CardHeader className="pb-2"><CardTitle className="text-sm">Recent Triggers</CardTitle></CardHeader>
              <CardContent>{alertTriggers.length === 0 ? <p className="text-center text-[#5D4A3A] text-sm py-4">No triggers</p> : (
                <div className="space-y-2 max-h-40 overflow-y-auto">{alertTriggers.slice(0, 5).map(t => (
                  <div key={t.id} className={`p-2 border rounded text-xs ${t.is_read ? 'border-[#E8D5C4]' : 'border-amber-300 bg-amber-50'}`}>
                    <div className="font-medium text-[#4A3728]">{t.title}</div>
                    <div className="text-[#5D4A3A]">{t.source} • {formatDate(t.created_at)}</div>
                    {t.url && <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-blue-600">View <ExternalLink className="w-3 h-3 inline" /></a>}
                  </div>
                ))}</div>
              )}</CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline (Phase 10) */}
        <TabsContent value="pipeline" className="space-y-4">
          {pipelineStats && <div className="grid grid-cols-4 gap-3 mb-4">{[{ l: 'Total', v: pipelineStats.total }, { l: 'Contact Rate', v: `${pipelineStats.conversion?.contact_rate?.toFixed(0) || 0}%` }, { l: 'Response Rate', v: `${pipelineStats.conversion?.response_rate?.toFixed(0) || 0}%` }, { l: 'Publish Rate', v: `${pipelineStats.conversion?.publish_rate?.toFixed(0) || 0}%` }].map((s, i) => <Card key={i} className="border-[#E8D5C4]"><CardContent className="py-3 text-center"><div className="text-xl font-bold text-[#4A3728]">{s.v}</div><div className="text-xs text-[#5D4A3A]">{s.l}</div></CardContent></Card>)}</div>}
          <div className="flex gap-3 overflow-x-auto pb-2">{pipelineBoard.map(stage => (
            <div key={stage.id} className="flex-shrink-0 w-56">
              <div className={`p-2 rounded-t ${stage.color || 'bg-gray-200'}`}><div className="flex justify-between items-center"><span className="font-medium text-sm">{stage.name}</span><Badge variant="outline" className="bg-white">{stage.count}</Badge></div></div>
              <div className="border border-t-0 border-[#E8D5C4] rounded-b min-h-[200px] max-h-[400px] overflow-y-auto p-2 space-y-2 bg-white">
                {stage.contacts?.slice(0, 20).map(c => (
                  <div key={c.id} className="p-2 border border-[#E8D5C4] rounded bg-[#F5EDE5] text-xs cursor-pointer hover:shadow" draggable>
                    <div className="font-medium text-[#4A3728]">{c.name}</div>
                    <div className="text-[#5D4A3A]">{c.publication}</div>
                    {c.days_in_stage > 0 && <div className="text-[#5D4A3A] mt-1">{c.days_in_stage}d in stage</div>}
                    <div className="flex gap-1 mt-2 flex-wrap">{PIPELINE_STAGES.filter(s => s.id !== stage.id).slice(0, 3).map(s => <Button key={s.id} size="sm" variant="ghost" className="h-5 text-xs px-1" onClick={() => handleMovePipelineStage(c.id, s.id)}>{s.name}</Button>)}</div>
                  </div>
                ))}
                {stage.count === 0 && <p className="text-center text-[#5D4A3A] py-4">Empty</p>}
              </div>
            </div>
          ))}</div>
        </TabsContent>

        {/* Coverage */}
        <TabsContent value="coverage" className="space-y-4">
          {coverage.length === 0 ? <Card className="border-[#E8D5C4]"><CardContent className="py-10 text-center"><Newspaper className="w-10 h-10 mx-auto text-[#5D4A3A] mb-3" /><p className="text-[#5D4A3A]">No coverage recorded</p></CardContent></Card> : (
            <div className="space-y-3">{coverage.map(c => (
              <Card key={c.id} className="border-[#E8D5C4]"><CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div><div className="flex gap-2 mb-1"><Badge variant="outline">{c.coverage_type}</Badge><Badge className={c.sentiment === 'positive' ? 'bg-green-100 text-green-700' : c.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>{c.sentiment}</Badge></div><h3 className="font-medium text-[#4A3728]">{c.title}</h3><p className="text-sm text-[#5D4A3A]">{c.publication}</p></div>
                  <div className="text-right text-xs text-[#5D4A3A]">{c.reach && <div><Eye className="w-3 h-3 inline mr-1" />{formatNum(c.reach)}</div>}<div>{formatDate(c.published_date)}</div>{c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-600">View <ExternalLink className="w-3 h-3 inline" /></a>}</div>
                </div>
              </CardContent></Card>
            ))}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DigitalPRPage;
