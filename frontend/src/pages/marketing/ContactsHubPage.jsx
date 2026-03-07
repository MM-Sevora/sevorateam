import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Search, Plus, Users, Star, MapPin, Instagram, Youtube, Twitter, Linkedin,
  Filter, Mail, Phone, Building2, Newspaper, PenTool, RefreshCw
} from 'lucide-react';

const CONTACT_TYPES = [
  { value: 'influencer', label: 'Influencer', icon: Users, color: 'bg-purple-100 text-purple-700' },
  { value: 'journalist', label: 'Journalist', icon: Newspaper, color: 'bg-blue-100 text-blue-700' },
  { value: 'blogger', label: 'Blogger', icon: PenTool, color: 'bg-green-100 text-green-700' },
  { value: 'hybrid', label: 'Hybrid', icon: Star, color: 'bg-amber-100 text-amber-700' },
];

const TIER_COLORS = {
  nano: 'bg-gray-100 text-gray-700',
  micro: 'bg-blue-100 text-blue-700',
  macro: 'bg-amber-100 text-amber-700',
  mega: 'bg-rose-100 text-rose-700',
  celebrity: 'bg-yellow-100 text-yellow-700'
};

const STATUS_COLORS = {
  identified: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  interested: 'bg-green-100 text-green-700',
  negotiating: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-red-100 text-red-700',
};

const ContactsHubPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState(null);
  
  const [newContact, setNewContact] = useState({
    name: '',
    contact_type: 'influencer',
    email: '',
    phone: '',
    instagram_handle: '',
    youtube_handle: '',
    twitter_handle: '',
    linkedin_url: '',
    city: '',
    country: 'India',
    industry: 'fashion',
    primary_platform: 'instagram',
    tier: 'micro',
    followers: 0,
    engagement_rate: 0,
    rate_per_post: '',
    rate_per_reel: '',
    publication: '',
    beat: '',
    editor_level: '',
    bio: '',
    notes: '',
  });

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterType !== 'all') params.append('contact_type', filterType);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const response = await api.get(`/marketing/v2/contacts?${params.toString()}`);
      setContacts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [api, search, filterType, filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [fetchContacts, fetchStats]);

  const handleAddContact = async () => {
    try {
      const contactData = {
        ...newContact,
        followers: parseInt(newContact.followers) || 0,
        engagement_rate: parseFloat(newContact.engagement_rate) || 0,
        rate_per_post: newContact.rate_per_post ? parseFloat(newContact.rate_per_post) : null,
        rate_per_reel: newContact.rate_per_reel ? parseFloat(newContact.rate_per_reel) : null,
      };
      
      await api.post('/marketing/v2/contacts', contactData);
      toast.success('Contact added successfully');
      setShowAddModal(false);
      setNewContact({
        name: '', contact_type: 'influencer', email: '', phone: '', instagram_handle: '',
        youtube_handle: '', twitter_handle: '', linkedin_url: '', city: '', country: 'India',
        industry: 'fashion', primary_platform: 'instagram', tier: 'micro', followers: 0,
        engagement_rate: 0, rate_per_post: '', rate_per_reel: '', publication: '', beat: '',
        editor_level: '', bio: '', notes: '',
      });
      fetchContacts();
      fetchStats();
    } catch (error) {
      toast.error('Failed to add contact');
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const getContactTypeConfig = (type) => CONTACT_TYPES.find(t => t.value === type) || CONTACT_TYPES[0];

  return (
    <div className="p-8 space-y-6" data-testid="contacts-hub-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Contacts Hub</h1>
          <p className="text-[#5D4A3A] mt-1">Unified database of influencers, journalists & bloggers</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-amber-700 hover:bg-amber-800" data-testid="add-contact-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Contact Type</Label>
                <Select value={newContact.contact_type} onValueChange={v => setNewContact({...newContact, contact_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Full name" />
              </div>
              
              <div>
                <Label>Email</Label>
                <Input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="email@example.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="+91 98765 43210" />
              </div>

              {/* Social handles */}
              <div>
                <Label>Instagram</Label>
                <Input value={newContact.instagram_handle} onChange={e => setNewContact({...newContact, instagram_handle: e.target.value})} placeholder="@handle" />
              </div>
              <div>
                <Label>YouTube</Label>
                <Input value={newContact.youtube_handle} onChange={e => setNewContact({...newContact, youtube_handle: e.target.value})} placeholder="@channel" />
              </div>

              <div>
                <Label>City</Label>
                <Input value={newContact.city} onChange={e => setNewContact({...newContact, city: e.target.value})} placeholder="Mumbai" />
              </div>
              <div>
                <Label>Industry</Label>
                <Select value={newContact.industry} onValueChange={v => setNewContact({...newContact, industry: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Influencer-specific fields */}
              {(newContact.contact_type === 'influencer' || newContact.contact_type === 'hybrid') && (
                <>
                  <div>
                    <Label>Tier</Label>
                    <Select value={newContact.tier} onValueChange={v => setNewContact({...newContact, tier: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nano">Nano (&lt;10K)</SelectItem>
                        <SelectItem value="micro">Micro (10K-100K)</SelectItem>
                        <SelectItem value="macro">Macro (100K-1M)</SelectItem>
                        <SelectItem value="mega">Mega (1M-10M)</SelectItem>
                        <SelectItem value="celebrity">Celebrity (10M+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Followers</Label>
                    <Input type="number" value={newContact.followers} onChange={e => setNewContact({...newContact, followers: e.target.value})} placeholder="150000" />
                  </div>
                  <div>
                    <Label>Engagement Rate (%)</Label>
                    <Input type="number" step="0.1" value={newContact.engagement_rate} onChange={e => setNewContact({...newContact, engagement_rate: e.target.value})} placeholder="4.5" />
                  </div>
                  <div>
                    <Label>Rate per Reel (₹)</Label>
                    <Input type="number" value={newContact.rate_per_reel} onChange={e => setNewContact({...newContact, rate_per_reel: e.target.value})} placeholder="25000" />
                  </div>
                </>
              )}

              {/* Journalist/Blogger-specific fields */}
              {(newContact.contact_type === 'journalist' || newContact.contact_type === 'blogger' || newContact.contact_type === 'hybrid') && (
                <>
                  <div>
                    <Label>Publication</Label>
                    <Input value={newContact.publication} onChange={e => setNewContact({...newContact, publication: e.target.value})} placeholder="Vogue India" />
                  </div>
                  <div>
                    <Label>Beat/Focus</Label>
                    <Input value={newContact.beat} onChange={e => setNewContact({...newContact, beat: e.target.value})} placeholder="Fashion, Lifestyle" />
                  </div>
                  <div>
                    <Label>Editor Level</Label>
                    <Select value={newContact.editor_level} onValueChange={v => setNewContact({...newContact, editor_level: v})}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff Writer</SelectItem>
                        <SelectItem value="senior">Senior Writer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="senior_editor">Senior Editor</SelectItem>
                        <SelectItem value="editor_in_chief">Editor-in-Chief</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="col-span-2">
                <Label>Notes</Label>
                <Input value={newContact.notes} onChange={e => setNewContact({...newContact, notes: e.target.value})} placeholder="Additional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddContact} className="bg-amber-700 hover:bg-amber-800">Add Contact</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="border-[#E8D5C4]">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-[#4A3728]">{stats.contacts.total}</div>
              <div className="text-sm text-[#5D4A3A]">Total Contacts</div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-700">{stats.contacts.influencers}</div>
              <div className="text-sm text-purple-600">Influencers</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-700">{stats.contacts.journalists}</div>
              <div className="text-sm text-blue-600">Journalists</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-700">{stats.contacts.bloggers}</div>
              <div className="text-sm text-green-600">Bloggers</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-700">{stats.deals.active}</div>
              <div className="text-sm text-amber-600">Active Deals</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5D4A3A]" />
          <Input 
            className="pl-10 border-[#E8D5C4]" 
            placeholder="Search contacts..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] border-[#E8D5C4]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONTACT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px] border-[#E8D5C4]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="identified">Identified</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="negotiating">Negotiating</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchContacts} className="border-[#E8D5C4]">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-[#4A3728]" />
        </div>
      ) : contacts.length === 0 ? (
        <Card className="border-[#E8D5C4]">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
            <h3 className="text-lg font-medium text-[#4A3728]">No contacts found</h3>
            <p className="text-[#5D4A3A]">Add your first contact to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map(contact => {
            const typeConfig = getContactTypeConfig(contact.contact_type);
            return (
              <Card 
                key={contact.id} 
                className="border-[#E8D5C4] hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/marketing/contacts/${contact.id}`)}
                data-testid={`contact-card-${contact.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeConfig.color}`}>
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#4A3728]">{contact.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-[#5D4A3A]">
                          {contact.instagram_handle && (
                            <span className="flex items-center gap-1">
                              <Instagram className="w-3 h-3" /> {contact.instagram_handle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-medium">{contact.score}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                    {contact.tier && <Badge className={TIER_COLORS[contact.tier] || TIER_COLORS.micro}>{contact.tier}</Badge>}
                    <Badge className={STATUS_COLORS[contact.status] || STATUS_COLORS.identified}>{contact.status}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {contact.followers > 0 && (
                      <div>
                        <div className="font-semibold text-[#4A3728]">{formatNumber(contact.followers)}</div>
                        <div className="text-xs text-[#5D4A3A]">Followers</div>
                      </div>
                    )}
                    {contact.engagement_rate > 0 && (
                      <div>
                        <div className="font-semibold text-[#4A3728]">{contact.engagement_rate}%</div>
                        <div className="text-xs text-[#5D4A3A]">Engagement</div>
                      </div>
                    )}
                    {contact.publication && (
                      <div className="col-span-3 text-left">
                        <div className="flex items-center gap-1 text-[#5D4A3A]">
                          <Building2 className="w-3 h-3" />
                          <span className="text-xs">{contact.publication}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {contact.city && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-[#5D4A3A]">
                      <MapPin className="w-3 h-3" /> {contact.city}, {contact.country}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContactsHubPage;
