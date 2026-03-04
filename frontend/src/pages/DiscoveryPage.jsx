import React, { useState, useEffect } from 'react';
import { influencerApi, aiApi } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
    Search, 
    Filter, 
    Sparkles,
    Instagram,
    Youtube,
    MapPin,
    Users,
    TrendingUp,
    Plus,
    X
} from 'lucide-react';

const CATEGORIES = ['luxury', 'menswear', 'womenswear', 'streetwear', 'ethnic', 'minimal'];
const CITIES = ['Mumbai', 'Delhi', 'Kolkata', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune'];

const InfluencerCard = ({ influencer, onViewProfile }) => (
    <Card 
        className="border border-border hover:border-gold/30 transition-all duration-300 group cursor-pointer overflow-hidden"
        onClick={() => onViewProfile(influencer)}
    >
        <div className="aspect-[3/4] relative bg-muted">
            <img 
                src={`https://images.unsplash.com/photo-${1646514336754 + Math.floor(Math.random() * 1000000)}-1c3fe17e28c2?w=400&h=600&fit=crop`}
                alt={influencer.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1652281846260-14c1bdd5e9a0?w=400&h=600&fit=crop';
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Score Badge */}
            <div className="absolute top-3 right-3">
                <Badge className="bg-gold text-white border-0 font-mono text-xs">
                    {influencer.score}
                </Badge>
            </div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-serif text-lg mb-1">{influencer.name}</h3>
                {influencer.instagram_handle && (
                    <p className="text-white/70 text-sm flex items-center gap-1 mb-2">
                        <Instagram className="w-3.5 h-3.5" />
                        @{influencer.instagram_handle}
                    </p>
                )}
                <div className="flex items-center gap-3 text-xs text-white/60">
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {(influencer.followers / 1000).toFixed(0)}K
                    </span>
                    <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {influencer.engagement_rate}%
                    </span>
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {influencer.city}
                    </span>
                </div>
            </div>
        </div>
        <CardContent className="p-3">
            <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] capitalize">
                    {influencer.category}
                </Badge>
                {influencer.style_tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                    </Badge>
                ))}
            </div>
        </CardContent>
    </Card>
);

export const DiscoveryPage = () => {
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        city: '',
        min_followers: '',
        min_engagement: ''
    });
    const [newInfluencer, setNewInfluencer] = useState({
        name: '',
        instagram_handle: '',
        youtube_handle: '',
        email: '',
        phone: '',
        city: 'Mumbai',
        category: 'luxury',
        followers: '',
        engagement_rate: '',
        style_tags: []
    });
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        fetchInfluencers();
    }, []);

    const fetchInfluencers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.category) params.category = filters.category;
            if (filters.city) params.city = filters.city;
            if (filters.min_followers) params.min_followers = parseInt(filters.min_followers);
            if (filters.min_engagement) params.min_engagement = parseFloat(filters.min_engagement);

            const response = await influencerApi.getAll(params);
            setInfluencers(response.data);
        } catch (error) {
            toast.error('Failed to fetch influencers');
        } finally {
            setLoading(false);
        }
    };

    const handleAIMatch = async () => {
        setAiLoading(true);
        try {
            const response = await aiApi.matchInfluencers({
                category: filters.category || 'luxury',
                min_followers: parseInt(filters.min_followers) || 10000,
                min_engagement: parseFloat(filters.min_engagement) || 3.0,
                city: filters.city || null,
                style_tags: []
            });
            setInfluencers(response.data.influencers);
            setAiRecommendation(response.data.ai_recommendation);
            toast.success('AI recommendations loaded');
        } catch (error) {
            toast.error('Failed to get AI recommendations');
        } finally {
            setAiLoading(false);
        }
    };

    const handleAddInfluencer = async (e) => {
        e.preventDefault();
        try {
            await influencerApi.create({
                ...newInfluencer,
                followers: parseInt(newInfluencer.followers) || 0,
                engagement_rate: parseFloat(newInfluencer.engagement_rate) || 0
            });
            toast.success('Influencer added successfully');
            setShowAddModal(false);
            setNewInfluencer({
                name: '',
                instagram_handle: '',
                youtube_handle: '',
                email: '',
                phone: '',
                city: 'Mumbai',
                category: 'luxury',
                followers: '',
                engagement_rate: '',
                style_tags: []
            });
            fetchInfluencers();
        } catch (error) {
            toast.error('Failed to add influencer');
        }
    };

    const addTag = () => {
        if (tagInput && !newInfluencer.style_tags.includes(tagInput)) {
            setNewInfluencer({
                ...newInfluencer,
                style_tags: [...newInfluencer.style_tags, tagInput]
            });
            setTagInput('');
        }
    };

    const removeTag = (tag) => {
        setNewInfluencer({
            ...newInfluencer,
            style_tags: newInfluencer.style_tags.filter(t => t !== tag)
        });
    };

    return (
        <div className="p-8 space-y-8" data-testid="discovery-page">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Find Creators
                    </p>
                    <h1 className="font-serif text-4xl">Discovery</h1>
                </div>
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogTrigger asChild>
                        <Button 
                            data-testid="add-influencer-btn"
                            className="rounded-none bg-primary text-primary-foreground hover:bg-gold"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Influencer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="font-serif text-2xl">Add New Influencer</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddInfluencer} className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Name *</Label>
                                    <Input
                                        data-testid="inf-name-input"
                                        value={newInfluencer.name}
                                        onChange={(e) => setNewInfluencer({ ...newInfluencer, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Instagram</Label>
                                    <Input
                                        data-testid="inf-instagram-input"
                                        value={newInfluencer.instagram_handle}
                                        onChange={(e) => setNewInfluencer({ ...newInfluencer, instagram_handle: e.target.value })}
                                        placeholder="@handle"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Email</Label>
                                    <Input
                                        type="email"
                                        value={newInfluencer.email}
                                        onChange={(e) => setNewInfluencer({ ...newInfluencer, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Phone</Label>
                                    <Input
                                        value={newInfluencer.phone}
                                        onChange={(e) => setNewInfluencer({ ...newInfluencer, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">City *</Label>
                                    <Select value={newInfluencer.city} onValueChange={(v) => setNewInfluencer({ ...newInfluencer, city: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CITIES.map(city => (
                                                <SelectItem key={city} value={city}>{city}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Category *</Label>
                                    <Select value={newInfluencer.category} onValueChange={(v) => setNewInfluencer({ ...newInfluencer, category: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(cat => (
                                                <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Followers</Label>
                                    <Input
                                        type="number"
                                        value={newInfluencer.followers}
                                        onChange={(e) => setNewInfluencer({ ...newInfluencer, followers: e.target.value })}
                                        placeholder="e.g., 50000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Engagement %</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={newInfluencer.engagement_rate}
                                        onChange={(e) => setNewInfluencer({ ...newInfluencer, engagement_rate: e.target.value })}
                                        placeholder="e.g., 4.5"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Style Tags</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        placeholder="Add tag"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    />
                                    <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {newInfluencer.style_tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)} className="ml-1">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <Button type="submit" data-testid="submit-influencer-btn" className="w-full rounded-none">
                                Add Influencer
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <Card className="border border-border">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Filters</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                data-testid="search-input"
                                placeholder="Search..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="pl-9"
                            />
                        </div>
                        <Select value={filters.category || "all"} onValueChange={(v) => setFilters({ ...filters, category: v === "all" ? "" : v })}>
                            <SelectTrigger data-testid="category-filter">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filters.city || "all"} onValueChange={(v) => setFilters({ ...filters, city: v === "all" ? "" : v })}>
                            <SelectTrigger data-testid="city-filter">
                                <SelectValue placeholder="City" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Cities</SelectItem>
                                {CITIES.map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            placeholder="Min Followers"
                            value={filters.min_followers}
                            onChange={(e) => setFilters({ ...filters, min_followers: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <Button 
                                onClick={fetchInfluencers} 
                                variant="outline" 
                                className="flex-1 rounded-none"
                                data-testid="apply-filters-btn"
                            >
                                Apply
                            </Button>
                            <Button 
                                onClick={handleAIMatch} 
                                disabled={aiLoading}
                                className="rounded-none bg-gold text-white hover:bg-gold/90"
                                data-testid="ai-match-btn"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                AI Match
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* AI Recommendation */}
            {aiRecommendation && (
                <Card className="border border-gold/30 bg-gold/5">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-gold mt-0.5" />
                        <div>
                            <p className="font-mono text-xs uppercase tracking-wider text-gold mb-1">AI Recommendation</p>
                            <p className="text-sm">{aiRecommendation}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="aspect-[3/4]" />
                    ))}
                </div>
            ) : influencers.length === 0 ? (
                <Card className="border border-border">
                    <CardContent className="p-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-serif text-xl mb-2">No Influencers Found</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Start building your influencer database by adding new creators
                        </p>
                        <Button onClick={() => setShowAddModal(true)} className="rounded-none">
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Influencer
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 stagger-children">
                    {influencers.map((inf) => (
                        <InfluencerCard 
                            key={inf.id} 
                            influencer={inf} 
                            onViewProfile={() => {}}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
