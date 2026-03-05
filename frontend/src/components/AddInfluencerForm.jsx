import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription } from '../components/ui/alert';
import { influencerApi, socialApi } from '../lib/api';
import { toast } from 'sonner';
import { User, AtSign, DollarSign, Plus, X, Loader2, Download, CheckCircle, Instagram, Youtube } from 'lucide-react';

const INDUSTRIES = ['fashion', 'beauty', 'lifestyle', 'fitness', 'tech', 'food', 'travel', 'entertainment', 'education', 'finance'];
const GENDERS = ['male', 'female', 'non-binary', 'other', 'prefer not to say'];
const TIERS = ['nano', 'micro', 'mid', 'macro', 'mega', 'celebrity'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Jaipur'];
const PLATFORMS = [
    { value: 'instagram', label: 'Instagram', icon: '📸' },
    { value: 'youtube', label: 'YouTube', icon: '▶️' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'tiktok', label: 'TikTok', icon: '🎵' },
    { value: 'twitter', label: 'Twitter/X', icon: '🐦' }
];

// Helper to calculate tier based on followers
const calculateTier = (followers) => {
    if (followers >= 5000000) return 'celebrity';
    if (followers >= 1000000) return 'mega';
    if (followers >= 500000) return 'macro';
    if (followers >= 100000) return 'mid';
    if (followers >= 10000) return 'micro';
    return 'nano';
};

// Format followers for display
const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
};

const initialForm = {
    name: '', bio: '', instagram_handle: '', youtube_handle: '', tiktok_handle: '', linkedin_handle: '', twitter_handle: '',
    primary_platform: 'instagram',
    email: '', phone: '', city: 'Mumbai', industry: 'fashion', tier: 'micro',
    gender: '', gender_focus: 'unisex', content_type: [],
    followers: '', engagement_rate: '', avg_likes: '',
    rate_per_post: '', rate_per_reel: '', rate_per_story: '', rate_per_video: '', accepts_barter: false,
    style_tags: [], past_brands: [], notes: ''
};

