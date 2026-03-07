import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { 
  ArrowLeft, RefreshCw, X, Save, CheckCircle, MapPin, 
  Instagram, Youtube, Download, Users, TrendingUp, Heart, Star,
  Globe, Image, Film, Clock, DollarSign, Sparkles
} from 'lucide-react';

const InfluencerDetailPage = () => {
  const { influencerId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    name: '', bio: '', email: '', phone: '', city: '', state: '',
    instagram_handle: '', youtube_handle: '', primary_platform: 'instagram',
    followers: 0, engagement_rate: 0, avg_likes: 0, avg_comments: 0,
    youtube_subscribers: 0, youtube_avg_views: 0, youtube_avg_likes: 0, youtube_total_videos: 0,
    industry: 'fashion', tier: 'micro', gender: 'not_specified', audience_focus: 'unisex', content_types: '',
    rate_per_post: '', rate_per_reel: '', rate_per_story: '', rate_per_youtube: '',
    accepts_barter: false, style_tags: '', past_collaborations: '', languages: '', portfolio_url: '', notes: '',
    status: 'identified'
  });

  const fetchInfluencer = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/marketing/v2/contacts/${influencerId}`);
      const data = response.data;
      setForm({
        name: data.name || '',
        bio: data.bio || '',
        email: data.email || '',
        phone: data.phone || '',
        city: data.city || '',
        state: data.state || '',
        instagram_handle: data.instagram_handle || '',
        youtube_handle: data.youtube_handle || '',
        primary_platform: data.primary_platform || 'instagram',
        followers: data.followers || 0,
        engagement_rate: data.engagement_rate || 0,
        avg_likes: data.avg_likes || 0,
        avg_comments: data.avg_comments || 0,
        youtube_subscribers: data.youtube_subscribers || 0,
        youtube_avg_views: data.youtube_avg_views || 0,
        youtube_avg_likes: data.youtube_avg_likes || 0,
        youtube_total_videos: data.youtube_video_count || 0,
        industry: data.industry || 'fashion',
        tier: data.tier || 'micro',
        gender: data.gender || 'not_specified',
        audience_focus: data.audience_focus || 'unisex',
        content_types: data.content_types || '',
        rate_per_post: data.rate_per_post || '',
        rate_per_reel: data.rate_per_reel || '',
        rate_per_story: data.rate_per_story || '',
        rate_per_youtube: data.rate_per_youtube || '',
        accepts_barter: data.accepts_barter || false,
        style_tags: data.style_tags || '',
        past_collaborations: data.past_collaborations || '',
        languages: data.languages || '',
        portfolio_url: data.portfolio_url || '',
        notes: data.notes || '',
        status: data.status || 'identified',
        score: data.score || 50,
        social_synced_at: data.social_synced_at
      });
      setOriginalData(data);
    } catch (error) {
      toast.error('Failed to load influencer');
      navigate('/marketing/influencers');
    } finally {
      setLoading(false);
    }
  }, [api, influencerId, navigate]);

  useEffect(() => {
    fetchInfluencer();
  }, [fetchInfluencer]);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleFetchSocial = async (platform) => {
    const handle = platform === 'instagram' ? form.instagram_handle : form.youtube_handle;
    if (!handle) {
      toast.error(`Please enter ${platform} handle first`);
      return;
    }
    
    toast.info(`Fetching ${platform} data...`);
    try {
      const response = await api.get(`/social-api/${platform}/${platform === 'instagram' ? 'profile' : 'channel'}/${handle}`);
      const data = response.data;
      
      if (platform === 'instagram') {
        setForm(prev => ({
          ...prev,
          followers: data.followers || prev.followers,
          engagement_rate: data.engagement_rate || prev.engagement_rate,
          avg_likes: data.avg_likes || prev.avg_likes,
          avg_comments: data.avg_comments || prev.avg_comments,
          bio: data.bio || prev.bio
        }));
      } else {
        setForm(prev => ({
          ...prev,
          youtube_subscribers: data.subscribers || prev.youtube_subscribers,
          youtube_avg_views: data.avg_views || prev.youtube_avg_views,
          youtube_total_videos: data.video_count || prev.youtube_total_videos
        }));
      }
      setHasChanges(true);
      toast.success(`${platform} data fetched!`);
    } catch (error) {
      toast.error(`Failed to fetch ${platform} data. API may not be configured.`);
    }
  };

  const handleRefreshData = async () => {
    toast.info('Refreshing all social data...');
    if (form.instagram_handle) await handleFetchSocial('instagram');
    if (form.youtube_handle) await handleFetchSocial('youtube');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/marketing/v2/contacts/${influencerId}`, form);
      toast.success('Changes saved!');
      setHasChanges(false);
      setOriginalData({ ...originalData, ...form });
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('Discard unsaved changes?')) {
        fetchInfluencer();
        setHasChanges(false);
      }
    } else {
      navigate('/marketing/influencers');
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

  const getTierBadge = () => {
    const followers = form.followers || 0;
    if (followers >= 1000000) return { label: 'Mega • 1M+', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (followers >= 100000) return { label: 'Macro • 100K-1M', color: 'bg-green-100 text-green-700 border-green-200' };
    if (followers >= 10000) return { label: 'Micro • 10K-100K', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { label: 'Nano • <10K', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const tier = getTierBadge();
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'metrics', label: 'Core Metrics' },
    { id: 'rates', label: 'Deliverables & Rates' },
    { id: 'history', label: 'History' }
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen" data-testid="influencer-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketing/influencers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-serif italic text-gray-900">{form.name || 'New Influencer'}</h1>
              <Badge className={`${tier.color} border font-normal`}>{tier.label}</Badge>
            </div>
            <div className="text-gray-500">@{form.instagram_handle || form.youtube_handle || 'handle'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefreshData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh Data
          </Button>
          <Button variant="outline" onClick={handleCancel} className="gap-2">
            <X className="w-4 h-4" /> Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="bg-[#c4a35a] hover:bg-[#b39349] text-white gap-2"
          >
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6 bg-white px-4 rounded-t-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-4 px-2 border-b-2 transition-colors ${
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
          {/* Left Column - Profile */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-28 h-28 rounded-full bg-amber-100 flex items-center justify-center text-5xl font-serif text-amber-700 mx-auto">
                    {form.name?.charAt(0).toUpperCase() || 'M'}
                  </div>
                  <div className="absolute bottom-1 right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-serif text-gray-900 mt-4">{form.name}</h2>
                <Badge className="mt-2 bg-gray-900 text-white capitalize">{form.industry}</Badge>
                <div className="text-xs text-gray-500 mt-2">Last verified: {formatDate(form.social_synced_at)}</div>
                <Select value={form.status} onValueChange={v => updateForm('status', v)}>
                  <SelectTrigger className="w-36 mx-auto mt-2">
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
              </div>

              <div className="space-y-4 border-t border-gray-100 pt-4">
                {/* Bio */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">BIO</Label>
                  <Textarea 
                    value={form.bio} 
                    onChange={e => updateForm('bio', e.target.value)}
                    placeholder="Influencer bio..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                {/* Contact */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">CONTACT</Label>
                  <div className="grid grid-cols-1 gap-2 mt-1">
                    <Input 
                      placeholder="Email" 
                      value={form.email} 
                      onChange={e => updateForm('email', e.target.value)}
                    />
                    <Input 
                      placeholder="Phone" 
                      value={form.phone} 
                      onChange={e => updateForm('phone', e.target.value)}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">LOCATION</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Input 
                      placeholder="City" 
                      value={form.city} 
                      onChange={e => updateForm('city', e.target.value)}
                    />
                    <Input 
                      placeholder="State" 
                      value={form.state} 
                      onChange={e => updateForm('state', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Social & Metrics */}
          <div className="space-y-6">
            {/* Social Profiles */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Social Profiles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Primary Platform */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">PRIMARY PLATFORM</Label>
                  <Select value={form.primary_platform} onValueChange={v => updateForm('primary_platform', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Social Handles */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <Instagram className="w-3 h-3 text-pink-500" /> INSTAGRAM
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        placeholder="@handle" 
                        value={form.instagram_handle} 
                        onChange={e => updateForm('instagram_handle', e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleFetchSocial('instagram')}
                        className="bg-pink-500 hover:bg-pink-600 text-white"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1">
                      <Youtube className="w-3 h-3 text-red-500" /> YOUTUBE
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        placeholder="@channel" 
                        value={form.youtube_handle} 
                        onChange={e => updateForm('youtube_handle', e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleFetchSocial('youtube')}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{formatNumber(form.followers)}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Followers</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{form.engagement_rate?.toFixed(2) || '0.00'}%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Engagement</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4 text-center">
                  <Heart className="w-5 h-5 text-red-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{formatNumber(form.avg_likes)}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Likes</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4 text-center">
                  <Star className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{form.score || 50}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Score</div>
                </CardContent>
              </Card>
            </div>

            {/* Classification */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Classification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">INDUSTRY</Label>
                    <Select value={form.industry} onValueChange={v => updateForm('industry', v)}>
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
                    <Select value={form.tier} onValueChange={v => updateForm('tier', v)}>
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
                  <div className="hidden" /> {/* Spacer */}
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">GENDER</Label>
                    <Select value={form.gender} onValueChange={v => updateForm('gender', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_specified">Prefer not to say</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non_binary">Non-binary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">AUDIENCE FOCUS</Label>
                    <Select value={form.audience_focus} onValueChange={v => updateForm('audience_focus', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unisex">Unisex</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">CONTENT TYPES</Label>
                    <Input 
                      placeholder="reels, posts, stories" 
                      value={form.content_types} 
                      onChange={e => updateForm('content_types', e.target.value)}
                      className="mt-1"
                    />
                  </div>
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
          <Card className="bg-white border-l-4 border-l-red-300 border-gray-200">
            <CardHeader className="bg-red-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" /> YouTube Metrics
                {form.primary_platform === 'youtube' && (
                  <Badge className="bg-red-100 text-red-600 text-xs ml-2">Primary</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">SUBSCRIBERS</Label>
                  <Input 
                    type="number"
                    value={form.youtube_subscribers || ''} 
                    onChange={e => updateForm('youtube_subscribers', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">AVG VIEWS</Label>
                  <Input 
                    type="number"
                    value={form.youtube_avg_views || ''} 
                    onChange={e => updateForm('youtube_avg_views', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">AVG LIKES</Label>
                  <Input 
                    type="number"
                    value={form.youtube_avg_likes || ''} 
                    onChange={e => updateForm('youtube_avg_likes', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">TOTAL VIDEOS</Label>
                  <Input 
                    type="number"
                    value={form.youtube_total_videos || ''} 
                    onChange={e => updateForm('youtube_total_videos', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instagram Metrics */}
          <Card className="bg-white border-l-4 border-l-pink-300 border-gray-200">
            <CardHeader className="bg-pink-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Instagram className="w-5 h-5 text-pink-500" /> Instagram Metrics
                {form.primary_platform === 'instagram' && (
                  <Badge className="bg-pink-100 text-pink-600 text-xs ml-2">Primary</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">FOLLOWERS</Label>
                  <Input 
                    type="number"
                    value={form.followers || ''} 
                    onChange={e => updateForm('followers', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">ENGAGEMENT %</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={form.engagement_rate || ''} 
                    onChange={e => updateForm('engagement_rate', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">AVG LIKES</Label>
                  <Input 
                    type="number"
                    value={form.avg_likes || ''} 
                    onChange={e => updateForm('avg_likes', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">AVG COMMENTS</Label>
                  <Input 
                    type="number"
                    value={form.avg_comments || ''} 
                    onChange={e => updateForm('avg_comments', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audience Demographics */}
          <Card className="bg-white border-gray-200">
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
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" /> Rate Card
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
                <div className="w-32">
                  <Input 
                    type="number"
                    placeholder="₹"
                    value={form.rate_per_post || ''}
                    onChange={e => updateForm('rate_per_post', e.target.value)}
                  />
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
                <div className="w-32">
                  <Input 
                    type="number"
                    placeholder="₹"
                    value={form.rate_per_reel || ''}
                    onChange={e => updateForm('rate_per_reel', e.target.value)}
                  />
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
                <div className="w-32">
                  <Input 
                    type="number"
                    placeholder="₹"
                    value={form.rate_per_story || ''}
                    onChange={e => updateForm('rate_per_story', e.target.value)}
                  />
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
                <div className="w-32">
                  <Input 
                    type="number"
                    placeholder="₹"
                    value={form.rate_per_youtube || ''}
                    onChange={e => updateForm('rate_per_youtube', e.target.value)}
                  />
                </div>
              </div>

              {/* Accepts Barter */}
              <div className="flex items-center justify-between p-3 border-t border-gray-100 mt-4 pt-4">
                <div>
                  <div className="font-medium text-gray-900">Accepts Barter</div>
                  <div className="text-xs text-gray-500">Product exchange collaborations</div>
                </div>
                <Switch 
                  checked={form.accepts_barter}
                  onCheckedChange={v => updateForm('accepts_barter', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Additional Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">STYLE TAGS</Label>
                <Input 
                  placeholder="minimal, luxury, streetwear"
                  value={form.style_tags}
                  onChange={e => updateForm('style_tags', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">PAST BRAND COLLABORATIONS</Label>
                <Textarea 
                  placeholder="Nike, Zara, H&M"
                  value={form.past_collaborations}
                  onChange={e => updateForm('past_collaborations', e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">LANGUAGES</Label>
                <Input 
                  placeholder="English, Hindi"
                  value={form.languages}
                  onChange={e => updateForm('languages', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">PORTFOLIO URL</Label>
                <Input 
                  placeholder="https://..."
                  value={form.portfolio_url}
                  onChange={e => updateForm('portfolio_url', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">NOTES</Label>
                <Textarea 
                  placeholder="Internal notes..."
                  value={form.notes}
                  onChange={e => updateForm('notes', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm">No activity history yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InfluencerDetailPage;
