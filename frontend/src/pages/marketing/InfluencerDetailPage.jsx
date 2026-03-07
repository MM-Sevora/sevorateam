import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, RefreshCw, Send, Edit, CheckCircle, MapPin, 
  Instagram, Youtube, ExternalLink, Users, TrendingUp, Heart, Star,
  Globe, Image, Film, Clock, DollarSign, Sparkles
} from 'lucide-react';

const InfluencerDetailPage = () => {
  const { influencerId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [influencer, setInfluencer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [communications, setCommunications] = useState([]);
  const [deals, setDeals] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  const fetchInfluencer = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/marketing/v2/contacts/${influencerId}`);
      setInfluencer(response.data);
      setEditForm(response.data);
    } catch (error) {
      toast.error('Failed to load influencer');
      navigate('/marketing/influencers');
    } finally {
      setLoading(false);
    }
  }, [api, influencerId, navigate]);

  const fetchHistory = useCallback(async () => {
    try {
      const [commsRes, dealsRes] = await Promise.all([
        api.get(`/marketing/v2/contacts/${influencerId}/communications`),
        api.get(`/marketing/v2/contacts/${influencerId}/deals`)
      ]);
      setCommunications(commsRes.data || []);
      setDeals(dealsRes.data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, [api, influencerId]);

  useEffect(() => {
    fetchInfluencer();
    fetchHistory();
  }, [fetchInfluencer, fetchHistory]);

  const handleRefreshData = async () => {
    toast.info('Refreshing social data...');
    try {
      await api.post(`/social-api/sync/influencer/${influencerId}`);
      await fetchInfluencer();
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/marketing/v2/contacts/${influencerId}`, editForm);
      toast.success('Profile updated');
      setShowEditModal(false);
      fetchInfluencer();
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getTierBadge = (followers) => {
    if (followers >= 1000000) return { label: 'Mega • 1M+', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (followers >= 100000) return { label: 'Macro • 100K-1M', color: 'bg-green-100 text-green-700 border-green-200' };
    if (followers >= 10000) return { label: 'Micro • 10K-100K', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { label: 'Nano • <10K', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  if (loading || !influencer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const tier = getTierBadge(influencer.followers);
  const isPrimaryYoutube = influencer.primary_platform === 'youtube';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'metrics', label: 'Core Metrics' },
    { id: 'rates', label: 'Deliverables & Rates' },
    { id: 'history', label: 'History' }
  ];

  return (
    <div className="p-8 bg-white min-h-screen" data-testid="influencer-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketing/influencers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-serif font-bold text-gray-900">{influencer.name}</h1>
              <Badge className={`${tier.color} border font-normal`}>{tier.label}</Badge>
            </div>
            <div className="text-gray-500">@{influencer.instagram_handle || influencer.youtube_handle || 'unknown'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefreshData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh Data
          </Button>
          <Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white gap-2">
            <Send className="w-4 h-4" /> Send Outreach
          </Button>
          <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" /> Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Influencer Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <Label>Name</Label>
                  <Input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Instagram Handle</Label>
                    <Input value={editForm.instagram_handle || ''} onChange={e => setEditForm({...editForm, instagram_handle: e.target.value})} />
                  </div>
                  <div>
                    <Label>YouTube Handle</Label>
                    <Input value={editForm.youtube_handle || ''} onChange={e => setEditForm({...editForm, youtube_handle: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Industry</Label>
                    <Select value={editForm.industry || 'fashion'} onValueChange={v => setEditForm({...editForm, industry: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fashion">Fashion</SelectItem>
                        <SelectItem value="beauty">Beauty</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="tech">Tech</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                  </div>
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea rows={3} value={editForm.bio || ''} onChange={e => setEditForm({...editForm, bio: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rate per Post (₹)</Label>
                    <Input type="number" value={editForm.rate_per_post || ''} onChange={e => setEditForm({...editForm, rate_per_post: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <Label>Rate per Reel (₹)</Label>
                    <Input type="number" value={editForm.rate_per_reel || ''} onChange={e => setEditForm({...editForm, rate_per_reel: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rate per Story (₹)</Label>
                    <Input type="number" value={editForm.rate_per_story || ''} onChange={e => setEditForm({...editForm, rate_per_story: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <Label>Rate per YouTube Video (₹)</Label>
                    <Input type="number" value={editForm.rate_per_youtube || ''} onChange={e => setEditForm({...editForm, rate_per_youtube: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div>
                  <Label>Languages (comma-separated)</Label>
                  <Input value={editForm.languages || ''} onChange={e => setEditForm({...editForm, languages: e.target.value})} placeholder="English, Hindi" />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={editForm.accepts_barter || false}
                    onChange={e => setEditForm({...editForm, accepts_barter: e.target.checked})}
                    className="rounded"
                  />
                  <Label className="mb-0">Accepts Barter</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} className="bg-[#c4a35a] hover:bg-[#b39349]">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-gray-900 text-gray-900 font-medium' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Profile Card */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-4xl font-serif text-amber-700 mx-auto">
                    {influencer.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-serif font-bold text-gray-900 mt-4">{influencer.name}</h2>
                <Badge className="mt-2 bg-gray-900 text-white">{influencer.industry || 'Fashion'}</Badge>
                <div className="text-xs text-gray-500 mt-2">Last verified: {formatDate(influencer.social_synced_at || influencer.updated_at)}</div>
                <Badge variant="outline" className="mt-2 capitalize">{influencer.status || 'Identified'}</Badge>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                {/* Bio */}
                <div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">BIO</div>
                  <p className="text-sm text-gray-700">{influencer.bio || 'No bio available'}</p>
                </div>

                {/* Contact */}
                <div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">CONTACT</div>
                  {influencer.email || influencer.phone ? (
                    <div className="text-sm text-gray-700">
                      {influencer.email && <div>{influencer.email}</div>}
                      {influencer.phone && <div>{influencer.phone}</div>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No contact info</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">LOCATION</div>
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {influencer.city || 'Unknown'}, India
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Social & Metrics */}
          <div className="space-y-6">
            {/* Social Profiles */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Social Profiles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {influencer.youtube_handle && (
                  <div className={`p-3 rounded-lg border mb-2 ${isPrimaryYoutube ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Youtube className="w-5 h-5 text-red-500" />
                        <div>
                          <div className="font-medium text-gray-900">{influencer.youtube_handle}</div>
                          {isPrimaryYoutube && <Badge className="bg-red-100 text-red-600 text-xs">Primary</Badge>}
                        </div>
                      </div>
                      <a href={`https://youtube.com/@${influencer.youtube_handle}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </a>
                    </div>
                  </div>
                )}
                {influencer.instagram_handle && (
                  <div className={`p-3 rounded-lg border ${!isPrimaryYoutube ? 'border-pink-200 bg-pink-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Instagram className="w-5 h-5 text-pink-500" />
                        <div>
                          <div className="font-medium text-gray-900">{influencer.instagram_handle}</div>
                          {!isPrimaryYoutube && <Badge className="bg-pink-100 text-pink-600 text-xs">Primary</Badge>}
                        </div>
                      </div>
                      <a href={`https://instagram.com/${influencer.instagram_handle?.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </a>
                    </div>
                  </div>
                )}
                {!influencer.instagram_handle && !influencer.youtube_handle && (
                  <p className="text-gray-500 text-sm">No social profiles linked</p>
                )}
              </CardContent>
            </Card>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="border-gray-200">
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{formatNumber(influencer.followers)}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Followers</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{influencer.engagement_rate?.toFixed(2) || '0.00'}%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Engagement</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className="p-4 text-center">
                  <Heart className="w-5 h-5 text-red-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{formatNumber(influencer.avg_likes || 0)}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Likes</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className="p-4 text-center">
                  <Star className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{influencer.score || 50}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Score</div>
                </CardContent>
              </Card>
            </div>

            {/* Classification */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Classification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-blue-100 text-blue-700">{influencer.industry || 'Fashion'}</Badge>
                  <Badge variant="outline">{tier.label.split(' •')[0]}</Badge>
                  <Badge variant="outline">Unisex Audience</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Core Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* YouTube Metrics */}
          {isPrimaryYoutube && (
            <Card className="border-l-4 border-l-red-400 border-gray-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Youtube className="w-5 h-5 text-red-500" /> YouTube Metrics
                  <Badge className="bg-red-100 text-red-600 text-xs ml-2">Primary</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Subscribers</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(influencer.youtube_subscribers || influencer.followers)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Views</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(influencer.avg_views || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Likes</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(influencer.avg_likes || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Videos</div>
                    <div className="text-2xl font-bold text-gray-900">{influencer.youtube_video_count || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instagram Metrics */}
          {!isPrimaryYoutube && (
            <Card className="border-l-4 border-l-pink-400 border-gray-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-pink-500" /> Instagram Metrics
                  <Badge className="bg-pink-100 text-pink-600 text-xs ml-2">Primary</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Followers</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(influencer.instagram_followers || influencer.followers)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Engagement Rate</div>
                    <div className="text-2xl font-bold text-gray-900">{influencer.engagement_rate?.toFixed(2) || '0.00'}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Likes</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(influencer.avg_likes || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Posts</div>
                    <div className="text-2xl font-bold text-gray-900">{influencer.instagram_posts_count || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audience Demographics */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5" /> Audience Demographics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 italic">No audience demographics data available</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deliverables & Rates Tab */}
      {activeTab === 'rates' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Rate Card */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" /> Rate Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Static Post */}
              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Image className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Static Post</div>
                    <div className="text-xs text-gray-500">Feed image post</div>
                  </div>
                </div>
                <div className="font-medium text-gray-900">
                  {influencer.rate_per_post ? `₹${influencer.rate_per_post.toLocaleString()}` : '-'}
                </div>
              </div>

              {/* Reel / Short */}
              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Film className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Reel / Short</div>
                    <div className="text-xs text-gray-500">15-60 sec video</div>
                  </div>
                </div>
                <div className="font-medium text-gray-900">
                  {influencer.rate_per_reel ? `₹${influencer.rate_per_reel.toLocaleString()}` : '-'}
                </div>
              </div>

              {/* Story */}
              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Story</div>
                    <div className="text-xs text-gray-500">24hr story post</div>
                  </div>
                </div>
                <div className="font-medium text-gray-900">
                  {influencer.rate_per_story ? `₹${influencer.rate_per_story.toLocaleString()}` : '-'}
                </div>
              </div>

              {/* YouTube Video */}
              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Youtube className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">YouTube Video</div>
                    <div className="text-xs text-gray-500">Dedicated/integrated</div>
                  </div>
                </div>
                <div className="font-medium text-gray-900">
                  {influencer.rate_per_youtube ? `₹${influencer.rate_per_youtube.toLocaleString()}` : '-'}
                </div>
              </div>

              {/* Accepts Barter */}
              <div className="flex items-center justify-between p-3 border-t border-gray-100 mt-4 pt-4">
                <div>
                  <div className="font-medium text-gray-900">Accepts Barter</div>
                  <div className="text-xs text-gray-500">Product exchange collaborations</div>
                </div>
                <Badge variant="outline">{influencer.accepts_barter ? 'Yes' : 'No'}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Additional Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">STYLE TAGS</div>
                <p className="text-sm text-gray-700">{influencer.style_tags || 'No tags'}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">PAST BRAND COLLABORATIONS</div>
                <p className="text-sm text-gray-700">{influencer.past_collaborations || 'No brands listed'}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">LANGUAGES</div>
                <p className="text-sm text-gray-700">{influencer.languages || 'English, Hindi'}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">PORTFOLIO URL</div>
                <p className="text-sm text-gray-700">{influencer.portfolio_url || 'Not provided'}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">NOTES</div>
                <p className="text-sm text-gray-700">{influencer.notes || 'No notes'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Communications */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Communications ({communications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {communications.length === 0 ? (
                <p className="text-gray-500 text-sm">No communications yet</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {communications.map(comm => (
                    <div key={comm.id} className="p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="capitalize">{comm.comm_type}</Badge>
                        <span className="text-xs text-gray-500">{formatDate(comm.sent_at)}</span>
                      </div>
                      <div className="font-medium text-gray-900 text-sm">{comm.subject || '(No subject)'}</div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{comm.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deals */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Deals ({deals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <p className="text-gray-500 text-sm">No deals yet</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {deals.map(deal => (
                    <div key={deal.id} className="p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={deal.status === 'agreed' ? 'default' : 'outline'} className="capitalize">{deal.status}</Badge>
                        <span className="text-xs text-gray-500">{formatDate(deal.created_at)}</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        Quote: ₹{deal.initial_quote?.toLocaleString() || 0}
                        {deal.final_amount && <span className="text-green-600 ml-2">Final: ₹{deal.final_amount.toLocaleString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InfluencerDetailPage;