export const AddInfluencerForm = ({ open, onOpenChange, onSuccess }) => {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [fetchingInstagram, setFetchingInstagram] = useState(false);
    const [fetchingYoutube, setFetchingYoutube] = useState(false);
    const [fetchedData, setFetchedData] = useState({ instagram: null, youtube: null });
    const [tagInput, setTagInput] = useState('');

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
    const addTag = () => { if (tagInput && !form.style_tags.includes(tagInput)) { update('style_tags', [...form.style_tags, tagInput]); setTagInput(''); } };
    const removeTag = (tag) => update('style_tags', form.style_tags.filter(t => t !== tag));

    // Fetch Instagram data
    const fetchInstagramData = async () => {
        const handle = form.instagram_handle?.replace('@', '').trim();
        if (!handle) {
            toast.error('Enter an Instagram handle first');
            return;
        }
        
        setFetchingInstagram(true);
        try {
            const response = await socialApi.verifyProfile('instagram', handle);
            const data = response.data;
            
            if (data && data.followers > 0) {
                // Auto-fill form fields
                setForm(prev => ({
                    ...prev,
                    name: prev.name || data.display_name || data.username,
                    bio: prev.bio || data.bio || '',
                    followers: data.followers,
                    engagement_rate: data.engagement_rate || 0,
                    tier: calculateTier(data.followers),
                    primary_platform: 'instagram'
                }));
                
                setFetchedData(prev => ({ ...prev, instagram: data }));
                toast.success(`Fetched: ${formatFollowers(data.followers)} followers, ${data.engagement_rate?.toFixed(1)}% engagement`);
            } else {
                toast.error('Could not fetch Instagram data. Profile may be private or handle incorrect.');
            }
        } catch (error) {
            toast.error('Failed to fetch Instagram data');
        } finally {
            setFetchingInstagram(false);
        }
    };

    // Fetch YouTube data
    const fetchYoutubeData = async () => {
        const handle = form.youtube_handle?.replace('@', '').trim();
        if (!handle) {
            toast.error('Enter a YouTube handle first');
            return;
        }
        
        setFetchingYoutube(true);
        try {
            const response = await socialApi.verifyProfile('youtube', handle);
            const data = response.data;
            
            if (data && data.followers > 0) {
                // Auto-fill form fields
                setForm(prev => ({
                    ...prev,
                    name: prev.name || data.display_name || data.username,
                    bio: prev.bio || data.bio || '',
                    followers: prev.primary_platform === 'youtube' ? data.followers : prev.followers || data.followers,
                    engagement_rate: prev.primary_platform === 'youtube' ? (data.engagement_rate || 0) : prev.engagement_rate || (data.engagement_rate || 0),
                    tier: prev.primary_platform === 'youtube' ? calculateTier(data.followers) : prev.tier,
                    primary_platform: !prev.followers ? 'youtube' : prev.primary_platform
                }));
                
                setFetchedData(prev => ({ ...prev, youtube: data }));
                toast.success(`Fetched: ${formatFollowers(data.followers)} subscribers, ${data.engagement_rate?.toFixed(1)}% engagement`);
            } else {
                toast.error('Could not fetch YouTube data. Channel may not exist or handle incorrect.');
            }
        } catch (error) {
            toast.error('Failed to fetch YouTube data');
        } finally {
            setFetchingYoutube(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.city) { toast.error('Name and City required'); return; }
        setLoading(true);
        try {
            // Clean up empty strings to null for optional fields
            const cleanValue = (val) => (val === '' || val === undefined) ? null : val;
            
            const submitData = {
                name: form.name,
                bio: cleanValue(form.bio),
                instagram_handle: cleanValue(form.instagram_handle),
                youtube_handle: cleanValue(form.youtube_handle),
                tiktok_handle: cleanValue(form.tiktok_handle),
                linkedin_handle: cleanValue(form.linkedin_handle),
                twitter_handle: cleanValue(form.twitter_handle),
                primary_platform: form.primary_platform || 'instagram',
                email: cleanValue(form.email) || null,  // Must be null, not empty string
                phone: cleanValue(form.phone),
                city: form.city,
                industry: form.industry || 'fashion',
                tier: form.tier || 'micro',
                gender: cleanValue(form.gender),
                gender_focus: form.gender_focus || 'unisex',
                content_type: form.content_type || [],
                followers: typeof form.followers === 'number' ? form.followers : (parseInt(form.followers) || 0),
                engagement_rate: typeof form.engagement_rate === 'number' ? form.engagement_rate : (parseFloat(form.engagement_rate) || 0),
                avg_likes: typeof form.avg_likes === 'number' ? form.avg_likes : (parseInt(form.avg_likes) || 0),
                rate_per_post: form.rate_per_post ? parseFloat(form.rate_per_post) : null,
                rate_per_reel: form.rate_per_reel ? parseFloat(form.rate_per_reel) : null,
                rate_per_story: form.rate_per_story ? parseFloat(form.rate_per_story) : null,
                accepts_barter: form.accepts_barter || false,
                style_tags: form.style_tags || [],
                notes: cleanValue(form.notes),
            };
            
            await influencerApi.create(submitData);
            toast.success('Influencer added with live data!');
            setForm(initialForm);
            setFetchedData({ instagram: null, youtube: null });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Failed to add influencer:', error);
            toast.error(error.response?.data?.detail || 'Failed to add influencer');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm(initialForm);
        setFetchedData({ instagram: null, youtube: null });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-serif text-xl">Add Influencer</DialogTitle>
                </DialogHeader>
                
                {/* Quick Add Section */}
                <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gold">
                        <Download className="w-4 h-4" />
                        Quick Add - Fetch from Social Media
                    </div>
                    <p className="text-xs text-muted-foreground">Enter a handle and click Fetch to auto-fill profile data</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {/* Instagram Fetch */}
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-mono flex items-center gap-1">
                                <Instagram className="w-3 h-3 text-pink-500" /> Instagram Handle
                            </Label>
                            <div className="flex gap-2">
                                <Input 
                                    data-testid="quick-instagram-input"
                                    value={form.instagram_handle} 
                                    onChange={(e) => update('instagram_handle', e.target.value)} 
                                    placeholder="@nike" 
                                    className="h-9 flex-1" 
                                />
                                <Button 
                                    type="button" 
                                    onClick={fetchInstagramData}
                                    disabled={fetchingInstagram || !form.instagram_handle}
                                    className="h-9 bg-pink-500 hover:bg-pink-600 text-white"
                                    data-testid="fetch-instagram-btn"
                                >
                                    {fetchingInstagram ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                                </Button>
                            </div>
                            {fetchedData.instagram && (
                                <div className="flex items-center gap-1 text-[10px] text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    {formatFollowers(fetchedData.instagram.followers)} followers fetched
                                </div>
                            )}
                        </div>
                        
                        {/* YouTube Fetch */}
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-mono flex items-center gap-1">
                                <Youtube className="w-3 h-3 text-red-500" /> YouTube Handle
                            </Label>
                            <div className="flex gap-2">
                                <Input 
                                    data-testid="quick-youtube-input"
                                    value={form.youtube_handle} 
                                    onChange={(e) => update('youtube_handle', e.target.value)} 
                                    placeholder="@mkbhd" 
                                    className="h-9 flex-1" 
                                />
                                <Button 
                                    type="button" 
                                    onClick={fetchYoutubeData}
                                    disabled={fetchingYoutube || !form.youtube_handle}
                                    className="h-9 bg-red-500 hover:bg-red-600 text-white"
                                    data-testid="fetch-youtube-btn"
                                >
                                    {fetchingYoutube ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                                </Button>
                            </div>
                            {fetchedData.youtube && (
                                <div className="flex items-center gap-1 text-[10px] text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    {formatFollowers(fetchedData.youtube.followers)} subscribers fetched
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Fetched Data Preview */}
                    {(fetchedData.instagram || fetchedData.youtube) && (
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <AlertDescription className="text-xs text-green-700">
                                Data fetched! Review and edit below, then click "Add Influencer" to save.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <Tabs defaultValue="basic" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic" className="text-xs gap-1"><User className="w-3 h-3" />Basic</TabsTrigger>
                            <TabsTrigger value="social" className="text-xs gap-1"><AtSign className="w-3 h-3" />Social</TabsTrigger>
                            <TabsTrigger value="rates" className="text-xs gap-1"><DollarSign className="w-3 h-3" />Rates</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-3 mt-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Name *</Label>
                                    <Input data-testid="inf-name-input" value={form.name} onChange={(e) => update('name', e.target.value)} required className="h-8" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Gender</Label>
                                    <Select value={form.gender || "none"} onValueChange={(v) => update('gender', v === "none" ? "" : v)}>
                                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Not specified</SelectItem>
                                            {GENDERS.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">City *</Label>
                                    <Select value={form.city} onValueChange={(v) => update('city', v)}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Industry</Label>
                                    <Select value={form.industry} onValueChange={(v) => update('industry', v)}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Tier {form.followers && <span className="text-gold">(auto)</span>}</Label>
                                    <Select value={form.tier} onValueChange={(v) => update('tier', v)}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>{TIERS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Audience Focus</Label>
                                    <Select value={form.gender_focus || 'unisex'} onValueChange={(v) => update('gender_focus', v)}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="menswear">Menswear</SelectItem>
                                            <SelectItem value="womenswear">Womenswear</SelectItem>
                                            <SelectItem value="unisex">Unisex</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Email</Label>
                                    <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="h-8" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Phone</Label>
                                    <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="h-8" />
                                </div>
                            </div>
                            
                            {/* Bio - now more prominent */}
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Bio {(fetchedData.instagram || fetchedData.youtube) && <span className="text-gold">(from API)</span>}</Label>
                                <Textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} rows={2} placeholder="Influencer bio..." />
                            </div>
                            
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Style Tags</Label>
                                <div className="flex gap-2">
                                    <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag" className="h-8 flex-1" />
                                    <Button type="button" variant="outline" size="sm" onClick={addTag}><Plus className="w-3 h-3" /></Button>
                                </div>
                                {form.style_tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {form.style_tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}<button type="button" onClick={() => removeTag(t)} className="ml-1"><X className="w-2 h-2" /></button></Badge>)}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="social" className="space-y-3 mt-4">
                            {/* Primary Platform Selection */}
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Primary Platform *</Label>
                                <Select value={form.primary_platform} onValueChange={(v) => update('primary_platform', v)}>
                                    <SelectTrigger className="h-8" data-testid="primary-platform-select">
                                        <SelectValue placeholder="Select primary platform" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PLATFORMS.map(p => (
                                            <SelectItem key={p.value} value={p.value}>
                                                <span className="flex items-center gap-2">{p.icon} {p.label}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[9px] text-muted-foreground">The platform where this influencer has their main presence</p>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono flex items-center gap-1">
                                        Instagram {form.primary_platform === 'instagram' && <Badge className="bg-gold/20 text-gold border-0 text-[8px]">Primary</Badge>}
                                        {fetchedData.instagram && <CheckCircle className="w-3 h-3 text-green-500" />}
                                    </Label>
                                    <Input data-testid="inf-instagram-input" value={form.instagram_handle} onChange={(e) => update('instagram_handle', e.target.value)} placeholder="@handle" className="h-8" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono flex items-center gap-1">
                                        YouTube {form.primary_platform === 'youtube' && <Badge className="bg-red-500/20 text-red-600 border-0 text-[8px]">Primary</Badge>}
                                        {fetchedData.youtube && <CheckCircle className="w-3 h-3 text-green-500" />}
                                    </Label>
                                    <Input value={form.youtube_handle} onChange={(e) => update('youtube_handle', e.target.value)} placeholder="@channel" className="h-8" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono flex items-center gap-1">
                                        LinkedIn {form.primary_platform === 'linkedin' && <Badge className="bg-blue-500/20 text-blue-600 border-0 text-[8px]">Primary</Badge>}
                                    </Label>
                                    <Input value={form.linkedin_handle} onChange={(e) => update('linkedin_handle', e.target.value)} placeholder="profile-url" className="h-8" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono flex items-center gap-1">
                                        TikTok {form.primary_platform === 'tiktok' && <Badge className="bg-pink-500/20 text-pink-600 border-0 text-[8px]">Primary</Badge>}
                                    </Label>
                                    <Input value={form.tiktok_handle} onChange={(e) => update('tiktok_handle', e.target.value)} placeholder="@handle" className="h-8" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono flex items-center gap-1">
                                        Twitter/X {form.primary_platform === 'twitter' && <Badge className="bg-sky-500/20 text-sky-600 border-0 text-[8px]">Primary</Badge>}
                                    </Label>
                                    <Input value={form.twitter_handle} onChange={(e) => update('twitter_handle', e.target.value)} placeholder="@handle" className="h-8" />
                                </div>
                            </div>
                            
                            {/* Metrics - now shows if auto-filled */}
                            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">
                                        Followers {(fetchedData.instagram || fetchedData.youtube) && <span className="text-gold">(from API)</span>}
                                    </Label>
                                    <Input 
                                        type="number" 
                                        value={form.followers} 
                                        onChange={(e) => update('followers', e.target.value)} 
                                        placeholder="50000" 
                                        className={`h-8 ${form.followers ? 'border-green-300 bg-green-50' : ''}`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">
                                        Engagement % {(fetchedData.instagram || fetchedData.youtube) && <span className="text-gold">(from API)</span>}
                                    </Label>
                                    <Input 
                                        type="number" 
                                        step="0.1" 
                                        value={form.engagement_rate} 
                                        onChange={(e) => update('engagement_rate', e.target.value)} 
                                        placeholder="4.5" 
                                        className={`h-8 ${form.engagement_rate ? 'border-green-300 bg-green-50' : ''}`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Avg Likes</Label>
                                    <Input type="number" value={form.avg_likes} onChange={(e) => update('avg_likes', e.target.value)} placeholder="2500" className="h-8" />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="rates" className="space-y-3 mt-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Per Post (₹)</Label>
                                    <Input type="number" value={form.rate_per_post} onChange={(e) => update('rate_per_post', e.target.value)} placeholder="15000" className="h-8" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Per Reel (₹)</Label>
                                    <Input type="number" value={form.rate_per_reel} onChange={(e) => update('rate_per_reel', e.target.value)} placeholder="25000" className="h-8" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-mono">Per Story (₹)</Label>
                                    <Input type="number" value={form.rate_per_story} onChange={(e) => update('rate_per_story', e.target.value)} placeholder="5000" className="h-8" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-sm">
                                <span className="text-sm">Accepts Barter</span>
                                <Switch checked={form.accepts_barter} onCheckedChange={(v) => update('accepts_barter', v)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Notes</Label>
                                <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} data-testid="submit-influencer-btn" className="rounded-none bg-gold text-white hover:bg-gold/90">
                            {loading ? 'Adding...' : 'Add Influencer'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
