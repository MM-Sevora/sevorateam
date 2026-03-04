import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { influencerApi } from '../lib/api';
import { toast } from 'sonner';
import { 
    User, 
    AtSign, 
    Mail, 
    Phone, 
    MapPin, 
    Tag, 
    DollarSign, 
    Users, 
    TrendingUp,
    Instagram,
    Youtube,
    Twitter,
    Linkedin,
    Globe,
    Plus,
    X,
    Sparkles,
    FileText,
    Link2
} from 'lucide-react';

const CATEGORIES = [
    { value: 'luxury', label: 'Luxury' },
    { value: 'menswear', label: 'Menswear' },
    { value: 'womenswear', label: 'Womenswear' },
    { value: 'streetwear', label: 'Streetwear' },
    { value: 'ethnic', label: 'Ethnic' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'sustainable', label: 'Sustainable' },
    { value: 'activewear', label: 'Activewear' },
];

const CONTENT_TYPES = [
    'Fashion', 'Lifestyle', 'Beauty', 'Fitness', 'Travel', 
    'Food', 'Tech', 'Entertainment', 'Art', 'Photography'
];

const TIERS = [
    { value: 'nano', label: 'Nano (1K-10K)', range: '1K-10K' },
    { value: 'micro', label: 'Micro (10K-50K)', range: '10K-50K' },
    { value: 'mid', label: 'Mid-tier (50K-500K)', range: '50K-500K' },
    { value: 'macro', label: 'Macro (500K-1M)', range: '500K-1M' },
    { value: 'mega', label: 'Mega (1M+)', range: '1M+' },
    { value: 'celebrity', label: 'Celebrity', range: '5M+' },
];

const CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 
    'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
    'Chandigarh', 'Goa', 'Kochi', 'Indore', 'Bhopal'
];

const STATES = [
    'Maharashtra', 'Delhi', 'Karnataka', 'West Bengal', 'Tamil Nadu',
    'Telangana', 'Gujarat', 'Rajasthan', 'Kerala', 'Punjab'
];

const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'];

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];

const initialFormState = {
    // Basic Info
    name: '',
    bio: '',
    profile_image_url: '',
    
    // Social Handles
    instagram_handle: '',
    youtube_handle: '',
    tiktok_handle: '',
    linkedin_handle: '',
    twitter_handle: '',
    pinterest_handle: '',
    blog_url: '',
    
    // Contact
    email: '',
    phone: '',
    whatsapp: '',
    
    // Location
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    
    // Classification
    category: 'luxury',
    content_type: [],
    tier: 'micro',
    gender_focus: 'unisex',
    
    // Metrics
    followers: '',
    engagement_rate: '',
    avg_likes: '',
    avg_comments: '',
    avg_views: '',
    
    // Audience
    audience_location: 'India',
    audience_age_group: '18-34',
    audience_gender_split: '',
    
    // Rate Card
    rate_per_post: '',
    rate_per_reel: '',
    rate_per_story: '',
    rate_per_video: '',
    accepts_barter: false,
    
    // Additional
    style_tags: [],
    languages: ['English', 'Hindi'],
    past_brands: [],
    portfolio_url: '',
    media_kit_url: '',
    notes: ''
};

