import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Search, Plus, Users, Star, MapPin, Instagram, Youtube, 
  Filter, RefreshCw
} from 'lucide-react';

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

const InfluencersPageNew = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, byTier: {} });
  
  const [newInfluencer, setNewInfluencer] = useState({
    name: '',
    contact_type: 'influencer',
    email: '',
    phone: '',
    instagram_handle: '',
    youtube_handle: '',
    twitter_handle: '',
    city: '',
    country: 'India',
    industry: 'fashion',
    primary_platform: 'instagram',
    tier: 'micro',
    followers: 0,
    engagement_rate: 0,
    rate_per_post: '',
    rate_per_reel: '',
    bio: '',
    notes: '',
  });

  const fetchInfluencers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('contact_type', 'influencer'); // Always filter to influencers
      if (search) params.append('search', search);
      if (filterTier !== 'all') params.append('tier', filterTier);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const response = await api.get(`/marketing/v2/contacts?${params.toString()}`);
      setInfluencers(response.data || []);
      
      // Calculate stats
      const data = response.data || [];
      const tierCounts = data.reduce((acc, inf) => {
        acc[inf.tier] = (acc[inf.tier] || 0) + 1;
        return acc;
      }, {});
      setStats({ total: data.length, byTier: tierCounts });
    } catch (error) {
      console.error('Failed to fetch influencers:', error);
      toast.error('Failed to load influencers');
    } finally {
      setLoading(false);
    }
  }, [api, search, filterTier, filterStatus]);

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  const handleAddInfluencer = async () => {
    try {
      const data = {
        ...newInfluencer,
        contact_type: 'influencer', // Force influencer type
        followers: parseInt(newInfluencer.followers) || 0,
        engagement_rate: parseFloat(newInfluencer.engagement_rate) || 0,
        rate_per_post: newInfluencer.rate_per_post ? parseFloat(newInfluencer.rate_per_post) : null,
        rate_per_reel: newInfluencer.rate_per_reel ? parseFloat(newInfluencer.rate_per_reel) : null,
      };
      
      await api.post('/marketing/v2/contacts', data);
      toast.success('Influencer added successfully');
      setShowAddModal(false);
      setNewInfluencer({
        name: '', contact_type: 'influencer', email: '', phone: '', instagram_handle: '',
        youtube_handle: '', twitter_handle: '', city: '', country: 'India',
        industry: 'fashion', primary_platform: 'instagram', tier: 'micro', followers: 0,
        engagement_rate: 0, rate_per_post: '', rate_per_reel: '', bio: '', notes: '',
      });
      fetchInfluencers();
    } catch (error) {
      toast.error('Failed to add influencer');
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  return (
    <div className="p-8 space-y-6" data-testid="influencers-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Influencers</h1>
          <p className="text-[#5D4A3A] mt-1">Manage influencer partnerships and collaborations</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-amber-700 hover:bg-amber-800" data-testid="add-influencer-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Influencer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Influencer</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={newInfluencer.name} onChange={e => setNewInfluencer({...newInfluencer, name: e.target.value})} placeholder="Full name" />
              </div>
              
              <div>
                <Label>Email</Label>
                <Input type="email" value={newInfluencer.email} onChange={e => setNewInfluencer({...newInfluencer, email: e.target.value})} placeholder="email@example.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={newInfluencer.phone} onChange={e => setNewInfluencer({...newInfluencer, phone: e.target.value})} placeholder="+91 98765 43210" />
              </div>

              <div>
                <Label>Instagram Handle</Label>
                <Input value={newInfluencer.instagram_handle} onChange={e => setNewInfluencer({...newInfluencer, instagram_handle: e.target.value})} placeholder="@handle" />
              </div>
              <div>
                <Label>YouTube Channel</Label>
                <Input value={newInfluencer.youtube_handle} onChange={e => setNewInfluencer({...newInfluencer, youtube_handle: e.target.value})} placeholder="@channel" />
              </div>

              <div>
                <Label>City</Label>
                <Input value={newInfluencer.city} onChange={e => setNewInfluencer({...newInfluencer, city: e.target.value})} placeholder="Mumbai" />
              </div>
              <div>
                <Label>Industry</Label>
                <Select value={newInfluencer.industry} onValueChange={v => setNewInfluencer({...newInfluencer, industry: v})}>
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

              <div>
                <Label>Tier</Label>
                <Select value={newInfluencer.tier} onValueChange={v => setNewInfluencer({...newInfluencer, tier: v})}>
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
                <Input type="number" value={newInfluencer.followers} onChange={e => setNewInfluencer({...newInfluencer, followers: e.target.value})} placeholder="150000" />
              </div>
              
              <div>
                <Label>Engagement Rate (%)</Label>
                <Input type="number" step="0.1" value={newInfluencer.engagement_rate} onChange={e => setNewInfluencer({...newInfluencer, engagement_rate: e.target.value})} placeholder="4.5" />
              </div>
              <div>
                <Label>Rate per Reel (₹)</Label>
                <Input type="number" value={newInfluencer.rate_per_reel} onChange={e => setNewInfluencer({...newInfluencer, rate_per_reel: e.target.value})} placeholder="25000" />
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <Input value={newInfluencer.notes} onChange={e => setNewInfluencer({...newInfluencer, notes: e.target.value})} placeholder="Additional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddInfluencer} className="bg-amber-700 hover:bg-amber-800">Add Influencer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-[#4A3728]">{stats.total}</div>
            <div className="text-sm text-[#5D4A3A]">Total Influencers</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-700">{stats.byTier?.nano || 0}</div>
            <div className="text-sm text-gray-600">Nano</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-700">{stats.byTier?.micro || 0}</div>
            <div className="text-sm text-blue-600">Micro</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-700">{stats.byTier?.macro || 0}</div>
            <div className="text-sm text-amber-600">Macro</div>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-rose-700">{stats.byTier?.mega || 0}</div>
            <div className="text-sm text-rose-600">Mega</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-700">{stats.byTier?.celebrity || 0}</div>
            <div className="text-sm text-yellow-600">Celebrity</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5D4A3A]" />
          <Input 
            className="pl-10 border-[#E8D5C4]" 
            placeholder="Search influencers..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[150px] border-[#E8D5C4]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="nano">Nano</SelectItem>
            <SelectItem value="micro">Micro</SelectItem>
            <SelectItem value="macro">Macro</SelectItem>
            <SelectItem value="mega">Mega</SelectItem>
            <SelectItem value="celebrity">Celebrity</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] border-[#E8D5C4]">
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
        <Button variant="outline" onClick={fetchInfluencers} className="border-[#E8D5C4]">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Influencers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-[#4A3728]" />
        </div>
      ) : influencers.length === 0 ? (
        <Card className="border-[#E8D5C4]">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
            <h3 className="text-lg font-medium text-[#4A3728]">No influencers found</h3>
            <p className="text-[#5D4A3A]">Add your first influencer to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {influencers.map(influencer => (
            <Card 
              key={influencer.id} 
              className="border-[#E8D5C4] hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/marketing/contacts/${influencer.id}`)}
              data-testid={`influencer-card-${influencer.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold">
                      {influencer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#4A3728]">{influencer.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-[#5D4A3A]">
                        {influencer.instagram_handle && (
                          <span className="flex items-center gap-1">
                            <Instagram className="w-3 h-3" /> {influencer.instagram_handle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium">{influencer.score}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {influencer.tier && <Badge className={TIER_COLORS[influencer.tier] || TIER_COLORS.micro}>{influencer.tier}</Badge>}
                  <Badge className={STATUS_COLORS[influencer.status] || STATUS_COLORS.identified}>{influencer.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                  <div>
                    <div className="font-semibold text-[#4A3728]">{formatNumber(influencer.followers)}</div>
                    <div className="text-xs text-[#5D4A3A]">Followers</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#4A3728]">{influencer.engagement_rate}%</div>
                    <div className="text-xs text-[#5D4A3A]">Engagement</div>
                  </div>
                </div>

                {influencer.city && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-[#5D4A3A]">
                    <MapPin className="w-3 h-3" /> {influencer.city}, {influencer.country}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InfluencersPageNew;
