import React, { useEffect, useState } from 'react';
import { marketingAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Search, Plus, Instagram, Youtube, MapPin, Users as UsersIcon, TrendingUp, Star } from 'lucide-react';

const TIER_COLORS = {
    nano: 'bg-[#F5EDE5]0',
    micro: 'bg-blue-500',
    macro: 'bg-amber-600',
    mega: 'bg-rose-600',
    celebrity: 'bg-yellow-500'
};

const STATUS_COLORS = {
    identified: 'bg-[#F5EDE5]0',
    contacted: 'bg-blue-500',
    interested: 'bg-stone-600',
    negotiation: 'bg-yellow-500',
    confirmed: 'bg-stone-600'
};

export const InfluencersPage = () => {
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newInfluencer, setNewInfluencer] = useState({
        name: '',
        instagram_handle: '',
        youtube_handle: '',
        city: '',
        industry: 'fashion',
        tier: 'micro',
        followers: 0,
        engagement_rate: 0,
        rate_per_reel: 0
    });

    const fetchInfluencers = async () => {
        try {
            const response = await marketingAPI.getInfluencers({ search });
            setInfluencers(response.data);
        } catch (error) {
            console.error('Failed to fetch influencers:', error);
            toast.error('Failed to load influencers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInfluencers();
    }, [search]);

    const handleAddInfluencer = async () => {
        try {
            await marketingAPI.createInfluencer(newInfluencer);
            toast.success('Influencer added successfully');
            setShowAddModal(false);
            setNewInfluencer({
                name: '',
                instagram_handle: '',
                youtube_handle: '',
                city: '',
                industry: 'fashion',
                tier: 'micro',
                followers: 0,
                engagement_rate: 0,
                rate_per_reel: 0
            });
            fetchInfluencers();
        } catch (error) {
            toast.error('Failed to add influencer');
        }
    };

    const formatNumber = (num) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num;
    };

    return (
        <div className="p-8 space-y-6" data-testid="influencers-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#4A3728]">Influencers</h1>
                    <p className="text-[#5D4A3A] mt-1">Manage your influencer database</p>
                </div>
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogTrigger asChild>
                        <Button className="bg-amber-700 hover:bg-amber-800" data-testid="add-influencer-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Influencer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-[#E8D5C4] text-[#4A3728] max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add New Influencer</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        value={newInfluencer.name}
                                        onChange={(e) => setNewInfluencer({...newInfluencer, name: e.target.value})}
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                        data-testid="influencer-name-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input
                                        value={newInfluencer.city}
                                        onChange={(e) => setNewInfluencer({...newInfluencer, city: e.target.value})}
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Instagram Handle</Label>
                                    <Input
                                        value={newInfluencer.instagram_handle}
                                        onChange={(e) => setNewInfluencer({...newInfluencer, instagram_handle: e.target.value})}
                                        placeholder="@handle"
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>YouTube Handle</Label>
                                    <Input
                                        value={newInfluencer.youtube_handle}
                                        onChange={(e) => setNewInfluencer({...newInfluencer, youtube_handle: e.target.value})}
                                        placeholder="@channel"
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Followers</Label>
                                    <Input
                                        type="number"
                                        value={newInfluencer.followers}
                                        onChange={(e) => setNewInfluencer({...newInfluencer, followers: parseInt(e.target.value)})}
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Engagement %</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={newInfluencer.engagement_rate}
                                        onChange={(e) => setNewInfluencer({...newInfluencer, engagement_rate: parseFloat(e.target.value)})}
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rate/Reel (₹)</Label>
                                    <Input
                                        type="number"
                                        value={newInfluencer.rate_per_reel}
                                        onChange={(e) => setNewInfluencer({...newInfluencer, rate_per_reel: parseInt(e.target.value)})}
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Industry</Label>
                                    <select
                                        value={newInfluencer.industry}
                                        onChange={(e) => setNewInfluencer({...newInfluencer, industry: e.target.value})}
                                        className="w-full p-2 bg-[#F5EDE5] border border-[#D4BBA6] rounded-md text-[#4A3728]"
                                    >
                                        <option value="fashion">Fashion</option>
                                        <option value="beauty">Beauty</option>
                                        <option value="lifestyle">Lifestyle</option>
                                        <option value="fitness">Fitness</option>
                                        <option value="tech">Tech</option>
                                        <option value="food">Food</option>
                                        <option value="travel">Travel</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tier</Label>
                                    <select
                                        value={newInfluencer.tier}
                                        onChange={(e) => setNewInfluencer({...newInfluencer, tier: e.target.value})}
                                        className="w-full p-2 bg-[#F5EDE5] border border-[#D4BBA6] rounded-md text-[#4A3728]"
                                    >
                                        <option value="nano">Nano (1K-10K)</option>
                                        <option value="micro">Micro (10K-100K)</option>
                                        <option value="macro">Macro (100K-1M)</option>
                                        <option value="mega">Mega (1M+)</option>
                                        <option value="celebrity">Celebrity</option>
                                    </select>
                                </div>
                            </div>
                            <Button 
                                onClick={handleAddInfluencer} 
                                className="w-full bg-amber-700 hover:bg-amber-800"
                                data-testid="save-influencer-btn"
                            >
                                Add Influencer
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                <Input
                    placeholder="Search influencers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white border-[#D4BBA6] text-[#4A3728]"
                    data-testid="influencer-search-input"
                />
            </div>

            {/* Influencers Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : influencers.length === 0 ? (
                <div className="text-center py-20">
                    <UsersIcon className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
                    <p className="text-[#5D4A3A]">No influencers found</p>
                    <Button 
                        onClick={() => setShowAddModal(true)} 
                        className="mt-4 bg-amber-700 hover:bg-amber-800"
                    >
                        Add Your First Influencer
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {influencers.map(influencer => (
                        <Card key={influencer.id} className="bg-white border-[#E8D5C4] hover:border-amber-300 hover:shadow-md transition-all cursor-pointer" data-testid={`influencer-card-${influencer.id}`}>
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A3728] to-[#5D4A3A] flex items-center justify-center text-white font-bold">
                                            {influencer.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-[#4A3728] font-semibold">{influencer.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {influencer.instagram_handle && (
                                                    <span className="flex items-center gap-1 text-[#5D4A3A] text-xs">
                                                        <Instagram className="w-3 h-3" />
                                                        @{influencer.instagram_handle}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        <span className="text-[#5D4A3A] text-sm">{influencer.score?.toFixed(1) || 0}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-4">
                                    <Badge className={`${TIER_COLORS[influencer.tier]} text-white text-xs capitalize`}>
                                        {influencer.tier}
                                    </Badge>
                                    <Badge className={`${STATUS_COLORS[influencer.status]} text-white text-xs capitalize`}>
                                        {influencer.status}
                                    </Badge>
                                    <Badge variant="outline" className="text-[#5D4A3A] border-[#D4BBA6] text-xs capitalize">
                                        {influencer.industry}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-[#5D4A3A] text-xs">Followers</p>
                                        <p className="text-[#4A3728] font-semibold">{formatNumber(influencer.followers)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#5D4A3A] text-xs">Engagement</p>
                                        <p className="text-[#4A3728] font-semibold">{influencer.engagement_rate}%</p>
                                    </div>
                                    <div>
                                        <p className="text-[#5D4A3A] text-xs">Rate/Reel</p>
                                        <p className="text-[#4A3728] font-semibold">₹{formatNumber(influencer.rate_per_reel || 0)}</p>
                                    </div>
                                </div>

                                {influencer.city && (
                                    <div className="flex items-center gap-1 mt-4 text-[#5D4A3A] text-xs">
                                        <MapPin className="w-3 h-3" />
                                        {influencer.city}, {influencer.country || 'India'}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InfluencersPage;
