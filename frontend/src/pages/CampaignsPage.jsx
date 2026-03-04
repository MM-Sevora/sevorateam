import React, { useState, useEffect } from 'react';
import { campaignApi, influencerApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
    Megaphone, 
    Plus,
    Calendar as CalendarIcon,
    Users,
    DollarSign,
    Target,
    Clock,
    ChevronRight,
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
    planning: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-gold/20 text-gold'
};

const CONTENT_STATUS_OPTIONS = ['pending', 'brief_sent', 'draft_submitted', 'approved', 'published'];

export const CampaignsPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        objective: 'branding',
        budget: '',
        start_date: null,
        end_date: null,
        target_market: 'Mumbai',
        description: ''
    });
    const [assignment, setAssignment] = useState({
        influencer_id: '',
        agreed_fee: '',
        deliverables: [{ deliverable_type: 'reel', quantity: 1, fee: 0 }]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [campaignsRes, influencersRes] = await Promise.all([
                campaignApi.getAll(),
                influencerApi.getAll()
            ]);
            setCampaigns(campaignsRes.data);
            setInfluencers(influencersRes.data);
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        try {
            await campaignApi.create({
                ...newCampaign,
                budget: parseFloat(newCampaign.budget) || 0,
                start_date: newCampaign.start_date ? format(newCampaign.start_date, 'yyyy-MM-dd') : '',
                end_date: newCampaign.end_date ? format(newCampaign.end_date, 'yyyy-MM-dd') : ''
            });
            toast.success('Campaign created');
            setShowCreateModal(false);
            setNewCampaign({
                name: '',
                objective: 'branding',
                budget: '',
                start_date: null,
                end_date: null,
                target_market: 'Mumbai',
                description: ''
            });
            fetchData();
        } catch (error) {
            toast.error('Failed to create campaign');
        }
    };

    const handleStatusUpdate = async (campaignId, status) => {
        try {
            await campaignApi.updateStatus(campaignId, status);
            toast.success('Status updated');
            fetchData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleAssignInfluencer = async (e) => {
        e.preventDefault();
        try {
            await campaignApi.assignInfluencer(selectedCampaign.id, {
                influencer_id: assignment.influencer_id,
                agreed_fee: parseFloat(assignment.agreed_fee) || 0,
                deliverables: assignment.deliverables
            });
            toast.success('Influencer assigned');
            setShowAssignModal(false);
            setAssignment({
                influencer_id: '',
                agreed_fee: '',
                deliverables: [{ deliverable_type: 'reel', quantity: 1, fee: 0 }]
            });
            fetchData();
        } catch (error) {
            toast.error('Failed to assign influencer');
        }
    };

    const handleContentStatusUpdate = async (campaignId, influencerId, status) => {
        try {
            await campaignApi.updateContentStatus(campaignId, influencerId, status);
            toast.success('Content status updated');
            fetchData();
        } catch (error) {
            toast.error('Failed to update content status');
        }
    };

    const openDetail = (campaign) => {
        setSelectedCampaign(campaign);
        setShowDetailModal(true);
    };

    return (
        <div className="p-8 space-y-8" data-testid="campaigns-page">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Campaign Management
                    </p>
                    <h1 className="font-serif text-4xl">Campaigns</h1>
                </div>
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogTrigger asChild>
                        <Button 
                            data-testid="create-campaign-btn"
                            className="rounded-none bg-primary text-primary-foreground hover:bg-gold"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Campaign
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="font-serif text-2xl">Create Campaign</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateCampaign} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Campaign Name *</Label>
                                <Input
                                    data-testid="campaign-name"
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                    placeholder="e.g., Summer Style Campaign"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Objective</Label>
                                    <Select 
                                        value={newCampaign.objective} 
                                        onValueChange={(v) => setNewCampaign({ ...newCampaign, objective: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="branding">Branding</SelectItem>
                                            <SelectItem value="sales">Sales</SelectItem>
                                            <SelectItem value="awareness">Awareness</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Budget (₹)</Label>
                                    <Input
                                        type="number"
                                        data-testid="campaign-budget"
                                        value={newCampaign.budget}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                                        placeholder="500000"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start">
                                                <CalendarIcon className="w-4 h-4 mr-2" />
                                                {newCampaign.start_date ? format(newCampaign.start_date, 'PP') : 'Pick date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={newCampaign.start_date}
                                                onSelect={(d) => setNewCampaign({ ...newCampaign, start_date: d })}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start">
                                                <CalendarIcon className="w-4 h-4 mr-2" />
                                                {newCampaign.end_date ? format(newCampaign.end_date, 'PP') : 'Pick date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={newCampaign.end_date}
                                                onSelect={(d) => setNewCampaign({ ...newCampaign, end_date: d })}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Target Market</Label>
                                <Input
                                    value={newCampaign.target_market}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, target_market: e.target.value })}
                                    placeholder="e.g., Mumbai, Delhi"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Description</Label>
                                <Textarea
                                    value={newCampaign.description}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                                    placeholder="Campaign brief..."
                                    rows={3}
                                />
                            </div>
                            <Button type="submit" data-testid="submit-campaign-btn" className="w-full rounded-none">
                                Create Campaign
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Campaign Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-64" />
                    ))}
                </div>
            ) : campaigns.length === 0 ? (
                <Card className="border border-border">
                    <CardContent className="p-12 text-center">
                        <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-serif text-xl mb-2">No Campaigns Yet</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Create your first influencer marketing campaign
                        </p>
                        <Button onClick={() => setShowCreateModal(true)} className="rounded-none">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Campaign
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                    {campaigns.map((campaign) => {
                        const StatusIcon = STATUS_ICONS[campaign.status];
                        const budgetUsed = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
                        
                        return (
                            <Card 
                                key={campaign.id}
                                className="border border-border hover:border-gold/30 transition-all duration-300 cursor-pointer group"
                                onClick={() => openDetail(campaign)}
                                data-testid={`campaign-card-${campaign.id}`}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <Badge className={`${STATUS_COLORS[campaign.status]} text-xs`}>
                                            <StatusIcon className="w-3 h-3 mr-1" />
                                            {campaign.status}
                                        </Badge>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
                                    </div>
                                    
                                    <h3 className="font-serif text-xl mb-2">{campaign.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                        {campaign.description || `${campaign.objective} campaign for ${campaign.target_market}`}
                                    </p>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <Users className="w-4 h-4" />
                                                Influencers
                                            </span>
                                            <span className="font-medium">{campaign.influencers?.length || 0}</span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <Target className="w-4 h-4" />
                                                Objective
                                            </span>
                                            <span className="font-medium capitalize">{campaign.objective}</span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                    <DollarSign className="w-4 h-4" />
                                                    Budget
                                                </span>
                                                <span className="font-medium">
                                                    ₹{(campaign.spent / 1000).toFixed(0)}K / ₹{(campaign.budget / 1000).toFixed(0)}K
                                                </span>
                                            </div>
                                            <Progress value={budgetUsed} className="h-1.5" />
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{campaign.start_date} - {campaign.end_date}</span>
                                        <span>{campaign.target_market}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Campaign Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    {selectedCampaign && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between">
                                    <DialogTitle className="font-serif text-2xl">{selectedCampaign.name}</DialogTitle>
                                    <Select 
                                        value={selectedCampaign.status}
                                        onValueChange={(v) => {
                                            handleStatusUpdate(selectedCampaign.id, v);
                                            setSelectedCampaign({ ...selectedCampaign, status: v });
                                        }}
                                    >
                                        <SelectTrigger className={`w-[140px] ${STATUS_COLORS[selectedCampaign.status]}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['planning', 'active', 'paused', 'completed'].map(s => (
                                                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </DialogHeader>
                            
                            <div className="grid grid-cols-4 gap-4 mt-4">
                                <Card className="border">
                                    <CardContent className="p-4 text-center">
                                        <p className="font-serif text-2xl">₹{(selectedCampaign.budget / 1000).toFixed(0)}K</p>
                                        <p className="font-mono text-[10px] uppercase text-muted-foreground">Budget</p>
                                    </CardContent>
                                </Card>
                                <Card className="border">
                                    <CardContent className="p-4 text-center">
                                        <p className="font-serif text-2xl">₹{(selectedCampaign.spent / 1000).toFixed(0)}K</p>
                                        <p className="font-mono text-[10px] uppercase text-muted-foreground">Spent</p>
                                    </CardContent>
                                </Card>
                                <Card className="border">
                                    <CardContent className="p-4 text-center">
                                        <p className="font-serif text-2xl">{selectedCampaign.influencers?.length || 0}</p>
                                        <p className="font-mono text-[10px] uppercase text-muted-foreground">Influencers</p>
                                    </CardContent>
                                </Card>
                                <Card className="border">
                                    <CardContent className="p-4 text-center">
                                        <p className="font-serif text-2xl capitalize">{selectedCampaign.objective}</p>
                                        <p className="font-mono text-[10px] uppercase text-muted-foreground">Objective</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-serif text-lg">Assigned Influencers</h3>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setShowAssignModal(true)}
                                        className="rounded-none"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Assign
                                    </Button>
                                </div>
                                {selectedCampaign.influencers?.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedCampaign.influencers.map((inf, i) => (
                                            <Card key={i} className="border">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium">{inf.influencer_name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Fee: ₹{(inf.agreed_fee / 1000).toFixed(0)}K
                                                            </p>
                                                        </div>
                                                        <Select
                                                            value={inf.content_status}
                                                            onValueChange={(v) => handleContentStatusUpdate(selectedCampaign.id, inf.influencer_id, v)}
                                                        >
                                                            <SelectTrigger className="w-[150px] text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {CONTENT_STATUS_OPTIONS.map(s => (
                                                                    <SelectItem key={s} value={s} className="capitalize text-xs">
                                                                        {s.replace('_', ' ')}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm text-center py-8">
                                        No influencers assigned yet
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Assign Influencer Modal */}
            <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-serif text-xl">Assign Influencer</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAssignInfluencer} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase">Influencer *</Label>
                            <Select 
                                value={assignment.influencer_id} 
                                onValueChange={(v) => setAssignment({ ...assignment, influencer_id: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select influencer" /></SelectTrigger>
                                <SelectContent>
                                    {influencers.map(inf => (
                                        <SelectItem key={inf.id} value={inf.id}>
                                            {inf.name} - {inf.followers?.toLocaleString()} followers
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase">Agreed Fee (₹) *</Label>
                            <Input
                                type="number"
                                value={assignment.agreed_fee}
                                onChange={(e) => setAssignment({ ...assignment, agreed_fee: e.target.value })}
                                placeholder="e.g., 50000"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full rounded-none">
                            Assign to Campaign
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
