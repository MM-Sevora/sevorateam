import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketingAPI } from '../../lib/api';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
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
    CheckCircle2,
    Video,
    Newspaper,
    Image,
    Share2
} from 'lucide-react';
import EntityIntegrationCheck from '../../components/shared/EntityIntegrationCheck';

const STATUS_ICONS = {
    planning: Clock,
    active: Play,
    paused: Pause,
    completed: CheckCircle2
};

const STATUS_COLORS = {
    planning: 'bg-blue-500/20 text-blue-400',
    active: 'bg-stone-600/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-amber-700/20 text-amber-400'
};

const CAMPAIGN_TYPES = {
    influencer: { label: 'Influencer Marketing', icon: Users, color: 'bg-purple-500/20 text-purple-400' },
    ugc: { label: 'UGC Promotion', icon: Share2, color: 'bg-pink-500/20 text-pink-400' },
    paid_ads: { label: 'Paid Ads', icon: Target, color: 'bg-blue-500/20 text-blue-400' },
    content_production: { label: 'Content Production', icon: Video, color: 'bg-green-500/20 text-green-400' },
    pr_media: { label: 'PR / Media', icon: Newspaper, color: 'bg-orange-500/20 text-orange-400' }
};

const CampaignsPage = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showIntegrationCheck, setShowIntegrationCheck] = useState(false);
    const [createdEntity, setCreatedEntity] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        campaign_type: 'influencer',
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
            const response = await marketingAPI.createCampaign({
                ...newCampaign,
                budget: parseFloat(newCampaign.budget)
            });
            const createdCampaign = response.data;
            toast.success('Campaign created successfully');
            setShowCreateModal(false);
            
            // Show integration check dialog
            setCreatedEntity({
                id: createdCampaign.id,
                name: newCampaign.name
            });
            setShowIntegrationCheck(true);
            
            setNewCampaign({
                name: '',
                campaign_type: 'influencer',
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
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6" data-testid="campaigns-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#4A3728]">Campaign Hub</h1>
                    <p className="text-[#5D4A3A] mt-1">Manage all marketing campaigns across channels</p>
                </div>
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogTrigger asChild>
                        <Button className="bg-amber-700 hover:bg-amber-800" data-testid="create-campaign-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            New Campaign
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-[#D4BBA6] text-white max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create New Campaign</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateCampaign} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Campaign Type</Label>
                                <select
                                    value={newCampaign.campaign_type}
                                    onChange={(e) => setNewCampaign({...newCampaign, campaign_type: e.target.value})}
                                    className="w-full p-2 bg-[#F5EDE5] border border-[#D4BBA6] rounded-md text-[#4A3728]"
                                    data-testid="campaign-type-select"
                                >
                                    <option value="influencer">Influencer Marketing</option>
                                    <option value="ugc">UGC Promotion</option>
                                    <option value="paid_ads">Paid Ads</option>
                                    <option value="content_production">Content Production</option>
                                    <option value="pr_media">PR / Media</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Campaign Name</Label>
                                <Input
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                                    placeholder="Spring Collection 2024"
                                    className="bg-[#F5EDE5] border-[#D4BBA6]"
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
                                        className="w-full p-2 bg-[#F5EDE5] border border-[#D4BBA6] rounded-md text-[#4A3728]"
                                    >
                                        <option value="branding">Branding</option>
                                        <option value="sales">Sales</option>
                                        <option value="awareness">Awareness</option>
                                        <option value="engagement">Engagement</option>
                                        <option value="lead_generation">Lead Generation</option>
                                        <option value="product_launch">Product Launch</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Budget (₹)</Label>
                                    <Input
                                        type="number"
                                        value={newCampaign.budget}
                                        onChange={(e) => setNewCampaign({...newCampaign, budget: e.target.value})}
                                        placeholder="500000"
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
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
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={newCampaign.end_date}
                                        onChange={(e) => setNewCampaign({...newCampaign, end_date: e.target.value})}
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
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
                                    className="bg-[#F5EDE5] border-[#D4BBA6]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <textarea
                                    value={newCampaign.description}
                                    onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                                    placeholder="Campaign description..."
                                    className="w-full p-2 bg-[#F5EDE5] border border-[#D4BBA6] rounded-md text-white min-h-[80px]"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-amber-700 hover:bg-amber-800">
                                Create Campaign
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Campaigns Grid */}
            {/* Type Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                <Button
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('all')}
                    className={filterType === 'all' ? 'bg-amber-700 hover:bg-amber-800' : 'border-[#D4BBA6] text-[#4A3728]'}
                >
                    All Campaigns
                </Button>
                {Object.entries(CAMPAIGN_TYPES).map(([key, { label, icon: Icon }]) => (
                    <Button
                        key={key}
                        variant={filterType === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterType(key)}
                        className={filterType === key ? 'bg-amber-700 hover:bg-amber-800' : 'border-[#D4BBA6] text-[#4A3728]'}
                    >
                        <Icon className="w-4 h-4 mr-1" />
                        {label}
                    </Button>
                ))}
            </div>

            {/* Campaign Grid */}
            {campaigns.filter(c => filterType === 'all' || c.campaign_type === filterType).length === 0 ? (
                <div className="text-center py-20">
                    <Megaphone className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-[#5D4A3A]">{filterType === 'all' ? 'No campaigns yet' : `No ${CAMPAIGN_TYPES[filterType]?.label || filterType} campaigns`}</p>
                    <Button 
                        onClick={() => setShowCreateModal(true)} 
                        className="mt-4 bg-amber-700 hover:bg-amber-800"
                    >
                        Create Your First Campaign
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaigns
                        .filter(c => filterType === 'all' || c.campaign_type === filterType)
                        .map(campaign => {
                        const StatusIcon = STATUS_ICONS[campaign.status] || Clock;
                        const typeConfig = CAMPAIGN_TYPES[campaign.campaign_type] || CAMPAIGN_TYPES.influencer;
                        const TypeIcon = typeConfig.icon;
                        return (
                            <Card 
                                key={campaign.id} 
                                className="bg-white border-[#E8D5C4] hover:border-amber-500/30 transition-all cursor-pointer"
                                onClick={() => navigate(`/marketing/campaign/${campaign.id}`)}
                                data-testid={`campaign-card-${campaign.id}`}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <Badge className={typeConfig.color}>
                                            <TypeIcon className="w-3 h-3 mr-1" />
                                            {typeConfig.label}
                                        </Badge>
                                        <Badge className={STATUS_COLORS[campaign.status] || STATUS_COLORS.planning}>
                                            <StatusIcon className="w-3 h-3 mr-1" />
                                            {campaign.status}
                                        </Badge>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <h3 className="text-[#4A3728] font-semibold">{campaign.name}</h3>
                                        <p className="text-[#5D4A3A] text-sm capitalize">{campaign.objective}</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#5D4A3A] flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                Budget
                                            </span>
                                            <span className="text-[#4A3728]">{formatCurrency(campaign.budget || 0)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#5D4A3A] flex items-center gap-2">
                                                <Target className="w-4 h-4" />
                                                Spent
                                            </span>
                                            <span className="text-[#4A3728]">{formatCurrency(campaign.spent || 0)}</span>
                                        </div>
                                        {campaign.campaign_type === 'influencer' && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[#5D4A3A] flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    Influencers
                                                </span>
                                                <span className="text-[#4A3728] font-medium">{campaign.influencer_count || campaign.influencers?.length || 0}</span>
                                            </div>
                                        )}
                                        {campaign.campaign_type === 'ugc' && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[#5D4A3A] flex items-center gap-2">
                                                    <Share2 className="w-4 h-4" />
                                                    Submissions
                                                </span>
                                                <span className="text-[#4A3728] font-medium">{campaign.ugc_submissions?.length || 0}</span>
                                            </div>
                                        )}
                                        {campaign.campaign_type === 'paid_ads' && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[#5D4A3A] flex items-center gap-2">
                                                    <Target className="w-4 h-4" />
                                                    Linked Ads
                                                </span>
                                                <span className="text-[#4A3728] font-medium">{campaign.linked_ads?.length || 0}</span>
                                            </div>
                                        )}
                                        {campaign.campaign_type === 'content_production' && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[#5D4A3A] flex items-center gap-2">
                                                    <Video className="w-4 h-4" />
                                                    Projects
                                                </span>
                                                <span className="text-[#4A3728] font-medium">{campaign.linked_content_projects?.length || 0}</span>
                                            </div>
                                        )}
                                        {campaign.campaign_type === 'pr_media' && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[#5D4A3A] flex items-center gap-2">
                                                    <Newspaper className="w-4 h-4" />
                                                    Publications
                                                </span>
                                                <span className="text-[#4A3728] font-medium">{campaign.linked_publications?.length || 0}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-[#E8D5C4] flex justify-between text-xs text-[#5D4A3A]">
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

            {/* Integration Check Dialog */}
            {createdEntity && (
                <EntityIntegrationCheck
                    open={showIntegrationCheck}
                    onOpenChange={setShowIntegrationCheck}
                    api={api}
                    module="marketing"
                    entityType="campaign"
                    entityId={createdEntity.id}
                    entityName={createdEntity.name}
                    onComplete={() => setCreatedEntity(null)}
                />
            )}
        </div>
    );
};

export default CampaignsPage;
