import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Slider } from '../../components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { 
  Sparkles, Search, Users, Target, MapPin, DollarSign, 
  Instagram, Youtube, TrendingUp, CheckCircle, XCircle,
  Bookmark, RefreshCw, ChevronDown, ChevronUp, Filter,
  ArrowUpDown, Star, Eye, MessageSquare, Send, Loader2,
  Newspaper, User, Building2, ArrowLeft, ArrowRight, Zap,
  Heart, Play, ExternalLink, Plus, Wand2, Brain, Rocket
} from 'lucide-react';

const INDUSTRIES = [
  'Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Food', 'Travel', 
  'Fitness', 'Parenting', 'Finance', 'Education', 'Entertainment', 'Gaming'
];

const PLATFORMS = ['Instagram', 'YouTube', 'Both'];
const OBJECTIVES = ['Brand Awareness', 'Product Launch', 'Engagement', 'Sales', 'Content Creation'];
const BEAT_OPTIONS = ['Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Business', 'Entertainment', 'Startup', 'Luxury'];

const AIDiscoveryPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Active tab
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'pr' ? 'pr' : 'influencer';
  });
  
  // Wizard step (1: Brief, 2: Processing, 3: Results)
  const [wizardStep, setWizardStep] = useState(1);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  
  // Campaign Brief Form
  const [brief, setBrief] = useState({
    industry: '',
    target_audience: '',
    platform: 'Instagram',
    location: 'India',
    budget_min: 10000,
    budget_max: 500000,
    follower_min: 10000,
    follower_max: 1000000,
    objective: 'Brand Awareness',
    content_type: '',
    additional_requirements: ''
  });
  
  // Discovery State
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [insights, setInsights] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  
  // Filter & Sort
  const [sortBy, setSortBy] = useState('match_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [minScore, setMinScore] = useState(0);
  
  // Action States
  const [savingId, setSavingId] = useState(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [outreachMessage, setOutreachMessage] = useState(null);
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  const [influencerMap, setInfluencerMap] = useState({});

  // PR Discovery State
  const [prBrief, setPrBrief] = useState({ topic: '', industry: 'Fashion', story_type: 'news', target_audience: '' });
  const [prLoading, setPrLoading] = useState(false);
  const [prResults, setPrResults] = useState(null);
  const [journalists, setJournalists] = useState([]);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [selectedJournalist, setSelectedJournalist] = useState(null);
  const [newPitch, setNewPitch] = useState({ contact_id: '', subject: '', message: '', pr_campaign_id: '' });
  const [prCampaigns, setPrCampaigns] = useState([]);

  // Quick Lookup State
  const [quickLookupHandle, setQuickLookupHandle] = useState('');
  const [quickLookupPlatform, setQuickLookupPlatform] = useState('instagram');
  const [quickLookupLoading, setQuickLookupLoading] = useState(false);
  const [quickLookupResult, setQuickLookupResult] = useState(null);

  // Fetch journalists
  const fetchJournalists = useCallback(async () => {
    try {
      const r = await api.get('/marketing/v2/contacts', { params: { contact_type: 'journalist', limit: 300 } });
      setJournalists(r.data || []);
    } catch (e) { console.error(e); }
  }, [api]);

  const fetchPRCampaigns = useCallback(async () => {
    try {
      const r = await api.get('/pr/campaigns');
      setPrCampaigns(r.data || []);
    } catch (e) { console.error(e); }
  }, [api]);

  useEffect(() => {
    if (activeTab === 'pr') {
      fetchJournalists();
      fetchPRCampaigns();
    }
  }, [activeTab, fetchJournalists, fetchPRCampaigns]);

  // Simulated processing stages
  const processingStages = [
    { progress: 15, stage: 'Analyzing campaign requirements...' },
    { progress: 30, stage: 'Scanning influencer database...' },
    { progress: 50, stage: 'Calculating match scores...' },
    { progress: 70, stage: 'Fetching social metrics...' },
    { progress: 85, stage: 'Generating AI insights...' },
    { progress: 100, stage: 'Preparing recommendations...' }
  ];

  const handleDiscover = async () => {
    if (!brief.industry) {
      toast.error('Please select an industry');
      return;
    }
    
    setLoading(true);
    setWizardStep(2);
    setProcessingProgress(0);
    
    // Animate through processing stages
    let stageIndex = 0;
    const progressInterval = setInterval(() => {
      if (stageIndex < processingStages.length) {
        setProcessingProgress(processingStages[stageIndex].progress);
        setProcessingStage(processingStages[stageIndex].stage);
        stageIndex++;
      }
    }, 800);

    try {
      const response = await api.post('/marketing/v2/ai/discover-influencers', brief);
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      setProcessingStage('Complete!');
      
      setTimeout(() => {
        const data = response.data;
        setResults(data);
        setRecommendations(data.recommendations || []);
        setInsights(data.insights);
        setSessionId(data.session_id);
        
        // Build influencer map
        const map = {};
        (data.recommendations || []).forEach(rec => {
          if (rec.influencer) map[rec.influencer.id] = rec.influencer;
        });
        setInfluencerMap(map);
        
        setWizardStep(3);
        setLoading(false);
        toast.success(`Found ${data.recommendations?.length || 0} matching influencers!`);
      }, 500);
      
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Discovery failed:', error);
      toast.error('Failed to discover influencers');
      setWizardStep(1);
      setLoading(false);
    }
  };

  const handleQuickLookup = async () => {
    if (!quickLookupHandle.trim()) {
      toast.error('Please enter a handle');
      return;
    }
    
    setQuickLookupLoading(true);
    try {
      const endpoint = quickLookupPlatform === 'youtube' 
        ? `/social-api/youtube/channel/${quickLookupHandle.replace('@', '')}`
        : `/social-api/instagram/profile/${quickLookupHandle.replace('@', '')}`;
      
      const response = await api.get(endpoint);
      setQuickLookupResult(response.data);
      toast.success('Profile found!');
    } catch (error) {
      console.error('Lookup failed:', error);
      toast.error('Profile not found or API error');
      setQuickLookupResult(null);
    } finally {
      setQuickLookupLoading(false);
    }
  };

  const handleSaveInfluencer = async (recommendation) => {
    const inf = recommendation.influencer;
    if (!inf) return;
    
    setSavingId(inf.id);
    try {
      const contactData = {
        name: inf.name || inf.username,
        contact_type: 'influencer',
        instagram_handle: inf.platform === 'instagram' ? `@${inf.username}` : null,
        youtube_handle: inf.platform === 'youtube' ? `@${inf.username}` : null,
        primary_platform: inf.platform,
        followers: inf.followers_count || inf.subscribers_count || 0,
        engagement_rate: inf.engagement_rate || 0,
        bio: inf.bio || inf.description,
        industry: brief.industry,
        city: brief.location,
      };
      
      await api.post('/marketing/v2/contacts', contactData);
      toast.success(`${inf.name || inf.username} saved to your contacts!`);
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save influencer');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveQuickLookup = async () => {
    if (!quickLookupResult) return;
    
    try {
      const data = quickLookupResult;
      const contactData = {
        name: data.name || data.username,
        contact_type: 'influencer',
        instagram_handle: data.platform === 'instagram' ? `@${data.username}` : null,
        youtube_handle: data.platform === 'youtube' ? `@${data.username}` : null,
        primary_platform: data.platform,
        followers: data.followers_count || data.subscribers_count || 0,
        engagement_rate: data.engagement_rate || 0,
        bio: data.bio || data.description,
        youtube_subscribers: data.platform === 'youtube' ? data.subscribers_count : null,
        youtube_avg_views: data.platform === 'youtube' ? data.average_views : null,
      };
      
      await api.post('/marketing/v2/contacts', contactData);
      toast.success(`${data.name || data.username} saved to contacts!`);
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleGenerateOutreach = async (recommendation) => {
    const inf = recommendation.influencer;
    setSelectedInfluencer(inf);
    setShowOutreachModal(true);
    setGeneratingOutreach(true);
    
    try {
      const response = await api.post('/marketing/v2/ai/generate-outreach', {
        session_id: sessionId,
        influencer_id: inf.id,
        campaign_brief: brief,
        influencer_data: inf
      });
      setOutreachMessage(response.data);
    } catch (error) {
      toast.error('Failed to generate outreach message');
    } finally {
      setGeneratingOutreach(false);
    }
  };

  // PR Discovery
  const handlePRDiscover = async () => {
    if (!prBrief.topic) {
      toast.error('Please enter a story topic');
      return;
    }
    
    setPrLoading(true);
    try {
      const response = await api.post('/marketing/v2/pr/ai-discover', prBrief);
      // Response has structure: { session_id, success, data: { recommendations, pr_insights, ... } }
      const resultData = response.data.data || response.data;
      setPrResults({
        ...response.data,
        recommendations: resultData.recommendations || [],
        pr_insights: resultData.pr_insights || {}
      });
      toast.success(`Found ${resultData.recommendations?.length || 0} media contacts!`);
    } catch (error) {
      console.error('PR Discovery failed:', error);
      toast.error('Failed to discover media contacts');
    } finally {
      setPrLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num) => {
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
    return `₹${num}`;
  };

  // Filtered & sorted recommendations
  const filteredRecommendations = recommendations
    .filter(rec => (rec.match_score || 0) >= minScore)
    .sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'match_score') {
        aVal = a.match_score || 0;
        bVal = b.match_score || 0;
      } else if (sortBy === 'followers') {
        aVal = a.influencer?.followers_count || a.influencer?.subscribers_count || 0;
        bVal = b.influencer?.followers_count || b.influencer?.subscribers_count || 0;
      } else {
        aVal = a.influencer?.engagement_rate || 0;
        bVal = b.influencer?.engagement_rate || 0;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

  const resetDiscovery = () => {
    setWizardStep(1);
    setResults(null);
    setRecommendations([]);
    setInsights(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-white to-orange-50/30" data-testid="ai-discovery-page">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-amber-50">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">AI Discovery</h1>
                    <p className="text-xs text-gray-500">Powered by AI to find perfect matches</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => { setActiveTab('influencer'); resetDiscovery(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'influencer' 
                    ? 'bg-white text-amber-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" /> Influencers
              </button>
              <button
                onClick={() => { setActiveTab('pr'); resetDiscovery(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'pr' 
                    ? 'bg-white text-amber-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Newspaper className="w-4 h-4" /> PR & Media
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'influencer' ? (
          <>
            {/* Step 1: Campaign Brief */}
            {wizardStep === 1 && (
              <div className="grid grid-cols-3 gap-8">
                {/* Main Brief Form */}
                <div className="col-span-2 space-y-6">
                  <Card className="border-0 shadow-xl shadow-amber-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                          <Brain className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Campaign Brief</CardTitle>
                          <p className="text-sm text-gray-500">Tell us about your campaign and AI will find the perfect influencers</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Industry & Audience */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
                            Industry / Niche <span className="text-red-500">*</span>
                          </Label>
                          <Select value={brief.industry} onValueChange={v => setBrief(prev => ({ ...prev, industry: v }))}>
                            <SelectTrigger className="h-12 bg-gray-50 border-gray-200 hover:bg-white transition-colors">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              {INDUSTRIES.map(ind => (
                                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Target Audience</Label>
                          <Input 
                            value={brief.target_audience}
                            onChange={e => setBrief(prev => ({ ...prev, target_audience: e.target.value }))}
                            placeholder="e.g., Women 25-35, Urban millennials"
                            className="h-12 bg-gray-50 border-gray-200"
                          />
                        </div>
                      </div>

                      {/* Platform & Location */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Platform</Label>
                          <div className="flex gap-2">
                            {PLATFORMS.map(p => (
                              <button
                                key={p}
                                onClick={() => setBrief(prev => ({ ...prev, platform: p }))}
                                className={`flex-1 h-12 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                                  brief.platform === p
                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                }`}
                              >
                                {p === 'Instagram' && <Instagram className="w-4 h-4" />}
                                {p === 'YouTube' && <Youtube className="w-4 h-4" />}
                                {p === 'Both' && <><Instagram className="w-4 h-4" /><Youtube className="w-4 h-4" /></>}
                                {p !== 'Both' && p}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Location</Label>
                          <Input 
                            value={brief.location}
                            onChange={e => setBrief(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="e.g., Mumbai, Delhi, Pan-India"
                            className="h-12 bg-gray-50 border-gray-200"
                          />
                        </div>
                      </div>

                      {/* Budget Range */}
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" /> Budget Range
                          </Label>
                          <span className="text-sm font-bold text-green-700">
                            {formatCurrency(brief.budget_min)} - {formatCurrency(brief.budget_max)}
                          </span>
                        </div>
                        <Slider
                          value={[brief.budget_min, brief.budget_max]}
                          min={0}
                          max={1000000}
                          step={10000}
                          onValueChange={([min, max]) => setBrief(prev => ({ ...prev, budget_min: min, budget_max: max }))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                          <span>₹0</span>
                          <span>₹10 Lakh</span>
                        </div>
                      </div>

                      {/* Follower Range */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" /> Follower Range
                          </Label>
                          <span className="text-sm font-bold text-blue-700">
                            {formatNumber(brief.follower_min)} - {formatNumber(brief.follower_max)}
                          </span>
                        </div>
                        <Slider
                          value={[brief.follower_min, brief.follower_max]}
                          min={1000}
                          max={5000000}
                          step={10000}
                          onValueChange={([min, max]) => setBrief(prev => ({ ...prev, follower_min: min, follower_max: max }))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                          <span>1K</span>
                          <span>5M</span>
                        </div>
                      </div>

                      {/* Objective */}
                      <div>
                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 block">Campaign Objective</Label>
                        <div className="flex flex-wrap gap-2">
                          {OBJECTIVES.map(obj => (
                            <button
                              key={obj}
                              onClick={() => setBrief(prev => ({ ...prev, objective: obj }))}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                brief.objective === obj
                                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {obj}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Additional */}
                      <div>
                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Additional Notes</Label>
                        <Textarea
                          value={brief.additional_requirements}
                          onChange={e => setBrief(prev => ({ ...prev, additional_requirements: e.target.value }))}
                          placeholder="Any specific requirements, brand values, content preferences..."
                          rows={3}
                          className="bg-gray-50 border-gray-200"
                        />
                      </div>

                      {/* Submit */}
                      <Button 
                        onClick={handleDiscover}
                        disabled={loading || !brief.industry}
                        className="w-full h-14 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-200 transition-all hover:shadow-2xl hover:shadow-amber-300"
                        data-testid="discover-btn"
                      >
                        <Rocket className="w-5 h-5 mr-2" />
                        Discover Perfect Matches
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Lookup Sidebar */}
                <div className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Search className="w-4 h-4 text-amber-500" /> Quick Profile Lookup
                      </CardTitle>
                      <p className="text-xs text-gray-500">Search any Instagram or YouTube profile</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setQuickLookupPlatform('instagram')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                            quickLookupPlatform === 'instagram'
                              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Instagram className="w-4 h-4" /> Instagram
                        </button>
                        <button
                          onClick={() => setQuickLookupPlatform('youtube')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                            quickLookupPlatform === 'youtube'
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Youtube className="w-4 h-4" /> YouTube
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          value={quickLookupHandle}
                          onChange={e => setQuickLookupHandle(e.target.value)}
                          placeholder={quickLookupPlatform === 'youtube' ? 'Channel name' : '@username'}
                          className="flex-1"
                          onKeyPress={e => e.key === 'Enter' && handleQuickLookup()}
                        />
                        <Button 
                          onClick={handleQuickLookup}
                          disabled={quickLookupLoading}
                          className="bg-amber-500 hover:bg-amber-600"
                        >
                          {quickLookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>

                      {/* Quick Lookup Result */}
                      {quickLookupResult && (
                        <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 space-y-3">
                          <div className="flex items-center gap-3">
                            {quickLookupResult.profile_picture_url ? (
                              <img 
                                src={quickLookupResult.profile_picture_url} 
                                alt="" 
                                className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-200"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                <User className="w-6 h-6 text-amber-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{quickLookupResult.name || quickLookupResult.username}</h4>
                              <p className="text-sm text-gray-500">@{quickLookupResult.username}</p>
                            </div>
                            <Badge className={quickLookupResult.platform === 'youtube' ? 'bg-red-100 text-red-700' : 'bg-pink-100 text-pink-700'}>
                              {quickLookupResult.platform === 'youtube' ? <Youtube className="w-3 h-3 mr-1" /> : <Instagram className="w-3 h-3 mr-1" />}
                              {quickLookupResult.platform}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-white rounded-lg">
                              <div className="text-lg font-bold text-gray-900">
                                {formatNumber(quickLookupResult.followers_count || quickLookupResult.subscribers_count)}
                              </div>
                              <div className="text-xs text-gray-500">{quickLookupResult.platform === 'youtube' ? 'Subs' : 'Followers'}</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg">
                              <div className="text-lg font-bold text-green-600">
                                {(quickLookupResult.engagement_rate || 0).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500">Engagement</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg">
                              <div className="text-lg font-bold text-gray-900">
                                {quickLookupResult.media_count || quickLookupResult.video_count || 0}
                              </div>
                              <div className="text-xs text-gray-500">{quickLookupResult.platform === 'youtube' ? 'Videos' : 'Posts'}</div>
                            </div>
                          </div>
                          
                          {quickLookupResult.bio && (
                            <p className="text-sm text-gray-600 line-clamp-2">{quickLookupResult.bio}</p>
                          )}
                          
                          <Button onClick={handleSaveQuickLookup} className="w-full bg-amber-500 hover:bg-amber-600">
                            <Plus className="w-4 h-4 mr-2" /> Save to Contacts
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* API Status */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="w-4 h-4 text-green-500" /> Integration Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-pink-500" />
                          <span className="text-sm font-medium">Instagram API</span>
                        </div>
                        <Badge className="bg-green-100 text-green-700">Connected</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Youtube className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium">YouTube API</span>
                        </div>
                        <Badge className="bg-green-100 text-green-700">Connected</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 2: Processing Animation */}
            {wizardStep === 2 && (
              <div className="max-w-2xl mx-auto">
                <Card className="border-0 shadow-2xl overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
                  <CardContent className="p-12 text-center">
                    <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center animate-pulse">
                      <Brain className="w-12 h-12 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">AI is Working</h2>
                    <p className="text-gray-500 mb-8">{processingStage}</p>
                    <Progress value={processingProgress} className="h-3 mb-4" />
                    <p className="text-sm text-amber-600 font-medium">{processingProgress}% Complete</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Results */}
            {wizardStep === 3 && results && (
              <div className="space-y-6">
                {/* Insights Banner */}
                {insights && (
                  <Card className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-3">AI Campaign Insights</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {insights.target_audience_analysis && (
                              <div>
                                <p className="text-xs text-amber-100 uppercase mb-1">Audience</p>
                                <p className="text-sm">{insights.target_audience_analysis}</p>
                              </div>
                            )}
                            {insights.best_posting_times && (
                              <div>
                                <p className="text-xs text-amber-100 uppercase mb-1">Best Time</p>
                                <p className="text-sm">{insights.best_posting_times}</p>
                              </div>
                            )}
                            {insights.recommended_content_types?.length > 0 && (
                              <div>
                                <p className="text-xs text-amber-100 uppercase mb-1">Content</p>
                                <div className="flex flex-wrap gap-1">
                                  {insights.recommended_content_types.slice(0, 3).map((ct, i) => (
                                    <Badge key={i} className="bg-white/20 text-white text-xs">{ct}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {insights.budget_allocation_suggestion && (
                              <div>
                                <p className="text-xs text-amber-100 uppercase mb-1">Budget Tip</p>
                                <p className="text-sm">{insights.budget_allocation_suggestion}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Results Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={resetDiscovery} className="border-amber-200 text-amber-700 hover:bg-amber-50">
                      <ArrowLeft className="w-4 h-4 mr-2" /> New Search
                    </Button>
                    <h2 className="text-xl font-bold text-gray-900">
                      {filteredRecommendations.length} Perfect Matches Found
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="match_score">Match Score</SelectItem>
                        <SelectItem value="followers">Followers</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRecommendations.map((rec, idx) => {
                    const inf = rec.influencer;
                    if (!inf) return null;
                    
                    return (
                      <Card 
                        key={inf.id || idx} 
                        className="border-0 shadow-lg hover:shadow-xl transition-all group overflow-hidden"
                      >
                        {/* Match Score Banner */}
                        <div className={`h-1.5 ${
                          rec.match_score >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                          rec.match_score >= 60 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                          'bg-gradient-to-r from-gray-300 to-gray-400'
                        }`} />
                        
                        <CardContent className="p-5">
                          {/* Header */}
                          <div className="flex items-start gap-4 mb-4">
                            {inf.profile_picture_url ? (
                              <img 
                                src={inf.profile_picture_url} 
                                alt=""
                                className="w-16 h-16 rounded-xl object-cover ring-2 ring-gray-100"
                              />
                            ) : (
                              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                                inf.platform === 'youtube' 
                                  ? 'bg-gradient-to-br from-red-100 to-red-50' 
                                  : 'bg-gradient-to-br from-pink-100 to-purple-50'
                              }`}>
                                {inf.platform === 'youtube' ? (
                                  <Youtube className="w-7 h-7 text-red-500" />
                                ) : (
                                  <Instagram className="w-7 h-7 text-pink-500" />
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 truncate">{inf.name || inf.username}</h3>
                              <p className="text-sm text-gray-500">@{inf.username}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`text-xs ${
                                  inf.platform === 'youtube' 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-pink-100 text-pink-700'
                                }`}>
                                  {inf.platform}
                                </Badge>
                                <Badge className={`text-xs ${
                                  rec.match_score >= 80 ? 'bg-green-100 text-green-700' :
                                  rec.match_score >= 60 ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {rec.match_score || 0}% Match
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-gray-900">
                                {formatNumber(inf.followers_count || inf.subscribers_count)}
                              </div>
                              <div className="text-xs text-gray-500">{inf.platform === 'youtube' ? 'Subs' : 'Followers'}</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-green-600">
                                {(inf.engagement_rate || 0).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500">Engage</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-amber-600">
                                {formatNumber(inf.average_likes || inf.average_views || 0)}
                              </div>
                              <div className="text-xs text-gray-500">Avg {inf.platform === 'youtube' ? 'Views' : 'Likes'}</div>
                            </div>
                          </div>

                          {/* Reason */}
                          {rec.reason && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2 italic">"{rec.reason}"</p>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleSaveInfluencer(rec)}
                              disabled={savingId === inf.id}
                              className="flex-1 bg-amber-500 hover:bg-amber-600"
                            >
                              {savingId === inf.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" /> Save
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleGenerateOutreach(rec)}
                              className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                            >
                              <Send className="w-4 h-4 mr-1" /> Outreach
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          /* PR Discovery Tab */
          <Card className="border-0 shadow-xl max-w-3xl mx-auto">
            <div className="h-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <Newspaper className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">PR & Media Discovery</CardTitle>
                  <p className="text-sm text-gray-500">Find journalists and media contacts for your story</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
                  Story Topic <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={prBrief.topic}
                  onChange={e => setPrBrief(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="Describe your story angle, announcement, or news..."
                  rows={3}
                  className="bg-gray-50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Industry Beat</Label>
                  <Select value={prBrief.industry} onValueChange={v => setPrBrief(prev => ({ ...prev, industry: v }))}>
                    <SelectTrigger className="bg-gray-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BEAT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Target Audience</Label>
                  <Input
                    value={prBrief.target_audience}
                    onChange={e => setPrBrief(prev => ({ ...prev, target_audience: e.target.value }))}
                    placeholder="e.g., Business readers, Fashion enthusiasts"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <Button 
                onClick={handlePRDiscover}
                disabled={prLoading || !prBrief.topic}
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-xl"
              >
                {prLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Finding Media Contacts...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Discover Media Contacts
                  </>
                )}
              </Button>

              {/* PR Results */}
              {prResults?.recommendations?.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">{prResults.recommendations.length} Media Contacts Found</h3>
                  {prResults.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{rec.journalist?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{rec.journalist?.publication || rec.journalist?.beat}</div>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">{rec.match_score || 0}% Match</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Outreach Modal */}
      <Dialog open={showOutreachModal} onOpenChange={setShowOutreachModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500" />
              Outreach Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {generatingOutreach ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
                <p className="text-gray-500">Generating personalized message...</p>
              </div>
            ) : outreachMessage ? (
              <>
                <div>
                  <Label className="text-xs uppercase text-gray-500 mb-1 block">Subject</Label>
                  <Input value={outreachMessage.subject || ''} readOnly className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-xs uppercase text-gray-500 mb-1 block">Message</Label>
                  <Textarea 
                    value={outreachMessage.message || ''} 
                    readOnly 
                    rows={8}
                    className="bg-gray-50"
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(outreachMessage.message || '');
                      toast.success('Copied to clipboard!');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Copy Message
                  </Button>
                  <Button className="flex-1 bg-amber-500 hover:bg-amber-600">
                    <Send className="w-4 h-4 mr-2" /> Send Email
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIDiscoveryPage;
