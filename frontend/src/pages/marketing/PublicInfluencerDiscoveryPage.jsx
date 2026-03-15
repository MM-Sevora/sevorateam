import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Search, Sparkles, Instagram, Youtube, Globe, MapPin, Users, 
  TrendingUp, Download, Plus, Loader2, ExternalLink, Mail,
  CheckCircle2, AlertCircle, RefreshCw, Eye, Save, Filter
} from 'lucide-react';

const NICHES = [
  'Fashion', 'Beauty', 'Lifestyle', 'Food', 'Travel', 'Fitness', 
  'Tech', 'Gaming', 'Finance', 'Education', 'Parenting', 'Home Decor',
  'Entertainment', 'Music', 'Art', 'Photography', 'Health', 'Wellness'
];

const FOLLOWER_RANGES = [
  { value: '1k-10k', label: 'Nano (1K-10K)', tier: 'nano' },
  { value: '10k-100k', label: 'Micro (10K-100K)', tier: 'micro' },
  { value: '100k-500k', label: 'Mid-Tier (100K-500K)', tier: 'mid' },
  { value: '500k-1M', label: 'Macro (500K-1M)', tier: 'macro' },
  { value: '1M+', label: 'Mega (1M+)', tier: 'mega' }
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'youtube', label: 'YouTube', icon: Youtube }
];

