import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  FileText, Newspaper, Send, Plus, ExternalLink, Clock, CheckCircle,
  TrendingUp, Eye, ThumbsUp, RefreshCw, Search, Filter,
  User, Mail, Phone, Globe, Building2, Briefcase, Star, Edit2, Trash2,
  ChevronUp, ChevronDown, Users, BookOpen, AtSign, Linkedin
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
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
  
  // Media Database state
  const [journalists, setJournalists] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBeat, setFilterBeat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  // Press Releases state
  const [releases, setReleases] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  
  // Forms
  const [newContact, setNewContact] = useState({
    name: '', email: '', phone: '', publication: '', publication_website: '',
    beat: 'Fashion', editor_level: 'staff', twitter_handle: '', linkedin_url: '',
    domain_authority: '', monthly_traffic: '', preferred_contact_method: 'email',
    city: '', country: 'India', notes: ''
  });
  
  const [newRelease, setNewRelease] = useState({
    title: '', subtitle: '', body: '', boilerplate: '', target_publications: ''
  });
  
  const [newCoverage, setNewCoverage] = useState({
    title: '', publication: '', url: '', coverage_type: 'article', 
    sentiment: 'positive', published_date: '', reach: '', contact_id: ''
  });
  
  const [newPitch, setNewPitch] = useState({
    contact_id: '', subject: '', message: '', press_release_id: ''
  });

  // Fetch journalists/media contacts
  const fetchJournalists = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const response = await api.get('/marketing/v2/contacts', {
        params: { contact_type: 'journalist', limit: 200 }
      });
      setJournalists(response.data || []);
    } catch (error) {
      console.error('Failed to fetch journalists:', error);
      toast.error('Failed to load media contacts');
    } finally {
      setLoadingContacts(false);
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchJournalists(), fetchReleases(), fetchCoverage(), fetchPitches()]);
      setLoading(false);
    };
    loadData();
  }, [fetchJournalists, fetchReleases, fetchCoverage, fetchPitches]);

  // Contact CRUD handlers
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
        toast.success('Contact added to media database');
      }
      
      setShowAddContactModal(false);
      setEditingContact(null);
      resetContactForm();
      fetchJournalists();
    } catch (error) {
      toast.error(editingContact ? 'Failed to update contact' : 'Failed to create contact');
    }
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setNewContact({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      publication: contact.publication || '',
      publication_website: contact.publication_website || '',
      beat: contact.beat || 'Fashion',
      editor_level: contact.editor_level || 'staff',
      twitter_handle: contact.twitter_handle || '',
      linkedin_url: contact.linkedin_url || '',
      domain_authority: contact.domain_authority?.toString() || '',
      monthly_traffic: contact.monthly_traffic?.toString() || '',
      preferred_contact_method: contact.preferred_contact_method || 'email',
      city: contact.city || '',
      country: contact.country || 'India',
      notes: contact.notes || ''
    });
    setShowAddContactModal(true);
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      await api.delete(`/marketing/v2/contacts/${contactId}`);
      toast.success('Contact deleted');
      fetchJournalists();
    } catch (error) {
      toast.error('Failed to delete contact');
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

  // Press Release handlers
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

  // Coverage handlers
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

  // Pitch handlers
  const handleCreatePitch = async () => {
    if (!newPitch.contact_id || !newPitch.subject || !newPitch.message) {
      toast.error('Please select a contact and fill in the subject and message');
      return;
    }
    
    try {
      await api.post('/marketing/v2/pr/pitches', newPitch);
      toast.success('Pitch created');
      setShowPitchModal(false);
      setNewPitch({ contact_id: '', subject: '', message: '', press_release_id: '' });
      fetchPitches();
    } catch (error) {
      toast.error('Failed to create pitch');
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

  // Filtered and sorted journalists
  const filteredJournalists = journalists
    .filter(j => {
      if (filterBeat !== 'all' && j.beat?.toLowerCase() !== filterBeat.toLowerCase()) return false;
      if (filterStatus !== 'all' && j.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          j.name?.toLowerCase().includes(query) ||
          j.email?.toLowerCase().includes(query) ||
          j.publication?.toLowerCase().includes(query) ||
          j.beat?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'score') { aVal = a.score || 0; bVal = b.score || 0; }
      else if (sortBy === 'domain_authority') { aVal = a.domain_authority || 0; bVal = b.domain_authority || 0; }
      else if (sortBy === 'name') { aVal = a.name || ''; bVal = b.name || ''; return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal); }
      else { aVal = a.created_at || ''; bVal = b.created_at || ''; }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  // Stats
  const totalContacts = journalists.length;
  const identifiedContacts = journalists.filter(j => j.status === 'identified').length;
  const contactedContacts = journalists.filter(j => j.status === 'contacted').length;
  const totalReleases = releases.length;
  const distributedReleases = releases.filter(r => r.status === 'distributed' || r.status === 'published').length;
  const totalCoverage = coverage.length;
  const positiveCoverage = coverage.filter(c => c.sentiment === 'positive').length;
  const totalPitches = pitches.length;
  const respondedPitches = pitches.filter(p => p.status === 'responded' || p.status === 'interested').length;

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="p-8 space-y-6" data-testid="digital-pr-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Digital PR Platform</h1>
          <p className="text-[#5D4A3A] mt-1">Manage media contacts, press releases, and track coverage</p>
        </div>
        <Button onClick={() => { setLoading(true); Promise.all([fetchJournalists(), fetchReleases(), fetchCoverage(), fetchPitches()]).then(() => setLoading(false)); }} variant="outline" className="border-[#E8D5C4]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#E8D5C4]" data-testid="stat-media-contacts">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{totalContacts}</div>
                <div className="text-sm text-[#5D4A3A]">Media Contacts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]" data-testid="stat-press-releases">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{totalReleases}</div>
                <div className="text-sm text-[#5D4A3A]">Press Releases</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]" data-testid="stat-coverage">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{totalCoverage}</div>
                <div className="text-sm text-[#5D4A3A]">Media Coverage</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]" data-testid="stat-pitches">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{respondedPitches}/{totalPitches}</div>
                <div className="text-sm text-[#5D4A3A]">Pitches Responded</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5EDE5]">
          <TabsTrigger value="media-database" data-testid="tab-media-database">
            <Users className="w-4 h-4 mr-2" /> Media Database
          </TabsTrigger>
          <TabsTrigger value="releases" data-testid="tab-releases">
            <FileText className="w-4 h-4 mr-2" /> Press Releases
          </TabsTrigger>
          <TabsTrigger value="coverage" data-testid="tab-coverage">
            <Newspaper className="w-4 h-4 mr-2" /> Coverage
          </TabsTrigger>
          <TabsTrigger value="pitches" data-testid="tab-pitches">
            <Send className="w-4 h-4 mr-2" /> Outreach
          </TabsTrigger>
        </TabsList>

        {/* Media Database Tab */}
        <TabsContent value="media-database" className="space-y-4" data-testid="media-database-content">
          {/* Filters and Actions */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5D4A3A]" />
                <Input 
                  placeholder="Search contacts..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 border-[#E8D5C4]"
                  data-testid="search-contacts"
                />
              </div>
              <Select value={filterBeat} onValueChange={setFilterBeat}>
                <SelectTrigger className="w-40 border-[#E8D5C4]" data-testid="filter-beat">
                  <SelectValue placeholder="Filter by Beat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Beats</SelectItem>
                  {BEAT_OPTIONS.map(beat => (
                    <SelectItem key={beat} value={beat.toLowerCase()}>{beat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 border-[#E8D5C4]" data-testid="filter-status">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="identified">Identified</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={showAddContactModal} onOpenChange={(open) => { setShowAddContactModal(open); if (!open) { setEditingContact(null); resetContactForm(); } }}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800" data-testid="add-contact-btn">
                  <Plus className="w-4 h-4 mr-2" /> Add Media Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingContact ? 'Edit Media Contact' : 'Add Media Contact'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2">
                    <Label>Name *</Label>
                    <Input 
                      value={newContact.name} 
                      onChange={(e) => setNewContact({...newContact, name: e.target.value})} 
                      placeholder="Full name"
                      data-testid="contact-name-input"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={newContact.email} 
                      onChange={(e) => setNewContact({...newContact, email: e.target.value})} 
                      placeholder="journalist@publication.com"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input 
                      value={newContact.phone} 
                      onChange={(e) => setNewContact({...newContact, phone: e.target.value})} 
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <Label>Publication *</Label>
                    <Input 
                      value={newContact.publication} 
                      onChange={(e) => setNewContact({...newContact, publication: e.target.value})} 
                      placeholder="Vogue India"
                      data-testid="contact-publication-input"
                    />
                  </div>
                  <div>
                    <Label>Publication Website</Label>
                    <Input 
                      value={newContact.publication_website} 
                      onChange={(e) => setNewContact({...newContact, publication_website: e.target.value})} 
                      placeholder="https://vogue.in"
                    />
                  </div>
                  <div>
                    <Label>Beat / Coverage Area</Label>
                    <Select value={newContact.beat} onValueChange={(v) => setNewContact({...newContact, beat: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BEAT_OPTIONS.map(beat => (
                          <SelectItem key={beat} value={beat}>{beat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Role / Level</Label>
                    <Select value={newContact.editor_level} onValueChange={(v) => setNewContact({...newContact, editor_level: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EDITOR_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Twitter Handle</Label>
                    <Input 
                      value={newContact.twitter_handle} 
                      onChange={(e) => setNewContact({...newContact, twitter_handle: e.target.value})} 
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <Label>LinkedIn URL</Label>
                    <Input 
                      value={newContact.linkedin_url} 
                      onChange={(e) => setNewContact({...newContact, linkedin_url: e.target.value})} 
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <Label>Domain Authority (1-100)</Label>
                    <Input 
                      type="number"
                      min="1" max="100"
                      value={newContact.domain_authority} 
                      onChange={(e) => setNewContact({...newContact, domain_authority: e.target.value})} 
                      placeholder="65"
                    />
                  </div>
                  <div>
                    <Label>Monthly Traffic</Label>
                    <Input 
                      type="number"
                      value={newContact.monthly_traffic} 
                      onChange={(e) => setNewContact({...newContact, monthly_traffic: e.target.value})} 
                      placeholder="1000000"
                    />
                  </div>
                  <div>
                    <Label>Preferred Contact Method</Label>
                    <Select value={newContact.preferred_contact_method} onValueChange={(v) => setNewContact({...newContact, preferred_contact_method: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="twitter">Twitter DM</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input 
                      value={newContact.city} 
                      onChange={(e) => setNewContact({...newContact, city: e.target.value})} 
                      placeholder="Mumbai"
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input 
                      value={newContact.country} 
                      onChange={(e) => setNewContact({...newContact, country: e.target.value})} 
                      placeholder="India"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea 
                      rows={3}
                      value={newContact.notes} 
                      onChange={(e) => setNewContact({...newContact, notes: e.target.value})} 
                      placeholder="Any additional notes about this contact..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowAddContactModal(false); setEditingContact(null); resetContactForm(); }}>Cancel</Button>
                  <Button onClick={handleCreateContact} className="bg-amber-700 hover:bg-amber-800" data-testid="save-contact-btn">
                    {editingContact ? 'Update' : 'Add Contact'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="border-[#E8D5C4] cursor-pointer hover:bg-gray-50" onClick={() => setFilterStatus('all')}>
              <CardContent className="py-3 text-center">
                <div className="text-xl font-bold text-[#4A3728]">{totalContacts}</div>
                <div className="text-xs text-[#5D4A3A]">Total</div>
              </CardContent>
            </Card>
            <Card className={`border-[#E8D5C4] cursor-pointer hover:bg-gray-50 ${filterStatus === 'identified' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setFilterStatus('identified')}>
              <CardContent className="py-3 text-center">
                <div className="text-xl font-bold text-gray-600">{identifiedContacts}</div>
                <div className="text-xs text-[#5D4A3A]">Identified</div>
              </CardContent>
            </Card>
            <Card className={`border-[#E8D5C4] cursor-pointer hover:bg-gray-50 ${filterStatus === 'contacted' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setFilterStatus('contacted')}>
              <CardContent className="py-3 text-center">
                <div className="text-xl font-bold text-blue-600">{contactedContacts}</div>
                <div className="text-xs text-[#5D4A3A]">Contacted</div>
              </CardContent>
            </Card>
            <Card className={`border-[#E8D5C4] cursor-pointer hover:bg-gray-50 ${filterStatus === 'interested' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setFilterStatus('interested')}>
              <CardContent className="py-3 text-center">
                <div className="text-xl font-bold text-green-600">{journalists.filter(j => j.status === 'interested').length}</div>
                <div className="text-xs text-[#5D4A3A]">Interested</div>
              </CardContent>
            </Card>
          </div>

          {/* Contacts Table */}
          {loadingContacts ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-[#4A3728]" />
            </div>
          ) : filteredJournalists.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No media contacts found</h3>
                <p className="text-[#5D4A3A]">
                  {searchQuery || filterBeat !== 'all' || filterStatus !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Add your first journalist or publication contact'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[#E8D5C4]">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="contacts-table">
                  <thead className="bg-[#F5EDE5]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase tracking-wider">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase tracking-wider">Publication</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase tracking-wider">Beat</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('domain_authority')}>
                        <div className="flex items-center gap-1">
                          DA {sortBy === 'domain_authority' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#5D4A3A] uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('score')}>
                        <div className="flex items-center gap-1">
                          Score {sortBy === 'score' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#5D4A3A] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D5C4]">
                    {filteredJournalists.map((contact) => (
                      <tr key={contact.id} className="hover:bg-[#F5EDE5]/50" data-testid={`contact-row-${contact.id}`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                              <div className="font-medium text-[#4A3728]">{contact.name}</div>
                              <div className="text-sm text-[#5D4A3A] flex items-center gap-2">
                                {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-[#4A3728]">{contact.publication || '-'}</div>
                          {contact.editor_level && (
                            <div className="text-xs text-[#5D4A3A] capitalize">{contact.editor_level.replace('_', ' ')}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {contact.beat || 'General'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-[#4A3728]">
                            {contact.domain_authority ? `${contact.domain_authority}/100` : '-'}
                          </div>
                          {contact.monthly_traffic && (
                            <div className="text-xs text-[#5D4A3A]">{formatNumber(contact.monthly_traffic)} visits</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={STATUS_COLORS[contact.status] || STATUS_COLORS.identified}>
                            {contact.status || 'identified'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                            {contact.score?.toFixed(1) || '0.0'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditContact(contact)} data-testid={`edit-contact-${contact.id}`}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setNewPitch({ ...newPitch, contact_id: contact.id });
                              setShowPitchModal(true);
                            }} data-testid={`pitch-contact-${contact.id}`}>
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.id)} className="text-red-600 hover:text-red-700" data-testid={`delete-contact-${contact.id}`}>
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

        {/* Press Releases Tab */}
        <TabsContent value="releases" className="space-y-4" data-testid="releases-content">
          <div className="flex justify-end">
            <Dialog open={showReleaseModal} onOpenChange={setShowReleaseModal}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800" data-testid="new-release-btn">
                  <Plus className="w-4 h-4 mr-2" /> New Press Release
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Create Press Release</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={newRelease.title} onChange={e => setNewRelease({...newRelease, title: e.target.value})} placeholder="Headline" />
                  </div>
                  <div>
                    <Label>Subtitle</Label>
                    <Input value={newRelease.subtitle} onChange={e => setNewRelease({...newRelease, subtitle: e.target.value})} placeholder="Subheadline" />
                  </div>
                  <div>
                    <Label>Body *</Label>
                    <Textarea rows={6} value={newRelease.body} onChange={e => setNewRelease({...newRelease, body: e.target.value})} placeholder="Press release content..." />
                  </div>
                  <div>
                    <Label>Boilerplate</Label>
                    <Textarea rows={3} value={newRelease.boilerplate} onChange={e => setNewRelease({...newRelease, boilerplate: e.target.value})} placeholder="About the company..." />
                  </div>
                  <div>
                    <Label>Target Publications (comma-separated)</Label>
                    <Input value={newRelease.target_publications} onChange={e => setNewRelease({...newRelease, target_publications: e.target.value})} placeholder="Vogue India, Elle India, Femina" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowReleaseModal(false)}>Cancel</Button>
                  <Button onClick={handleCreateRelease} className="bg-amber-700 hover:bg-amber-800" data-testid="create-release-btn">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-[#4A3728]" /></div>
          ) : releases.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No press releases yet</h3>
                <p className="text-[#5D4A3A]">Create your first press release</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {releases.map(release => (
                <Card key={release.id} className="border-[#E8D5C4]" data-testid={`release-${release.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={STATUS_COLORS[release.status]}>{release.status}</Badge>
                          {release.coverage_count > 0 && (
                            <Badge variant="outline" className="bg-green-50">
                              <Newspaper className="w-3 h-3 mr-1" /> {release.coverage_count} coverage
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-[#4A3728] text-lg">{release.title}</h3>
                        {release.subtitle && <p className="text-[#5D4A3A] mt-1">{release.subtitle}</p>}
                        <p className="text-sm text-[#5D4A3A] mt-2 line-clamp-2">{release.body}</p>
                        {release.target_publications?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {release.target_publications.map((pub, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{pub}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-[#5D4A3A]">
                        {formatDate(release.created_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Media Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4" data-testid="coverage-content">
          <div className="flex justify-end">
            <Dialog open={showCoverageModal} onOpenChange={setShowCoverageModal}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800" data-testid="record-coverage-btn">
                  <Plus className="w-4 h-4 mr-2" /> Record Coverage
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Media Coverage</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={newCoverage.title} onChange={e => setNewCoverage({...newCoverage, title: e.target.value})} placeholder="Article title" />
                  </div>
                  <div>
                    <Label>Publication *</Label>
                    <Input value={newCoverage.publication} onChange={e => setNewCoverage({...newCoverage, publication: e.target.value})} placeholder="Vogue India" />
                  </div>
                  <div>
                    <Label>URL *</Label>
                    <Input value={newCoverage.url} onChange={e => setNewCoverage({...newCoverage, url: e.target.value})} placeholder="https://..." />
                  </div>
                  <div>
                    <Label>Link to Journalist (optional)</Label>
                    <Select value={newCoverage.contact_id} onValueChange={v => setNewCoverage({...newCoverage, contact_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select journalist..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No journalist linked</SelectItem>
                        {journalists.map(j => (
                          <SelectItem key={j.id} value={j.id}>{j.name} - {j.publication}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Coverage Type</Label>
                      <Select value={newCoverage.coverage_type} onValueChange={v => setNewCoverage({...newCoverage, coverage_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="mention">Mention</SelectItem>
                          <SelectItem value="feature">Feature</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
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
                      <Label>Published Date</Label>
                      <Input type="date" value={newCoverage.published_date} onChange={e => setNewCoverage({...newCoverage, published_date: e.target.value})} />
                    </div>
                    <div>
                      <Label>Estimated Reach</Label>
                      <Input type="number" value={newCoverage.reach} onChange={e => setNewCoverage({...newCoverage, reach: e.target.value})} placeholder="1000000" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCoverageModal(false)}>Cancel</Button>
                  <Button onClick={handleRecordCoverage} className="bg-amber-700 hover:bg-amber-800" data-testid="save-coverage-btn">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {coverage.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Newspaper className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No coverage recorded yet</h3>
                <p className="text-[#5D4A3A]">Track your media mentions and features</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {coverage.map(item => (
                <Card key={item.id} className="border-[#E8D5C4]" data-testid={`coverage-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{item.coverage_type}</Badge>
                          <Badge className={SENTIMENT_COLORS[item.sentiment]}>{item.sentiment}</Badge>
                          {item.contact_name && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              <User className="w-3 h-3 mr-1" />{item.contact_name}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-[#4A3728]">{item.title}</h3>
                        <p className="text-sm text-[#5D4A3A]">{item.publication}</p>
                      </div>
                      <div className="text-right">
                        {item.reach && (
                          <div className="flex items-center gap-1 text-sm text-[#5D4A3A]">
                            <Eye className="w-4 h-4" /> {formatNumber(item.reach)} reach
                          </div>
                        )}
                        <div className="text-xs text-[#5D4A3A] mt-1">{formatDate(item.published_date)}</div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1 justify-end">
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PR Outreach Tab */}
        <TabsContent value="pitches" className="space-y-4" data-testid="pitches-content">
          <div className="flex justify-end">
            <Dialog open={showPitchModal} onOpenChange={setShowPitchModal}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800" data-testid="new-pitch-btn">
                  <Plus className="w-4 h-4 mr-2" /> New Pitch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create PR Pitch</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Select Contact *</Label>
                    <Select value={newPitch.contact_id} onValueChange={v => setNewPitch({...newPitch, contact_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Choose a journalist..." /></SelectTrigger>
                      <SelectContent>
                        {journalists.map(j => (
                          <SelectItem key={j.id} value={j.id}>{j.name} - {j.publication}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Link to Press Release (optional)</Label>
                    <Select value={newPitch.press_release_id} onValueChange={v => setNewPitch({...newPitch, press_release_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select press release..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No press release</SelectItem>
                        {releases.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject *</Label>
                    <Input value={newPitch.subject} onChange={e => setNewPitch({...newPitch, subject: e.target.value})} placeholder="Pitch subject line" />
                  </div>
                  <div>
                    <Label>Message *</Label>
                    <Textarea rows={6} value={newPitch.message} onChange={e => setNewPitch({...newPitch, message: e.target.value})} placeholder="Your pitch message..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowPitchModal(false)}>Cancel</Button>
                  <Button onClick={handleCreatePitch} className="bg-amber-700 hover:bg-amber-800" data-testid="send-pitch-btn">Create Pitch</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {pitches.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Send className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No pitches yet</h3>
                <p className="text-[#5D4A3A]">Start pitching to journalists from your media database</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pitches.map(pitch => (
                <Card key={pitch.id} className="border-[#E8D5C4]" data-testid={`pitch-${pitch.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={STATUS_COLORS[pitch.status]}>{pitch.status}</Badge>
                        </div>
                        <h3 className="font-medium text-[#4A3728]">{pitch.subject}</h3>
                        <p className="text-sm text-[#5D4A3A]">To: {pitch.contact_name} {pitch.publication && `• ${pitch.publication}`}</p>
                        <p className="text-sm text-[#5D4A3A] mt-2 line-clamp-2">{pitch.message}</p>
                      </div>
                      <div className="text-xs text-[#5D4A3A]">
                        {formatDate(pitch.sent_at || pitch.created_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DigitalPRPage;
