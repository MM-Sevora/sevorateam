import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { influencerApi, aiApi, socialApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { AddInfluencerForm } from '../components/AddInfluencerForm';
import { toast } from 'sonner';
import { 
    Search, Users, Sparkles, Instagram, MapPin, TrendingUp, Plus, Star, 
    MoreHorizontal, Mail, Trash2, Zap, Loader2, CheckCircle, ExternalLink,
    GitCompare, Shield, Youtube, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown,
    Filter, X, ChevronDown
} from 'lucide-react';

const CITIES = ['Mumbai', 'Delhi', 'Kolkata', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune'];
const STATUS_OPTIONS = ['identified', 'contacted', 'interested', 'negotiation', 'confirmed', 'completed'];
const INDUSTRIES = ['fashion', 'beauty', 'lifestyle', 'fitness', 'tech', 'food', 'travel'];
const TIERS = ['nano', 'micro', 'macro', 'mega', 'celebrity'];
const GENDERS = ['male', 'female', 'non-binary', 'other'];
const PLATFORMS = ['instagram', 'youtube'];

const STATUS_COLORS = {
    identified: 'bg-muted text-muted-foreground',
    contacted: 'bg-blue-100 text-blue-700',
    interested: 'bg-green-100 text-green-700',
    negotiation: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-gold/20 text-gold',
    completed: 'bg-emerald-100 text-emerald-700'
};

const TIER_COLORS = {
    nano: 'bg-slate-100 text-slate-600',
    micro: 'bg-blue-100 text-blue-600',
    macro: 'bg-purple-100 text-purple-600',
    mega: 'bg-orange-100 text-orange-600',
    celebrity: 'bg-gold/20 text-gold'
};

const PLATFORM_ICONS = {
    instagram: { icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-50' },
    youtube: { icon: Youtube, color: 'text-red-500', bg: 'bg-red-50' }
};

// Format followers count
const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
};

// Format date
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const InfluencersPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('database');
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedInfluencer, setSelectedInfluencer] = useState(null);
    
    // Basic Filters
    const [filters, setFilters] = useState({ search: '', city: '', status: '' });
    
    // Advanced Filters
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        industry: '',
        gender: '',
        tier: '',
        platform: '',
        minEngagement: 0,
        maxEngagement: 20,
        minFollowers: 0,
        maxFollowers: 10000000
    });
    
    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
    
    // AI Discovery with SSE
    const [aiLoading, setAiLoading] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    const [aiProgressMessage, setAiProgressMessage] = useState('');
    const [aiResults, setAiResults] = useState(null);
    const [importing, setImporting] = useState({});
    const [imported, setImported] = useState({});
    const [aiParams, setAiParams] = useState({
        campaign_brief: '',
        location: 'India',
        follower_range: '10K-500K',
        num_suggestions: 8
    });
    
    // Comparison feature
    const [selectedForCompare, setSelectedForCompare] = useState([]);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [comparisonResult, setComparisonResult] = useState(null);
    const [comparing, setComparing] = useState(false);
    
    // Verification
    const [verifying, setVerifying] = useState({});
    
    // Sorted and filtered influencers
    const sortedInfluencers = useMemo(() => {
        let filtered = [...influencers];
        
        // Apply advanced filters
        if (advancedFilters.industry) {
            filtered = filtered.filter(i => i.industry?.toLowerCase() === advancedFilters.industry.toLowerCase());
        }
        if (advancedFilters.gender) {
            filtered = filtered.filter(i => i.gender?.toLowerCase() === advancedFilters.gender.toLowerCase());
        }
        if (advancedFilters.tier) {
            filtered = filtered.filter(i => i.tier?.toLowerCase() === advancedFilters.tier.toLowerCase());
        }
        if (advancedFilters.platform) {
            filtered = filtered.filter(i => i.primary_platform?.toLowerCase() === advancedFilters.platform.toLowerCase());
        }
        if (advancedFilters.minEngagement > 0) {
            filtered = filtered.filter(i => (i.engagement_rate || 0) >= advancedFilters.minEngagement);
        }
        if (advancedFilters.maxEngagement < 20) {
            filtered = filtered.filter(i => (i.engagement_rate || 0) <= advancedFilters.maxEngagement);
        }
        if (advancedFilters.minFollowers > 0) {
            filtered = filtered.filter(i => (i.followers || 0) >= advancedFilters.minFollowers);
        }
        if (advancedFilters.maxFollowers < 10000000) {
            filtered = filtered.filter(i => (i.followers || 0) <= advancedFilters.maxFollowers);
        }
        
        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                
                // Handle null/undefined
                if (aValue == null) aValue = sortConfig.key === 'name' ? '' : 0;
                if (bValue == null) bValue = sortConfig.key === 'name' ? '' : 0;
                
                // String comparison
                if (typeof aValue === 'string') {
                    return sortConfig.direction === 'asc' 
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                
                // Number comparison
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            });
        }
        
        return filtered;
    }, [influencers, sortConfig, advancedFilters]);
    
    // Handle column sorting
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };
    
    // Get sort icon for column
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp className="w-3 h-3 ml-1 text-gold" />
            : <ArrowDown className="w-3 h-3 ml-1 text-gold" />;
    };
    
    // Clear all advanced filters
    const clearAdvancedFilters = () => {
        setAdvancedFilters({
            industry: '',
            gender: '',
            tier: '',
            platform: '',
            minEngagement: 0,
            maxEngagement: 20,
            minFollowers: 0,
            maxFollowers: 10000000
        });
    };
    
    // Check if any advanced filters are active
    const hasActiveAdvancedFilters = advancedFilters.industry || advancedFilters.gender || 
        advancedFilters.tier || advancedFilters.platform || 
        advancedFilters.minEngagement > 0 || advancedFilters.maxEngagement < 20 ||
        advancedFilters.minFollowers > 0 || advancedFilters.maxFollowers < 10000000;

    useEffect(() => { fetchInfluencers(); }, []);

    const fetchInfluencers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.city) params.city = filters.city;
            if (filters.status) params.status = filters.status;
            const response = await influencerApi.getAll(params);
            setInfluencers(response.data);
        } catch (error) {
            toast.error('Failed to fetch influencers');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await influencerApi.update(id, { status });
            toast.success('Status updated');
            fetchInfluencers();
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this influencer?')) return;
        try {
            await influencerApi.delete(id);
            toast.success('Deleted');
            fetchInfluencers();
            setSelectedForCompare(prev => prev.filter(i => i !== id));
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    // AI Discovery with Server-Sent Events for real-time progress
    const handleAIDiscoverSSE = async () => {
        if (!aiParams.campaign_brief) {
            toast.error('Enter a campaign brief');
            return;
        }
        
        setAiLoading(true);
        setAiResults(null);
        setAiProgress(0);
        setAiProgressMessage('Initializing...');
        
        try {
            const token = localStorage.getItem('sevora_token');
            const url = aiApi.autoDiscoverStream({
                campaign_brief: aiParams.campaign_brief,
                location: aiParams.location,
                follower_range: aiParams.follower_range,
                num_suggestions: aiParams.num_suggestions
            });
            
            const eventSource = new EventSource(url, {
                withCredentials: false
            });
            
            // Since EventSource doesn't support headers, we'll use regular fetch with SSE
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const text = decoder.decode(value);
                const lines = text.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.type === 'progress') {
                                setAiProgress(data.progress);
                                setAiProgressMessage(data.message);
                            } else if (data.type === 'complete') {
                                setAiResults(data);
                                toast.success(`Found ${data.total_discovered} influencers`);
                            } else if (data.type === 'error') {
                                toast.error(data.message);
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }
        } catch (error) {
            console.error('SSE error:', error);
            // Fallback to regular API call
            try {
                const response = await aiApi.autoDiscover(aiParams);
                setAiResults(response.data);
                toast.success(`Found ${response.data.total_discovered} influencers`);
            } catch (fallbackError) {
                toast.error('Discovery failed');
            }
        } finally {
            setAiLoading(false);
            setAiProgress(100);
        }
    };

    const handleImport = async (influencer, index) => {
        setImporting(prev => ({ ...prev, [index]: true }));
        try {
            await aiApi.importDiscovered(influencer);
            setImported(prev => ({ ...prev, [index]: true }));
            toast.success(`${influencer.name} added to database`);
            fetchInfluencers();
        } catch (error) {
            toast.error('Import failed');
        } finally {
            setImporting(prev => ({ ...prev, [index]: false }));
        }
    };
    
    // Toggle influencer selection for comparison
    const toggleCompareSelection = (id) => {
        setSelectedForCompare(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            }
            if (prev.length >= 5) {
                toast.error('Maximum 5 influencers can be compared');
                return prev;
            }
            return [...prev, id];
        });
    };
    
    // Compare selected influencers
    const handleCompare = async () => {
        if (selectedForCompare.length < 2) {
            toast.error('Select at least 2 influencers to compare');
            return;
        }
        
        setComparing(true);
        try {
            const response = await influencerApi.compare(selectedForCompare);
            setComparisonResult(response.data);
            setShowCompareModal(true);
        } catch (error) {
            toast.error('Comparison failed');
        } finally {
            setComparing(false);
        }
    };
    
    // Verify influencer social profiles
    const handleVerify = async (id) => {
        setVerifying(prev => ({ ...prev, [id]: true }));
        try {
            const response = await socialApi.verifyInfluencer(id);
            toast.success('Profiles verified and updated');
            fetchInfluencers();
        } catch (error) {
            toast.error('Verification failed - API may not be configured');
        } finally {
            setVerifying(prev => ({ ...prev, [id]: false }));
        }
    };
    
    // Refresh single influencer data from social APIs
    const [refreshing, setRefreshing] = useState({});
    const [batchRefreshing, setBatchRefreshing] = useState(false);
    
    const handleRefresh = async (id) => {
        setRefreshing(prev => ({ ...prev, [id]: true }));
        try {
            const response = await influencerApi.refresh(id);
            toast.success(`Refreshed data: ${formatFollowers(response.data.followers)} followers, ${response.data.engagement_rate?.toFixed(1)}% engagement`);
            fetchInfluencers();
        } catch (error) {
            toast.error('Failed to refresh data');
        } finally {
            setRefreshing(prev => ({ ...prev, [id]: false }));
        }
    };
    
    // Batch refresh all influencers
    const handleBatchRefresh = async () => {
        setBatchRefreshing(true);
        try {
            const ids = selectedForCompare.length > 0 ? selectedForCompare : null;
            const response = await influencerApi.batchRefresh(ids);
            toast.success(`Refreshed ${response.data.success} influencers${response.data.failed > 0 ? `, ${response.data.failed} failed` : ''}`);
            fetchInfluencers();
            setSelectedForCompare([]);
        } catch (error) {
            toast.error('Batch refresh failed');
        } finally {
            setBatchRefreshing(false);
        }
    };

    const statusCounts = influencers.reduce((acc, inf) => {
        acc[inf.status] = (acc[inf.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="p-6 space-y-6" data-testid="influencers-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-serif text-3xl">Influencers</h1>
                <div className="flex gap-2">
                    <Button 
                        onClick={handleBatchRefresh} 
                        variant="outline" 
                        className="rounded-none"
                        disabled={batchRefreshing}
                        data-testid="batch-refresh-btn"
                    >
                        {batchRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        {selectedForCompare.length > 0 ? `Refresh (${selectedForCompare.length})` : 'Refresh All'}
                    </Button>
                    {selectedForCompare.length >= 2 && (
                        <Button 
                            onClick={handleCompare} 
                            variant="outline" 
                            className="rounded-none"
                            disabled={comparing}
                            data-testid="compare-btn"
                        >
                            {comparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCompare className="w-4 h-4 mr-2" />}
                            Compare ({selectedForCompare.length})
                        </Button>
                    )}
                    <Button onClick={() => setShowAddModal(true)} className="rounded-none" data-testid="add-influencer-btn">
                        <Plus className="w-4 h-4 mr-2" /> Add Influencer
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="database" className="gap-2">
                        <Users className="w-4 h-4" /> Database ({influencers.length})
                    </TabsTrigger>
                    <TabsTrigger value="ai-discover" className="gap-2">
                        <Sparkles className="w-4 h-4" /> AI Discover
                    </TabsTrigger>
                </TabsList>

                {/* Database Tab */}
                <TabsContent value="database" className="space-y-4 mt-4">
                    {/* Pipeline Stats */}
                    <div className="grid grid-cols-6 gap-2">
                        {STATUS_OPTIONS.map((status) => (
                            <Card 
                                key={status}
                                className={`border cursor-pointer transition-all ${filters.status === status ? 'border-gold' : 'border-border hover:border-gold/30'}`}
                                onClick={() => setFilters({ ...filters, status: filters.status === status ? '' : status })}
                            >
                                <CardContent className="p-3 text-center">
                                    <p className="font-serif text-xl">{statusCounts[status] || 0}</p>
                                    <p className="font-mono text-[9px] uppercase text-muted-foreground capitalize">{status}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Basic Filters */}
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search name or handle..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyPress={(e) => e.key === 'Enter' && fetchInfluencers()}
                                className="pl-9"
                                data-testid="search-input"
                            />
                        </div>
                        <Select value={filters.city || "all"} onValueChange={(v) => setFilters({ ...filters, city: v === "all" ? "" : v })}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button 
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
                            variant={hasActiveAdvancedFilters ? "default" : "outline"}
                            className="gap-2"
                            data-testid="advanced-filters-btn"
                        >
                            <Filter className="w-4 h-4" />
                            {hasActiveAdvancedFilters && <span className="text-xs">({Object.values(advancedFilters).filter(v => v && v !== 0 && v !== 20 && v !== 10000000).length})</span>}
                        </Button>
                        <Button onClick={fetchInfluencers} variant="outline">Search</Button>
                    </div>
                    
                    {/* Advanced Filters Panel */}
                    {showAdvancedFilters && (
                        <Card className="border border-gold/20 bg-gold/5">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-mono text-xs uppercase text-gold">Advanced Filters</h4>
                                    <div className="flex gap-2">
                                        {hasActiveAdvancedFilters && (
                                            <Button variant="ghost" size="sm" onClick={clearAdvancedFilters} className="h-7 text-xs">
                                                <X className="w-3 h-3 mr-1" /> Clear All
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => setShowAdvancedFilters(false)} className="h-7">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-4">
                                    {/* Industry */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-mono">Industry</Label>
                                        <Select value={advancedFilters.industry || "all"} onValueChange={(v) => setAdvancedFilters({ ...advancedFilters, industry: v === "all" ? "" : v })}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Industries</SelectItem>
                                                {INDUSTRIES.map(i => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    {/* Gender */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-mono">Gender</Label>
                                        <Select value={advancedFilters.gender || "all"} onValueChange={(v) => setAdvancedFilters({ ...advancedFilters, gender: v === "all" ? "" : v })}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Genders</SelectItem>
                                                {GENDERS.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    {/* Tier */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-mono">Tier</Label>
                                        <Select value={advancedFilters.tier || "all"} onValueChange={(v) => setAdvancedFilters({ ...advancedFilters, tier: v === "all" ? "" : v })}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Tiers</SelectItem>
                                                {TIERS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    {/* Platform */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-mono">Platform</Label>
                                        <Select value={advancedFilters.platform || "all"} onValueChange={(v) => setAdvancedFilters({ ...advancedFilters, platform: v === "all" ? "" : v })}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Platforms</SelectItem>
                                                {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    {/* Engagement Range */}
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-[10px] uppercase font-mono">Engagement Rate: {advancedFilters.minEngagement}% - {advancedFilters.maxEngagement}%</Label>
                                        <div className="flex gap-2 items-center">
                                            <Input 
                                                type="number" 
                                                min="0" 
                                                max="20"
                                                value={advancedFilters.minEngagement}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, minEngagement: parseFloat(e.target.value) || 0 })}
                                                className="h-8 w-20 text-xs"
                                            />
                                            <span className="text-muted-foreground">to</span>
                                            <Input 
                                                type="number" 
                                                min="0" 
                                                max="20"
                                                value={advancedFilters.maxEngagement}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, maxEngagement: parseFloat(e.target.value) || 20 })}
                                                className="h-8 w-20 text-xs"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Followers Range */}
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-[10px] uppercase font-mono">Followers: {formatFollowers(advancedFilters.minFollowers)} - {formatFollowers(advancedFilters.maxFollowers)}</Label>
                                        <div className="flex gap-2 items-center">
                                            <Select value={advancedFilters.minFollowers.toString()} onValueChange={(v) => setAdvancedFilters({ ...advancedFilters, minFollowers: parseInt(v) })}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">0</SelectItem>
                                                    <SelectItem value="1000">1K</SelectItem>
                                                    <SelectItem value="10000">10K</SelectItem>
                                                    <SelectItem value="50000">50K</SelectItem>
                                                    <SelectItem value="100000">100K</SelectItem>
                                                    <SelectItem value="500000">500K</SelectItem>
                                                    <SelectItem value="1000000">1M</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <span className="text-muted-foreground">to</span>
                                            <Select value={advancedFilters.maxFollowers.toString()} onValueChange={(v) => setAdvancedFilters({ ...advancedFilters, maxFollowers: parseInt(v) })}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10000">10K</SelectItem>
                                                    <SelectItem value="50000">50K</SelectItem>
                                                    <SelectItem value="100000">100K</SelectItem>
                                                    <SelectItem value="500000">500K</SelectItem>
                                                    <SelectItem value="1000000">1M</SelectItem>
                                                    <SelectItem value="10000000">10M+</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Results Summary */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Showing {sortedInfluencers.length} of {influencers.length} influencers</span>
                        {sortConfig.key && (
                            <span className="font-mono text-xs">
                                Sorted by <span className="text-gold capitalize">{sortConfig.key.replace('_', ' ')}</span> ({sortConfig.direction})
                            </span>
                        )}
                    </div>

                    {/* Enhanced Table */}
                    <Card className="border">
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                            ) : sortedInfluencers.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground">No influencers found</p>
                                    {hasActiveAdvancedFilters && (
                                        <Button variant="link" onClick={clearAdvancedFilters} className="mt-2">
                                            Clear filters
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[40px]"></TableHead>
                                                <TableHead 
                                                    className="font-mono text-[10px] uppercase cursor-pointer hover:text-gold transition-colors"
                                                    onClick={() => handleSort('name')}
                                                    data-testid="sort-name"
                                                >
                                                    <div className="flex items-center">Influencer {getSortIcon('name')}</div>
                                                </TableHead>
                                                <TableHead 
                                                    className="font-mono text-[10px] uppercase cursor-pointer hover:text-gold transition-colors"
                                                    onClick={() => handleSort('primary_platform')}
                                                >
                                                    <div className="flex items-center">Platform {getSortIcon('primary_platform')}</div>
                                                </TableHead>
                                                <TableHead 
                                                    className="font-mono text-[10px] uppercase cursor-pointer hover:text-gold transition-colors"
                                                    onClick={() => handleSort('followers')}
                                                    data-testid="sort-followers"
                                                >
                                                    <div className="flex items-center">Followers {getSortIcon('followers')}</div>
                                                </TableHead>
                                                <TableHead 
                                                    className="font-mono text-[10px] uppercase cursor-pointer hover:text-gold transition-colors"
                                                    onClick={() => handleSort('engagement_rate')}
                                                    data-testid="sort-engagement"
                                                >
                                                    <div className="flex items-center">Eng. % {getSortIcon('engagement_rate')}</div>
                                                </TableHead>
                                                <TableHead className="font-mono text-[10px] uppercase">Industry</TableHead>
                                                <TableHead 
                                                    className="font-mono text-[10px] uppercase cursor-pointer hover:text-gold transition-colors"
                                                    onClick={() => handleSort('tier')}
                                                >
                                                    <div className="flex items-center">Tier {getSortIcon('tier')}</div>
                                                </TableHead>
                                                <TableHead className="font-mono text-[10px] uppercase">Gender</TableHead>
                                                <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                                                <TableHead 
                                                    className="font-mono text-[10px] uppercase cursor-pointer hover:text-gold transition-colors"
                                                    onClick={() => handleSort('score')}
                                                    data-testid="sort-score"
                                                >
                                                    <div className="flex items-center">Score {getSortIcon('score')}</div>
                                                </TableHead>
                                                <TableHead className="font-mono text-[10px] uppercase">Updated</TableHead>
                                                <TableHead className="w-[40px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedInfluencers.map((inf) => {
                                                const platform = inf.primary_platform || 'instagram';
                                                const PlatformIcon = PLATFORM_ICONS[platform]?.icon || Instagram;
                                                const platformColor = PLATFORM_ICONS[platform]?.color || 'text-pink-500';
                                                const platformBg = PLATFORM_ICONS[platform]?.bg || 'bg-pink-50';
                                                const primaryHandle = platform === 'instagram' ? inf.instagram_handle :
                                                                      platform === 'youtube' ? inf.youtube_handle :
                                                                      platform === 'linkedin' ? inf.linkedin_handle :
                                                                      platform === 'tiktok' ? inf.tiktok_handle :
                                                                      inf.instagram_handle;
                                                return (
                                                <TableRow 
                                                    key={inf.id} 
                                                    className={`cursor-pointer hover:bg-muted/50 ${selectedForCompare.includes(inf.id) ? 'bg-gold/5' : ''}`}
                                                    data-testid={`influencer-row-${inf.id}`}
                                                >
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selectedForCompare.includes(inf.id)}
                                                            onCheckedChange={() => toggleCompareSelection(inf.id)}
                                                            data-testid={`compare-checkbox-${inf.id}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell onClick={() => navigate(`/influencers/${inf.id}`)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-full ${platformBg} flex items-center justify-center`}>
                                                                <PlatformIcon className={`w-4 h-4 ${platformColor}`} />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">{inf.name}</p>
                                                                <p className="text-xs text-muted-foreground">@{primaryHandle || inf.instagram_handle} • {inf.city}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${platformBg} ${platformColor} border-0 text-[10px] capitalize`}>
                                                            {platform}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm font-medium">
                                                        {formatFollowers(inf.followers)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`text-sm font-medium ${(inf.engagement_rate || 0) >= 5 ? 'text-green-600' : (inf.engagement_rate || 0) >= 3 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                                                            {inf.engagement_rate?.toFixed(1) || '0.0'}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-muted-foreground capitalize">{inf.industry || '-'}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${TIER_COLORS[inf.tier] || 'bg-muted'} border-0 text-[10px] capitalize`}>
                                                            {inf.tier || 'micro'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-muted-foreground capitalize">{inf.gender || '-'}</span>
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Select value={inf.status} onValueChange={(v) => handleStatusUpdate(inf.id, v)}>
                                                            <SelectTrigger className={`w-[100px] text-[10px] h-7 ${STATUS_COLORS[inf.status]}`}><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-gold/10 text-gold border-0 text-xs">{inf.score?.toFixed(0) || 0}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-[10px] text-muted-foreground">{formatDate(inf.created_at)}</span>
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleRefresh(inf.id)} disabled={refreshing[inf.id]}>
                                                                    {refreshing[inf.id] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                                                    Refresh Data
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleVerify(inf.id)} disabled={verifying[inf.id]}>
                                                                    {verifying[inf.id] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                                                                    Verify Profile
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => navigate(`/outreach?influencer=${inf.id}`)}><Mail className="w-4 h-4 mr-2" />Outreach</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDelete(inf.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* AI Discover Tab */}
                <TabsContent value="ai-discover" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-6">
                        {/* Search Panel */}
                        <Card className="border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-gold" /> AI Search
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Campaign Brief *</Label>
                                    <Textarea
                                        data-testid="campaign-brief-input"
                                        value={aiParams.campaign_brief}
                                        onChange={(e) => setAiParams({ ...aiParams, campaign_brief: e.target.value })}
                                        placeholder="Describe your campaign needs..."
                                        rows={3}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-mono">Location</Label>
                                        <Select value={aiParams.location} onValueChange={(v) => setAiParams({ ...aiParams, location: v })}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {['India', ...CITIES].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Follower Range</Label>
                                    <Select value={aiParams.follower_range} onValueChange={(v) => setAiParams({ ...aiParams, follower_range: v })}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['1K-10K', '10K-50K', '50K-500K', '500K-1M', '1M+'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAIDiscoverSSE} disabled={aiLoading} className="w-full rounded-none bg-gold text-white hover:bg-gold/90" data-testid="discover-btn">
                                    {aiLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</> : <><Sparkles className="w-4 h-4 mr-2" />Discover</>}
                                </Button>
                                {aiLoading && (
                                    <div className="space-y-2">
                                        <Progress value={aiProgress} className="h-1" />
                                        <p className="text-[10px] text-muted-foreground text-center">{aiProgressMessage}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Results */}
                        <div className="col-span-2 space-y-4">
                            {aiResults ? (
                                <>
                                    {aiResults.search_strategy && (
                                        <Card className="border-gold/30 bg-gold/5">
                                            <CardContent className="p-3">
                                                <p className="text-xs"><span className="font-mono text-gold uppercase">Strategy:</span> {aiResults.search_strategy}</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                    <div className="flex gap-3">
                                        <Badge variant="outline" className="bg-gold/10 text-gold">{aiResults.total_discovered} AI Found</Badge>
                                        <Badge variant="outline">{aiResults.total_existing_matches} In Database</Badge>
                                    </div>
                                    <ScrollArea className="h-[400px]">
                                        <div className="grid grid-cols-2 gap-3">
                                            {aiResults.discovered_influencers?.map((inf, i) => (
                                                <Card key={i} className="border hover:border-gold/30">
                                                    <CardContent className="p-3">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                                                                    <span className="font-serif text-sm text-gold">{inf.name?.charAt(0)}</span>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm">{inf.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground">@{inf.instagram_handle}</p>
                                                                </div>
                                                            </div>
                                                            <Badge className={inf.audience_match_score >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                                                {inf.audience_match_score}%
                                                            </Badge>
                                                        </div>
                                                        <div className="flex gap-2 text-[10px] text-muted-foreground mb-2">
                                                            <span>{(inf.followers / 1000).toFixed(0)}K</span>
                                                            <span>•</span>
                                                            <span>{inf.engagement_rate}%</span>
                                                            <span>•</span>
                                                            <span>{inf.city}</span>
                                                        </div>
                                                        {inf.why_recommended && <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{inf.why_recommended}</p>}
                                                        <Button 
                                                            onClick={() => handleImport(inf, i)} 
                                                            disabled={importing[i] || imported[i]} 
                                                            variant={imported[i] ? 'secondary' : 'default'} 
                                                            className="w-full h-7 text-xs rounded-none"
                                                        >
                                                            {importing[i] ? <Loader2 className="w-3 h-3 animate-spin" /> : imported[i] ? <><CheckCircle className="w-3 h-3 mr-1" />Added</> : <><Plus className="w-3 h-3 mr-1" />Add to DB</>}
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </>
                            ) : (
                                <Card className="border-dashed border-muted-foreground/30 bg-muted/10">
                                    <CardContent className="p-8 text-center">
                                        <Sparkles className="w-10 h-10 text-gold mx-auto mb-3" />
                                        <p className="text-muted-foreground text-sm">Enter campaign brief and click Discover</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Add Modal */}
            <AddInfluencerForm open={showAddModal} onOpenChange={setShowAddModal} onSuccess={fetchInfluencers} />

            {/* Profile Modal */}
            <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
                <DialogContent className="max-w-lg">
                    {selectedInfluencer && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                                        <span className="font-serif text-gold">{selectedInfluencer.name?.charAt(0)}</span>
                                    </div>
                                    {selectedInfluencer.name}
                                </DialogTitle>
                            </DialogHeader>
                            
                            {/* Primary Platform Badge */}
                            {selectedInfluencer.primary_platform && (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-muted-foreground">Primary Platform:</span>
                                    <Badge className={`${PLATFORM_ICONS[selectedInfluencer.primary_platform]?.bg} ${PLATFORM_ICONS[selectedInfluencer.primary_platform]?.color} border-0 text-xs capitalize`}>
                                        {selectedInfluencer.primary_platform}
                                    </Badge>
                                </div>
                            )}
                            
                            {/* Social Handles - Clickable Links */}
                            <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-muted/30 rounded">
                                {selectedInfluencer.instagram_handle && (
                                    <a 
                                        href={`https://instagram.com/${selectedInfluencer.instagram_handle.replace('@', '')}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs hover:text-pink-500 transition-colors group"
                                    >
                                        <Instagram className="w-3.5 h-3.5 text-pink-500" />
                                        <span className="group-hover:underline">@{selectedInfluencer.instagram_handle.replace('@', '')}</span>
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}
                                {selectedInfluencer.youtube_handle && (
                                    <a 
                                        href={`https://youtube.com/@${selectedInfluencer.youtube_handle.replace('@', '')}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs hover:text-red-500 transition-colors group"
                                    >
                                        <Youtube className="w-3.5 h-3.5 text-red-500" />
                                        <span className="group-hover:underline">{selectedInfluencer.youtube_handle}</span>
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}
                                {selectedInfluencer.linkedin_handle && (
                                    <a 
                                        href={selectedInfluencer.linkedin_handle.startsWith('http') ? selectedInfluencer.linkedin_handle : `https://linkedin.com/in/${selectedInfluencer.linkedin_handle}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs hover:text-blue-600 transition-colors group"
                                    >
                                        <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="group-hover:underline">{selectedInfluencer.linkedin_handle}</span>
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}
                                {selectedInfluencer.tiktok_handle && (
                                    <a 
                                        href={`https://tiktok.com/@${selectedInfluencer.tiktok_handle.replace('@', '')}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs hover:text-black transition-colors group"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span className="group-hover:underline">@{selectedInfluencer.tiktok_handle.replace('@', '')}</span>
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}
                                {selectedInfluencer.twitter_handle && (
                                    <a 
                                        href={`https://x.com/${selectedInfluencer.twitter_handle.replace('@', '')}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs hover:text-black transition-colors group"
                                    >
                                        <span className="text-xs font-bold">𝕏</span>
                                        <span className="group-hover:underline">@{selectedInfluencer.twitter_handle.replace('@', '')}</span>
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                <div><span className="text-muted-foreground">City:</span> {selectedInfluencer.city}</div>
                                <div><span className="text-muted-foreground">Tier:</span> <Badge variant="outline" className="capitalize text-[10px]">{selectedInfluencer.tier || 'micro'}</Badge></div>
                                <div><span className="text-muted-foreground">Followers:</span> {(selectedInfluencer.followers / 1000).toFixed(0)}K</div>
                                <div><span className="text-muted-foreground">Engagement:</span> {selectedInfluencer.engagement_rate}%</div>
                                <div><span className="text-muted-foreground">Industry:</span> <Badge variant="outline" className="capitalize">{selectedInfluencer.industry || 'fashion'}</Badge></div>
                                <div><span className="text-muted-foreground">Score:</span> <Badge className="bg-gold text-white">{selectedInfluencer.score}</Badge></div>
                                {selectedInfluencer.rate_per_reel && <div><span className="text-muted-foreground">Rate/Reel:</span> ₹{selectedInfluencer.rate_per_reel?.toLocaleString()}</div>}
                                {selectedInfluencer.rate_per_video && <div><span className="text-muted-foreground">Rate/Video:</span> ₹{selectedInfluencer.rate_per_video?.toLocaleString()}</div>}
                                {selectedInfluencer.email && <div className="col-span-2"><span className="text-muted-foreground">Email:</span> {selectedInfluencer.email}</div>}
                                {selectedInfluencer.phone && <div className="col-span-2"><span className="text-muted-foreground">Phone:</span> {selectedInfluencer.phone}</div>}
                            </div>
                            {selectedInfluencer.style_tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {selectedInfluencer.style_tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                                </div>
                            )}
                            {selectedInfluencer.notes && <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted rounded">{selectedInfluencer.notes}</p>}
                        </>
                    )}
                </DialogContent>
            </Dialog>
            
            {/* Comparison Modal */}
            <Dialog open={showCompareModal} onOpenChange={setShowCompareModal}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GitCompare className="w-5 h-5 text-gold" />
                            Influencer Comparison
                        </DialogTitle>
                    </DialogHeader>
                    
                    {comparisonResult && (
                        <div className="space-y-6 mt-4">
                            {/* Influencer Cards */}
                            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparisonResult.influencers.length}, 1fr)` }}>
                                {comparisonResult.influencers.map((inf, i) => (
                                    <Card key={inf.id} className="border">
                                        <CardContent className="p-4 text-center">
                                            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-2">
                                                <span className="font-serif text-lg text-gold">{inf.name?.charAt(0)}</span>
                                            </div>
                                            <p className="font-medium text-sm">{inf.name}</p>
                                            <p className="text-[10px] text-muted-foreground">@{inf.instagram_handle}</p>
                                            <Badge variant="outline" className="mt-2 text-[10px] capitalize">{inf.industry || 'fashion'}</Badge>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            
                            {/* Metrics Comparison */}
                            <Card className="border">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Metrics Comparison</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-mono text-[10px]">Metric</TableHead>
                                                {comparisonResult.influencers.map(inf => (
                                                    <TableHead key={inf.id} className="font-mono text-[10px] text-center">{inf.name?.split(' ')[0]}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium text-xs">Followers</TableCell>
                                                {comparisonResult.metrics.followers.values.map((v, i) => (
                                                    <TableCell key={i} className={`text-center text-xs ${v === comparisonResult.metrics.followers.max ? 'text-green-600 font-medium' : ''}`}>
                                                        {(v / 1000).toFixed(0)}K
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-xs">Engagement Rate</TableCell>
                                                {comparisonResult.metrics.engagement_rate.values.map((v, i) => (
                                                    <TableCell key={i} className={`text-center text-xs ${v === comparisonResult.metrics.engagement_rate.max ? 'text-green-600 font-medium' : ''}`}>
                                                        {v}%
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-xs">Score</TableCell>
                                                {comparisonResult.metrics.score.values.map((v, i) => (
                                                    <TableCell key={i} className={`text-center text-xs ${v === comparisonResult.metrics.score.max ? 'text-green-600 font-medium' : ''}`}>
                                                        {v}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-xs">Rate/Reel</TableCell>
                                                {comparisonResult.metrics.rate_per_reel.values.map((v, i) => (
                                                    <TableCell key={i} className={`text-center text-xs ${v === comparisonResult.metrics.rate_per_reel.min && v > 0 ? 'text-green-600 font-medium' : ''}`}>
                                                        {v > 0 ? `₹${v.toLocaleString()}` : 'N/A'}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            
                            {/* AI Recommendation */}
                            {comparisonResult.recommendation && (
                                <Card className="border-gold/30 bg-gold/5">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Sparkles className="w-5 h-5 text-gold mt-0.5" />
                                            <div>
                                                <p className="font-mono text-[10px] uppercase text-gold mb-1">AI Recommendation</p>
                                                <p className="text-sm">{comparisonResult.recommendation}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            
                            <div className="flex justify-end">
                                <Button variant="outline" onClick={() => { setShowCompareModal(false); setSelectedForCompare([]); }}>
                                    Close & Clear Selection
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
