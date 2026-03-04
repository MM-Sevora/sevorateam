import React, { useState } from 'react';
import { aiApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
    Sparkles, 
    Users,
    MessageSquare,
    Lightbulb,
    Copy,
    RefreshCw,
    Wand2
} from 'lucide-react';

export const AIStudioPage = () => {
    const [activeTab, setActiveTab] = useState('match');
    const [loading, setLoading] = useState(false);
    
    // Match Influencers
    const [matchParams, setMatchParams] = useState({
        category: 'luxury',
        min_followers: 10000,
        min_engagement: 3.0,
        city: ''
    });
    const [matchResults, setMatchResults] = useState(null);

    // Caption Generator
    const [captionParams, setCaptionParams] = useState({
        brand: 'SEVORA',
        product: '',
        tone: 'luxury',
        hashtags: true
    });
    const [captionResult, setCaptionResult] = useState('');

    // Campaign Ideas
    const [ideaParams, setIdeaParams] = useState({
        season: 'summer',
        category: 'menswear',
        budget: 500000
    });
    const [ideaResult, setIdeaResult] = useState('');

    const handleMatchInfluencers = async () => {
        setLoading(true);
        try {
            const response = await aiApi.matchInfluencers(matchParams);
            setMatchResults(response.data);
            toast.success('AI matching complete');
        } catch (error) {
            toast.error('Failed to match influencers');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCaption = async () => {
        if (!captionParams.product) {
            toast.error('Please enter a product');
            return;
        }
        setLoading(true);
        try {
            const response = await aiApi.generateCaption(captionParams);
            setCaptionResult(response.data.caption);
            toast.success('Caption generated');
        } catch (error) {
            toast.error('Failed to generate caption');
        } finally {
            setLoading(false);
        }
    };

    const handleGetCampaignIdeas = async () => {
        setLoading(true);
        try {
            const response = await aiApi.getCampaignIdeas(ideaParams);
            setIdeaResult(response.data.ideas);
            toast.success('Ideas generated');
        } catch (error) {
            toast.error('Failed to generate ideas');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="p-8 space-y-8" data-testid="ai-studio-page">
            {/* Header */}
            <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Powered by GPT-5.2
                </p>
                <h1 className="font-serif text-4xl flex items-center gap-3">
                    AI Studio
                    <Sparkles className="w-8 h-8 text-gold" />
                </h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="match" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Match
                    </TabsTrigger>
                    <TabsTrigger value="caption" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Caption
                    </TabsTrigger>
                    <TabsTrigger value="ideas" className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Ideas
                    </TabsTrigger>
                </TabsList>

                {/* Match Influencers */}
                <TabsContent value="match" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="border border-border lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="font-serif text-lg flex items-center gap-2">
                                    <Wand2 className="w-5 h-5 text-gold" />
                                    Find Influencers
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Category</Label>
                                    <Select 
                                        value={matchParams.category} 
                                        onValueChange={(v) => setMatchParams({ ...matchParams, category: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['luxury', 'menswear', 'womenswear', 'streetwear', 'ethnic', 'minimal'].map(c => (
                                                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Min Followers</Label>
                                    <Input
                                        type="number"
                                        value={matchParams.min_followers}
                                        onChange={(e) => setMatchParams({ ...matchParams, min_followers: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Min Engagement %</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={matchParams.min_engagement}
                                        onChange={(e) => setMatchParams({ ...matchParams, min_engagement: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">City (Optional)</Label>
                                    <Input
                                        value={matchParams.city}
                                        onChange={(e) => setMatchParams({ ...matchParams, city: e.target.value })}
                                        placeholder="e.g., Mumbai"
                                    />
                                </div>
                                <Button 
                                    onClick={handleMatchInfluencers}
                                    disabled={loading}
                                    className="w-full rounded-none bg-gold text-white hover:bg-gold/90"
                                    data-testid="ai-match-btn"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {loading ? 'Matching...' : 'Find Matches'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border border-border lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="font-serif text-lg">AI Recommendations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {matchResults ? (
                                    <div className="space-y-4">
                                        {matchResults.ai_recommendation && (
                                            <Card className="border border-gold/30 bg-gold/5">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <Sparkles className="w-5 h-5 text-gold mt-0.5" />
                                                        <div>
                                                            <p className="font-mono text-xs uppercase text-gold mb-1">AI Insight</p>
                                                            <p className="text-sm">{matchResults.ai_recommendation}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                        <div className="grid grid-cols-2 gap-3">
                                            {matchResults.influencers?.slice(0, 6).map((inf) => (
                                                <Card key={inf.id} className="border">
                                                    <CardContent className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                                                                <span className="font-serif text-gold">{inf.name?.charAt(0)}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm truncate">{inf.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {(inf.followers / 1000).toFixed(0)}K • {inf.engagement_rate}%
                                                                </p>
                                                            </div>
                                                            <Badge className="bg-gold/10 text-gold border-0 text-xs">
                                                                {inf.score}
                                                            </Badge>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-muted-foreground">
                                            Set your criteria and let AI find the perfect influencers
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Caption Generator */}
                <TabsContent value="caption" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border border-border">
                            <CardHeader>
                                <CardTitle className="font-serif text-lg flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-gold" />
                                    Generate Caption
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Brand Name</Label>
                                    <Input
                                        value={captionParams.brand}
                                        onChange={(e) => setCaptionParams({ ...captionParams, brand: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Product *</Label>
                                    <Input
                                        value={captionParams.product}
                                        onChange={(e) => setCaptionParams({ ...captionParams, product: e.target.value })}
                                        placeholder="e.g., Summer Linen Blazer"
                                        data-testid="caption-product-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Tone</Label>
                                    <Select 
                                        value={captionParams.tone} 
                                        onValueChange={(v) => setCaptionParams({ ...captionParams, tone: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="luxury">Luxury</SelectItem>
                                            <SelectItem value="casual">Casual</SelectItem>
                                            <SelectItem value="playful">Playful</SelectItem>
                                            <SelectItem value="professional">Professional</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button 
                                    onClick={handleGenerateCaption}
                                    disabled={loading}
                                    className="w-full rounded-none bg-gold text-white hover:bg-gold/90"
                                    data-testid="generate-caption-btn"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {loading ? 'Generating...' : 'Generate Caption'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border border-border">
                            <CardHeader>
                                <CardTitle className="font-serif text-lg">Generated Caption</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {captionResult ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-muted rounded-sm">
                                            <p className="text-sm whitespace-pre-wrap">{captionResult}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => copyToClipboard(captionResult)}
                                                className="flex-1 rounded-none"
                                            >
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copy
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                onClick={handleGenerateCaption}
                                                className="rounded-none"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-muted-foreground">
                                            Enter product details to generate an engaging caption
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Campaign Ideas */}
                <TabsContent value="ideas" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border border-border">
                            <CardHeader>
                                <CardTitle className="font-serif text-lg flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-gold" />
                                    Campaign Ideas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Season</Label>
                                    <Select 
                                        value={ideaParams.season} 
                                        onValueChange={(v) => setIdeaParams({ ...ideaParams, season: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="summer">Summer</SelectItem>
                                            <SelectItem value="monsoon">Monsoon</SelectItem>
                                            <SelectItem value="winter">Winter</SelectItem>
                                            <SelectItem value="festive">Festive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Category</Label>
                                    <Select 
                                        value={ideaParams.category} 
                                        onValueChange={(v) => setIdeaParams({ ...ideaParams, category: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['menswear', 'womenswear', 'luxury', 'ethnic', 'streetwear'].map(c => (
                                                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Budget (₹)</Label>
                                    <Input
                                        type="number"
                                        value={ideaParams.budget}
                                        onChange={(e) => setIdeaParams({ ...ideaParams, budget: parseInt(e.target.value) })}
                                    />
                                </div>
                                <Button 
                                    onClick={handleGetCampaignIdeas}
                                    disabled={loading}
                                    className="w-full rounded-none bg-gold text-white hover:bg-gold/90"
                                    data-testid="generate-ideas-btn"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {loading ? 'Generating...' : 'Generate Ideas'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border border-border">
                            <CardHeader>
                                <CardTitle className="font-serif text-lg">AI Campaign Ideas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {ideaResult ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-muted rounded-sm">
                                            <p className="text-sm whitespace-pre-wrap">{ideaResult}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => copyToClipboard(ideaResult)}
                                                className="flex-1 rounded-none"
                                            >
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copy
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                onClick={handleGetCampaignIdeas}
                                                className="rounded-none"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-muted-foreground">
                                            Set parameters to generate creative campaign ideas
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
