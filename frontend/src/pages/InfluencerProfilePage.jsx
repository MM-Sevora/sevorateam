import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { influencerApi, socialApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { 
    ArrowLeft, Edit2, Save, X, Instagram, Youtube, 
    Users, TrendingUp, MapPin, Mail, Phone, DollarSign, 
    ExternalLink, Star, Sparkles, Video, Image, MessageCircle,
    Eye, Heart, BarChart3, Target, Globe, Calendar, RefreshCw, Loader2, CheckCircle, Download, Send
} from 'lucide-react';
import OutreachModal from '../components/OutreachModal';

const INDUSTRIES = ['fashion', 'beauty', 'lifestyle', 'fitness', 'tech', 'food', 'travel', 'entertainment', 'education', 'finance'];
const CONTENT_TYPES = ['reels', 'posts', 'stories', 'youtube videos', 'blogs', 'podcasts', 'live streams'];
const GENDERS = ['male', 'female', 'non-binary', 'other', 'prefer not to say'];
const TIERS = ['nano', 'micro', 'mid', 'macro', 'mega', 'celebrity'];
const PLATFORMS = ['instagram', 'youtube'];
const STATUS_OPTIONS = ['identified', 'contacted', 'interested', 'negotiation', 'confirmed', 'completed'];

const TIER_INFO = {
    nano: { range: '1K-10K', color: 'bg-gray-100 text-gray-700' },
    micro: { range: '10K-100K', color: 'bg-blue-100 text-blue-700' },
    mid: { range: '100K-500K', color: 'bg-green-100 text-green-700' },
    macro: { range: '500K-1M', color: 'bg-purple-100 text-purple-700' },
    mega: { range: '1M-5M', color: 'bg-gold/20 text-gold' },
    celebrity: { range: '5M+', color: 'bg-pink-100 text-pink-700' }
};

const PLATFORM_URLS = {
    instagram: (h) => `https://instagram.com/${h?.replace('@', '')}`,
    youtube: (h) => `https://youtube.com/@${h?.replace('@', '')}`
};

export const InfluencerProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [influencer, setInfluencer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchingPlatform, setFetchingPlatform] = useState(null);
    const [editData, setEditData] = useState({});
    const [showOutreach, setShowOutreach] = useState(false);

    useEffect(() => {
        fetchInfluencer();
    }, [id]);

    const fetchInfluencer = async () => {
        try {
            setLoading(true);
            const response = await influencerApi.getById(id);
            setInfluencer(response.data);
            setEditData(response.data);
        } catch (error) {
            toast.error('Failed to load influencer');
            navigate('/influencers');
        } finally {
            setLoading(false);
        }
    };
    
    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const response = await influencerApi.refresh(id);
            setInfluencer(response.data);
            setEditData(response.data);
            toast.success(`Data refreshed: ${formatFollowers(response.data.followers)} followers, ${response.data.engagement_rate?.toFixed(1)}% engagement`);
        } catch (error) {
            toast.error('Failed to refresh data');
        } finally {
            setRefreshing(false);
        }
    };
    
    // Fetch data for a specific platform and update the influencer
    const fetchPlatformData = async (platform) => {
        const handle = platform === 'instagram' ? editData.instagram_handle : editData.youtube_handle;
        if (!handle) {
            toast.error(`Enter ${platform} handle first`);
            return;
        }
        
        setFetchingPlatform(platform);
        try {
            const response = await socialApi.verifyProfile(platform, handle.replace('@', ''));
            const data = response.data;
            
            if (data && data.followers > 0) {
                const metrics = platform === 'instagram' ? {
                    followers: data.followers,
                    engagement_rate: data.engagement_rate || 0,
                    avg_likes: data.raw_data?.avg_likes || 0,
                    avg_comments: data.raw_data?.avg_comments || 0,
                    posts_count: data.posts_count || 0,
                    last_verified: data.last_verified
                } : {
                    subscribers: data.followers,
                    engagement_rate: data.engagement_rate || 0,
                    avg_views: data.raw_data?.avg_views || 0,
                    avg_likes: data.raw_data?.avg_likes || 0,
                    videos_count: data.posts_count || 0,
                    last_verified: data.last_verified
                };
                
                // Update editData with new metrics
                const metricsKey = platform === 'instagram' ? 'instagram_metrics' : 'youtube_metrics';
                const updatedData = {
                    ...editData,
                    [metricsKey]: metrics,
                    // Update main followers if this is the primary platform
                    ...(editData.primary_platform === platform && {
                        followers: data.followers,
                        engagement_rate: data.engagement_rate || 0
                    })
                };
                
                setEditData(updatedData);
                toast.success(`${platform === 'instagram' ? 'Instagram' : 'YouTube'}: ${formatFollowers(data.followers)} ${platform === 'instagram' ? 'followers' : 'subscribers'} fetched`);
            } else {
                toast.error(`Could not fetch ${platform} data`);
            }
        } catch (error) {
            toast.error(`Failed to fetch ${platform} data`);
        } finally {
            setFetchingPlatform(null);
        }
    };
    
    const formatFollowers = (count) => {
        if (!count) return '0';
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
        return count.toString();
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await influencerApi.update(id, editData);
            setInfluencer(editData);
            setEditing(false);
            toast.success('Profile updated');
        } catch (error) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditData(influencer);
        setEditing(false);
    };

    const update = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const formatCurrency = (amount) => amount ? `₹${amount.toLocaleString()}` : '-';

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-3 gap-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64 col-span-2" />
                </div>
            </div>
        );
    }

    if (!influencer) return null;

    const data = editing ? editData : influencer;

    return (
        <div className="p-6 space-y-6" data-testid="influencer-profile-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/influencers')} data-testid="back-btn">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="font-serif text-2xl">{data.name}</h1>
                        <p className="text-sm text-muted-foreground">@{data.instagram_handle || data.youtube_handle || 'N/A'}</p>
                    </div>
                    <Badge className={`${TIER_INFO[data.tier || 'micro']?.color} text-xs capitalize`}>
                        {data.tier || 'micro'} • {TIER_INFO[data.tier || 'micro']?.range}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleRefresh} 
                        disabled={refreshing} 
                        className="rounded-none"
                        data-testid="refresh-btn"
                    >
                        {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Refresh Data
                    </Button>
                    {editing ? (
                        <>
                            <Button variant="outline" onClick={handleCancel} className="rounded-none">
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={saving} className="rounded-none bg-gold text-white hover:bg-gold/90" data-testid="save-btn">
                                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setShowOutreach(true)} variant="default" className="rounded-none bg-gold hover:bg-gold/90" data-testid="outreach-btn">
                                <Send className="w-4 h-4 mr-2" /> Send Outreach
                            </Button>
                            <Button onClick={() => setEditing(true)} variant="outline" className="rounded-none" data-testid="edit-btn">
                                <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Outreach Modal */}
            <OutreachModal 
                open={showOutreach} 
                onClose={() => setShowOutreach(false)} 
                influencer={data}
                onSuccess={fetchInfluencer}
            />

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="metrics">Core Metrics</TabsTrigger>
                    <TabsTrigger value="deliverables">Deliverables & Rates</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                    <div className="grid grid-cols-3 gap-6">
                        {/* Left Column - Profile Card */}
                        <Card className="border">
                            <CardContent className="p-6 space-y-4">
                                {/* Avatar */}
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center mb-3 relative">
                                        <span className="font-serif text-3xl text-gold">{data.name?.charAt(0)}</span>
                                        {data.last_verified && (
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center" title="Verified via API">
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="font-serif text-xl">{data.name}</h2>
                                    <Badge className="capitalize mt-1">{data.industry || 'fashion'}</Badge>
                                    
                                    {/* Verification Status */}
                                    {data.last_verified && (
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            Last verified: {new Date(data.last_verified).toLocaleDateString()}
                                        </p>
                                    )}
                                    
                                    {/* Status */}
                                    {editing ? (
                                        <Select value={data.status || 'identified'} onValueChange={(v) => update('status', v)}>
                                            <SelectTrigger className="w-[140px] mt-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant="outline" className="mt-2 capitalize">{data.status || 'identified'}</Badge>
                                    )}
                                </div>

                                <Separator />

                                {/* Bio */}
                                <div>
                                    <Label className="text-[10px] uppercase font-mono text-muted-foreground">Bio</Label>
                                    {editing ? (
                                        <Textarea value={data.bio || ''} onChange={(e) => update('bio', e.target.value)} rows={3} className="mt-1" />
                                    ) : (
                                        <p className="text-sm mt-1">{data.bio || 'No bio added'}</p>
                                    )}
                                </div>

                                <Separator />

                                {/* Contact Info */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-mono text-muted-foreground">Contact</Label>
                                    {editing ? (
                                        <div className="space-y-2">
                                            <Input value={data.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="Email" className="h-8 text-xs" />
                                            <Input value={data.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="Phone" className="h-8 text-xs" />
                                        </div>
                                    ) : (
                                        <>
                                            {data.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{data.email}</div>}
                                            {data.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{data.phone}</div>}
                                            {!data.email && !data.phone && <p className="text-sm text-muted-foreground">No contact info</p>}
                                        </>
                                    )}
                                </div>

                                <Separator />

                                {/* Location */}
                                <div>
                                    <Label className="text-[10px] uppercase font-mono text-muted-foreground">Location</Label>
                                    {editing ? (
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            <Input value={data.city || ''} onChange={(e) => update('city', e.target.value)} placeholder="City" className="h-8 text-xs" />
                                            <Input value={data.state || ''} onChange={(e) => update('state', e.target.value)} placeholder="State" className="h-8 text-xs" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm mt-1">
                                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                            {data.city}{data.state ? `, ${data.state}` : ''}, {data.country || 'India'}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right Column - Details */}
                        <div className="col-span-2 space-y-6">
                            {/* Social Handles */}
                            <Card className="border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-gold" /> Social Profiles
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {editing ? (
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-mono">Primary Platform</Label>
                                                <Select value={data.primary_platform || 'instagram'} onValueChange={(v) => update('primary_platform', v)}>
                                                    <SelectTrigger className="w-[180px] h-8"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono flex items-center gap-1">
                                                        <Instagram className="w-3 h-3 text-pink-500" /> Instagram
                                                    </Label>
                                                    <div className="flex gap-1">
                                                        <Input value={data.instagram_handle || ''} onChange={(e) => update('instagram_handle', e.target.value)} placeholder="@handle" className="h-8 text-xs flex-1" />
                                                        <Button 
                                                            type="button" 
                                                            size="sm"
                                                            onClick={() => fetchPlatformData('instagram')}
                                                            disabled={fetchingPlatform === 'instagram' || !data.instagram_handle}
                                                            className="h-8 px-2 bg-pink-500 hover:bg-pink-600 text-white"
                                                        >
                                                            {fetchingPlatform === 'instagram' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono flex items-center gap-1">
                                                        <Youtube className="w-3 h-3 text-red-500" /> YouTube
                                                    </Label>
                                                    <div className="flex gap-1">
                                                        <Input value={data.youtube_handle || ''} onChange={(e) => update('youtube_handle', e.target.value)} placeholder="@channel" className="h-8 text-xs flex-1" />
                                                        <Button 
                                                            type="button" 
                                                            size="sm"
                                                            onClick={() => fetchPlatformData('youtube')}
                                                            disabled={fetchingPlatform === 'youtube' || !data.youtube_handle}
                                                            className="h-8 px-2 bg-red-500 hover:bg-red-600 text-white"
                                                        >
                                                            {fetchingPlatform === 'youtube' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            {data.instagram_handle && (
                                                <a href={PLATFORM_URLS.instagram(data.instagram_handle)} target="_blank" rel="noopener noreferrer" 
                                                   className={`flex items-center gap-2 p-3 rounded border hover:bg-muted/50 transition-colors ${data.primary_platform === 'instagram' ? 'border-pink-300 bg-pink-50/50' : ''}`}>
                                                    <Instagram className="w-5 h-5 text-pink-500" />
                                                    <div>
                                                        <p className="text-sm font-medium">@{data.instagram_handle.replace('@', '')}</p>
                                                        {data.primary_platform === 'instagram' && <Badge className="bg-pink-100 text-pink-600 text-[8px]">Primary</Badge>}
                                                    </div>
                                                    <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                                                </a>
                                            )}
                                            {data.youtube_handle && (
                                                <a href={PLATFORM_URLS.youtube(data.youtube_handle)} target="_blank" rel="noopener noreferrer"
                                                   className={`flex items-center gap-2 p-3 rounded border hover:bg-muted/50 transition-colors ${data.primary_platform === 'youtube' ? 'border-red-300 bg-red-50/50' : ''}`}>
                                                    <Youtube className="w-5 h-5 text-red-500" />
                                                    <div>
                                                        <p className="text-sm font-medium">{data.youtube_handle}</p>
                                                        {data.primary_platform === 'youtube' && <Badge className="bg-red-100 text-red-600 text-[8px]">Primary</Badge>}
                                                    </div>
                                                    <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                                                </a>
                                            )}
                                            {!data.instagram_handle && !data.youtube_handle && (
                                                <p className="text-sm text-muted-foreground col-span-2">No social profiles added. Click Edit to add Instagram or YouTube handles.</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <Card className="border">
                                    <CardContent className="p-4 text-center">
                                        <Users className="w-5 h-5 text-gold mx-auto mb-1" />
                                        <p className="font-serif text-xl">{((data.followers || 0) / 1000).toFixed(0)}K</p>
                                        <p className="text-[10px] uppercase font-mono text-muted-foreground">Followers</p>
                                    </CardContent>
                                </Card>
                                <Card className="border">
                                    <CardContent className="p-4 text-center">
                                        <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                                        <p className="font-serif text-xl">{data.engagement_rate || 0}%</p>
                                        <p className="text-[10px] uppercase font-mono text-muted-foreground">Engagement</p>
                                    </CardContent>
                                </Card>
                                <Card className="border">
                                    <CardContent className="p-4 text-center">
                                        <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                                        <p className="font-serif text-xl">{((data.avg_likes || 0) / 1000).toFixed(1)}K</p>
                                        <p className="text-[10px] uppercase font-mono text-muted-foreground">Avg Likes</p>
                                    </CardContent>
                                </Card>
                                <Card className="border">
                                    <CardContent className="p-4 text-center">
                                        <Star className="w-5 h-5 text-gold mx-auto mb-1" />
                                        <p className="font-serif text-xl">{data.score || 0}</p>
                                        <p className="text-[10px] uppercase font-mono text-muted-foreground">Score</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Classification */}
                            <Card className="border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Target className="w-4 h-4 text-gold" /> Classification
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {editing ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Industry</Label>
                                                    <Select value={data.industry || 'fashion'} onValueChange={(v) => update('industry', v)}>
                                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {INDUSTRIES.map(i => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Tier</Label>
                                                    <Select value={data.tier || 'micro'} onValueChange={(v) => update('tier', v)}>
                                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {TIERS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Gender</Label>
                                                    <Select value={data.gender || 'prefer not to say'} onValueChange={(v) => update('gender', v)}>
                                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {GENDERS.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Audience Focus</Label>
                                                    <Select value={data.gender_focus || 'unisex'} onValueChange={(v) => update('gender_focus', v)}>
                                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="menswear">Menswear</SelectItem>
                                                            <SelectItem value="womenswear">Womenswear</SelectItem>
                                                            <SelectItem value="unisex">Unisex</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Content Types</Label>
                                                    <Input 
                                                        value={data.content_type?.join(', ') || ''} 
                                                        onChange={(e) => update('content_type', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                                                        placeholder="reels, posts, stories"
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                <Badge className="bg-blue-100 text-blue-700 capitalize">{data.industry || 'fashion'}</Badge>
                                                <Badge className={`${TIER_INFO[data.tier || 'micro']?.color} capitalize`}>{data.tier || 'micro'}</Badge>
                                                {data.gender && data.gender !== 'prefer not to say' && (
                                                    <Badge variant="outline" className="capitalize">{data.gender}</Badge>
                                                )}
                                                <Badge variant="outline" className="capitalize">{data.gender_focus || 'unisex'} audience</Badge>
                                            </div>
                                            {data.content_type?.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] uppercase font-mono text-muted-foreground mb-1">Content Types</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {data.content_type.map(ct => (
                                                            <Badge key={ct} variant="secondary" className="text-[10px] capitalize">{ct}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {data.style_tags?.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] uppercase font-mono text-muted-foreground mb-1">Style Tags</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {data.style_tags.map(tag => (
                                                            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Core Metrics Tab - Per Platform */}
                <TabsContent value="metrics">
                    <div className="space-y-6">
                        {/* Per-Platform Metrics */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Instagram Metrics */}
                            {(data.instagram_handle || data.primary_platform === 'instagram') && (
                                <Card className="border border-pink-200">
                                    <CardHeader className="pb-3 bg-pink-50/50">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Instagram className="w-4 h-4 text-pink-500" /> Instagram Metrics
                                            {data.primary_platform === 'instagram' && <Badge className="bg-pink-100 text-pink-600 text-[8px]">Primary</Badge>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {editing ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Followers</Label>
                                                    <Input type="number" value={data.instagram_metrics?.followers || data.followers || ''} 
                                                        onChange={(e) => update('instagram_metrics', { ...data.instagram_metrics, followers: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Engagement %</Label>
                                                    <Input type="number" step="0.1" value={data.instagram_metrics?.engagement_rate || data.engagement_rate || ''} 
                                                        onChange={(e) => update('instagram_metrics', { ...data.instagram_metrics, engagement_rate: parseFloat(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Avg Likes</Label>
                                                    <Input type="number" value={data.instagram_metrics?.avg_likes || data.avg_likes || ''} 
                                                        onChange={(e) => update('instagram_metrics', { ...data.instagram_metrics, avg_likes: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Avg Reel Views</Label>
                                                    <Input type="number" value={data.instagram_metrics?.avg_reel_views || ''} 
                                                        onChange={(e) => update('instagram_metrics', { ...data.instagram_metrics, avg_reel_views: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><span className="text-[10px] text-muted-foreground">Followers</span><p className="font-medium">{((data.instagram_metrics?.followers || data.followers || 0) / 1000).toFixed(0)}K</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Engagement</span><p className="font-medium">{data.instagram_metrics?.engagement_rate || data.engagement_rate || 0}%</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Avg Likes</span><p className="font-medium">{(data.instagram_metrics?.avg_likes || data.avg_likes || 0).toLocaleString()}</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Avg Reel Views</span><p className="font-medium">{(data.instagram_metrics?.avg_reel_views || 0).toLocaleString()}</p></div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* YouTube Metrics */}
                            {(data.youtube_handle || data.primary_platform === 'youtube') && (
                                <Card className="border border-red-200">
                                    <CardHeader className="pb-3 bg-red-50/50">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Youtube className="w-4 h-4 text-red-500" /> YouTube Metrics
                                            {data.primary_platform === 'youtube' && <Badge className="bg-red-100 text-red-600 text-[8px]">Primary</Badge>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {editing ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Subscribers</Label>
                                                    <Input type="number" value={data.youtube_metrics?.subscribers || ''} 
                                                        onChange={(e) => update('youtube_metrics', { ...data.youtube_metrics, subscribers: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Avg Views</Label>
                                                    <Input type="number" value={data.youtube_metrics?.avg_views || ''} 
                                                        onChange={(e) => update('youtube_metrics', { ...data.youtube_metrics, avg_views: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Avg Likes</Label>
                                                    <Input type="number" value={data.youtube_metrics?.avg_likes || ''} 
                                                        onChange={(e) => update('youtube_metrics', { ...data.youtube_metrics, avg_likes: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Total Videos</Label>
                                                    <Input type="number" value={data.youtube_metrics?.total_videos || ''} 
                                                        onChange={(e) => update('youtube_metrics', { ...data.youtube_metrics, total_videos: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><span className="text-[10px] text-muted-foreground">Subscribers</span><p className="font-medium">{((data.youtube_metrics?.subscribers || 0) / 1000).toFixed(0)}K</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Avg Views</span><p className="font-medium">{(data.youtube_metrics?.avg_views || 0).toLocaleString()}</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Avg Likes</span><p className="font-medium">{(data.youtube_metrics?.avg_likes || 0).toLocaleString()}</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Total Videos</span><p className="font-medium">{data.youtube_metrics?.total_videos || 0}</p></div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* LinkedIn Metrics */}
                            {(data.linkedin_handle || data.primary_platform === 'linkedin') && (
                                <Card className="border border-blue-200">
                                    <CardHeader className="pb-3 bg-blue-50/50">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Linkedin className="w-4 h-4 text-blue-600" /> LinkedIn Metrics
                                            {data.primary_platform === 'linkedin' && <Badge className="bg-blue-100 text-blue-600 text-[8px]">Primary</Badge>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {editing ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Connections</Label>
                                                    <Input type="number" value={data.linkedin_metrics?.connections || ''} 
                                                        onChange={(e) => update('linkedin_metrics', { ...data.linkedin_metrics, connections: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Followers</Label>
                                                    <Input type="number" value={data.linkedin_metrics?.followers || ''} 
                                                        onChange={(e) => update('linkedin_metrics', { ...data.linkedin_metrics, followers: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Avg Engagement</Label>
                                                    <Input type="number" step="0.1" value={data.linkedin_metrics?.avg_engagement || ''} 
                                                        onChange={(e) => update('linkedin_metrics', { ...data.linkedin_metrics, avg_engagement: parseFloat(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><span className="text-[10px] text-muted-foreground">Connections</span><p className="font-medium">{(data.linkedin_metrics?.connections || 0).toLocaleString()}</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Followers</span><p className="font-medium">{(data.linkedin_metrics?.followers || 0).toLocaleString()}</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Avg Engagement</span><p className="font-medium">{data.linkedin_metrics?.avg_engagement || 0}%</p></div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* TikTok Metrics */}
                            {(data.tiktok_handle || data.primary_platform === 'tiktok') && (
                                <Card className="border border-gray-300">
                                    <CardHeader className="pb-3 bg-gray-50/50">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" /> TikTok Metrics
                                            {data.primary_platform === 'tiktok' && <Badge className="bg-gray-200 text-gray-700 text-[8px]">Primary</Badge>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {editing ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Followers</Label>
                                                    <Input type="number" value={data.tiktok_metrics?.followers || ''} 
                                                        onChange={(e) => update('tiktok_metrics', { ...data.tiktok_metrics, followers: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Avg Views</Label>
                                                    <Input type="number" value={data.tiktok_metrics?.avg_views || ''} 
                                                        onChange={(e) => update('tiktok_metrics', { ...data.tiktok_metrics, avg_views: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Avg Likes</Label>
                                                    <Input type="number" value={data.tiktok_metrics?.avg_likes || ''} 
                                                        onChange={(e) => update('tiktok_metrics', { ...data.tiktok_metrics, avg_likes: parseInt(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-mono">Engagement %</Label>
                                                    <Input type="number" step="0.1" value={data.tiktok_metrics?.engagement_rate || ''} 
                                                        onChange={(e) => update('tiktok_metrics', { ...data.tiktok_metrics, engagement_rate: parseFloat(e.target.value) || 0 })} className="h-8" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><span className="text-[10px] text-muted-foreground">Followers</span><p className="font-medium">{((data.tiktok_metrics?.followers || 0) / 1000).toFixed(0)}K</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Avg Views</span><p className="font-medium">{(data.tiktok_metrics?.avg_views || 0).toLocaleString()}</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Avg Likes</span><p className="font-medium">{(data.tiktok_metrics?.avg_likes || 0).toLocaleString()}</p></div>
                                                <div><span className="text-[10px] text-muted-foreground">Engagement</span><p className="font-medium">{data.tiktok_metrics?.engagement_rate || 0}%</p></div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Audience Demographics - Platform Specific */}
                        <Card className="border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gold" /> Audience Demographics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {data.audience_demographics ? (
                                    <>
                                        {/* Instagram Audience */}
                                        {data.audience_demographics.instagram && (
                                            <div className="border rounded-lg p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Instagram className="w-4 h-4 text-pink-600" />
                                                    <span className="font-semibold text-sm">Instagram</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {/* Age Distribution */}
                                                    {data.audience_demographics.instagram.age_split?.length > 0 && (
                                                        <div className="space-y-1">
                                                            <Label className="text-[9px] uppercase font-mono text-muted-foreground">Age</Label>
                                                            {data.audience_demographics.instagram.age_split.map(item => (
                                                                <div key={item.group} className="flex items-center gap-2">
                                                                    <span className="text-xs w-12">{item.group}</span>
                                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                        <div className="bg-pink-500 h-2 rounded-full transition-all" style={{width: `${item.percentage}%`}}></div>
                                                                    </div>
                                                                    <span className="text-xs font-medium w-8 text-right">{item.percentage}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Gender Distribution */}
                                                    {data.audience_demographics.instagram.gender_split?.length > 0 && (
                                                        <div className="space-y-1">
                                                            <Label className="text-[9px] uppercase font-mono text-muted-foreground">Gender</Label>
                                                            {data.audience_demographics.instagram.gender_split.map(item => (
                                                                <div key={item.gender} className="flex items-center gap-2">
                                                                    <span className="text-xs w-12">{item.gender}</span>
                                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                        <div className="bg-purple-500 h-2 rounded-full transition-all" style={{width: `${item.percentage}%`}}></div>
                                                                    </div>
                                                                    <span className="text-xs font-medium w-8 text-right">{item.percentage}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* City Distribution */}
                                                    {data.audience_demographics.instagram.city_split?.length > 0 && (
                                                        <div className="space-y-1">
                                                            <Label className="text-[9px] uppercase font-mono text-muted-foreground">Top Cities</Label>
                                                            {data.audience_demographics.instagram.city_split.map(item => (
                                                                <div key={item.city} className="flex items-center gap-2">
                                                                    <span className="text-xs w-16 truncate">{item.city}</span>
                                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width: `${item.percentage}%`}}></div>
                                                                    </div>
                                                                    <span className="text-xs font-medium w-8 text-right">{item.percentage}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* YouTube Audience */}
                                        {data.audience_demographics.youtube && (
                                            <div className="border rounded-lg p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Youtube className="w-4 h-4 text-red-600" />
                                                    <span className="font-semibold text-sm">YouTube</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {/* Age Distribution */}
                                                    {data.audience_demographics.youtube.age_split?.length > 0 && (
                                                        <div className="space-y-1">
                                                            <Label className="text-[9px] uppercase font-mono text-muted-foreground">Age</Label>
                                                            {data.audience_demographics.youtube.age_split.map(item => (
                                                                <div key={item.group} className="flex items-center gap-2">
                                                                    <span className="text-xs w-12">{item.group}</span>
                                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                        <div className="bg-red-500 h-2 rounded-full transition-all" style={{width: `${item.percentage}%`}}></div>
                                                                    </div>
                                                                    <span className="text-xs font-medium w-8 text-right">{item.percentage}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Gender Distribution */}
                                                    {data.audience_demographics.youtube.gender_split?.length > 0 && (
                                                        <div className="space-y-1">
                                                            <Label className="text-[9px] uppercase font-mono text-muted-foreground">Gender</Label>
                                                            {data.audience_demographics.youtube.gender_split.map(item => (
                                                                <div key={item.gender} className="flex items-center gap-2">
                                                                    <span className="text-xs w-12">{item.gender}</span>
                                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                        <div className="bg-orange-500 h-2 rounded-full transition-all" style={{width: `${item.percentage}%`}}></div>
                                                                    </div>
                                                                    <span className="text-xs font-medium w-8 text-right">{item.percentage}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* City Distribution */}
                                                    {data.audience_demographics.youtube.city_split?.length > 0 && (
                                                        <div className="space-y-1">
                                                            <Label className="text-[9px] uppercase font-mono text-muted-foreground">Top Cities</Label>
                                                            {data.audience_demographics.youtube.city_split.map(item => (
                                                                <div key={item.city} className="flex items-center gap-2">
                                                                    <span className="text-xs w-16 truncate">{item.city}</span>
                                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                        <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{width: `${item.percentage}%`}}></div>
                                                                    </div>
                                                                    <span className="text-xs font-medium w-8 text-right">{item.percentage}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Legacy support - show old format if no platform-specific data */}
                                        {!data.audience_demographics.instagram && !data.audience_demographics.youtube && (
                                            <>
                                                {data.audience_demographics.age_split?.length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase font-mono">Age Distribution</Label>
                                                        {data.audience_demographics.age_split.map(item => (
                                                            <div key={item.group} className="flex items-center gap-2">
                                                                <span className="text-xs w-14">{item.group}</span>
                                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                    <div className="bg-gold h-2 rounded-full" style={{width: `${item.percentage}%`}}></div>
                                                                </div>
                                                                <span className="text-xs font-medium w-10 text-right">{item.percentage}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {data.audience_demographics.gender_split?.length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase font-mono">Gender Distribution</Label>
                                                        {data.audience_demographics.gender_split.map(item => (
                                                            <div key={item.gender} className="flex items-center gap-2">
                                                                <span className="text-xs w-14">{item.gender}</span>
                                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                    <div className="bg-purple-500 h-2 rounded-full" style={{width: `${item.percentage}%`}}></div>
                                                                </div>
                                                                <span className="text-xs font-medium w-10 text-right">{item.percentage}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {data.audience_demographics.city_split?.length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase font-mono">Top Cities</Label>
                                                        {data.audience_demographics.city_split.map(item => (
                                                            <div key={item.city} className="flex items-center gap-2">
                                                                <span className="text-xs w-20 truncate">{item.city}</span>
                                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                    <div className="bg-blue-500 h-2 rounded-full" style={{width: `${item.percentage}%`}}></div>
                                                                </div>
                                                                <span className="text-xs font-medium w-10 text-right">{item.percentage}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No audience demographics data available</p>
                                )}
                            </CardContent>
                        </Card>
                        
                        {/* Manager / Agent Contact */}
                        {(data.manager_name || data.manager_email || data.manager_phone) && (
                            <Card className="border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gold" /> Manager / Agent
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {data.manager_name && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs w-16">Name</span>
                                            <span className="font-medium">{data.manager_name}</span>
                                        </div>
                                    )}
                                    {data.manager_email && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs w-16">Email</span>
                                            <a href={`mailto:${data.manager_email}`} className="text-gold hover:underline">{data.manager_email}</a>
                                        </div>
                                    )}
                                    {data.manager_phone && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs w-16">Phone</span>
                                            <a href={`tel:${data.manager_phone}`} className="text-gold hover:underline">{data.manager_phone}</a>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Commercial Terms */}
                        {(data.exclusivity_terms || data.typical_turnaround_days || data.payment_terms) && (
                            <Card className="border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-gold" /> Commercial Terms
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {data.typical_turnaround_days && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs w-24">Turnaround</span>
                                            <span className="font-medium">{data.typical_turnaround_days} days</span>
                                        </div>
                                    )}
                                    {data.payment_terms && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs w-24">Payment</span>
                                            <Badge variant="outline" className="capitalize">{data.payment_terms.replace('-', ' / ')}</Badge>
                                        </div>
                                    )}
                                    {data.exclusivity_terms && (
                                        <div className="space-y-1">
                                            <span className="text-muted-foreground text-xs">Exclusivity Terms</span>
                                            <p className="text-sm bg-muted/30 p-2 rounded">{data.exclusivity_terms}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                {/* Deliverables & Rates Tab */}
                <TabsContent value="deliverables">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Rate Card */}
                        <Card className="border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-gold" /> Rate Card
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Post */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">
                                                <Image className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Static Post</p>
                                                <p className="text-[10px] text-muted-foreground">Feed image post</p>
                                            </div>
                                        </div>
                                        {editing ? (
                                            <Input type="number" value={data.rate_per_post || ''} onChange={(e) => update('rate_per_post', parseFloat(e.target.value) || null)} placeholder="₹" className="w-32 h-8 text-right" />
                                        ) : (
                                            <p className="font-serif text-lg">{formatCurrency(data.rate_per_post)}</p>
                                        )}
                                    </div>

                                    {/* Reel */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-pink-100 flex items-center justify-center">
                                                <Video className="w-5 h-5 text-pink-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Reel / Short</p>
                                                <p className="text-[10px] text-muted-foreground">15-60 sec video</p>
                                            </div>
                                        </div>
                                        {editing ? (
                                            <Input type="number" value={data.rate_per_reel || ''} onChange={(e) => update('rate_per_reel', parseFloat(e.target.value) || null)} placeholder="₹" className="w-32 h-8 text-right" />
                                        ) : (
                                            <p className="font-serif text-lg">{formatCurrency(data.rate_per_reel)}</p>
                                        )}
                                    </div>

                                    {/* Story */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-purple-100 flex items-center justify-center">
                                                <MessageCircle className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Story</p>
                                                <p className="text-[10px] text-muted-foreground">24hr story post</p>
                                            </div>
                                        </div>
                                        {editing ? (
                                            <Input type="number" value={data.rate_per_story || ''} onChange={(e) => update('rate_per_story', parseFloat(e.target.value) || null)} placeholder="₹" className="w-32 h-8 text-right" />
                                        ) : (
                                            <p className="font-serif text-lg">{formatCurrency(data.rate_per_story)}</p>
                                        )}
                                    </div>

                                    {/* YouTube Video */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center">
                                                <Youtube className="w-5 h-5 text-red-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">YouTube Video</p>
                                                <p className="text-[10px] text-muted-foreground">Dedicated/integrated</p>
                                            </div>
                                        </div>
                                        {editing ? (
                                            <Input type="number" value={data.rate_per_video || ''} onChange={(e) => update('rate_per_video', parseFloat(e.target.value) || null)} placeholder="₹" className="w-32 h-8 text-right" />
                                        ) : (
                                            <p className="font-serif text-lg">{formatCurrency(data.rate_per_video)}</p>
                                        )}
                                    </div>

                                    {/* Barter */}
                                    <div className="flex items-center justify-between p-3 border rounded">
                                        <div>
                                            <p className="font-medium text-sm">Accepts Barter</p>
                                            <p className="text-[10px] text-muted-foreground">Product exchange collaborations</p>
                                        </div>
                                        {editing ? (
                                            <Switch checked={data.accepts_barter || false} onCheckedChange={(v) => update('accepts_barter', v)} />
                                        ) : (
                                            <Badge variant={data.accepts_barter ? 'default' : 'outline'}>{data.accepts_barter ? 'Yes' : 'No'}</Badge>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Additional Info */}
                        <Card className="border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-gold" /> Additional Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Style Tags</Label>
                                    {editing ? (
                                        <Input 
                                            value={data.style_tags?.join(', ') || ''} 
                                            onChange={(e) => update('style_tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                                            placeholder="minimal, luxury, streetwear"
                                            className="h-8"
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {data.style_tags?.length > 0 ? data.style_tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                            )) : <span className="text-sm text-muted-foreground">No tags</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Past Brand Collaborations</Label>
                                    {editing ? (
                                        <Textarea 
                                            value={data.past_brands?.join(', ') || ''} 
                                            onChange={(e) => update('past_brands', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                                            placeholder="Nike, Zara, H&M"
                                            rows={2}
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {data.past_brands?.length > 0 ? data.past_brands.map(brand => (
                                                <Badge key={brand} variant="outline" className="text-xs">{brand}</Badge>
                                            )) : <span className="text-sm text-muted-foreground">No brands listed</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Languages</Label>
                                    {editing ? (
                                        <Input 
                                            value={data.languages?.join(', ') || ''} 
                                            onChange={(e) => update('languages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                                            placeholder="English, Hindi"
                                            className="h-8"
                                        />
                                    ) : (
                                        <p className="text-sm">{data.languages?.join(', ') || 'English, Hindi'}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Portfolio URL</Label>
                                    {editing ? (
                                        <Input value={data.portfolio_url || ''} onChange={(e) => update('portfolio_url', e.target.value)} placeholder="https://..." className="h-8" />
                                    ) : data.portfolio_url ? (
                                        <a href={data.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                            View Portfolio <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Not provided</span>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Notes</Label>
                                    {editing ? (
                                        <Textarea value={data.notes || ''} onChange={(e) => update('notes', e.target.value)} placeholder="Internal notes..." rows={3} />
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{data.notes || 'No notes'}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history">
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gold" /> Activity History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-muted-foreground">Added to database</span>
                                    <span className="ml-auto text-xs text-muted-foreground">{data.created_at ? new Date(data.created_at).toLocaleDateString() : 'Unknown'}</span>
                                </div>
                                {data.last_contacted && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span className="text-muted-foreground">Last contacted</span>
                                        <span className="ml-auto text-xs text-muted-foreground">{new Date(data.last_contacted).toLocaleDateString()}</span>
                                    </div>
                                )}
                                <p className="text-sm text-muted-foreground text-center py-4">More activity tracking coming soon</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
