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
import { toast } from 'sonner';
import { 
  RefreshCw, Plus, Search, Filter, Instagram, Youtube, 
  MoreHorizontal, Users, Sparkles, ChevronUp, ChevronDown
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
  const [statusCounts, setStatusCounts] = useState({
    identified: 0, contacted: 0, interested: 0, negotiation: 0, confirmed: 0, completed: 0
  });
  
  const [newInfluencer, setNewInfluencer] = useState({
    name: '', instagram_handle: '', youtube_handle: '', email: '', phone: '',
    industry: 'fashion', city: '', primary_platform: 'instagram'
  });

  const fetchInfluencers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/marketing/v2/contacts', {
        params: { contact_type: 'influencer', limit: 100 }
      });
      const data = response.data || [];
      setInfluencers(data);
      
      // Calculate status counts
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

  const handleAddInfluencer = async () => {
    if (!newInfluencer.name) {
      toast.error('Name is required');
      return;
    }
    try {
      await api.post('/marketing/v2/contacts', {
        ...newInfluencer,
        contact_type: 'influencer',
        status: 'identified'
      });
      toast.success('Influencer added');
      setShowAddModal(false);
      setNewInfluencer({
        name: '', instagram_handle: '', youtube_handle: '', email: '', phone: '',
        industry: 'fashion', city: '', primary_platform: 'instagram'
      });
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

  return (
    <div className="p-8 space-y-6 bg-white min-h-screen" data-testid="influencers-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold text-gray-900">Influencers</h1>
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Influencer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Name *</Label>
                  <Input 
                    value={newInfluencer.name} 
                    onChange={e => setNewInfluencer({...newInfluencer, name: e.target.value})}
                    placeholder="Influencer Name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Instagram Handle</Label>
                    <Input 
                      value={newInfluencer.instagram_handle} 
                      onChange={e => setNewInfluencer({...newInfluencer, instagram_handle: e.target.value})}
                      placeholder="@handle"
                    />
                  </div>
                  <div>
                    <Label>YouTube Handle</Label>
                    <Input 
                      value={newInfluencer.youtube_handle} 
                      onChange={e => setNewInfluencer({...newInfluencer, youtube_handle: e.target.value})}
                      placeholder="@channel"
                    />
                  </div>
                </div>
                <div>
                  <Label>Primary Platform</Label>
                  <Select 
                    value={newInfluencer.primary_platform} 
                    onValueChange={v => setNewInfluencer({...newInfluencer, primary_platform: v})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Industry</Label>
                    <Select 
                      value={newInfluencer.industry} 
                      onValueChange={v => setNewInfluencer({...newInfluencer, industry: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Label>City</Label>
                    <Input 
                      value={newInfluencer.city} 
                      onChange={e => setNewInfluencer({...newInfluencer, city: e.target.value})}
                      placeholder="Mumbai"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={newInfluencer.email} 
                      onChange={e => setNewInfluencer({...newInfluencer, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input 
                      value={newInfluencer.phone} 
                      onChange={e => setNewInfluencer({...newInfluencer, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button onClick={handleAddInfluencer} className="bg-[#c4a35a] hover:bg-[#b39349]">Add</Button>
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
