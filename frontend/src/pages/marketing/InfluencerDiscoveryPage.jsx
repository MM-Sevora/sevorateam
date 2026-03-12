import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Search, Sparkles, Filter, Instagram, Youtube, Users, TrendingUp, 
  Crown, Medal, Award, Target, BarChart3, Loader2, X, Check,
  ArrowRight, Zap, Star, ChevronRight, ExternalLink
} from 'lucide-react';

const InfluencerDiscoveryPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  // Discovery state
  const [activeTab, setActiveTab] = useState('discover');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  
  // Filter state
  const [filters, setFilters] = useState({
    niche: '',
    tier: 'all',
    minFollowers: '',
    maxFollowers: '',
    minEngagement: '',
    platform: 'all',
    city: '',
    verifiedOnly: false
  });
  
  // AI Discovery state
  const [aiQuery, setAiQuery] = useState('');
  const [aiBudget, setAiBudget] = useState('');
  const [aiCampaignType, setAiCampaignType] = useState('');
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Comparison state
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [comparisonResults, setComparisonResults] = useState(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [comparingLoading, setComparingLoading] = useState(false);

  const handleDiscover = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.niche) params.append('niche', filters.niche);
      if (filters.tier !== 'all') params.append('tier', filters.tier);
      if (filters.minFollowers) params.append('min_followers', filters.minFollowers);
      if (filters.maxFollowers) params.append('max_followers', filters.maxFollowers);
      if (filters.minEngagement) params.append('min_engagement', filters.minEngagement);
      if (filters.platform !== 'all') params.append('platform', filters.platform);
      if (filters.city) params.append('city', filters.city);
      if (filters.verifiedOnly) params.append('verified_only', 'true');
      params.append('limit', '50');
      
      const response = await api.get(`/marketing/v2/influencers/discover?${params.toString()}`);
      setResults(response.data.influencers || []);
      toast.success(`Found ${response.data.total} influencers`);
    } catch (error) {
      toast.error('Failed to discover influencers');
    } finally {
      setLoading(false);
    }
  };

  const handleAiDiscover = async () => {
    if (!aiQuery.trim()) {
      toast.error('Please describe what you\'re looking for');
      return;
    }
    
    setAiLoading(true);
    try {
      const response = await api.post('/marketing/v2/influencers/ai-discover', {
        query: aiQuery,
        budget_range: aiBudget || undefined,
        campaign_type: aiCampaignType || undefined
      });
      
      if (response.data.success) {
        setAiResults(response.data);
        toast.success(`AI found ${response.data.recommendations?.length || 0} recommendations`);
      } else {
        toast.error(response.data.error || 'AI discovery failed');
      }
    } catch (error) {
      toast.error('Failed to run AI discovery');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleCompareSelection = (influencer) => {
    setSelectedForCompare(prev => {
      const isSelected = prev.find(i => i.id === influencer.id);
      if (isSelected) {
        return prev.filter(i => i.id !== influencer.id);
      } else if (prev.length < 5) {
        return [...prev, influencer];
      } else {
        toast.error('Maximum 5 influencers can be compared');
        return prev;
      }
    });
  };

  const handleCompare = async () => {
    if (selectedForCompare.length < 2) {
      toast.error('Select at least 2 influencers to compare');
      return;
    }
    
    setComparingLoading(true);
    try {
      const response = await api.post('/marketing/v2/influencers/compare', {
        influencer_ids: selectedForCompare.map(i => i.id)
      });
      setComparisonResults(response.data);
      setShowCompareDialog(true);
    } catch (error) {
      toast.error('Failed to compare influencers');
    } finally {
      setComparingLoading(false);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      nano: 'bg-gray-100 text-gray-700',
      micro: 'bg-blue-100 text-blue-700',
      macro: 'bg-purple-100 text-purple-700',
      mega: 'bg-orange-100 text-orange-700',
      celebrity: 'bg-yellow-100 text-yellow-700'
    };
    return colors[tier] || 'bg-gray-100 text-gray-700';
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Influencer Discovery</h1>
          <p className="text-gray-500 mt-1">Find and compare influencers for your campaigns</p>
        </div>
        
        {selectedForCompare.length > 0 && (
          <Button 
            onClick={handleCompare}
            disabled={comparingLoading || selectedForCompare.length < 2}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            {comparingLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4 mr-2" />
            )}
            Compare ({selectedForCompare.length})
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="discover" className="data-[state=active]:bg-[#c4a35a] data-[state=active]:text-white">
            <Filter className="w-4 h-4 mr-2" /> Filter Search
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-[#c4a35a] data-[state=active]:text-white">
            <Sparkles className="w-4 h-4 mr-2" /> AI Discovery
          </TabsTrigger>
        </TabsList>

        {/* Filter Search Tab */}
        <TabsContent value="discover" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-[#c4a35a]" />
                Search Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-xs text-gray-500">NICHE / INDUSTRY</Label>
                  <Input 
                    placeholder="e.g., Fashion, Tech, Beauty"
                    value={filters.niche}
                    onChange={e => setFilters({...filters, niche: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">TIER</Label>
                  <Select value={filters.tier} onValueChange={v => setFilters({...filters, tier: v})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="nano">Nano (1K-10K)</SelectItem>
                      <SelectItem value="micro">Micro (10K-100K)</SelectItem>
                      <SelectItem value="macro">Macro (100K-1M)</SelectItem>
                      <SelectItem value="mega">Mega (1M-10M)</SelectItem>
                      <SelectItem value="celebrity">Celebrity (10M+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">PLATFORM</Label>
                  <Select value={filters.platform} onValueChange={v => setFilters({...filters, platform: v})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">CITY</Label>
                  <Input 
                    placeholder="e.g., Mumbai, Delhi"
                    value={filters.city}
                    onChange={e => setFilters({...filters, city: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-xs text-gray-500">MIN FOLLOWERS</Label>
                  <Input 
                    type="number"
                    placeholder="10000"
                    value={filters.minFollowers}
                    onChange={e => setFilters({...filters, minFollowers: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">MAX FOLLOWERS</Label>
                  <Input 
                    type="number"
                    placeholder="1000000"
                    value={filters.maxFollowers}
                    onChange={e => setFilters({...filters, maxFollowers: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">MIN ENGAGEMENT %</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    placeholder="3.0"
                    value={filters.minEngagement}
                    onChange={e => setFilters({...filters, minEngagement: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="verified"
                      checked={filters.verifiedOnly}
                      onCheckedChange={v => setFilters({...filters, verifiedOnly: v})}
                    />
                    <Label htmlFor="verified" className="text-sm cursor-pointer">Verified Only</Label>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleDiscover} disabled={loading} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Search Influencers
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Discovery Tab */}
        <TabsContent value="ai" className="mt-4">
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI-Powered Discovery
                <Badge className="bg-purple-100 text-purple-700">GPT-4o</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Describe what you're looking for</Label>
                  <Textarea 
                    placeholder="e.g., Find fashion influencers in Mumbai with high engagement for a luxury brand campaign targeting young professionals"
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    className="mt-1 min-h-[100px] bg-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">BUDGET RANGE (Optional)</Label>
                    <Input 
                      placeholder="e.g., 50000-100000"
                      value={aiBudget}
                      onChange={e => setAiBudget(e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">CAMPAIGN TYPE (Optional)</Label>
                    <Select value={aiCampaignType} onValueChange={setAiCampaignType}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="product_launch">Product Launch</SelectItem>
                        <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                        <SelectItem value="event_promotion">Event Promotion</SelectItem>
                        <SelectItem value="content_collab">Content Collaboration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  onClick={handleAiDiscover} 
                  disabled={aiLoading || !aiQuery.trim()}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Find with AI
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* AI Results */}
          {aiResults && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">AI Recommendations</CardTitle>
                {aiResults.search_insights && (
                  <p className="text-sm text-gray-500 mt-1">{aiResults.search_insights}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiResults.recommendations?.map((rec, index) => (
                    <div 
                      key={index}
                      className="p-4 border rounded-lg hover:border-purple-300 hover:bg-purple-50/30 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{rec.name}</h4>
                            <Badge variant="outline">{rec.handle}</Badge>
                            <Badge className="bg-purple-100 text-purple-700">
                              {rec.match_score}% Match
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{rec.reasoning}</p>
                          
                          {rec.strengths && rec.strengths.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {rec.strengths.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {rec.estimated_cost && (
                            <p className="text-sm text-gray-500 mt-2">
                              <span className="font-medium">Est. Cost:</span> {rec.estimated_cost}
                            </p>
                          )}
                        </div>
                        
                        {rec.influencer_id && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/marketing/influencer/${rec.influencer_id}`)}
                          >
                            View Profile <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {aiResults.alternative_suggestions && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Suggestion:</strong> {aiResults.alternative_suggestions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Results Grid */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">
              {results.length} Influencers Found
            </h3>
            {selectedForCompare.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedForCompare([])}
              >
                <X className="w-4 h-4 mr-1" /> Clear Selection
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {results.map(inf => {
              const isSelected = selectedForCompare.find(i => i.id === inf.id);
              const PlatformIcon = inf.primary_platform === 'youtube' ? Youtube : Instagram;
              
              return (
                <Card 
                  key={inf.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                  }`}
                  onClick={() => toggleCompareSelection(inf)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          inf.primary_platform === 'youtube' 
                            ? 'bg-red-100' 
                            : 'bg-gradient-to-br from-pink-100 to-purple-100'
                        }`}>
                          <PlatformIcon className={`w-5 h-5 ${
                            inf.primary_platform === 'youtube' ? 'text-red-600' : 'text-pink-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{inf.name}</h4>
                          <p className="text-sm text-gray-500">
                            @{inf.instagram_handle || inf.youtube_handle}
                          </p>
                        </div>
                      </div>
                      
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <Badge className={getTierColor(inf.tier)}>{inf.tier}</Badge>
                      <Badge variant="outline">{inf.industry}</Badge>
                      {(inf.instagram_verified || inf.youtube_verified) && (
                        <Badge className="bg-blue-100 text-blue-700">Verified</Badge>
                      )}
                    </div>
                    
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-lg font-bold text-gray-900">{formatNumber(inf.followers)}</p>
                        <p className="text-xs text-gray-500">Followers</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-lg font-bold text-gray-900">{inf.engagement_rate || 0}%</p>
                        <p className="text-xs text-gray-500">Engagement</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-lg font-bold text-gray-900">{inf.score || '-'}</p>
                        <p className="text-xs text-gray-500">Score</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-sm text-gray-500">{inf.city}</span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/marketing/influencer/${inf.id}`);
                        }}
                      >
                        View <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Influencer Comparison
            </DialogTitle>
          </DialogHeader>
          
          {comparisonResults && (
            <div className="space-y-6">
              {/* Winners Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-yellow-300 bg-yellow-50">
                  <CardContent className="p-4 text-center">
                    <Crown className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                    <p className="text-sm text-gray-500">Most Followers</p>
                    <p className="font-bold">
                      {comparisonResults.influencers?.find(i => i.id === comparisonResults.winner_by_metric?.followers)?.name || '-'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-green-300 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto text-green-600 mb-2" />
                    <p className="text-sm text-gray-500">Best Engagement</p>
                    <p className="font-bold">
                      {comparisonResults.influencers?.find(i => i.id === comparisonResults.winner_by_metric?.engagement_rate)?.name || '-'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-blue-300 bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <Target className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-sm text-gray-500">Best Value</p>
                    <p className="font-bold">
                      {comparisonResults.influencers?.find(i => i.id === comparisonResults.winner_by_metric?.best_value)?.name || '-'}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-semibold">Metric</th>
                      {comparisonResults.influencers?.map(inf => (
                        <th key={inf.id} className="text-center p-3 font-semibold">
                          {inf.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 text-gray-600">Followers</td>
                      {comparisonResults.influencers?.map(inf => (
                        <td key={inf.id} className="p-3 text-center">
                          <span className={`font-bold ${
                            inf.id === comparisonResults.winner_by_metric?.followers 
                              ? 'text-yellow-600' : ''
                          }`}>
                            {formatNumber(inf.followers)}
                            {inf.id === comparisonResults.winner_by_metric?.followers && (
                              <Crown className="w-4 h-4 inline ml-1 text-yellow-500" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-gray-600">Engagement Rate</td>
                      {comparisonResults.influencers?.map(inf => (
                        <td key={inf.id} className="p-3 text-center">
                          <span className={`font-bold ${
                            inf.id === comparisonResults.winner_by_metric?.engagement_rate 
                              ? 'text-green-600' : ''
                          }`}>
                            {inf.engagement_rate}%
                            {inf.id === comparisonResults.winner_by_metric?.engagement_rate && (
                              <Star className="w-4 h-4 inline ml-1 text-green-500" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-gray-600">Estimated Reach</td>
                      {comparisonResults.influencers?.map(inf => (
                        <td key={inf.id} className="p-3 text-center font-medium">
                          {formatNumber(inf.estimated_reach)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-gray-600">Rate per Post</td>
                      {comparisonResults.influencers?.map(inf => (
                        <td key={inf.id} className="p-3 text-center">
                          {inf.rate_per_post ? `₹${formatNumber(inf.rate_per_post)}` : '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-gray-600">Cost per 1K Followers</td>
                      {comparisonResults.influencers?.map(inf => (
                        <td key={inf.id} className="p-3 text-center">
                          <span className={`${
                            inf.id === comparisonResults.winner_by_metric?.best_value 
                              ? 'text-blue-600 font-bold' : ''
                          }`}>
                            {inf.cost_per_1k_followers ? `₹${inf.cost_per_1k_followers}` : '-'}
                            {inf.id === comparisonResults.winner_by_metric?.best_value && (
                              <Award className="w-4 h-4 inline ml-1 text-blue-500" />
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-gray-600">Platform</td>
                      {comparisonResults.influencers?.map(inf => (
                        <td key={inf.id} className="p-3 text-center">
                          <Badge variant="outline">{inf.platform}</Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-gray-600">Tier</td>
                      {comparisonResults.influencers?.map(inf => (
                        <td key={inf.id} className="p-3 text-center">
                          <Badge className={getTierColor(inf.tier)}>{inf.tier}</Badge>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 text-gray-600">Verified</td>
                      {comparisonResults.influencers?.map(inf => (
                        <td key={inf.id} className="p-3 text-center">
                          {inf.verified ? (
                            <Check className="w-5 h-5 mx-auto text-green-500" />
                          ) : (
                            <X className="w-5 h-5 mx-auto text-gray-300" />
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Radar Chart Data (Visual representation) */}
              {comparisonResults.radar_chart_data && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Performance Score (Normalized 0-100)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 flex-wrap">
                      {comparisonResults.radar_chart_data.map(inf => (
                        <div key={inf.id} className="flex-1 min-w-[200px] p-4 border rounded-lg">
                          <h4 className="font-semibold mb-3">{inf.name}</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">Followers</span>
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-yellow-500 rounded-full"
                                  style={{ width: `${inf.data.followers}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">Engagement</span>
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${inf.data.engagement}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">Reach</span>
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 rounded-full"
                                  style={{ width: `${inf.data.reach}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">Value</span>
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${inf.data.value}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfluencerDiscoveryPage;
