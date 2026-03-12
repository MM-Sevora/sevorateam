import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Sparkles, Users, Target, MapPin, DollarSign, 
  Instagram, Youtube, TrendingUp, CheckCircle,
  Loader2, Newspaper, Building2, Wand2, Brain, 
  Heart, ExternalLink, Plus, Search, Star, Eye
} from 'lucide-react';

const INDUSTRIES = ['Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Food', 'Travel', 'Fitness', 'Entertainment', 'Gaming'];
const PLATFORMS = ['Instagram', 'YouTube', 'Both'];
const OBJECTIVES = ['Brand Awareness', 'Product Launch', 'Engagement', 'Sales', 'Content Creation'];

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const AIToolsPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('influencer');
  
  // Influencer Discovery State
  const [infLoading, setInfLoading] = useState(false);
  const [infResults, setInfResults] = useState([]);
  const [infBrief, setInfBrief] = useState({
    industry: 'Fashion',
    platform: 'Instagram',
    objective: 'Brand Awareness',
    budget_min: 10000,
    budget_max: 500000,
    follower_min: 10000,
    follower_max: 1000000,
    description: ''
  });
  
  // PR Discovery State
  const [prLoading, setPrLoading] = useState(false);
  const [prResults, setPrResults] = useState([]);
  const [prBrief, setPrBrief] = useState({
    topic: '',
    industry: 'Fashion',
    story_type: 'news',
    target_audience: ''
  });

  // Handle Influencer Discovery
  const handleInfluencerDiscovery = useCallback(async () => {
    if (!infBrief.description && !infBrief.industry) {
      toast.error('Please provide campaign details');
      return;
    }
    
    setInfLoading(true);
    try {
      const response = await api.post('/marketing/v2/ai/discover-influencers', {
        industry: infBrief.industry,
        platform: infBrief.platform.toLowerCase(),
        objective: infBrief.objective,
        budget_range: { min: infBrief.budget_min, max: infBrief.budget_max },
        follower_range: { min: infBrief.follower_min, max: infBrief.follower_max },
        additional_requirements: infBrief.description,
        limit: 15
      });
      
      setInfResults(response.data.recommendations || []);
      
      if (response.data.recommendations?.length > 0) {
        toast.success(`Found ${response.data.recommendations.length} influencer recommendations!`);
      } else {
        toast.info('No matching influencers found. Try adjusting your criteria.');
      }
    } catch (error) {
      console.error('Discovery error:', error);
      toast.error('Discovery failed. Please try again.');
    } finally {
      setInfLoading(false);
    }
  }, [api, infBrief]);

  // Handle PR Discovery
  const handlePRDiscovery = useCallback(async () => {
    if (!prBrief.topic) {
      toast.error('Please enter a story topic');
      return;
    }
    
    setPrLoading(true);
    try {
      const response = await api.post('/marketing/v2/ai/discover-journalists', {
        topic: prBrief.topic,
        industry: prBrief.industry,
        story_type: prBrief.story_type,
        target_audience: prBrief.target_audience,
        limit: 15
      });
      
      setPrResults(response.data.recommendations || []);
      
      if (response.data.recommendations?.length > 0) {
        toast.success(`Found ${response.data.recommendations.length} media contacts!`);
      } else {
        toast.info('No matching journalists found. Try adjusting your story angle.');
      }
    } catch (error) {
      console.error('PR Discovery error:', error);
      toast.error('PR Discovery failed. Please try again.');
    } finally {
      setPrLoading(false);
    }
  }, [api, prBrief]);

  // Add influencer to database
  const handleAddInfluencer = async (rec) => {
    try {
      await api.post('/marketing/contacts', {
        name: rec.name,
        instagram_handle: rec.instagram_handle,
        youtube_handle: rec.youtube_handle,
        industry: rec.industry || infBrief.industry,
        pipeline_status: 'identified',
        source: 'ai_discovery'
      });
      toast.success(`${rec.name} added to your influencers!`);
    } catch (error) {
      toast.error('Failed to add influencer');
    }
  };

  return (
    <div className="p-8 space-y-6 bg-white min-h-screen" data-testid="ai-tools-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">AI-Powered Features</p>
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            AI Tools
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">GPT-4o</Badge>
          </h1>
          <p className="text-gray-500 mt-1">Discover influencers and media contacts using AI</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="influencer" className="gap-2 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <Users className="w-4 h-4" /> Influencer Discovery
          </TabsTrigger>
          <TabsTrigger value="pr" className="gap-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
            <Newspaper className="w-4 h-4" /> PR & Media
          </TabsTrigger>
        </TabsList>

        {/* Influencer Discovery Tab */}
        <TabsContent value="influencer" className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left - Form */}
            <Card className="col-span-1 bg-gradient-to-b from-amber-50 to-white border-amber-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wand2 className="w-5 h-5 text-amber-600" />
                  Campaign Brief
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Industry</Label>
                  <Select value={infBrief.industry} onValueChange={v => setInfBrief({...infBrief, industry: v})}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Platform</Label>
                  <Select value={infBrief.platform} onValueChange={v => setInfBrief({...infBrief, platform: v})}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Objective</Label>
                  <Select value={infBrief.objective} onValueChange={v => setInfBrief({...infBrief, objective: v})}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIVES.map(obj => (
                        <SelectItem key={obj} value={obj}>{obj}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Min Followers</Label>
                    <Input 
                      type="number" 
                      value={infBrief.follower_min}
                      onChange={e => setInfBrief({...infBrief, follower_min: parseInt(e.target.value) || 0})}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Max Followers</Label>
                    <Input 
                      type="number" 
                      value={infBrief.follower_max}
                      onChange={e => setInfBrief({...infBrief, follower_max: parseInt(e.target.value) || 0})}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Min Budget (₹)</Label>
                    <Input 
                      type="number" 
                      value={infBrief.budget_min}
                      onChange={e => setInfBrief({...infBrief, budget_min: parseInt(e.target.value) || 0})}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Max Budget (₹)</Label>
                    <Input 
                      type="number" 
                      value={infBrief.budget_max}
                      onChange={e => setInfBrief({...infBrief, budget_max: parseInt(e.target.value) || 0})}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Additional Requirements</Label>
                  <Textarea 
                    value={infBrief.description}
                    onChange={e => setInfBrief({...infBrief, description: e.target.value})}
                    placeholder="Describe your ideal influencer, content style, audience demographics..."
                    className="mt-1 bg-white min-h-[100px]"
                  />
                </div>
                
                <Button 
                  onClick={handleInfluencerDiscovery}
                  disabled={infLoading}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2 h-11"
                >
                  {infLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Find Influencers
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right - Results */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {infResults.length > 0 ? `${infResults.length} AI Recommendations` : 'AI Recommendations'}
                </h3>
                {infResults.length > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Powered by GPT-4o
                  </Badge>
                )}
              </div>
              
              {infLoading ? (
                <Card className="p-12">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-amber-500 mb-4" />
                    <p className="text-gray-600 font-medium">Analyzing your requirements...</p>
                    <p className="text-sm text-gray-400 mt-1">Finding the best influencer matches</p>
                  </div>
                </Card>
              ) : infResults.length === 0 ? (
                <Card className="p-12 bg-gray-50 border-dashed">
                  <div className="text-center text-gray-400">
                    <Brain className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">No recommendations yet</p>
                    <p className="text-sm mt-1">Fill in your campaign brief and click "Find Influencers"</p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {infResults.map((rec, idx) => (
                    <Card key={idx} className="hover:shadow-lg transition-shadow border-gray-200 overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              rec.platform === 'youtube' ? 'bg-red-100' : 'bg-gradient-to-br from-pink-100 to-purple-100'
                            }`}>
                              {rec.platform === 'youtube' ? 
                                <Youtube className="w-6 h-6 text-red-600" /> : 
                                <Instagram className="w-6 h-6 text-pink-600" />
                              }
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{rec.name}</h4>
                              <p className="text-xs text-gray-500">
                                @{rec.instagram_handle || rec.youtube_handle || 'unknown'}
                              </p>
                            </div>
                          </div>
                          {rec.match_score && (
                            <Badge className="bg-green-100 text-green-700">
                              {rec.match_score}% match
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{rec.reason}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {formatNumber(rec.followers)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {rec.engagement_rate?.toFixed(1) || '0'}%
                          </span>
                          {rec.industry && (
                            <Badge variant="outline" className="text-xs">{rec.industry}</Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAddInfluencer(rec)}
                            className="flex-1 gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </Button>
                          {rec.id && (
                            <Button 
                              size="sm"
                              onClick={() => navigate(`/marketing/influencer/${rec.id}`)}
                              className="flex-1 gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Eye className="w-3 h-3" /> View
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PR & Media Tab */}
        <TabsContent value="pr" className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left - Form */}
            <Card className="col-span-1 bg-gradient-to-b from-purple-50 to-white border-purple-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Newspaper className="w-5 h-5 text-purple-600" />
                  Story Brief
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Story Topic / Angle</Label>
                  <Textarea 
                    value={prBrief.topic}
                    onChange={e => setPrBrief({...prBrief, topic: e.target.value})}
                    placeholder="Describe your story, news, or PR pitch..."
                    className="mt-1 bg-white min-h-[100px]"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Industry / Beat</Label>
                  <Select value={prBrief.industry} onValueChange={v => setPrBrief({...prBrief, industry: v})}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Story Type</Label>
                  <Select value={prBrief.story_type} onValueChange={v => setPrBrief({...prBrief, story_type: v})}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="news">News / Announcement</SelectItem>
                      <SelectItem value="feature">Feature Story</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="review">Product Review</SelectItem>
                      <SelectItem value="event">Event Coverage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Target Audience</Label>
                  <Input 
                    value={prBrief.target_audience}
                    onChange={e => setPrBrief({...prBrief, target_audience: e.target.value})}
                    placeholder="e.g., Tech professionals, Fashion enthusiasts..."
                    className="mt-1 bg-white"
                  />
                </div>
                
                <Button 
                  onClick={handlePRDiscovery}
                  disabled={prLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 h-11"
                >
                  {prLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Find Media Contacts
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right - Results */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {prResults.length > 0 ? `${prResults.length} Media Contacts` : 'Media Contacts'}
                </h3>
                {prResults.length > 0 && (
                  <Badge variant="outline" className="text-purple-600 border-purple-300">
                    Powered by GPT-4o
                  </Badge>
                )}
              </div>
              
              {prLoading ? (
                <Card className="p-12">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500 mb-4" />
                    <p className="text-gray-600 font-medium">Analyzing your story...</p>
                    <p className="text-sm text-gray-400 mt-1">Finding relevant journalists and publications</p>
                  </div>
                </Card>
              ) : prResults.length === 0 ? (
                <Card className="p-12 bg-gray-50 border-dashed">
                  <div className="text-center text-gray-400">
                    <Newspaper className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">No media contacts yet</p>
                    <p className="text-sm mt-1">Describe your story and click "Find Media Contacts"</p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {prResults.map((rec, idx) => (
                    <Card key={idx} className="hover:shadow-lg transition-shadow border-gray-200 overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{rec.name}</h4>
                              <p className="text-xs text-gray-500">{rec.publication || rec.outlet}</p>
                            </div>
                          </div>
                          {rec.match_score && (
                            <Badge className="bg-purple-100 text-purple-700">
                              {rec.match_score}% match
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{rec.reason}</p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          {rec.beat && <Badge variant="outline" className="text-xs">{rec.beat}</Badge>}
                          {rec.role && <span className="text-gray-400">{rec.role}</span>}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add to List
                          </Button>
                          <Button 
                            size="sm"
                            className="flex-1 gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <ExternalLink className="w-3 h-3" /> View Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIToolsPage;
