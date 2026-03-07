import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
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
  Users, Search, Plus, RefreshCw, Mail, Edit2, Trash2, Send, Eye, ExternalLink,
  Newspaper, TrendingUp, Target, ChevronRight, MessageSquare, Clock,
  CheckCircle, XCircle, BarChart3, DollarSign, Building2, User, Filter
} from 'lucide-react';

// PR Journey: Campaign → Media Research → Outreach → Response → Coverage → Impact

const OUTREACH_STATUS = [
  { id: 'identified', label: 'Identified', color: 'bg-gray-100 text-gray-700' },
  { id: 'pitch_prepared', label: 'Pitch Prepared', color: 'bg-blue-100 text-blue-700' },
  { id: 'pitch_sent', label: 'Pitch Sent', color: 'bg-purple-100 text-purple-700' },
  { id: 'follow_up', label: 'Follow Up', color: 'bg-amber-100 text-amber-700' },
  { id: 'responded', label: 'Responded', color: 'bg-green-100 text-green-700' },
  { id: 'interested', label: 'Interested', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'story_in_progress', label: 'Story in Progress', color: 'bg-teal-100 text-teal-700' },
  { id: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
];

const COVERAGE_TYPES = [
  { value: 'article', label: 'Article' },
  { value: 'mention', label: 'Mention' },
  { value: 'feature', label: 'Feature' },
  { value: 'interview', label: 'Interview' },
  { value: 'review', label: 'Review' },
];

const BEAT_OPTIONS = ['Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Business', 'Entertainment', 'Startup', 'Luxury'];

const DigitalPRPage = () => {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const campaignIdFromUrl = searchParams.get('campaign');
  
  const [activeTab, setActiveTab] = useState('media-research');
  const [loading, setLoading] = useState(true);
  
  // Core data
  const [journalists, setJournalists] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [paidPR, setPaidPR] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBeat, setFilterBeat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState(campaignIdFromUrl || 'all');
  const [campaigns, setCampaigns] = useState([]);
  
  // Modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [showPaidPRModal, setShowPaidPRModal] = useState(false);
  const [selectedJournalist, setSelectedJournalist] = useState(null);
  
  // Forms
  const [newContact, setNewContact] = useState({ name: '', email: '', publication: '', publication_id: 'manual', role: '', beat: 'Fashion', location: '', domain_authority: '', audience_reach: '' });
  const [newPitch, setNewPitch] = useState({ contact_id: '', subject: '', message: '', pr_campaign_id: '' });
  const [newCoverage, setNewCoverage] = useState({ title: '', publication: '', url: '', author: '', published_date: '', coverage_type: 'article', domain_authority: '', estimated_reach: '', sentiment: 'positive', contact_id: '', pr_campaign_id: '' });
  const [newPaidPR, setNewPaidPR] = useState({ publication: '', package_type: '', cost: '', deliverables: '', pr_campaign_id: '' });

  // Publications for linking journalists
  const [publications, setPublications] = useState([]);

  // Fetch functions
  const fetchJournalists = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/contacts', { params: { contact_type: 'journalist', limit: 300 } }); setJournalists(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  
  const fetchPublications = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/publications'); setPublications(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  
  const fetchCampaigns = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/pr/campaigns'); setCampaigns(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  
  const fetchPitches = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/pr/pitches'); setPitches(r.data || []); } catch (e) { console.error(e); }
  }, [api]);
  
  const fetchCoverage = useCallback(async () => {
    try { const r = await api.get('/marketing/v2/pr/coverage'); setCoverage(r.data || []); } catch (e) { console.error(e); }
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchJournalists(), fetchPublications(), fetchCampaigns(), fetchPitches(), fetchCoverage()]);
      setLoading(false);
    };
    loadData();
  }, [fetchJournalists, fetchPublications, fetchCampaigns, fetchPitches, fetchCoverage]);

  useEffect(() => {
    if (campaignIdFromUrl) setSelectedCampaign(campaignIdFromUrl);
  }, [campaignIdFromUrl]);

  // Handlers
  const handleCreateContact = async () => {
    if (!newContact.name) { toast.error('Name required'); return; }
    try {
      // If publication_id is selected, get the publication name
      const selectedPub = publications.find(p => p.id === newContact.publication_id);
      const payload = {
        ...newContact,
        contact_type: 'journalist',
        publication: selectedPub?.name || newContact.publication,
        domain_authority: newContact.domain_authority ? parseInt(newContact.domain_authority) : null,
        monthly_traffic: newContact.audience_reach ? parseInt(newContact.audience_reach) : null
      };
      await api.post('/marketing/v2/contacts', payload);
      toast.success('Journalist added'); 
      setShowContactModal(false); 
      setNewContact({ name: '', email: '', publication: '', publication_id: 'manual', role: '', beat: 'Fashion', location: '', domain_authority: '', audience_reach: '' }); 
      fetchJournalists();
    } catch (e) { toast.error('Failed'); }
  };

  const handleCreatePitch = async () => {
    if (!newPitch.contact_id || !newPitch.subject || !newPitch.message) { toast.error('All fields required'); return; }
    try {
      await api.post('/marketing/v2/pr/pitches', newPitch);
      toast.success('Pitch created'); setShowPitchModal(false); setNewPitch({ contact_id: '', subject: '', message: '', pr_campaign_id: '' }); fetchPitches();
      // Update journalist status
      await api.put(`/marketing/v2/pipeline/contacts/${newPitch.contact_id}/stage`, null, { params: { stage: 'contacted' } });
      fetchJournalists();
    } catch (e) { toast.error('Failed'); }
  };

  const handleCreateCoverage = async () => {
    if (!newCoverage.title || !newCoverage.publication || !newCoverage.url) { toast.error('Title, publication, and URL required'); return; }
    try {
      await api.post('/marketing/v2/pr/coverage', { ...newCoverage, reach: newCoverage.estimated_reach ? parseInt(newCoverage.estimated_reach) : null, domain_authority: newCoverage.domain_authority ? parseInt(newCoverage.domain_authority) : null });
      toast.success('Coverage recorded'); setShowCoverageModal(false); setNewCoverage({ title: '', publication: '', url: '', author: '', published_date: '', coverage_type: 'earned', domain_authority: '', estimated_reach: '', sentiment: 'positive', contact_id: '', pr_campaign_id: '' }); fetchCoverage();
    } catch (e) { toast.error('Failed'); }
  };

  const handleUpdatePitchStatus = async (pitchId, status) => {
    try {
      await api.put(`/marketing/v2/pr/pitches/${pitchId}/status`, null, { params: { status } });
      toast.success('Status updated'); fetchPitches();
    } catch (e) { toast.error('Failed'); }
  };

  const handleAddToCampaign = async (journalistId, campaignId) => {
    try {
      await api.post(`/marketing/v2/pr/campaigns/${campaignId}/journalists/${journalistId}`);
      toast.success('Added to campaign'); fetchCampaigns();
    } catch (e) { toast.error('Failed'); }
  };

  // Helpers
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';
  const formatNum = (n) => { if (!n) return '-'; if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`; if (n >= 1000) return `${(n/1000).toFixed(1)}K`; return n; };
  const formatCurrency = (n) => n ? `₹${(n/100000).toFixed(1)}L` : '-';

  // Filtered data
  const filteredJournalists = journalists.filter(j => {
    if (filterBeat !== 'all' && j.beat?.toLowerCase() !== filterBeat.toLowerCase()) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return j.name?.toLowerCase().includes(q) || j.publication?.toLowerCase().includes(q) || j.email?.toLowerCase().includes(q); }
    return true;
  });

  const filteredPitches = pitches.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (selectedCampaign !== 'all' && p.pr_campaign_id !== selectedCampaign) return false;
    return true;
  });

  const filteredCoverage = coverage.filter(c => {
    if (selectedCampaign !== 'all' && c.campaign_id !== selectedCampaign) return false;
    return true;
  });

  // Stats
  const stats = {
    journalists: journalists.length,
    pitchesSent: pitches.filter(p => ['pitch_sent', 'follow_up', 'responded', 'interested', 'story_in_progress'].includes(p.status)).length,
    responses: pitches.filter(p => ['responded', 'interested', 'story_in_progress'].includes(p.status)).length,
    articlesPublished: coverage.length,
    estimatedReach: coverage.reduce((sum, c) => sum + (c.reach || 0), 0),
    responseRate: pitches.length > 0 ? (pitches.filter(p => ['responded', 'interested', 'story_in_progress'].includes(p.status)).length / pitches.filter(p => p.status !== 'identified').length * 100) : 0
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen" data-testid="digital-pr-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">PR Management</p>
          <h1 className="text-3xl font-semibold text-gray-900">Digital PR</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-56 bg-white">
              <Target className="w-4 h-4 mr-2 text-amber-600" />
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Stats - PR Analytics Dashboard */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        {[
          { icon: Users, label: 'Journalists', value: stats.journalists, color: 'blue' },
          { icon: Send, label: 'Pitches Sent', value: stats.pitchesSent, color: 'purple' },
          { icon: MessageSquare, label: 'Responses', value: stats.responses, color: 'green' },
          { icon: Newspaper, label: 'Articles', value: stats.articlesPublished, color: 'amber' },
          { icon: Eye, label: 'Est. Reach', value: formatNum(stats.estimatedReach), color: 'emerald' },
          { icon: TrendingUp, label: 'Response Rate', value: `${stats.responseRate.toFixed(0)}%`, color: 'rose' },
        ].map((s, i) => (
          <Card key={i} className="bg-white border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-${s.color}-100 flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 text-${s.color}-600`} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PR Journey Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1 mb-6">
          <TabsTrigger value="media-research" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <Users className="w-4 h-4 mr-2" />Media Research
          </TabsTrigger>
          <TabsTrigger value="outreach" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <Send className="w-4 h-4 mr-2" />Outreach
          </TabsTrigger>
          <TabsTrigger value="coverage" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <Newspaper className="w-4 h-4 mr-2" />Coverage
          </TabsTrigger>
          <TabsTrigger value="paid-pr" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <DollarSign className="w-4 h-4 mr-2" />Paid PR
          </TabsTrigger>
        </TabsList>

        {/* Media Research Tab */}
        <TabsContent value="media-research" className="space-y-4">
          <div className="flex gap-3 items-center justify-between flex-wrap">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Search journalists..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-64 bg-white" />
              </div>
              <Select value={filterBeat} onValueChange={setFilterBeat}>
                <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="All Beats" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Beats</SelectItem>{BEAT_OPTIONS.map(b => <SelectItem key={b} value={b.toLowerCase()}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
              <DialogTrigger asChild><Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white"><Plus className="w-4 h-4 mr-2" />Add Journalist</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><User className="w-5 h-5 text-amber-500" />Add Media Contact</DialogTitle><DialogDescription>Add journalist to your media database and link to a publication</DialogDescription></DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2"><Label className="text-xs uppercase tracking-wider text-gray-500">NAME *</Label><Input value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">EMAIL</Label><Input value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="mt-1" /></div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">PUBLICATION</Label>
                    <Select value={newContact.publication_id || 'manual'} onValueChange={v => {
                      if (v === 'manual') {
                        setNewContact({...newContact, publication_id: '', publication: ''});
                      } else {
                        const pub = publications.find(p => p.id === v);
                        setNewContact({...newContact, publication_id: v, publication: pub?.name || ''});
                      }
                    }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select or type below" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">-- Enter manually --</SelectItem>
                        {publications.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.tier?.replace('_', ' ')})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {(!newContact.publication_id || newContact.publication_id === 'manual') && (
                      <Input value={newContact.publication} onChange={e => setNewContact({...newContact, publication: e.target.value})} placeholder="Or type publication name" className="mt-2" />
                    )}
                  </div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">ROLE</Label><Input value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} placeholder="Fashion Editor" className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">BEAT</Label><Select value={newContact.beat} onValueChange={v => setNewContact({...newContact, beat: v})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{BEAT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">LOCATION</Label><Input value={newContact.location} onChange={e => setNewContact({...newContact, location: e.target.value})} placeholder="Mumbai" className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">DOMAIN AUTHORITY</Label><Input type="number" value={newContact.domain_authority} onChange={e => setNewContact({...newContact, domain_authority: e.target.value})} className="mt-1" /></div>
                  <div className="col-span-2"><Label className="text-xs uppercase tracking-wider text-gray-500">AUDIENCE REACH</Label><Input type="number" value={newContact.audience_reach} onChange={e => setNewContact({...newContact, audience_reach: e.target.value})} placeholder="Monthly visitors" className="mt-1" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={() => setShowContactModal(false)}>Cancel</Button><Button onClick={handleCreateContact} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">Add Journalist</Button></div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Media Lists */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { title: 'Fashion Editors India', count: journalists.filter(j => j.beat?.toLowerCase() === 'fashion').length, beat: 'fashion' },
              { title: 'Startup Journalists', count: journalists.filter(j => j.beat?.toLowerCase() === 'startup').length, beat: 'startup' },
              { title: 'Luxury Lifestyle Media', count: journalists.filter(j => j.beat?.toLowerCase() === 'luxury' || j.beat?.toLowerCase() === 'lifestyle').length, beat: 'luxury' },
            ].map((list, i) => (
              <Card key={i} className="bg-white border-gray-200 cursor-pointer hover:border-amber-300" onClick={() => setFilterBeat(list.beat)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{list.title}</div>
                      <div className="text-sm text-gray-500">{list.count} contacts</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Journalists Table */}
          <Card className="bg-white border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journalist</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publication</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reach</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJournalists.slice(0, 30).map(j => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><User className="w-4 h-4 text-amber-600" /></div>
                          <div><div className="font-medium text-gray-900">{j.name}</div>{j.email && <div className="text-xs text-gray-500">{j.email}</div>}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><div className="text-gray-900">{j.publication}</div>{j.editor_level && <div className="text-xs text-gray-500 capitalize">{j.editor_level.replace('_', ' ')}</div>}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{j.beat || 'General'}</Badge></td>
                      <td className="px-4 py-3 text-gray-900">{j.domain_authority || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{formatNum(j.monthly_traffic)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedJournalist(j); setNewPitch({...newPitch, contact_id: j.id}); setShowPitchModal(true); }} title="Create Pitch"><Send className="w-4 h-4" /></Button>
                          {campaigns.length > 0 && (
                            <Select onValueChange={v => handleAddToCampaign(j.id, v)}>
                              <SelectTrigger className="w-8 h-8 p-0 border-0"><Plus className="w-4 h-4" /></SelectTrigger>
                              <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Outreach Tab */}
        <TabsContent value="outreach" className="space-y-4">
          <div className="flex gap-3 items-center justify-between">
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44 bg-white"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem>{OUTREACH_STATUS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Dialog open={showPitchModal} onOpenChange={setShowPitchModal}>
              <DialogTrigger asChild><Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white"><Plus className="w-4 h-4 mr-2" />New Pitch</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-amber-500" />Create Pitch</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">JOURNALIST *</Label>
                    <Select value={newPitch.contact_id} onValueChange={v => setNewPitch({...newPitch, contact_id: v})}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select journalist" /></SelectTrigger>
                      <SelectContent>{journalists.slice(0, 50).map(j => <SelectItem key={j.id} value={j.id}>{j.name} - {j.publication}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">CAMPAIGN</Label>
                    <Select value={newPitch.pr_campaign_id} onValueChange={v => setNewPitch({...newPitch, pr_campaign_id: v})}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select campaign" /></SelectTrigger>
                      <SelectContent><SelectItem value="">No campaign</SelectItem>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">SUBJECT *</Label><Input value={newPitch.subject} onChange={e => setNewPitch({...newPitch, subject: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">MESSAGE *</Label><Textarea rows={5} value={newPitch.message} onChange={e => setNewPitch({...newPitch, message: e.target.value})} className="mt-1" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={() => setShowPitchModal(false)}>Cancel</Button><Button onClick={handleCreatePitch} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">Create Pitch</Button></div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Outreach Status Funnel */}
          <div className="grid grid-cols-8 gap-2 mb-4">
            {OUTREACH_STATUS.map(s => {
              const count = pitches.filter(p => p.status === s.id).length;
              return (
                <Card key={s.id} className={`bg-white border-gray-200 cursor-pointer hover:border-amber-300 ${filterStatus === s.id ? 'ring-2 ring-amber-400' : ''}`} onClick={() => setFilterStatus(s.id)}>
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500 truncate">{s.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pitches List */}
          <Card className="bg-white border-gray-200">
            <div className="divide-y divide-gray-100">
              {filteredPitches.length === 0 ? (
                <div className="py-12 text-center text-gray-500"><Send className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p>No pitches yet</p></div>
              ) : filteredPitches.map(pitch => (
                <div key={pitch.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={OUTREACH_STATUS.find(s => s.id === pitch.status)?.color || 'bg-gray-100 text-gray-700'}>{OUTREACH_STATUS.find(s => s.id === pitch.status)?.label || pitch.status}</Badge>
                        {pitch.pr_campaign_id && <Badge variant="outline" className="text-xs"><Target className="w-3 h-3 mr-1" />{campaigns.find(c => c.id === pitch.pr_campaign_id)?.name || 'Campaign'}</Badge>}
                      </div>
                      <h4 className="font-medium text-gray-900">{pitch.subject}</h4>
                      <p className="text-sm text-gray-500">To: {pitch.contact_name} • {pitch.publication}</p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pitch.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-gray-500">{formatDate(pitch.sent_at || pitch.created_at)}</span>
                      <Select onValueChange={v => handleUpdatePitchStatus(pitch.id, v)}>
                        <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Update status" /></SelectTrigger>
                        <SelectContent>{OUTREACH_STATUS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCoverageModal} onOpenChange={setShowCoverageModal}>
              <DialogTrigger asChild><Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white"><Plus className="w-4 h-4 mr-2" />Record Coverage</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Newspaper className="w-5 h-5 text-amber-500" />Record Media Coverage</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2"><Label className="text-xs uppercase tracking-wider text-gray-500">ARTICLE TITLE *</Label><Input value={newCoverage.title} onChange={e => setNewCoverage({...newCoverage, title: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">PUBLICATION *</Label><Input value={newCoverage.publication} onChange={e => setNewCoverage({...newCoverage, publication: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">AUTHOR</Label><Input value={newCoverage.author} onChange={e => setNewCoverage({...newCoverage, author: e.target.value})} className="mt-1" /></div>
                  <div className="col-span-2"><Label className="text-xs uppercase tracking-wider text-gray-500">URL *</Label><Input value={newCoverage.url} onChange={e => setNewCoverage({...newCoverage, url: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">PUBLISH DATE</Label><Input type="date" value={newCoverage.published_date} onChange={e => setNewCoverage({...newCoverage, published_date: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">COVERAGE TYPE</Label><Select value={newCoverage.coverage_type} onValueChange={v => setNewCoverage({...newCoverage, coverage_type: v})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{COVERAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">DOMAIN AUTHORITY</Label><Input type="number" value={newCoverage.domain_authority} onChange={e => setNewCoverage({...newCoverage, domain_authority: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">ESTIMATED REACH</Label><Input type="number" value={newCoverage.estimated_reach} onChange={e => setNewCoverage({...newCoverage, estimated_reach: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">SENTIMENT</Label><Select value={newCoverage.sentiment} onValueChange={v => setNewCoverage({...newCoverage, sentiment: v})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="positive">Positive</SelectItem><SelectItem value="neutral">Neutral</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent></Select></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">CAMPAIGN</Label><Select value={newCoverage.pr_campaign_id} onValueChange={v => setNewCoverage({...newCoverage, pr_campaign_id: v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Link campaign" /></SelectTrigger><SelectContent><SelectItem value="">None</SelectItem>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={() => setShowCoverageModal(false)}>Cancel</Button><Button onClick={handleCreateCoverage} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">Record Coverage</Button></div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Coverage Summary */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {COVERAGE_TYPES.map(t => {
              const items = coverage.filter(c => c.coverage_type === t.value);
              const totalReach = items.reduce((sum, c) => sum + (c.reach || 0), 0);
              return (
                <Card key={t.value} className="bg-white border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-gray-900">{t.label}</span><Badge variant="outline">{items.length}</Badge></div>
                    <div className="text-xl font-bold text-gray-900">{formatNum(totalReach)}</div>
                    <div className="text-xs text-gray-500">Total Reach</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Coverage List */}
          <Card className="bg-white border-gray-200">
            <div className="divide-y divide-gray-100">
              {filteredCoverage.length === 0 ? (
                <div className="py-12 text-center text-gray-500"><Newspaper className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p>No coverage recorded</p></div>
              ) : filteredCoverage.map(c => (
                <div key={c.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{c.coverage_type}</Badge>
                        <Badge className={c.sentiment === 'positive' ? 'bg-green-100 text-green-700' : c.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>{c.sentiment}</Badge>
                      </div>
                      <h4 className="font-medium text-gray-900">{c.title}</h4>
                      <p className="text-sm text-gray-500">{c.publication} {c.author && `• ${c.author}`}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500"><Eye className="w-4 h-4 inline mr-1" />{formatNum(c.reach)}</div>
                      <div className="text-xs text-gray-500">{formatDate(c.published_date)}</div>
                      {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline">View <ExternalLink className="w-3 h-3 inline" /></a>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Paid PR Tab */}
        <TabsContent value="paid-pr" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showPaidPRModal} onOpenChange={setShowPaidPRModal}>
              <DialogTrigger asChild><Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white"><Plus className="w-4 h-4 mr-2" />Add Paid PR</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-500" />Record Paid PR</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">PUBLICATION *</Label><Input value={newPaidPR.publication} onChange={e => setNewPaidPR({...newPaidPR, publication: e.target.value})} placeholder="Vogue India" className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">PACKAGE TYPE</Label><Input value={newPaidPR.package_type} onChange={e => setNewPaidPR({...newPaidPR, package_type: e.target.value})} placeholder="Brand Feature" className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">COST (₹)</Label><Input type="number" value={newPaidPR.cost} onChange={e => setNewPaidPR({...newPaidPR, cost: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">DELIVERABLES</Label><Textarea rows={3} value={newPaidPR.deliverables} onChange={e => setNewPaidPR({...newPaidPR, deliverables: e.target.value})} placeholder="Article, Instagram story, etc." className="mt-1" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-gray-500">CAMPAIGN</Label><Select value={newPaidPR.pr_campaign_id} onValueChange={v => setNewPaidPR({...newPaidPR, pr_campaign_id: v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Link campaign" /></SelectTrigger><SelectContent><SelectItem value="">None</SelectItem>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={() => setShowPaidPRModal(false)}>Cancel</Button><Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white">Save</Button></div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Paid PR Summary */}
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center text-gray-500">
              <DollarSign className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No paid PR collaborations recorded</p>
              <p className="text-sm">Track paid collaborations with publications</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DigitalPRPage;
