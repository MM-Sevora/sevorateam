import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Slider } from '../../components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Sparkles, Search, Users, Target, MapPin, DollarSign, 
  Instagram, Youtube, TrendingUp, CheckCircle, XCircle,
  Bookmark, RefreshCw, ChevronDown, ChevronUp, Filter,
  ArrowUpDown, Star, Eye, MessageSquare, Send, Loader2
} from 'lucide-react';

const INDUSTRIES = [
  'Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Food', 'Travel', 
  'Fitness', 'Parenting', 'Finance', 'Education', 'Entertainment', 'Gaming'
];

const PLATFORMS = ['Instagram', 'YouTube', 'Both'];
const OBJECTIVES = ['Brand Awareness', 'Product Launch', 'Engagement', 'Sales', 'Content Creation'];

const AIDiscoveryPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  // Campaign Brief Form
  const [brief, setBrief] = useState({
    industry: '',
    target_audience: '',
    platform: 'Instagram',
    location: '',
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
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(0);
  
  // Action States
  const [savingId, setSavingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [outreachMessage, setOutreachMessage] = useState(null);
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  
  // Influencer data mapping
  const [influencerMap, setInfluencerMap] = useState({});

  const handleDiscover = async () => {
    if (!brief.industry) {
      toast.error('Please select an industry');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/ai/discovery/search', brief);
      
      if (response.data.success) {
        setSessionId(response.data.session_id);
        const data = response.data.data;
        setInsights(data.campaign_insights);
        
        // Fetch full influencer data for each recommendation
        const recs = data.recommendations || [];
        const map = {};
        
        for (const rec of recs) {
          try {
            const infRes = await api.get(`/marketing/v2/contacts/${rec.influencer_id}`);
            map[rec.influencer_id] = infRes.data;
          } catch (e) {
            console.log(`Could not fetch influencer ${rec.influencer_id}`);
          }
        }
        
        setInfluencerMap(map);
        setRecommendations(recs);
        setResults(data);
        toast.success(`Found ${recs.length} matching influencers!`);
      } else {
        toast.error(response.data.error || 'Discovery failed');
      }
    } catch (error) {
      toast.error('Discovery failed. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (influencerId) => {
    setSavingId(influencerId);
    try {
      await api.post('/ai/discovery/save', {
        influencer_id: influencerId,
        list_name: 'AI Discovery Results',
        update_status: true
      });
      toast.success('Influencer saved to list!');
      // Update local state to show saved badge
      setRecommendations(prev => prev.map(r => 
        r.influencer_id === influencerId ? { ...r, saved: true } : r
      ));
    } catch (error) {
      toast.error('Failed to save influencer');
    } finally {
      setSavingId(null);
    }
  };

  const handleReject = async (influencerId, reason = '') => {
    setRejectingId(influencerId);
    try {
      await api.post('/ai/discovery/reject', {
        influencer_id: influencerId,
        reason
      });
      toast.success('Influencer rejected');
      // Remove from recommendations
      setRecommendations(prev => prev.filter(r => r.influencer_id !== influencerId));
    } catch (error) {
      toast.error('Failed to reject influencer');
    } finally {
      setRejectingId(null);
    }
  };

  const handleGenerateOutreach = async (influencerId) => {
    const influencer = influencerMap[influencerId];
    if (!influencer) return;
    
    setSelectedInfluencer(influencer);
    setShowOutreachModal(true);
    setGeneratingOutreach(true);
    
    try {
      const response = await api.post('/ai/discovery/outreach-message', {
        influencer_id: influencerId,
        brand_name: 'Sevora',
        key_message: brief.objective,
        tone: 'professional'
      });
      
      if (response.data.success) {
        setOutreachMessage(response.data.data);
      } else {
        toast.error('Failed to generate outreach message');
      }
    } catch (error) {
      toast.error('Failed to generate outreach');
    } finally {
      setGeneratingOutreach(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  // Filter and sort recommendations
  const filteredRecommendations = recommendations
    .filter(r => r.match_score >= minScore)
    .sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'match_score') return (a.match_score - b.match_score) * multiplier;
      if (sortBy === 'followers') {
        const aFollowers = influencerMap[a.influencer_id]?.followers || 0;
        const bFollowers = influencerMap[b.influencer_id]?.followers || 0;
        return (aFollowers - bFollowers) * multiplier;
      }
      if (sortBy === 'engagement') {
        const aEng = influencerMap[a.influencer_id]?.engagement_rate || 0;
        const bEng = influencerMap[b.influencer_id]?.engagement_rate || 0;
        return (aEng - bEng) * multiplier;
      }
      return 0;
    });

  return (
    <div className="p-8 bg-gray-50 min-h-screen" data-testid="ai-discovery-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">AI-Powered</p>
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-500" />
            Influencer Discovery
          </h1>
        </div>
        {results && (
          <Button variant="outline" onClick={() => { setResults(null); setRecommendations([]); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> New Search
          </Button>
        )}
      </div>

      {/* Campaign Brief Form (shown when no results) */}
      {!results && (
        <Card className="bg-white border-gray-200 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              Campaign Brief
            </CardTitle>
            <p className="text-sm text-gray-500">Tell us about your campaign and we'll find the perfect influencers</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Row 1: Industry & Audience */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">INDUSTRY / NICHE *</Label>
                <Select value={brief.industry} onValueChange={v => setBrief(prev => ({ ...prev, industry: v }))}>
                  <SelectTrigger data-testid="industry-select"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">TARGET AUDIENCE</Label>
                <Input 
                  value={brief.target_audience}
                  onChange={e => setBrief(prev => ({ ...prev, target_audience: e.target.value }))}
                  placeholder="e.g., Women 25-35, Urban millennials"
                  data-testid="audience-input"
                />
              </div>
            </div>

            {/* Row 2: Platform & Location */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">PLATFORM</Label>
                <Select value={brief.platform} onValueChange={v => setBrief(prev => ({ ...prev, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">LOCATION</Label>
                <Input 
                  value={brief.location}
                  onChange={e => setBrief(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Mumbai, Maharashtra or India-wide"
                />
              </div>
            </div>

            {/* Row 3: Budget Range */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-3 block">
                BUDGET RANGE: {formatCurrency(brief.budget_min)} - {formatCurrency(brief.budget_max)}
              </Label>
              <div className="px-2">
                <Slider
                  value={[brief.budget_min, brief.budget_max]}
                  min={0}
                  max={1000000}
                  step={10000}
                  onValueChange={([min, max]) => setBrief(prev => ({ ...prev, budget_min: min, budget_max: max }))}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>₹0</span>
                <span>₹10L</span>
              </div>
            </div>

            {/* Row 4: Follower Range */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-3 block">
                FOLLOWER RANGE: {formatNumber(brief.follower_min)} - {formatNumber(brief.follower_max)}
              </Label>
              <div className="px-2">
                <Slider
                  value={[brief.follower_min, brief.follower_max]}
                  min={1000}
                  max={5000000}
                  step={10000}
                  onValueChange={([min, max]) => setBrief(prev => ({ ...prev, follower_min: min, follower_max: max }))}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1K</span>
                <span>5M</span>
              </div>
            </div>

            {/* Row 5: Objective & Content Type */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">CAMPAIGN OBJECTIVE</Label>
                <Select value={brief.objective} onValueChange={v => setBrief(prev => ({ ...prev, objective: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">CONTENT TYPE PREFERENCE</Label>
                <Input 
                  value={brief.content_type}
                  onChange={e => setBrief(prev => ({ ...prev, content_type: e.target.value }))}
                  placeholder="e.g., Reels, Stories, Posts, Videos"
                />
              </div>
            </div>

            {/* Additional Requirements */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">ADDITIONAL REQUIREMENTS</Label>
              <Textarea
                value={brief.additional_requirements}
                onChange={e => setBrief(prev => ({ ...prev, additional_requirements: e.target.value }))}
                placeholder="Any specific requirements, brand values, or preferences..."
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button 
              onClick={handleDiscover}
              disabled={loading || !brief.industry}
              className="w-full bg-[#c4a35a] hover:bg-[#b39349] text-white h-12 text-lg"
              data-testid="discover-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing & Finding Matches...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Discover Influencers
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {results && (
        <div className="space-y-6">
          {/* Campaign Insights */}
          {insights && (
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  AI Campaign Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {insights.target_audience_analysis && (
                    <div>
                      <p className="text-xs uppercase text-amber-600 mb-1">Audience Analysis</p>
                      <p className="text-sm text-gray-700">{insights.target_audience_analysis}</p>
                    </div>
                  )}
                  {insights.recommended_content_types?.length > 0 && (
                    <div>
                      <p className="text-xs uppercase text-amber-600 mb-1">Recommended Content</p>
                      <div className="flex flex-wrap gap-1">
                        {insights.recommended_content_types.map((ct, idx) => (
                          <Badge key={idx} variant="outline" className="bg-white">{ct}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {insights.best_posting_times && (
                    <div>
                      <p className="text-xs uppercase text-amber-600 mb-1">Best Posting Times</p>
                      <p className="text-sm text-gray-700">{insights.best_posting_times}</p>
                    </div>
                  )}
                  {insights.budget_allocation_suggestion && (
                    <div>
                      <p className="text-xs uppercase text-amber-600 mb-1">Budget Strategy</p>
                      <p className="text-sm text-gray-700">{insights.budget_allocation_suggestion}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters & Sort */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredRecommendations.length} Recommended Influencers
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-1" /> Filters
                {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-500">Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="match_score">Match Score</SelectItem>
                  <SelectItem value="followers">Followers</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card className="bg-white border-gray-200">
              <CardContent className="py-4">
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-2 block">
                      Minimum Match Score: {minScore}%
                    </Label>
                    <Slider
                      value={[minScore]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => setMinScore(v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-2 gap-4">
            {filteredRecommendations.map((rec) => {
              const influencer = influencerMap[rec.influencer_id];
              if (!influencer) return null;
              
              return (
                <Card 
                  key={rec.influencer_id}
                  className={`bg-white border-gray-200 hover:shadow-md transition-shadow ${rec.saved ? 'border-green-300' : ''}`}
                  data-testid={`influencer-card-${rec.influencer_id}`}
                >
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xl">
                          {influencer.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{influencer.name}</h3>
                            {rec.saved && <Badge className="bg-green-100 text-green-700">Saved</Badge>}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            {influencer.instagram_handle && (
                              <span className="flex items-center gap-1">
                                <Instagram className="w-3 h-3 text-pink-500" />
                                @{influencer.instagram_handle}
                              </span>
                            )}
                            {influencer.youtube_handle && (
                              <span className="flex items-center gap-1">
                                <Youtube className="w-3 h-3 text-red-500" />
                                {influencer.youtube_handle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Match Score */}
                      <div className="text-center">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${
                          rec.match_score >= 80 ? 'bg-green-100 text-green-700' :
                          rec.match_score >= 60 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {rec.match_score}%
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Match</p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-gray-900">{formatNumber(influencer.followers)}</div>
                        <div className="text-xs text-gray-500">Followers</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-gray-900">{influencer.engagement_rate?.toFixed(1) || 0}%</div>
                        <div className="text-xs text-gray-500">Engagement</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-gray-900">{formatNumber(influencer.avg_likes || 0)}</div>
                        <div className="text-xs text-gray-500">Avg Likes</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-gray-900">{influencer.tier || 'Mid'}</div>
                        <div className="text-xs text-gray-500">Tier</div>
                      </div>
                    </div>

                    {/* Match Reasons */}
                    {rec.match_reasons?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs uppercase text-gray-400 mb-2">Why this match</p>
                        <div className="space-y-1">
                          {rec.match_reasons.slice(0, 3).map((reason, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Concerns */}
                    {rec.concerns?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs uppercase text-gray-400 mb-2">Considerations</p>
                        <div className="space-y-1">
                          {rec.concerns.slice(0, 2).map((concern, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-amber-600">
                              <Eye className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {concern}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Collaboration */}
                    {rec.suggested_collaboration && (
                      <div className="p-3 bg-blue-50 rounded-lg mb-4">
                        <p className="text-xs uppercase text-blue-600 mb-1">Suggested Collaboration</p>
                        <p className="text-sm text-blue-800">{rec.suggested_collaboration}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/marketing/influencer/${rec.influencer_id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View Profile
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleGenerateOutreach(rec.influencer_id)}
                      >
                        <Send className="w-4 h-4 mr-1" /> Outreach
                      </Button>
                      {!rec.saved ? (
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleSave(rec.influencer_id)}
                          disabled={savingId === rec.influencer_id}
                          data-testid={`save-btn-${rec.influencer_id}`}
                        >
                          {savingId === rec.influencer_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled className="text-green-600">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(rec.influencer_id)}
                        disabled={rejectingId === rec.influencer_id}
                        data-testid={`reject-btn-${rec.influencer_id}`}
                      >
                        {rejectingId === rec.influencer_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredRecommendations.length === 0 && (
            <Card className="bg-white border-gray-200">
              <CardContent className="py-12 text-center">
                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No matching influencers found</h3>
                <p className="text-gray-500">Try adjusting your search criteria or expanding your filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Outreach Modal */}
      <Dialog open={showOutreachModal} onOpenChange={setShowOutreachModal}>
        <DialogContent className="max-w-lg" data-testid="outreach-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              AI-Generated Outreach for {selectedInfluencer?.name}
            </DialogTitle>
          </DialogHeader>
          
          {generatingOutreach ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
              <p className="text-gray-500">Generating personalized message...</p>
            </div>
          ) : outreachMessage ? (
            <div className="space-y-4 py-4">
              {outreachMessage.subject && (
                <div>
                  <Label className="text-xs uppercase text-gray-500">SUBJECT</Label>
                  <Input value={outreachMessage.subject} readOnly className="mt-1 bg-gray-50" />
                </div>
              )}
              <div>
                <Label className="text-xs uppercase text-gray-500">MESSAGE</Label>
                <Textarea 
                  value={outreachMessage.message} 
                  readOnly 
                  className="mt-1 bg-gray-50" 
                  rows={8}
                />
              </div>
              {outreachMessage.follow_up_message && (
                <div>
                  <Label className="text-xs uppercase text-gray-500">FOLLOW-UP MESSAGE</Label>
                  <Textarea 
                    value={outreachMessage.follow_up_message} 
                    readOnly 
                    className="mt-1 bg-gray-50" 
                    rows={4}
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1 bg-[#c4a35a] hover:bg-[#b39349] text-white"
                  onClick={() => {
                    // Copy message to clipboard
                    navigator.clipboard.writeText(outreachMessage.message);
                    toast.success('Message copied to clipboard!');
                  }}
                >
                  Copy Message
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/marketing/influencer/${selectedInfluencer?.id}`)}
                >
                  Go to Profile
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              Failed to generate message. Please try again.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIDiscoveryPage;