const PublicInfluencerDiscoveryPage = () => {
  const { api } = useAuth();
  
  // Search form state
  const [searchForm, setSearchForm] = useState({
    niche: '',
    location: '',
    platform: 'instagram',
    follower_range: '10k-100k',
    count: 20
  });
  
  // Results state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedInfluencers, setSelectedInfluencers] = useState([]);
  const [savingIds, setSavingIds] = useState([]);
  const [shownHandles, setShownHandles] = useState([]); // Track shown handles for "Discover More"
  
  // Enrich modal
  const [enrichModal, setEnrichModal] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState(null);

  const handleSearch = async (discoverMore = false) => {
    if (!searchForm.niche) {
      toast.error('Please select a niche/industry');
      return;
    }
    
    setLoading(true);
    if (!discoverMore) {
      setResults(null);
      setSelectedInfluencers([]);
      setShownHandles([]);
    }
    
    try {
      const payload = {
        ...searchForm,
        exclude_handles: discoverMore ? shownHandles : []
      };
      
      const response = await api.post('/marketing/v2/influencers/public-discover', payload);
      
      // Track shown handles
      const newHandles = (response.data.influencers || []).map(i => i.instagram_handle?.toLowerCase()).filter(Boolean);
      setShownHandles(prev => [...prev, ...newHandles]);
      
      if (discoverMore && results?.influencers) {
        // Append to existing results
        setResults({
          ...response.data,
          influencers: [...results.influencers, ...(response.data.influencers || [])]
        });
      } else {
        setResults(response.data);
      }
      
      if (response.data.influencers?.length > 0) {
        toast.success(`Found ${response.data.influencers.length} ${discoverMore ? 'more ' : ''}influencers!`);
      } else {
        toast.info('No more influencers found. Try different criteria.');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Discovery failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfluencer = async (influencer) => {
    setSavingIds(prev => [...prev, influencer.instagram_handle]);
    
    try {
      const response = await api.post('/marketing/v2/influencers/public-discover/save', influencer);
      
      if (response.data.success) {
        toast.success(`${influencer.name} added to database!`);
        setSelectedInfluencers(prev => [...prev, influencer.instagram_handle]);
      } else {
        toast.info(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to save influencer');
    } finally {
      setSavingIds(prev => prev.filter(id => id !== influencer.instagram_handle));
    }
  };

  const handleSaveSelected = async () => {
    const toSave = results?.influencers?.filter(inf => 
      selectedInfluencers.includes(inf.instagram_handle)
    ) || [];
    
    for (const influencer of toSave) {
      await handleSaveInfluencer(influencer);
    }
  };

  const handleEnrich = async (influencer) => {
    setEnrichModal(influencer);
    setEnriching(true);
    setEnrichedData(null);
    
    try {
      const response = await api.post('/marketing/v2/influencers/public-discover/enrich', {
        handle: influencer.instagram_handle,
        platform: influencer.platform || 'instagram'
      });
      setEnrichedData(response.data);
    } catch (error) {
      toast.error('Failed to enrich profile');
    } finally {
      setEnriching(false);
    }
  };

  const toggleSelectInfluencer = (handle) => {
    setSelectedInfluencers(prev => 
      prev.includes(handle) 
        ? prev.filter(h => h !== handle)
        : [...prev, handle]
    );
  };

  const getTierBadgeColor = (tier) => {
    switch(tier?.toLowerCase()) {
      case 'nano': return 'bg-gray-100 text-gray-700';
      case 'micro': return 'bg-blue-100 text-blue-700';
      case 'mid': return 'bg-green-100 text-green-700';
      case 'macro': return 'bg-purple-100 text-purple-700';
      case 'mega': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="public-discovery-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Marketing Operations</p>
          <h1 className="text-3xl font-bold text-[#4A3728] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            AI Influencer Discovery
          </h1>
          <p className="text-gray-600 mt-1">Find new influencers from public Instagram & social media</p>
        </div>
      </div>

      {/* Search Form */}
      <Card className="border-2 border-dashed border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5 text-purple-600" />
            Discover New Influencers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Niche */}
            <div>
              <Label className="text-sm font-medium">Niche/Industry *</Label>
              <Select 
                value={searchForm.niche} 
                onValueChange={(v) => setSearchForm(prev => ({ ...prev, niche: v }))}
              >
                <SelectTrigger className="mt-1" data-testid="niche-select">
                  <SelectValue placeholder="Select niche" />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map(niche => (
                    <SelectItem key={niche} value={niche.toLowerCase()}>{niche}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label className="text-sm font-medium">Location</Label>
              <Input
                placeholder="e.g., Mumbai, India"
                value={searchForm.location}
                onChange={(e) => setSearchForm(prev => ({ ...prev, location: e.target.value }))}
                className="mt-1"
                data-testid="location-input"
              />
            </div>

            {/* Platform */}
            <div>
              <Label className="text-sm font-medium">Platform</Label>
              <Select 
                value={searchForm.platform} 
                onValueChange={(v) => setSearchForm(prev => ({ ...prev, platform: v }))}
              >
                <SelectTrigger className="mt-1" data-testid="platform-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <p.icon className="w-4 h-4" /> {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Follower Range */}
            <div>
              <Label className="text-sm font-medium">Follower Range</Label>
              <Select 
                value={searchForm.follower_range} 
                onValueChange={(v) => setSearchForm(prev => ({ ...prev, follower_range: v }))}
              >
                <SelectTrigger className="mt-1" data-testid="follower-range-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOWER_RANGES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button 
                onClick={() => handleSearch(false)} 
                disabled={loading || !searchForm.niche}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="discover-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Discover
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                Discovered Influencers
              </h2>
              <Badge className="bg-purple-100 text-purple-700">
                {results.influencers?.length || 0} found
              </Badge>
            </div>
            
            {results.influencers?.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allHandles = results.influencers.map(i => i.instagram_handle);
                    setSelectedInfluencers(
                      selectedInfluencers.length === allHandles.length ? [] : allHandles
                    );
                  }}
                >
                  {selectedInfluencers.length === results.influencers?.length ? 'Deselect All' : 'Select All'}
                </Button>
                
                {selectedInfluencers.length > 0 && (
                  <Button
                    onClick={handleSaveSelected}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save {selectedInfluencers.length} to Database
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Search Insights */}
          {results.search_insights && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">AI Insights</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {results.search_insights.niche_observations || results.search_insights.recommendations}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Influencer Grid */}
          {results.influencers?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.influencers.map((influencer, idx) => (
                <Card 
                  key={influencer.instagram_handle || idx} 
                  className={`hover:shadow-lg transition-all ${
                    selectedInfluencers.includes(influencer.instagram_handle) 
                      ? 'ring-2 ring-purple-500 bg-purple-50/50' 
                      : ''
                  }`}
                >
                  <CardContent className="p-4">
                    {/* Header with checkbox */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedInfluencers.includes(influencer.instagram_handle)}
                          onCheckedChange={() => toggleSelectInfluencer(influencer.instagram_handle)}
                        />
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {influencer.name?.charAt(0) || '?'}
                        </div>
                      </div>
                      <Badge className={getTierBadgeColor(influencer.follower_tier)}>
                        {influencer.follower_tier || 'Unknown'}
                      </Badge>
                    </div>

                    {/* Name & Handle */}
                    <h3 className="font-semibold text-lg">{influencer.name || 'Unknown'}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Instagram className="w-4 h-4" />
                      <a 
                        href={influencer.profile_url || `https://instagram.com/${influencer.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        @{influencer.instagram_handle}
                      </a>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {influencer.estimated_followers?.toLocaleString() || 'N/A'}
                        </span>
                        <span className="text-xs text-amber-600" title="AI estimated - verify on Instagram">~</span>
                      </div>
                      {influencer.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="w-4 h-4" />
                          {influencer.location}
                        </div>
                      )}
                    </div>
                    
                    {/* Metrics disclaimer */}
                    {influencer.metrics_note && (
                      <p className="text-xs text-amber-600 mt-1 italic">
                        {influencer.metrics_note}
                      </p>
                    )}

                    {/* Niche */}
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {influencer.niche}
                      </Badge>
                      {influencer.content_style && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {influencer.content_style}
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {influencer.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {influencer.description}
                      </p>
                    )}

                    {/* Collaboration Fit */}
                    {influencer.collaboration_fit && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                        <strong>Why collaborate:</strong> {influencer.collaboration_fit}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEnrich(influencer)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Enrich
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(influencer.profile_url || `https://instagram.com/${influencer.instagram_handle}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleSaveInfluencer(influencer)}
                        disabled={savingIds.includes(influencer.instagram_handle)}
                        className="ml-auto bg-green-600 hover:bg-green-700"
                      >
                        {savingIds.includes(influencer.instagram_handle) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" /> Add
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No Influencers Found</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Try different search criteria or broaden your location/follower range.
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Discover More Button */}
          {results.influencers?.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleSearch(true)}
                disabled={loading}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Discover More Influencers
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!results && !loading && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-700">Discover New Influencers</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Our AI searches public Instagram profiles and social media to find influencers 
              matching your criteria. Select a niche and click Discover to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Enrich Modal */}
      <Dialog open={!!enrichModal} onOpenChange={() => setEnrichModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Profile Details: @{enrichModal?.instagram_handle}
            </DialogTitle>
          </DialogHeader>
          
          {enriching ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
              <p className="text-sm text-gray-500 mt-3">Fetching additional profile data...</p>
            </div>
          ) : enrichedData ? (
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Name</Label>
                  <p className="font-medium">{enrichedData.name || enrichModal?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Followers</Label>
                  <p className="font-medium">{enrichedData.followers?.toLocaleString() || enrichModal?.estimated_followers?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Engagement Rate</Label>
                  <p className="font-medium">{enrichedData.engagement_rate || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Location</Label>
                  <p className="font-medium">{enrichedData.location || enrichModal?.location || 'N/A'}</p>
                </div>
              </div>
              
              {/* Bio */}
              {enrichedData.bio && (
                <div>
                  <Label className="text-xs text-gray-500">Bio</Label>
                  <p className="text-sm mt-1">{enrichedData.bio}</p>
                </div>
              )}
              
              {/* Contact */}
              {enrichedData.email && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Mail className="w-5 h-5 text-green-600" />
                  <span className="text-sm">{enrichedData.email}</span>
                </div>
              )}
              
              {/* Recent Collaborations */}
              {enrichedData.recent_collaborations && (
                <div>
                  <Label className="text-xs text-gray-500">Recent Brand Collaborations</Label>
                  <p className="text-sm mt-1">{enrichedData.recent_collaborations}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p>Could not fetch additional data for this profile.</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrichModal(null)}>Close</Button>
            <Button onClick={() => { handleSaveInfluencer(enrichModal); setEnrichModal(null); }}>
              <Plus className="w-4 h-4 mr-2" /> Add to Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicInfluencerDiscoveryPage;
