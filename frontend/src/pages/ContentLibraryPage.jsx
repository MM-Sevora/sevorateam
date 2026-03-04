import React, { useState, useEffect } from 'react';
import { contentApi, campaignApi, influencerApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
    FolderOpen, 
    Plus,
    Image,
    Video,
    FileText,
    Download,
    ExternalLink,
    Filter
} from 'lucide-react';

const CONTENT_TYPES = [
    { value: 'reel', label: 'Reel', icon: Video },
    { value: 'post', label: 'Post', icon: Image },
    { value: 'story', label: 'Story', icon: Image },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'document', label: 'Document', icon: FileText },
];

// Sample content for demo
const SAMPLE_CONTENT = [
    {
        id: '1',
        content_type: 'reel',
        content_url: 'https://images.unsplash.com/photo-1646514336754-1c3fe17e28c2?w=400',
        description: 'Summer Collection Styling',
        campaign_name: 'Summer Style 2026',
        influencer_name: 'Priya Kapoor',
        created_at: '2026-01-15'
    },
    {
        id: '2',
        content_type: 'post',
        content_url: 'https://images.unsplash.com/photo-1652281846260-14c1bdd5e9a0?w=400',
        description: 'Ethnic Wear Lookbook',
        campaign_name: 'Festive Collection',
        influencer_name: 'Arjun Mehta',
        created_at: '2026-01-12'
    },
    {
        id: '3',
        content_type: 'story',
        content_url: 'https://images.unsplash.com/photo-1652281846249-f81974eba5b4?w=400',
        description: 'Behind the Scenes',
        campaign_name: 'Summer Style 2026',
        influencer_name: 'Neha Shah',
        created_at: '2026-01-10'
    },
];

