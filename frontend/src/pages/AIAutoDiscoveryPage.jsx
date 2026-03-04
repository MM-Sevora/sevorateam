import React, { useState } from 'react';
import { aiApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { 
    Sparkles, 
    Search,
    Users,
    TrendingUp,
    MapPin,
    Instagram,
    Plus,
    CheckCircle,
    Loader2,
    Target,
    Lightbulb,
    Zap,
    AlertCircle,
    DollarSign,
    Eye
} from 'lucide-react';

const CATEGORIES = [
    { value: 'luxury', label: 'Luxury Fashion' },
    { value: 'menswear', label: 'Menswear' },
    { value: 'womenswear', label: 'Womenswear' },
    { value: 'streetwear', label: 'Streetwear' },
    { value: 'ethnic', label: 'Ethnic/Traditional' },
    { value: 'sustainable', label: 'Sustainable Fashion' },
    { value: 'activewear', label: 'Activewear' },
];

const FOLLOWER_RANGES = [
    { value: '1K-10K', label: 'Nano (1K-10K)' },
    { value: '10K-50K', label: 'Micro (10K-50K)' },
    { value: '50K-500K', label: 'Mid-tier (50K-500K)' },
    { value: '500K-1M', label: 'Macro (500K-1M)' },
    { value: '1M+', label: 'Mega (1M+)' },
];

const BUDGET_RANGES = [
    { value: '₹5K-₹20K', label: '₹5K - ₹20K per influencer' },
    { value: '₹20K-₹50K', label: '₹20K - ₹50K per influencer' },
    { value: '₹50K-₹1L', label: '₹50K - ₹1L per influencer' },
    { value: '₹1L-₹5L', label: '₹1L - ₹5L per influencer' },
    { value: '₹5L+', label: '₹5L+ per influencer' },
];

const LOCATIONS = [
    'India', 'Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 
    'Hyderabad', 'Pune', 'Jaipur', 'Metro Cities'
];

export const AIAutoDiscoveryPage = () => {
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState({});
    const [imported, setImported] = useState({});
    const [results, setResults] = useState(null);
    const [searchParams, setSearchParams] = useState({
        campaign_brief: '',
        category: 'luxury',
        target_audience: 'Young professionals aged 25-35 in metro cities',
        budget_range: '₹20K-₹50K',
        location: 'India',
        style_preference: 'Luxury, minimal, contemporary',
        follower_range: '10K-500K',
        content_type: 'Reels, Stories, Posts',
        num_suggestions: 10
    });

    const handleDiscover = async () => {
        if (!searchParams.campaign_brief) {
            toast.error('Please enter a campaign brief');
            return;
        }

        setLoading(true);
        setResults(null);
        
        try {
            const response = await aiApi.autoDiscover(searchParams);
            setResults(response.data);
            toast.success(`Found ${response.data.total_discovered} potential influencers!`);
        } catch (error) {
            toast.error('Discovery failed. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (influencer, index) => {
        setImporting(prev => ({ ...prev, [index]: true }));
        try {
            await aiApi.importDiscovered(influencer);
            setImported(prev => ({ ...prev, [index]: true }));
            toast.success(`${influencer.name} added to your CRM!`);
        } catch (error) {
            toast.error('Failed to import influencer');
        } finally {
            setImporting(prev => ({ ...prev, [index]: false }));
        }
    };

    const InfluencerCard = ({ influencer, index, isExisting = false }) => (
        <Card className="border border-border hover:border-gold/30 transition-all duration-300">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                            <span className="font-serif text-lg text-gold">
                                {influencer.name?.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <h4 className="font-medium">{influencer.name}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Instagram className="w-3.5 h-3.5" />
                                @{influencer.instagram_handle}
                            </p>
                        </div>
                    </div>
                    {!isExisting && (
                        <Badge 
                            className={`${
                                influencer.audience_match_score >= 80 
                                    ? 'bg-green-100 text-green-700' 
                                    : influencer.audience_match_score >= 60 
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {influencer.audience_match_score}% Match
                        </Badge>
                    )}
                    {isExisting && (
                        <Badge variant="outline" className="bg-gold/10 text-gold border-gold/20">
                            In Database
                        </Badge>
                    )}
                </div>

                {influencer.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {influencer.bio}
                    </p>
                )}

                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-muted/50 rounded-sm">
                        <p className="font-serif text-lg">{(influencer.followers / 1000).toFixed(0)}K</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Followers</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-sm">
                        <p className="font-serif text-lg">{influencer.engagement_rate}%</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Engagement</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-sm">
                        <p className="font-serif text-lg">
                            {influencer.estimated_rate_per_reel 
                                ? `₹${(influencer.estimated_rate_per_reel / 1000).toFixed(0)}K`
                                : influencer.rate_per_reel 
                                    ? `₹${(influencer.rate_per_reel / 1000).toFixed(0)}K`
                                    : '-'
                            }
                        </p>
                        <p className="text-[10px] uppercase text-muted-foreground">Per Reel</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{influencer.city}</span>
                    <span className="text-muted-foreground">•</span>
                    <Badge variant="outline" className="text-xs capitalize">{influencer.category}</Badge>
                    {influencer.tier && (
                        <>
                            <span className="text-muted-foreground">•</span>
                            <Badge variant="outline" className="text-xs capitalize">{influencer.tier}</Badge>
                        </>
                    )}
                </div>

                {influencer.style_tags && influencer.style_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {influencer.style_tags.slice(0, 4).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}

                {influencer.why_recommended && (
                    <div className="p-2 bg-gold/5 rounded-sm mb-3">
                        <p className="text-xs text-muted-foreground flex items-start gap-2">
                            <Lightbulb className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
                            {influencer.why_recommended}
                        </p>
                    </div>
                )}

                {!isExisting && (
                    <Button
                        onClick={() => handleImport(influencer, index)}
                        disabled={importing[index] || imported[index]}
                        className="w-full rounded-none"
                        variant={imported[index] ? 'secondary' : 'default'}
                    >
                        {importing[index] ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                        ) : imported[index] ? (
                            <><CheckCircle className="w-4 h-4 mr-2" /> Added to CRM</>
                        ) : (
                            <><Plus className="w-4 h-4 mr-2" /> Add to CRM</>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="p-8 space-y-8" data-testid="ai-discovery-page">
            {/* Header */}
            <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    AI-Powered Discovery
                </p>
                <h1 className="font-serif text-4xl flex items-center gap-3">
                    Auto Discover Influencers
                    <Sparkles className="w-8 h-8 text-gold" />
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                    Describe your campaign and let AI find the perfect influencers for your brand. 
                    Our system analyzes profiles, engagement patterns, and audience demographics to recommend the best matches.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Search Form */}
                <Card className="border border-border lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="font-serif text-lg flex items-center gap-2">
                            <Search className="w-5 h-5 text-gold" />
                            Campaign Brief
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider">
                                Describe Your Campaign <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                data-testid="campaign-brief-input"
                                value={searchParams.campaign_brief}
                                onChange={(e) => setSearchParams({ ...searchParams, campaign_brief: e.target.value })}
                                placeholder="e.g., Looking for luxury fashion influencers for our summer collection launch. Need creators who embody minimal aesthetics and have an engaged audience interested in premium menswear..."
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider">Category</Label>
                            <Select 
                                value={searchParams.category} 
                                onValueChange={(v) => setSearchParams({ ...searchParams, category: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider">Target Audience</Label>
                            <Input
                                value={searchParams.target_audience}
                                onChange={(e) => setSearchParams({ ...searchParams, target_audience: e.target.value })}
                                placeholder="e.g., Young professionals 25-35"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider">Follower Range</Label>
                            <Select 
                                value={searchParams.follower_range} 
                                onValueChange={(v) => setSearchParams({ ...searchParams, follower_range: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {FOLLOWER_RANGES.map(range => (
                                        <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider">Budget Range</Label>
                            <Select 
                                value={searchParams.budget_range} 
                                onValueChange={(v) => setSearchParams({ ...searchParams, budget_range: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {BUDGET_RANGES.map(range => (
                                        <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider">Location</Label>
                            <Select 
                                value={searchParams.location} 
                                onValueChange={(v) => setSearchParams({ ...searchParams, location: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {LOCATIONS.map(loc => (
                                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider">Style Preference</Label>
                            <Input
                                value={searchParams.style_preference}
                                onChange={(e) => setSearchParams({ ...searchParams, style_preference: e.target.value })}
                                placeholder="e.g., Minimal, luxury, contemporary"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase tracking-wider">Content Type</Label>
                            <Input
                                value={searchParams.content_type}
                                onChange={(e) => setSearchParams({ ...searchParams, content_type: e.target.value })}
                                placeholder="e.g., Reels, Stories, Posts"
                            />
                        </div>

                        <Separator />

                        <Button
                            onClick={handleDiscover}
                            disabled={loading || !searchParams.campaign_brief}
                            className="w-full rounded-none bg-gold text-white hover:bg-gold/90 h-12"
                            data-testid="discover-btn"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    AI is searching...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    Discover Influencers
                                </>
                            )}
                        </Button>

                        {loading && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Analyzing campaign requirements...</span>
                                </div>
                                <Progress value={33} className="h-1" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results */}
                <div className="lg:col-span-2 space-y-6">
                    {results ? (
                        <>
                            {/* AI Strategy */}
                            {results.search_strategy && (
                                <Card className="border border-gold/30 bg-gold/5">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                                                <Target className="w-5 h-5 text-gold" />
                                            </div>
                                            <div>
                                                <p className="font-mono text-xs uppercase text-gold mb-1">AI Search Strategy</p>
                                                <p className="text-sm">{results.search_strategy}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Ideal Profile */}
                            {results.ideal_profile && (
                                <Card className="border border-border">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                                <Users className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-mono text-xs uppercase text-muted-foreground mb-1">Ideal Influencer Profile</p>
                                                <p className="text-sm">{results.ideal_profile}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Campaign Insights */}
                            {results.campaign_insights && (
                                <Card className="border border-border">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="font-serif text-lg flex items-center gap-2">
                                            <Lightbulb className="w-5 h-5 text-gold" />
                                            Campaign Insights
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm whitespace-pre-wrap">{results.campaign_insights}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="border border-border">
                                    <CardContent className="p-4 text-center">
                                        <p className="font-serif text-3xl text-gold">{results.total_discovered}</p>
                                        <p className="font-mono text-xs uppercase text-muted-foreground">AI Discovered</p>
                                    </CardContent>
                                </Card>
                                <Card className="border border-border">
                                    <CardContent className="p-4 text-center">
                                        <p className="font-serif text-3xl">{results.total_existing_matches}</p>
                                        <p className="font-mono text-xs uppercase text-muted-foreground">Existing Matches</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Discovered Influencers */}
                            {results.discovered_influencers?.length > 0 && (
                                <div>
                                    <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-gold" />
                                        AI Discovered Influencers
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {results.discovered_influencers.map((influencer, index) => (
                                            <InfluencerCard 
                                                key={index} 
                                                influencer={influencer} 
                                                index={index}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Existing Matches */}
                            {results.existing_matches?.length > 0 && (
                                <div>
                                    <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Matching Influencers in Your CRM
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {results.existing_matches.map((influencer, index) => (
                                            <InfluencerCard 
                                                key={influencer.id} 
                                                influencer={influencer} 
                                                index={`existing-${index}`}
                                                isExisting={true}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <Card className="border border-dashed border-muted-foreground/30 bg-muted/20">
                            <CardContent className="p-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-gold" />
                                </div>
                                <h3 className="font-serif text-xl mb-2">Ready to Discover</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Enter your campaign brief and preferences, then click "Discover Influencers" 
                                    to let AI find the perfect matches for your brand.
                                </p>
                                <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-gold" />
                                        GPT-5.2 Powered
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Eye className="w-4 h-4" />
                                        Deep Analysis
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Target className="w-4 h-4" />
                                        Match Scoring
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
