import React, { useState, useEffect } from 'react';
import { aiApi, scheduledApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
    Sparkles, MessageSquare, Lightbulb, Copy, RefreshCw, Loader2, Calendar, 
    Plus, Play, Trash2, Clock, Users, CheckCircle
} from 'lucide-react';

const CATEGORIES = ['luxury', 'menswear', 'womenswear', 'streetwear', 'ethnic', 'minimal'];

export const AIToolsPage = () => {
    const [loading, setLoading] = useState(false);
    
    // Caption Generator
    const [captionParams, setCaptionParams] = useState({ brand: 'SEVORA', product: '', tone: 'luxury', hashtags: true });
    const [captionResult, setCaptionResult] = useState('');
    
    // Campaign Ideas
    const [ideaParams, setIdeaParams] = useState({ season: 'summer', category: 'menswear', budget: 500000 });
    const [ideaResult, setIdeaResult] = useState('');
    
    // Scheduled Discovery
    const [scheduledSearches, setScheduledSearches] = useState([]);
    const [discoveryResults, setDiscoveryResults] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [runningSearchId, setRunningSearchId] = useState(null);
    const [newSearch, setNewSearch] = useState({
        name: '',
        campaign_brief: '',
        category: 'luxury',
        location: 'India',
        follower_range: '10K-500K',
        frequency: 'daily',
        num_suggestions: 10
    });

    useEffect(() => {
        fetchScheduledSearches();
        fetchDiscoveryResults();
    }, []);

    const fetchScheduledSearches = async () => {
        try {
            const response = await scheduledApi.getSearches();
            setScheduledSearches(response.data || []);
        } catch (error) {
            console.error('Failed to fetch searches');
        }
    };

    const fetchDiscoveryResults = async () => {
        try {
            const response = await scheduledApi.getResults({ limit: 20 });
            setDiscoveryResults(response.data || []);
        } catch (error) {
            console.error('Failed to fetch results');
        }
    };

    const handleCreateSearch = async () => {
        if (!newSearch.name || !newSearch.campaign_brief) {
            toast.error('Name and campaign brief are required');
            return;
        }
        setLoading(true);
        try {
            await scheduledApi.createSearch(newSearch);
            toast.success('Scheduled search created');
            setShowCreateModal(false);
            setNewSearch({ name: '', campaign_brief: '', category: 'luxury', location: 'India', follower_range: '10K-500K', frequency: 'daily', num_suggestions: 10 });
            fetchScheduledSearches();
        } catch (error) {
            toast.error('Failed to create search');
        } finally {
            setLoading(false);
        }
    };

    const handleRunNow = async (searchId) => {
        setRunningSearchId(searchId);
        try {
            const result = await scheduledApi.runNow(searchId);
            if (result.data.success) {
                toast.success(`Found ${result.data.discovered_count} influencers`);
                fetchDiscoveryResults();
            } else {
                toast.error(result.data.error || 'Discovery failed');
            }
        } catch (error) {
            toast.error('Failed to run search');
        } finally {
            setRunningSearchId(null);
        }
    };

    const handleToggleSearch = async (search) => {
        try {
            await scheduledApi.updateSearch(search.id, { is_active: !search.is_active });
            fetchScheduledSearches();
            toast.success(search.is_active ? 'Search paused' : 'Search activated');
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    const handleDeleteSearch = async (searchId) => {
        if (!window.confirm('Delete this scheduled search?')) return;
        try {
            await scheduledApi.deleteSearch(searchId);
            toast.success('Search deleted');
            fetchScheduledSearches();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleGenerateCaption = async () => {
        if (!captionParams.product) { toast.error('Enter a product'); return; }
        setLoading(true);
        try {
            const response = await aiApi.generateCaption(captionParams);
            setCaptionResult(response.data.caption);
            toast.success('Caption generated');
        } catch (error) {
            toast.error('Failed to generate');
        } finally {
            setLoading(false);
        }
    };

    const handleGetIdeas = async () => {
        setLoading(true);
        try {
            const response = await aiApi.getCampaignIdeas(ideaParams);
            setIdeaResult(response.data.ideas);
            toast.success('Ideas generated');
        } catch (error) {
            toast.error('Failed to generate');
        } finally {
            setLoading(false);
        }
    };

    const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

    return (
        <div className="p-6 space-y-6" data-testid="ai-tools-page">
            <div className="flex items-center gap-3">
                <h1 className="font-serif text-3xl">AI Tools</h1>
                <Sparkles className="w-6 h-6 text-gold" />
            </div>

            <Tabs defaultValue="scheduled" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="scheduled" className="gap-2"><Calendar className="w-4 h-4" />Scheduled Discovery</TabsTrigger>
                    <TabsTrigger value="caption" className="gap-2"><MessageSquare className="w-4 h-4" />Caption</TabsTrigger>
                    <TabsTrigger value="ideas" className="gap-2"><Lightbulb className="w-4 h-4" />Campaign Ideas</TabsTrigger>
                </TabsList>

                {/* Scheduled Discovery Tab */}
                <TabsContent value="scheduled">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-sm">Automatically discover new influencers on a schedule</p>
                            <Button onClick={() => setShowCreateModal(true)} className="rounded-none" data-testid="create-scheduled-btn">
                                <Plus className="w-4 h-4 mr-2" /> New Scheduled Search
                            </Button>
                        </div>

                        {/* Scheduled Searches List */}
                        <Card className="border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gold" /> Active Schedules
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {scheduledSearches.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No scheduled searches yet. Create one to automate discovery.
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-mono text-[10px] uppercase">Name</TableHead>
                                                <TableHead className="font-mono text-[10px] uppercase">Category</TableHead>
                                                <TableHead className="font-mono text-[10px] uppercase">Frequency</TableHead>
                                                <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                                                <TableHead className="font-mono text-[10px] uppercase">Total Found</TableHead>
                                                <TableHead className="font-mono text-[10px] uppercase">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {scheduledSearches.map((search) => (
                                                <TableRow key={search.id}>
                                                    <TableCell className="font-medium">{search.name}</TableCell>
                                                    <TableCell><Badge variant="outline" className="capitalize text-xs">{search.category}</Badge></TableCell>
                                                    <TableCell className="text-xs capitalize">{search.frequency}</TableCell>
                                                    <TableCell>
                                                        <Switch 
                                                            checked={search.is_active} 
                                                            onCheckedChange={() => handleToggleSearch(search)}
                                                        />
                                                    </TableCell>
                                                    <TableCell><Badge className="bg-gold/10 text-gold border-0">{search.total_discovered}</Badge></TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleRunNow(search.id)}
                                                                disabled={runningSearchId === search.id}
                                                                className="h-7 text-xs"
                                                            >
                                                                {runningSearchId === search.id ? 
                                                                    <Loader2 className="w-3 h-3 animate-spin" /> : 
                                                                    <><Play className="w-3 h-3 mr-1" />Run</>
                                                                }
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => handleDeleteSearch(search.id)}
                                                                className="h-7 text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Discovery Results */}
                        <Card className="border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gold" /> Recent Discoveries
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {discoveryResults.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No discovery results yet.
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[300px]">
                                        <div className="space-y-3">
                                            {discoveryResults.map((result) => (
                                                <Card key={result.id} className="border bg-muted/30">
                                                    <CardContent className="p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                                <span className="font-medium text-sm">{result.search_name}</span>
                                                            </div>
                                                            <Badge variant="outline">{result.discovered_count} found</Badge>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {new Date(result.discovered_at).toLocaleString()}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {result.influencers?.slice(0, 3).map((inf, i) => (
                                                                <Badge key={i} variant="secondary" className="text-[10px]">{inf.name}</Badge>
                                                            ))}
                                                            {result.influencers?.length > 3 && (
                                                                <Badge variant="secondary" className="text-[10px]">+{result.influencers.length - 3} more</Badge>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Caption Generator */}
                <TabsContent value="caption">
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">Generate Caption</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-mono">Brand</Label>
                                        <Input value={captionParams.brand} onChange={(e) => setCaptionParams({ ...captionParams, brand: e.target.value })} className="h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-mono">Tone</Label>
                                        <Select value={captionParams.tone} onValueChange={(v) => setCaptionParams({ ...captionParams, tone: v })}>
                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {['luxury', 'casual', 'playful', 'professional'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Product *</Label>
                                    <Input 
                                        value={captionParams.product} 
                                        onChange={(e) => setCaptionParams({ ...captionParams, product: e.target.value })} 
                                        placeholder="e.g., Summer Linen Blazer" 
                                        className="h-8"
                                    />
                                </div>
                                <Button onClick={handleGenerateCaption} disabled={loading} className="w-full rounded-none bg-gold text-white hover:bg-gold/90">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" />Generate</>}
                                </Button>
                            </CardContent>
                        </Card>
                        <Card className="border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">Result</CardTitle></CardHeader>
                            <CardContent>
                                {captionResult ? (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-muted rounded text-sm">{captionResult}</div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => copy(captionResult)} className="flex-1 rounded-none"><Copy className="w-4 h-4 mr-2" />Copy</Button>
                                            <Button variant="outline" onClick={handleGenerateCaption} className="rounded-none"><RefreshCw className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm text-center py-8">Enter product details to generate</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Campaign Ideas */}
                <TabsContent value="ideas">
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">Campaign Ideas</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-mono">Season</Label>
                                        <Select value={ideaParams.season} onValueChange={(v) => setIdeaParams({ ...ideaParams, season: v })}>
                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {['summer', 'monsoon', 'winter', 'festive'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-mono">Category</Label>
                                        <Select value={ideaParams.category} onValueChange={(v) => setIdeaParams({ ...ideaParams, category: v })}>
                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {['menswear', 'womenswear', 'luxury', 'ethnic', 'streetwear'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Budget (₹)</Label>
                                    <Input type="number" value={ideaParams.budget} onChange={(e) => setIdeaParams({ ...ideaParams, budget: parseInt(e.target.value) })} className="h-8" />
                                </div>
                                <Button onClick={handleGetIdeas} disabled={loading} className="w-full rounded-none bg-gold text-white hover:bg-gold/90">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lightbulb className="w-4 h-4 mr-2" />Generate Ideas</>}
                                </Button>
                            </CardContent>
                        </Card>
                        <Card className="border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">Ideas</CardTitle></CardHeader>
                            <CardContent>
                                {ideaResult ? (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">{ideaResult}</div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => copy(ideaResult)} className="flex-1 rounded-none"><Copy className="w-4 h-4 mr-2" />Copy</Button>
                                            <Button variant="outline" onClick={handleGetIdeas} className="rounded-none"><RefreshCw className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm text-center py-8">Set parameters to generate ideas</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create Scheduled Search Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Scheduled Discovery</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-mono">Search Name *</Label>
                            <Input 
                                value={newSearch.name}
                                onChange={(e) => setNewSearch({ ...newSearch, name: e.target.value })}
                                placeholder="e.g., Daily Luxury Discovery"
                                data-testid="search-name-input"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-mono">Campaign Brief *</Label>
                            <Textarea 
                                value={newSearch.campaign_brief}
                                onChange={(e) => setNewSearch({ ...newSearch, campaign_brief: e.target.value })}
                                placeholder="Describe what kind of influencers you want to discover..."
                                rows={3}
                                data-testid="search-brief-input"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Category</Label>
                                <Select value={newSearch.category} onValueChange={(v) => setNewSearch({ ...newSearch, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Frequency</Label>
                                <Select value={newSearch.frequency} onValueChange={(v) => setNewSearch({ ...newSearch, frequency: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Follower Range</Label>
                                <Select value={newSearch.follower_range} onValueChange={(v) => setNewSearch({ ...newSearch, follower_range: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['1K-10K', '10K-50K', '50K-500K', '500K-1M', '1M+'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono"># Suggestions</Label>
                                <Input 
                                    type="number" 
                                    value={newSearch.num_suggestions}
                                    onChange={(e) => setNewSearch({ ...newSearch, num_suggestions: parseInt(e.target.value) || 10 })}
                                    min={1}
                                    max={20}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1 rounded-none">Cancel</Button>
                            <Button onClick={handleCreateSearch} disabled={loading} className="flex-1 rounded-none bg-gold text-white hover:bg-gold/90" data-testid="create-search-btn">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Schedule'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