export const ContentLibraryPage = () => {
    const [content, setContent] = useState(SAMPLE_CONTENT);
    const [campaigns, setCampaigns] = useState([]);
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [filter, setFilter] = useState({ campaign: '', influencer: '', type: '' });
    const [newContent, setNewContent] = useState({
        campaign_id: '',
        influencer_id: '',
        content_type: 'post',
        content_url: '',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [campaignsRes, influencersRes, contentRes] = await Promise.all([
                campaignApi.getAll(),
                influencerApi.getAll(),
                contentApi.getAll()
            ]);
            setCampaigns(campaignsRes.data);
            setInfluencers(influencersRes.data);
            if (contentRes.data.length > 0) {
                setContent(contentRes.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddContent = async (e) => {
        e.preventDefault();
        try {
            await contentApi.create(newContent);
            toast.success('Content added');
            setShowAddModal(false);
            setNewContent({
                campaign_id: '',
                influencer_id: '',
                content_type: 'post',
                content_url: '',
                description: ''
            });
            fetchData();
        } catch (error) {
            toast.error('Failed to add content');
        }
    };

    const filteredContent = content.filter(item => {
        if (filter.type && item.content_type !== filter.type) return false;
        if (filter.campaign && item.campaign_id !== filter.campaign) return false;
        if (filter.influencer && item.influencer_id !== filter.influencer) return false;
        return true;
    });

    const contentByType = CONTENT_TYPES.reduce((acc, type) => {
        acc[type.value] = content.filter(c => c.content_type === type.value).length;
        return acc;
    }, {});

    return (
        <div className="p-8 space-y-8" data-testid="content-library-page">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Asset Management
                    </p>
                    <h1 className="font-serif text-4xl">Content Library</h1>
                </div>
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogTrigger asChild>
                        <Button 
                            data-testid="add-content-btn"
                            className="rounded-none bg-primary text-primary-foreground hover:bg-gold"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Content
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="font-serif text-2xl">Add Content</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddContent} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Campaign</Label>
                                <Select 
                                    value={newContent.campaign_id} 
                                    onValueChange={(v) => setNewContent({ ...newContent, campaign_id: v })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                                    <SelectContent>
                                        {campaigns.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Influencer</Label>
                                <Select 
                                    value={newContent.influencer_id} 
                                    onValueChange={(v) => setNewContent({ ...newContent, influencer_id: v })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select influencer" /></SelectTrigger>
                                    <SelectContent>
                                        {influencers.map(i => (
                                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Content Type</Label>
                                <Select 
                                    value={newContent.content_type} 
                                    onValueChange={(v) => setNewContent({ ...newContent, content_type: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CONTENT_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Content URL *</Label>
                                <Input
                                    value={newContent.content_url}
                                    onChange={(e) => setNewContent({ ...newContent, content_url: e.target.value })}
                                    placeholder="https://..."
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Description</Label>
                                <Input
                                    value={newContent.description}
                                    onChange={(e) => setNewContent({ ...newContent, description: e.target.value })}
                                    placeholder="Brief description..."
                                />
                            </div>
                            <Button type="submit" className="w-full rounded-none">
                                Add to Library
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {CONTENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                        <Card 
                            key={type.value}
                            className={`border cursor-pointer transition-all duration-200 ${
                                filter.type === type.value ? 'border-gold' : 'border-border hover:border-gold/30'
                            }`}
                            onClick={() => setFilter({ ...filter, type: filter.type === type.value ? '' : type.value })}
                        >
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                                    <Icon className="w-5 h-5 text-gold" />
                                </div>
                                <div>
                                    <p className="font-serif text-xl">{contentByType[type.value] || 0}</p>
                                    <p className="font-mono text-[10px] uppercase text-muted-foreground">{type.label}s</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Filters */}
            <Card className="border border-border">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Filter</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Select value={filter.campaign || "all"} onValueChange={(v) => setFilter({ ...filter, campaign: v === "all" ? "" : v })}>
                            <SelectTrigger><SelectValue placeholder="All Campaigns" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Campaigns</SelectItem>
                                {campaigns.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filter.influencer || "all"} onValueChange={(v) => setFilter({ ...filter, influencer: v === "all" ? "" : v })}>
                            <SelectTrigger><SelectValue placeholder="All Influencers" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Influencers</SelectItem>
                                {influencers.map(i => (
                                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button 
                            variant="outline" 
                            onClick={() => setFilter({ campaign: '', influencer: '', type: '' })}
                            className="rounded-none"
                        >
                            Clear Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Content Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square" />
                    ))}
                </div>
            ) : filteredContent.length === 0 ? (
                <Card className="border border-border">
                    <CardContent className="p-12 text-center">
                        <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-serif text-xl mb-2">No Content Found</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            {filter.type || filter.campaign || filter.influencer 
                                ? 'No content matches your filters'
                                : 'Start building your content library by adding influencer content'
                            }
                        </p>
                        <Button onClick={() => setShowAddModal(true)} className="rounded-none">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Content
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 stagger-children">
                    {filteredContent.map((item) => {
                        const TypeIcon = CONTENT_TYPES.find(t => t.value === item.content_type)?.icon || Image;
                        return (
                            <Card 
                                key={item.id}
                                className="border border-border hover:border-gold/30 transition-all duration-300 group overflow-hidden"
                            >
                                <div className="aspect-square relative bg-muted">
                                    <img 
                                        src={item.content_url}
                                        alt={item.description}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => {
                                            e.target.src = 'https://images.unsplash.com/photo-1652281846260-14c1bdd5e9a0?w=400';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="secondary" className="rounded-full">
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="rounded-full">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Badge className="absolute top-3 right-3 bg-black/50 text-white border-0">
                                        <TypeIcon className="w-3 h-3 mr-1" />
                                        {item.content_type}
                                    </Badge>
                                </div>
                                <CardContent className="p-3">
                                    <p className="font-medium text-sm truncate">{item.description || 'Untitled'}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {item.influencer_name || 'Unknown'} • {item.campaign_name || 'No Campaign'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(item.created_at).toLocaleDateString('en-IN')}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
