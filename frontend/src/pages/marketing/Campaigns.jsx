import React, { useState, useEffect } from 'react';
import { marketingAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
    Megaphone, 
    Plus,
    Users,
    DollarSign,
    Target,
    Clock,
    Play,
    Pause,
    CheckCircle2
} from 'lucide-react';

const STATUS_ICONS = {
    planning: Clock,
    active: Play,
    paused: Pause,
    completed: CheckCircle2
};

const STATUS_COLORS = {
    planning: 'bg-blue-500/20 text-blue-400',
    active: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-violet-500/20 text-violet-400'
};

const CampaignsPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        objective: 'branding',
        budget: '',
        start_date: '',
        end_date: '',
        target_market: 'Mumbai',
        description: ''
    });

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const response = await marketingAPI.getCampaigns();
            setCampaigns(response.data || []);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
            toast.error('Failed to fetch campaigns');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        try {
            await marketingAPI.createCampaign({
                ...newCampaign,
                budget: parseFloat(newCampaign.budget)
            });
            toast.success('Campaign created successfully');
            setShowCreateModal(false);
            setNewCampaign({
                name: '',
                objective: 'branding',
                budget: '',
                start_date: '',
                end_date: '',
                target_market: 'Mumbai',
                description: ''
            });
            fetchCampaigns();
        } catch (error) {
            toast.error('Failed to create campaign');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6" data-testid="campaigns-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Campaigns</h1>
                    <p className="text-white/50 mt-1">Manage influencer marketing campaigns</p>
                </div>
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogTrigger asChild>
                        <Button className="bg-violet-500 hover:bg-violet-600" data-testid="create-campaign-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            New Campaign
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create New Campaign</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateCampaign} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Campaign Name</Label>
                                <Input
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                                    placeholder="Spring Collection 2024"
                                    className="bg-white/5 border-white/10"
                                    required
                                    data-testid="campaign-name-input"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Objective</Label>
                                    <select
                                        value={newCampaign.objective}
                                        onChange={(e) => setNewCampaign({...newCampaign, objective: e.target.value})}
                                        className="w-full p-2 bg-white/5 border border-white/10 rounded-md text-white"
                                    >
                                        <option value="branding">Branding</option>
                                        <option value="sales">Sales</option>
                                        <option value="awareness">Awareness</option>
                                        <option value="engagement">Engagement</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Budget (₹)</Label>
                                    <Input
                                        type="number"
                                        value={newCampaign.budget}
                                        onChange={(e) => setNewCampaign({...newCampaign, budget: e.target.value})}
                                        placeholder="500000"
                                        className="bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={newCampaign.start_date}
                                        onChange={(e) => setNewCampaign({...newCampaign, start_date: e.target.value})}
                                        className="bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={newCampaign.end_date}
                                        onChange={(e) => setNewCampaign({...newCampaign, end_date: e.target.value})}
                                        className="bg-white/5 border-white/10"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Market</Label>
                                <Input
                                    value={newCampaign.target_market}
                                    onChange={(e) => setNewCampaign({...newCampaign, target_market: e.target.value})}
                                    placeholder="Mumbai, Delhi"
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <textarea
                                    value={newCampaign.description}
                                    onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                                    placeholder="Campaign description..."
                                    className="w-full p-2 bg-white/5 border border-white/10 rounded-md text-white min-h-[80px]"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-violet-500 hover:bg-violet-600">
                                Create Campaign
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Campaigns Grid */}
            {campaigns.length === 0 ? (
                <div className="text-center py-20">
                    <Megaphone className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50">No campaigns yet</p>
                    <Button 
                        onClick={() => setShowCreateModal(true)} 
                        className="mt-4 bg-violet-500 hover:bg-violet-600"
                    >
                        Create Your First Campaign
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaigns.map(campaign => {
                        const StatusIcon = STATUS_ICONS[campaign.status] || Clock;
                        return (
                            <Card key={campaign.id} className="bg-[#12121a] border-white/5 hover:border-violet-500/30 transition-all cursor-pointer">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-white font-semibold">{campaign.name}</h3>
                                            <p className="text-white/50 text-sm capitalize">{campaign.objective}</p>
                                        </div>
                                        <Badge className={STATUS_COLORS[campaign.status] || STATUS_COLORS.planning}>
                                            <StatusIcon className="w-3 h-3 mr-1" />
                                            {campaign.status}
                                        </Badge>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-white/50 flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                Budget
                                            </span>
                                            <span className="text-white">{formatCurrency(campaign.budget || 0)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-white/50 flex items-center gap-2">
                                                <Target className="w-4 h-4" />
                                                Spent
                                            </span>
                                            <span className="text-white">{formatCurrency(campaign.spent || 0)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-white/50 flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                Influencers
                                            </span>
                                            <span className="text-white">{campaign.influencers?.length || 0}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs text-white/40">
                                        <span>{campaign.start_date}</span>
                                        <span>to</span>
                                        <span>{campaign.end_date}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CampaignsPage;