export const AddInfluencerForm = ({ open, onOpenChange, onSuccess }) => {
    const [form, setForm] = useState(initialFormState);
    const [loading, setLoading] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [brandInput, setBrandInput] = useState('');
    const [activeTab, setActiveTab] = useState('basic');

    const updateForm = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const addTag = () => {
        if (tagInput && !form.style_tags.includes(tagInput.toLowerCase())) {
            updateForm('style_tags', [...form.style_tags, tagInput.toLowerCase()]);
            setTagInput('');
        }
    };

    const removeTag = (tag) => {
        updateForm('style_tags', form.style_tags.filter(t => t !== tag));
    };

    const addBrand = () => {
        if (brandInput && !form.past_brands.includes(brandInput)) {
            updateForm('past_brands', [...form.past_brands, brandInput]);
            setBrandInput('');
        }
    };

    const removeBrand = (brand) => {
        updateForm('past_brands', form.past_brands.filter(b => b !== brand));
    };

    const toggleContentType = (type) => {
        if (form.content_type.includes(type)) {
            updateForm('content_type', form.content_type.filter(t => t !== type));
        } else {
            updateForm('content_type', [...form.content_type, type]);
        }
    };

    const toggleLanguage = (lang) => {
        if (form.languages.includes(lang)) {
            updateForm('languages', form.languages.filter(l => l !== lang));
        } else {
            updateForm('languages', [...form.languages, lang]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.name || !form.city || !form.category) {
            toast.error('Please fill in required fields: Name, City, Category');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...form,
                followers: parseInt(form.followers) || 0,
                engagement_rate: parseFloat(form.engagement_rate) || 0,
                avg_likes: parseInt(form.avg_likes) || 0,
                avg_comments: parseInt(form.avg_comments) || 0,
                avg_views: parseInt(form.avg_views) || 0,
                rate_per_post: parseFloat(form.rate_per_post) || null,
                rate_per_reel: parseFloat(form.rate_per_reel) || null,
                rate_per_story: parseFloat(form.rate_per_story) || null,
                rate_per_video: parseFloat(form.rate_per_video) || null,
            };

            await influencerApi.create(payload);
            toast.success('Influencer added successfully');
            setForm(initialFormState);
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to add influencer');
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ icon: Icon, title }) => (
        <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-gold" />
            </div>
            <h3 className="font-serif text-lg">{title}</h3>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="font-serif text-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-gold" />
                        </div>
                        Add New Influencer
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Fill in the influencer details across different sections
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="px-6 pt-4">
                            <TabsList className="grid w-full grid-cols-5 h-auto">
                                <TabsTrigger value="basic" className="text-xs py-2">
                                    <User className="w-3.5 h-3.5 mr-1.5" />
                                    Basic
                                </TabsTrigger>
                                <TabsTrigger value="social" className="text-xs py-2">
                                    <AtSign className="w-3.5 h-3.5 mr-1.5" />
                                    Social
                                </TabsTrigger>
                                <TabsTrigger value="metrics" className="text-xs py-2">
                                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                                    Metrics
                                </TabsTrigger>
                                <TabsTrigger value="rates" className="text-xs py-2">
                                    <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                                    Rates
                                </TabsTrigger>
                                <TabsTrigger value="additional" className="text-xs py-2">
                                    <Tag className="w-3.5 h-3.5 mr-1.5" />
                                    More
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="h-[50vh] px-6 py-4">
                            {/* Basic Info Tab */}
                            <TabsContent value="basic" className="mt-0 space-y-6">
                                <SectionHeader icon={User} title="Basic Information" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Full Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            data-testid="inf-name-input"
                                            value={form.name}
                                            onChange={(e) => updateForm('name', e.target.value)}
                                            placeholder="e.g., Priya Kapoor"
                                            required
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">Bio</Label>
                                        <Textarea
                                            value={form.bio}
                                            onChange={(e) => updateForm('bio', e.target.value)}
                                            placeholder="Brief bio about the influencer..."
                                            rows={2}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Category <span className="text-destructive">*</span>
                                        </Label>
                                        <Select value={form.category} onValueChange={(v) => updateForm('category', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES.map(cat => (
                                                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">Tier</Label>
                                        <Select value={form.tier} onValueChange={(v) => updateForm('tier', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {TIERS.map(tier => (
                                                    <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">Gender Focus</Label>
                                        <Select value={form.gender_focus} onValueChange={(v) => updateForm('gender_focus', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="menswear">Menswear</SelectItem>
                                                <SelectItem value="womenswear">Womenswear</SelectItem>
                                                <SelectItem value="unisex">Unisex</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">Profile Image URL</Label>
                                        <Input
                                            value={form.profile_image_url}
                                            onChange={(e) => updateForm('profile_image_url', e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <SectionHeader icon={MapPin} title="Location & Contact" />

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            City <span className="text-destructive">*</span>
                                        </Label>
                                        <Select value={form.city} onValueChange={(v) => updateForm('city', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {CITIES.map(city => (
                                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">State</Label>
                                        <Select value={form.state} onValueChange={(v) => updateForm('state', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {STATES.map(state => (
                                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">Country</Label>
                                        <Input value={form.country} onChange={(e) => updateForm('country', e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => updateForm('email', e.target.value)}
                                                placeholder="email@example.com"
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">Phone</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                value={form.phone}
                                                onChange={(e) => updateForm('phone', e.target.value)}
                                                placeholder="+91 XXXXX XXXXX"
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">WhatsApp</Label>
                                        <Input
                                            value={form.whatsapp}
                                            onChange={(e) => updateForm('whatsapp', e.target.value)}
                                            placeholder="+91 XXXXX XXXXX"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase tracking-wider">Content Types</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {CONTENT_TYPES.map(type => (
                                            <Badge
                                                key={type}
                                                variant={form.content_type.includes(type) ? 'default' : 'outline'}
                                                className={`cursor-pointer transition-all ${
                                                    form.content_type.includes(type) ? 'bg-gold text-white' : 'hover:bg-gold/10'
                                                }`}
                                                onClick={() => toggleContentType(type)}
                                            >
                                                {type}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Social Media Tab */}
                            <TabsContent value="social" className="mt-0 space-y-6">
                                <SectionHeader icon={AtSign} title="Social Media Handles" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                                            <Instagram className="w-4 h-4 text-pink-500" />
                                            Instagram
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                                            <Input
                                                data-testid="inf-instagram-input"
                                                value={form.instagram_handle}
                                                onChange={(e) => updateForm('instagram_handle', e.target.value)}
                                                placeholder="username"
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                                            <Youtube className="w-4 h-4 text-red-500" />
                                            YouTube
                                        </Label>
                                        <Input
                                            value={form.youtube_handle}
                                            onChange={(e) => updateForm('youtube_handle', e.target.value)}
                                            placeholder="Channel name or URL"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                                            </svg>
                                            TikTok
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                                            <Input
                                                value={form.tiktok_handle}
                                                onChange={(e) => updateForm('tiktok_handle', e.target.value)}
                                                placeholder="username"
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                                            <Linkedin className="w-4 h-4 text-blue-600" />
                                            LinkedIn
                                        </Label>
                                        <Input
                                            value={form.linkedin_handle}
                                            onChange={(e) => updateForm('linkedin_handle', e.target.value)}
                                            placeholder="Profile URL or username"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                                            <Twitter className="w-4 h-4" />
                                            Twitter/X
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                                            <Input
                                                value={form.twitter_handle}
                                                onChange={(e) => updateForm('twitter_handle', e.target.value)}
                                                placeholder="username"
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                                            <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 0a12 12 0 00-3.8 23.4c.2-.6.4-1.6.5-2.3l1.1-4.4s-.3-.6-.3-1.4c0-1.3.8-2.3 1.7-2.3.8 0 1.2.6 1.2 1.3 0 .8-.5 2-. 8 3.2-.2.8.5 1.5 1.3 1.5 1.6 0 2.8-1.7 2.8-4.2 0-2.2-1.6-3.7-3.8-3.7a4 4 0 00-4.2 4c0 .8.3 1.6.7 2.1l.1.2c0 .2-.1.7-.2 1a.1.1 0 01-.2 0 4.7 4.7 0 01-2-4.1c0-3.3 2.4-6.3 7-6.3 3.6 0 6.5 2.6 6.5 6 0 3.7-2.3 6.6-5.5 6.6a2.9 2.9 0 01-2.4-1.2l-.7 2.5c-.2.9-.9 2-1.3 2.6A12 12 0 0012 0"/>
                                            </svg>
                                            Pinterest
                                        </Label>
                                        <Input
                                            value={form.pinterest_handle}
                                            onChange={(e) => updateForm('pinterest_handle', e.target.value)}
                                            placeholder="Username"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                                            <Globe className="w-4 h-4" />
                                            Blog / Website
                                        </Label>
                                        <Input
                                            value={form.blog_url}
                                            onChange={(e) => updateForm('blog_url', e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Metrics Tab */}
                            <TabsContent value="metrics" className="mt-0 space-y-6">
                                <SectionHeader icon={TrendingUp} title="Performance Metrics" />
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Total Followers
                                        </Label>
                                        <Input
                                            type="number"
                                            value={form.followers}
                                            onChange={(e) => updateForm('followers', e.target.value)}
                                            placeholder="e.g., 50000"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Engagement Rate (%)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={form.engagement_rate}
                                            onChange={(e) => updateForm('engagement_rate', e.target.value)}
                                            placeholder="e.g., 4.5"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Avg Likes
                                        </Label>
                                        <Input
                                            type="number"
                                            value={form.avg_likes}
                                            onChange={(e) => updateForm('avg_likes', e.target.value)}
                                            placeholder="e.g., 2500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Avg Comments
                                        </Label>
                                        <Input
                                            type="number"
                                            value={form.avg_comments}
                                            onChange={(e) => updateForm('avg_comments', e.target.value)}
                                            placeholder="e.g., 150"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Avg Video Views
                                        </Label>
                                        <Input
                                            type="number"
                                            value={form.avg_views}
                                            onChange={(e) => updateForm('avg_views', e.target.value)}
                                            placeholder="e.g., 10000"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <SectionHeader icon={Users} title="Audience Demographics" />

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Primary Location
                                        </Label>
                                        <Input
                                            value={form.audience_location}
                                            onChange={(e) => updateForm('audience_location', e.target.value)}
                                            placeholder="e.g., India, Metro Cities"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Age Group
                                        </Label>
                                        <Select value={form.audience_age_group} onValueChange={(v) => updateForm('audience_age_group', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {AGE_GROUPS.map(age => (
                                                    <SelectItem key={age} value={age}>{age}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Gender Split
                                        </Label>
                                        <Input
                                            value={form.audience_gender_split}
                                            onChange={(e) => updateForm('audience_gender_split', e.target.value)}
                                            placeholder="e.g., 60% Female, 40% Male"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Rate Card Tab */}
                            <TabsContent value="rates" className="mt-0 space-y-6">
                                <SectionHeader icon={DollarSign} title="Rate Card (INR)" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Rate per Photo Post (₹)
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                            <Input
                                                type="number"
                                                value={form.rate_per_post}
                                                onChange={(e) => updateForm('rate_per_post', e.target.value)}
                                                placeholder="e.g., 15000"
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Rate per Reel (₹)
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                            <Input
                                                type="number"
                                                value={form.rate_per_reel}
                                                onChange={(e) => updateForm('rate_per_reel', e.target.value)}
                                                placeholder="e.g., 25000"
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Rate per Story (₹)
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                            <Input
                                                type="number"
                                                value={form.rate_per_story}
                                                onChange={(e) => updateForm('rate_per_story', e.target.value)}
                                                placeholder="e.g., 5000"
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">
                                            Rate per YouTube Video (₹)
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                            <Input
                                                type="number"
                                                value={form.rate_per_video}
                                                onChange={(e) => updateForm('rate_per_video', e.target.value)}
                                                placeholder="e.g., 50000"
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 border border-border rounded-sm">
                                    <div>
                                        <p className="font-medium text-sm">Accepts Barter Collaborations</p>
                                        <p className="text-xs text-muted-foreground">
                                            Willing to collaborate in exchange for products
                                        </p>
                                    </div>
                                    <Switch
                                        checked={form.accepts_barter}
                                        onCheckedChange={(v) => updateForm('accepts_barter', v)}
                                    />
                                </div>
                            </TabsContent>

                            {/* Additional Info Tab */}
                            <TabsContent value="additional" className="mt-0 space-y-6">
                                <SectionHeader icon={Tag} title="Style Tags" />
                                
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            placeholder="Add style tag (e.g., minimal, vintage)"
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        />
                                        <Button type="button" variant="outline" onClick={addTag}>
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {form.style_tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="px-3 py-1">
                                                {tag}
                                                <button type="button" onClick={() => removeTag(tag)} className="ml-2">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <SectionHeader icon={Sparkles} title="Past Brand Collaborations" />

                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Input
                                            value={brandInput}
                                            onChange={(e) => setBrandInput(e.target.value)}
                                            placeholder="Add brand name (e.g., Nike, Zara)"
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBrand())}
                                        />
                                        <Button type="button" variant="outline" onClick={addBrand}>
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {form.past_brands.map(brand => (
                                            <Badge key={brand} variant="outline" className="px-3 py-1 bg-gold/5">
                                                {brand}
                                                <button type="button" onClick={() => removeBrand(brand)} className="ml-2">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase tracking-wider">Languages</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {LANGUAGES.map(lang => (
                                            <Badge
                                                key={lang}
                                                variant={form.languages.includes(lang) ? 'default' : 'outline'}
                                                className={`cursor-pointer transition-all ${
                                                    form.languages.includes(lang) ? 'bg-gold text-white' : 'hover:bg-gold/10'
                                                }`}
                                                onClick={() => toggleLanguage(lang)}
                                            >
                                                {lang}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <SectionHeader icon={Link2} title="Portfolio & Media Kit" />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">Portfolio URL</Label>
                                        <Input
                                            value={form.portfolio_url}
                                            onChange={(e) => updateForm('portfolio_url', e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs uppercase tracking-wider">Media Kit URL</Label>
                                        <Input
                                            value={form.media_kit_url}
                                            onChange={(e) => updateForm('media_kit_url', e.target.value)}
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase tracking-wider">Internal Notes</Label>
                                    <Textarea
                                        value={form.notes}
                                        onChange={(e) => updateForm('notes', e.target.value)}
                                        placeholder="Any additional notes about this influencer..."
                                        rows={3}
                                    />
                                </div>
                            </TabsContent>
                        </ScrollArea>

                        <div className="p-6 pt-4 border-t border-border flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                <span className="text-destructive">*</span> Required fields
                            </p>
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={loading}
                                    data-testid="submit-influencer-btn"
                                    className="rounded-none bg-gold text-white hover:bg-gold/90 min-w-[120px]"
                                >
                                    {loading ? 'Adding...' : 'Add Influencer'}
                                </Button>
                            </div>
                        </div>
                    </Tabs>
                </form>
            </DialogContent>
        </Dialog>
    );
};
