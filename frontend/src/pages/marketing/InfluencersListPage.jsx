import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { 
  RefreshCw, Plus, Search, Filter, Instagram, Youtube, 
  MoreHorizontal, Users, Sparkles, ChevronUp, ChevronDown, Download, User, AtSign, DollarSign, Building
} from 'lucide-react';

const InfluencersListPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState('basic');
  const [fetching, setFetching] = useState({ instagram: false, youtube: false });
  const [statusCounts, setStatusCounts] = useState({
    identified: 0, contacted: 0, interested: 0, negotiation: 0, confirmed: 0, completed: 0
  });
  
  const [newInfluencer, setNewInfluencer] = useState({
    name: '', gender: 'not_specified', city: '', industry: 'fashion', tier: 'micro',
    audience_focus: 'unisex', email: '', phone: '', bio: '', style_tags: '',
    instagram_handle: '', youtube_handle: '', primary_platform: 'instagram',
    followers: '', engagement_rate: '', avg_likes: '', avg_comments: '',
    rate_per_post: '', rate_per_reel: '', rate_per_story: '', rate_per_youtube: '',
    manager_name: '', manager_email: '', manager_phone: '', agency: '',
    turnaround_days: '', payment_terms: 'not_specified', exclusivity_terms: '',
    accepts_barter: false, notes: ''
  });

  const fetchInfluencers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/marketing/v2/contacts', {
        params: { contact_type: 'influencer', limit: 100 }
      });
      const data = response.data || [];
      setInfluencers(data);
      
      const counts = { identified: 0, contacted: 0, interested: 0, negotiation: 0, confirmed: 0, completed: 0 };
      data.forEach(inf => {
        const status = inf.status?.toLowerCase() || 'identified';
        if (counts[status] !== undefined) counts[status]++;
        else counts.identified++;
      });
      setStatusCounts(counts);
    } catch (error) {
      toast.error('Failed to load influencers');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  const handleFetchSocial = async (platform) => {
    const handle = platform === 'instagram' ? newInfluencer.instagram_handle : newInfluencer.youtube_handle;
    if (!handle) {
      toast.error(`Please enter ${platform} handle first`);
      return;
    }
    
    setFetching(prev => ({ ...prev, [platform]: true }));
    toast.info(`Fetching ${platform} data...`);
    
    try {
      const endpoint = platform === 'instagram' ? 'profile' : 'channel';
      const response = await api.get(`/social-api/${platform}/${endpoint}/${handle.replace('@', '')}`);
      const data = response.data;
      
      if (platform === 'instagram') {
        setNewInfluencer(prev => ({
          ...prev,
          followers: data.followers || prev.followers,
          engagement_rate: data.engagement_rate || prev.engagement_rate,
          avg_likes: data.avg_likes || prev.avg_likes,
          avg_comments: data.avg_comments || prev.avg_comments,
          bio: data.bio || prev.bio,
          name: data.name || prev.name
        }));
      } else {
        setNewInfluencer(prev => ({
          ...prev,
          followers: data.subscribers || prev.followers,
          name: data.title || prev.name
        }));
      }
      toast.success(`${platform} data fetched!`);
    } catch (error) {
      toast.error(`Failed to fetch. API may not be configured.`);
    } finally {
      setFetching(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleFetchAll = async () => {
    if (newInfluencer.instagram_handle) await handleFetchSocial('instagram');
    if (newInfluencer.youtube_handle) await handleFetchSocial('youtube');
  };

  const handleAddInfluencer = async () => {
    if (!newInfluencer.name) {
      toast.error('Name is required');
      return;
    }
    try {
      await api.post('/marketing/v2/contacts', {
        ...newInfluencer,
        contact_type: 'influencer',
        status: 'identified',
        followers: parseInt(newInfluencer.followers) || 0,
        engagement_rate: parseFloat(newInfluencer.engagement_rate) || 0,
        avg_likes: parseInt(newInfluencer.avg_likes) || 0,
        avg_comments: parseInt(newInfluencer.avg_comments) || 0
      });
      toast.success('Influencer added');
      setShowAddModal(false);
      setNewInfluencer({
        name: '', gender: 'not_specified', city: '', industry: 'fashion', tier: 'micro',
        audience_focus: 'unisex', email: '', phone: '', bio: '', style_tags: '',
        instagram_handle: '', youtube_handle: '', primary_platform: 'instagram',
        followers: '', engagement_rate: '', avg_likes: '', avg_comments: '',
        rate_per_post: '', rate_per_reel: '', rate_per_story: '', rate_per_youtube: '',
        manager_name: '', manager_email: '', manager_phone: '', agency: '',
        turnaround_days: '', payment_terms: 'not_specified', exclusivity_terms: '',
        accepts_barter: false, notes: ''
      });
      setAddModalTab('basic');
      fetchInfluencers();
    } catch (error) {
      toast.error('Failed to add influencer');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/marketing/v2/contacts/${id}`, { status: newStatus });
      fetchInfluencers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleRefreshAll = async () => {
    toast.info('Refreshing influencer data...');
    await fetchInfluencers();
    toast.success('Data refreshed');
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getTierBadge = (followers) => {
    if (followers >= 1000000) return { label: 'Mega', color: 'bg-amber-100 text-amber-700' };
    if (followers >= 500000) return { label: 'Celebrity', color: 'bg-purple-100 text-purple-700' };
    if (followers >= 100000) return { label: 'Macro', color: 'bg-green-100 text-green-700' };
    if (followers >= 10000) return { label: 'Micro', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Nano', color: 'bg-gray-100 text-gray-700' };
  };

  const getPlatformBadge = (platform) => {
    if (platform === 'youtube') return { label: 'Youtube', color: 'bg-red-100 text-red-600', icon: Youtube };
    return { label: 'Instagram', color: 'bg-pink-100 text-pink-600', icon: Instagram };
  };

  const getStatusColor = (status) => {
    const colors = {
      identified: 'bg-gray-100 text-gray-700',
      contacted: 'bg-blue-100 text-blue-700',
      interested: 'bg-green-100 text-green-700',
      negotiation: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-purple-100 text-purple-700'
    };
    return colors[status?.toLowerCase()] || colors.identified;
  };

  const filteredInfluencers = influencers.filter(inf => {
    const matchesSearch = !searchQuery || 
      inf.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.instagram_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.youtube_handle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || inf.primary_platform === filterPlatform;
    return matchesSearch && matchesPlatform;
  }).sort((a, b) => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    if (sortBy === 'score') return multiplier * ((a.score || 0) - (b.score || 0));
    if (sortBy === 'followers') return multiplier * ((a.followers || 0) - (b.followers || 0));
    if (sortBy === 'engagement') return multiplier * ((a.engagement_rate || 0) - (b.engagement_rate || 0));
    return 0;
  });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortOrder === 'desc' ? 
      <ChevronDown className="w-3 h-3 text-gray-600" /> : 
      <ChevronUp className="w-3 h-3 text-gray-600" />;
  };

  const modalTabs = [
    { id: 'basic', label: 'Basic', icon: User },
    { id: 'social', label: 'Social', icon: AtSign },
    { id: 'audience', label: 'Audience', icon: Users },
    { id: 'manager', label: 'Manager', icon: Building },
    { id: 'rates', label: 'Rates', icon: DollarSign }
  ];

  return (
    <div className="p-8 space-y-6 bg-white min-h-screen" data-testid="influencers-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif italic text-gray-900">Influencers</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefreshAll} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh All
          </Button>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white gap-2">
                <Plus className="w-4 h-4" /> Add Influencer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif italic">Add Influencer</DialogTitle>
              </DialogHeader>
              
              {/* Quick Add Section */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Download className="w-4 h-4" />
                    <span className="font-medium">Quick Add - Fetch from Social Media</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleFetchAll}
                    className="bg-[#c4a35a] hover:bg-[#b39349] text-white"
                  >
                    <Download className="w-4 h-4 mr-2" /> Fetch All
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-3">Enter handles and click Fetch All, or fetch individually</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1">
                      <Instagram className="w-3 h-3 text-pink-500" /> INSTAGRAM HANDLE
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        placeholder="@nike" 
                        value={newInfluencer.instagram_handle}
                        onChange={e => setNewInfluencer({...newInfluencer, instagram_handle: e.target.value})}
                      />
                      <Button 
                        size="sm"
                        onClick={() => handleFetchSocial('instagram')}
                        disabled={fetching.instagram}
                        className="bg-pink-500 hover:bg-pink-600 text-white px-4"
                      >
                        {fetching.instagram ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Fetch'}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1">
                      <Youtube className="w-3 h-3 text-red-500" /> YOUTUBE HANDLE
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        placeholder="@mkbhd" 
                        value={newInfluencer.youtube_handle}
                        onChange={e => setNewInfluencer({...newInfluencer, youtube_handle: e.target.value})}
                      />
                      <Button 
                        size="sm"
                        onClick={() => handleFetchSocial('youtube')}
                        disabled={fetching.youtube}
                        className="bg-red-500 hover:bg-red-600 text-white px-4"
                      >
                        {fetching.youtube ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Fetch'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
                {modalTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setAddModalTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                        addModalTab === tab.id 
                          ? 'bg-gray-100 text-gray-900 font-medium' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto px-1">
                {/* Basic Tab */}
                {addModalTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">NAME *</Label>
                        <Input 
                          value={newInfluencer.name}
                          onChange={e => setNewInfluencer({...newInfluencer, name: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">GENDER</Label>
                        <Select value={newInfluencer.gender} onValueChange={v => setNewInfluencer({...newInfluencer, gender: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_specified">Not specified</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">CITY *</Label>
                        <Select value={newInfluencer.city || 'mumbai'} onValueChange={v => setNewInfluencer({...newInfluencer, city: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mumbai">Mumbai</SelectItem>
                            <SelectItem value="delhi">Delhi</SelectItem>
                            <SelectItem value="bangalore">Bangalore</SelectItem>
                            <SelectItem value="hyderabad">Hyderabad</SelectItem>
                            <SelectItem value="chennai">Chennai</SelectItem>
                            <SelectItem value="kolkata">Kolkata</SelectItem>
                            <SelectItem value="pune">Pune</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">INDUSTRY</Label>
                        <Select value={newInfluencer.industry} onValueChange={v => setNewInfluencer({...newInfluencer, industry: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fashion">Fashion</SelectItem>
                            <SelectItem value="beauty">Beauty</SelectItem>
                            <SelectItem value="lifestyle">Lifestyle</SelectItem>
                            <SelectItem value="tech">Tech</SelectItem>
                            <SelectItem value="food">Food</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="fitness">Fitness</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">TIER</Label>
                        <Select value={newInfluencer.tier} onValueChange={v => setNewInfluencer({...newInfluencer, tier: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nano">Nano</SelectItem>
                            <SelectItem value="micro">Micro</SelectItem>
                            <SelectItem value="macro">Macro</SelectItem>
                            <SelectItem value="mega">Mega</SelectItem>
                            <SelectItem value="celebrity">Celebrity</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">AUDIENCE FOCUS</Label>
                        <Select value={newInfluencer.audience_focus} onValueChange={v => setNewInfluencer({...newInfluencer, audience_focus: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unisex">Unisex</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">EMAIL</Label>
                        <Input 
                          type="email"
                          value={newInfluencer.email}
                          onChange={e => setNewInfluencer({...newInfluencer, email: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">PHONE</Label>
                        <Input 
                          value={newInfluencer.phone}
                          onChange={e => setNewInfluencer({...newInfluencer, phone: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">BIO</Label>
                      <Textarea 
                        placeholder="Influencer bio..."
                        value={newInfluencer.bio}
                        onChange={e => setNewInfluencer({...newInfluencer, bio: e.target.value})}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">STYLE TAGS</Label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          placeholder="Add tag"
                          value={newInfluencer.style_tags}
                          onChange={e => setNewInfluencer({...newInfluencer, style_tags: e.target.value})}
                        />
                        <Button variant="outline" size="icon"><Plus className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Tab */}
                {addModalTab === 'social' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">PRIMARY PLATFORM *</Label>
                      <Select value={newInfluencer.primary_platform} onValueChange={v => setNewInfluencer({...newInfluencer, primary_platform: v})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">📷 Instagram</SelectItem>
                          <SelectItem value="youtube">▶️ YouTube</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">The platform where this influencer has their main presence</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1">
                          <Instagram className="w-3 h-3 text-pink-500" /> INSTAGRAM
                          {newInfluencer.primary_platform === 'instagram' && (
                            <Badge className="bg-pink-100 text-pink-600 text-xs ml-1">PRIMARY</Badge>
                          )}
                        </Label>
                        <Input 
                          placeholder="@handle"
                          value={newInfluencer.instagram_handle}
                          onChange={e => setNewInfluencer({...newInfluencer, instagram_handle: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1">
                          <Youtube className="w-3 h-3 text-red-500" /> YOUTUBE
                          {newInfluencer.primary_platform === 'youtube' && (
                            <Badge className="bg-red-100 text-red-600 text-xs ml-1">PRIMARY</Badge>
                          )}
                        </Label>
                        <Input 
                          placeholder="@channel"
                          value={newInfluencer.youtube_handle}
                          onChange={e => setNewInfluencer({...newInfluencer, youtube_handle: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">FOLLOWERS</Label>
                        <Input 
                          type="number"
                          placeholder="50000"
                          value={newInfluencer.followers}
                          onChange={e => setNewInfluencer({...newInfluencer, followers: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">ENGAGEMENT %</Label>
                        <Input 
                          type="number"
                          step="0.1"
                          placeholder="4.5"
                          value={newInfluencer.engagement_rate}
                          onChange={e => setNewInfluencer({...newInfluencer, engagement_rate: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">AVG LIKES</Label>
                        <Input 
                          type="number"
                          placeholder="2500"
                          value={newInfluencer.avg_likes}
                          onChange={e => setNewInfluencer({...newInfluencer, avg_likes: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">AVG COMMENTS</Label>
                        <Input 
                          type="number"
                          placeholder="100"
                          value={newInfluencer.avg_comments}
                          onChange={e => setNewInfluencer({...newInfluencer, avg_comments: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Audience Tab */}
                {addModalTab === 'audience' && (
                  <div className="space-y-6">
                    {/* Instagram Audience */}
                    <div className="border border-pink-200 bg-pink-50/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Instagram className="w-5 h-5 text-pink-500" />
                        <span className="font-medium text-gray-900">Instagram Audience</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">AGE DISTRIBUTION</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['13-17', '18-24', '25-34', '35-44', '45-54', '55+'].map(age => (
                              <button key={age} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {age}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">GENDER DISTRIBUTION</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['Male', 'Female', 'Other'].map(gender => (
                              <button key={gender} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {gender}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">TOP CITIES</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Jaipur', 'Ahmedabad', 'Lucknow', 'Other Indian', 'International'].map(city => (
                              <button key={city} className={`px-3 py-1 border rounded text-sm hover:bg-gray-100 flex items-center gap-1 ${city === 'Other Indian' ? 'border-pink-400 text-pink-600' : 'border-gray-300'}`}>
                                <Plus className="w-3 h-3" /> {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* YouTube Audience */}
                    <div className="border border-red-200 bg-red-50/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Youtube className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-gray-900">YouTube Audience</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">AGE DISTRIBUTION</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['13-17', '18-24', '25-34', '35-44', '45-54', '55+'].map(age => (
                              <button key={`yt-${age}`} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {age}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">GENDER DISTRIBUTION</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['Male', 'Female', 'Other'].map(gender => (
                              <button key={`yt-${gender}`} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {gender}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">TOP CITIES</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Jaipur', 'Ahmedabad', 'Lucknow', 'Other Indian', 'International'].map(city => (
                              <button key={`yt-${city}`} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manager Tab */}
                {addModalTab === 'manager' && (
                  <div className="space-y-6">
                    <p className="text-gray-600">Contact details for influencer's manager or talent agency (if applicable).</p>
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">MANAGER / AGENT NAME</Label>
                      <Input 
                        placeholder="John Doe"
                        value={newInfluencer.manager_name}
                        onChange={e => setNewInfluencer({...newInfluencer, manager_name: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">MANAGER EMAIL</Label>
                        <Input 
                          type="email"
                          placeholder="manager@agency.com"
                          value={newInfluencer.manager_email}
                          onChange={e => setNewInfluencer({...newInfluencer, manager_email: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">MANAGER PHONE</Label>
                        <Input 
                          placeholder="+91 98765 43210"
                          value={newInfluencer.manager_phone}
                          onChange={e => setNewInfluencer({...newInfluencer, manager_phone: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-medium text-gray-900 mb-4">Commercial Terms</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-gray-500">TURNAROUND (DAYS)</Label>
                          <Input 
                            type="number"
                            placeholder="7"
                            value={newInfluencer.turnaround_days}
                            onChange={e => setNewInfluencer({...newInfluencer, turnaround_days: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-gray-500">PAYMENT TERMS</Label>
                          <Select 
                            value={newInfluencer.payment_terms || 'not_specified'} 
                            onValueChange={v => setNewInfluencer({...newInfluencer, payment_terms: v})}
                          >
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_specified">Not specified</SelectItem>
                              <SelectItem value="advance">100% Advance</SelectItem>
                              <SelectItem value="50_50">50% Advance, 50% After</SelectItem>
                              <SelectItem value="after_delivery">After Delivery</SelectItem>
                              <SelectItem value="net_30">Net 30</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Label className="text-xs uppercase tracking-wider text-gray-500">EXCLUSIVITY TERMS</Label>
                        <Textarea 
                          placeholder="e.g., No competing brand posts for 30 days"
                          value={newInfluencer.exclusivity_terms}
                          onChange={e => setNewInfluencer({...newInfluencer, exclusivity_terms: e.target.value})}
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Rates Tab */}
                {addModalTab === 'rates' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">PER POST (₹)</Label>
                        <Input 
                          type="number"
                          placeholder="15000"
                          value={newInfluencer.rate_per_post}
                          onChange={e => setNewInfluencer({...newInfluencer, rate_per_post: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">PER REEL (₹)</Label>
                        <Input 
                          type="number"
                          placeholder="25000"
                          value={newInfluencer.rate_per_reel}
                          onChange={e => setNewInfluencer({...newInfluencer, rate_per_reel: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">PER STORY (₹)</Label>
                        <Input 
                          type="number"
                          placeholder="5000"
                          value={newInfluencer.rate_per_story}
                          onChange={e => setNewInfluencer({...newInfluencer, rate_per_story: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 py-3 border-y border-gray-100">
                      <input 
                        type="checkbox"
                        checked={newInfluencer.accepts_barter || false}
                        onChange={e => setNewInfluencer({...newInfluencer, accepts_barter: e.target.checked})}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label className="mb-0">Accepts Barter</Label>
                    </div>
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">NOTES</Label>
                      <Textarea 
                        placeholder="e.g., Preferred payment method, special requirements..."
                        value={newInfluencer.notes}
                        onChange={e => setNewInfluencer({...newInfluencer, notes: e.target.value})}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button onClick={handleAddInfluencer} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
                  Add Influencer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'database' 
              ? 'border-[#c4a35a] text-gray-900 font-medium' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Database ({influencers.length})
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'discover' 
              ? 'border-[#c4a35a] text-gray-900 font-medium' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Discover
        </button>
      </div>

      {/* Status Funnel Cards */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { key: 'identified', label: 'Identified' },
          { key: 'contacted', label: 'Contacted' },
          { key: 'interested', label: 'Interested' },
          { key: 'negotiation', label: 'Negotiation' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'completed', label: 'Completed' }
        ].map(status => (
          <Card key={status.key} className="bg-gray-50 border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-light text-gray-900">{statusCounts[status.key]}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{status.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search name or handle..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
        <Button variant="outline">Search</Button>
      </div>

      {/* Results Count & Sort */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          Showing {filteredInfluencers.length} of {influencers.length} influencers
        </span>
        <span className="text-gray-600">
          Sorted by <button onClick={() => toggleSort('score')} className="text-[#c4a35a] font-medium">Score</button> ({sortOrder})
        </span>
      </div>

      {/* Influencers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-10 p-3">
                <Checkbox 
                  checked={selectedIds.length === filteredInfluencers.length && filteredInfluencers.length > 0}
                  onCheckedChange={(checked) => {
                    setSelectedIds(checked ? filteredInfluencers.map(i => i.id) : []);
                  }}
                />
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Influencer
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platform
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('followers')}>
                <span className="flex items-center gap-1">Followers <SortIcon field="followers" /></span>
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('engagement')}>
                <span className="flex items-center gap-1">Eng. % <SortIcon field="engagement" /></span>
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Industry
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gender
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('score')}>
                <span className="flex items-center gap-1">Score <SortIcon field="score" /></span>
              </th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </td>
              </tr>
            ) : filteredInfluencers.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-gray-500">
                  No influencers found
                </td>
              </tr>
            ) : (
              filteredInfluencers.map(inf => {
                const platform = getPlatformBadge(inf.primary_platform);
                const tier = getTierBadge(inf.followers);
                const PlatformIcon = platform.icon;
                
                return (
                  <tr 
                    key={inf.id} 
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/marketing/influencer/${inf.id}`)}
                  >
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedIds.includes(inf.id)}
                        onCheckedChange={(checked) => {
                          setSelectedIds(prev => 
                            checked ? [...prev, inf.id] : prev.filter(id => id !== inf.id)
                          );
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                          <PlatformIcon className="w-5 h-5 text-pink-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{inf.name}</div>
                          <div className="text-sm text-gray-500">
                            @{inf.instagram_handle || inf.youtube_handle || 'unknown'} • {inf.city || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`${platform.color} font-normal`}>{platform.label}</Badge>
                    </td>
                    <td className="p-3 text-gray-900 font-medium">
                      {formatNumber(inf.followers)}
                    </td>
                    <td className="p-3 text-gray-900">
                      {inf.engagement_rate?.toFixed(1) || '0.0'}%
                    </td>
                    <td className="p-3 text-gray-700 capitalize">
                      {inf.industry || '-'}
                    </td>
                    <td className="p-3">
                      <Badge className={`${tier.color} font-normal`}>{tier.label}</Badge>
                    </td>
                    <td className="p-3 text-gray-500">-</td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <Select 
                        value={inf.status || 'identified'} 
                        onValueChange={(v) => handleStatusChange(inf.id, v)}
                      >
                        <SelectTrigger className={`w-28 h-8 text-xs ${getStatusColor(inf.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="identified">Identified</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="interested">Interested</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <div className="w-10 h-8 bg-blue-100 text-blue-700 rounded flex items-center justify-center font-medium">
                        {inf.score || 50}
                      </div>
                    </td>
                    <td className="p-3 text-gray-500 text-sm">
                      {formatDate(inf.updated_at)}
                    </td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InfluencersListPage;
