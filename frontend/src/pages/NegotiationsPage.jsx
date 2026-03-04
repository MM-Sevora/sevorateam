import React, { useState, useEffect } from 'react';
import { negotiationApi, influencerApi, campaignApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
    Handshake, Plus, TrendingDown, TrendingUp, Clock, CheckCircle, XCircle, 
    MessageSquare, DollarSign, Users, Target, AlertCircle, ArrowRight, Loader2
} from 'lucide-react';

const STATUS_CONFIG = {
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
    negotiating: { color: 'bg-blue-100 text-blue-700', icon: MessageSquare, label: 'Negotiating' },
    agreed: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Agreed' },
    rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
    on_hold: { color: 'bg-gray-100 text-gray-700', icon: AlertCircle, label: 'On Hold' }
};

const EVENT_CONFIG = {
    negotiation_started: { icon: Handshake, color: 'text-gold' },
    counter_received: { icon: TrendingUp, color: 'text-orange-500' },
    counter_sent: { icon: TrendingDown, color: 'text-blue-500' },
    agreed: { icon: CheckCircle, color: 'text-green-500' },
    rejected: { icon: XCircle, color: 'text-red-500' },
    note_added: { icon: MessageSquare, color: 'text-gray-500' }
};

export const NegotiationsPage = () => {
    const [negotiations, setNegotiations] = useState([]);
    const [influencers, setInfluencers] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedNeg, setSelectedNeg] = useState(null);
    const [filter, setFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState(false);
    
    const [newNeg, setNewNeg] = useState({
        influencer_id: '',
        campaign_id: '',
        initial_quote: '',
        our_budget: '',
        deliverables: '',
        deadline: '',
        notes: ''
    });
    
    const [newEvent, setNewEvent] = useState({
        event_type: 'counter_sent',
        amount: '',
        note: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [negsRes, infRes, campRes, statsRes] = await Promise.all([
                negotiationApi.getAll(),
                influencerApi.getAll(),
                campaignApi.getAll(),
                negotiationApi.getStats()
            ]);
            setNegotiations(negsRes.data || []);
            setInfluencers(infRes.data || []);
            setCampaigns(campRes.data || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newNeg.influencer_id || !newNeg.initial_quote || !newNeg.deliverables) {
            toast.error('Influencer, quote, and deliverables are required');
            return;
        }
        setActionLoading(true);
        try {
            await negotiationApi.create({
                ...newNeg,
                initial_quote: parseFloat(newNeg.initial_quote),
                our_budget: newNeg.our_budget ? parseFloat(newNeg.our_budget) : null
            });
            toast.success('Negotiation started');
            setShowCreateModal(false);
            setNewNeg({ influencer_id: '', campaign_id: '', initial_quote: '', our_budget: '', deliverables: '', deadline: '', notes: '' });
            fetchData();
        } catch (error) {
            toast.error('Failed to create negotiation');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddEvent = async () => {
        if (!newEvent.event_type) {
            toast.error('Event type required');
            return;
        }
        setActionLoading(true);
        try {
            const result = await negotiationApi.addEvent(selectedNeg.id, {
                ...newEvent,
                amount: newEvent.amount ? parseFloat(newEvent.amount) : null
            });
            setSelectedNeg(result.data);
            toast.success('Event added');
            setNewEvent({ event_type: 'counter_sent', amount: '', note: '' });
            fetchData();
        } catch (error) {
            toast.error('Failed to add event');
        } finally {
            setActionLoading(false);
        }
    };

    const handleQuickAction = async (negId, action, amount = null) => {
        setActionLoading(true);
        try {
            await negotiationApi.addEvent(negId, {
                event_type: action,
                amount: amount,
                note: null
            });
            toast.success(action === 'agreed' ? 'Deal closed!' : 'Status updated');
            fetchData();
            if (selectedNeg?.id === negId) {
                const result = await negotiationApi.getById(negId);
                setSelectedNeg(result.data);
            }
        } catch (error) {
            toast.error('Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredNegotiations = negotiations.filter(neg => 
        filter === 'all' || neg.status === filter
    );

    const formatCurrency = (amount) => `₹${amount?.toLocaleString() || 0}`;

    return (
        <div className="p-6 space-y-6" data-testid="negotiations-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="font-serif text-3xl">Negotiations</h1>
                    <Handshake className="w-6 h-6 text-gold" />
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="rounded-none" data-testid="new-negotiation-btn">
                    <Plus className="w-4 h-4 mr-2" /> New Negotiation
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-5 gap-4">
                    <Card className="border">
                        <CardContent className="p-4 text-center">
                            <p className="font-serif text-2xl">{stats.total}</p>
                            <p className="text-[10px] uppercase font-mono text-muted-foreground">Total</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-green-200 bg-green-50/50">
                        <CardContent className="p-4 text-center">
                            <p className="font-serif text-2xl text-green-600">{stats.by_status?.agreed || 0}</p>
                            <p className="text-[10px] uppercase font-mono text-green-600">Agreed</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-blue-200 bg-blue-50/50">
                        <CardContent className="p-4 text-center">
                            <p className="font-serif text-2xl text-blue-600">{stats.by_status?.negotiating || 0}</p>
                            <p className="text-[10px] uppercase font-mono text-blue-600">In Progress</p>
                        </CardContent>
                    </Card>
                    <Card className="border">
                        <CardContent className="p-4 text-center">
                            <p className="font-serif text-2xl">{stats.success_rate?.toFixed(0)}%</p>
                            <p className="text-[10px] uppercase font-mono text-muted-foreground">Success Rate</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-gold/30 bg-gold/5">
                        <CardContent className="p-4 text-center">
                            <p className="font-serif text-2xl text-gold">{stats.avg_discount_percent}%</p>
                            <p className="text-[10px] uppercase font-mono text-gold">Avg Savings</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={setFilter}>
                <TabsList>
                    <TabsTrigger value="all">All ({negotiations.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({negotiations.filter(n => n.status === 'pending').length})</TabsTrigger>
                    <TabsTrigger value="negotiating">Negotiating ({negotiations.filter(n => n.status === 'negotiating').length})</TabsTrigger>
                    <TabsTrigger value="agreed">Agreed ({negotiations.filter(n => n.status === 'agreed').length})</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected ({negotiations.filter(n => n.status === 'rejected').length})</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Negotiations Table */}
            <Card className="border">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-3">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                        </div>
                    ) : filteredNegotiations.length === 0 ? (
                        <div className="p-12 text-center">
                            <Handshake className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">No negotiations found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-mono text-[10px] uppercase">Influencer</TableHead>
                                    <TableHead className="font-mono text-[10px] uppercase">Campaign</TableHead>
                                    <TableHead className="font-mono text-[10px] uppercase">Quote</TableHead>
                                    <TableHead className="font-mono text-[10px] uppercase">Our Budget</TableHead>
                                    <TableHead className="font-mono text-[10px] uppercase">Final</TableHead>
                                    <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                                    <TableHead className="font-mono text-[10px] uppercase">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredNegotiations.map((neg) => {
                                    const StatusIcon = STATUS_CONFIG[neg.status]?.icon || Clock;
                                    const savings = neg.final_price && neg.initial_quote 
                                        ? ((neg.initial_quote - neg.final_price) / neg.initial_quote * 100).toFixed(0)
                                        : null;
                                    return (
                                        <TableRow 
                                            key={neg.id} 
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => { setSelectedNeg(neg); setShowDetailModal(true); }}
                                        >
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">{neg.influencer_name}</p>
                                                    <p className="text-[10px] text-muted-foreground">@{neg.influencer_handle}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">{neg.campaign_name || '-'}</TableCell>
                                            <TableCell className="text-xs font-medium">{formatCurrency(neg.initial_quote)}</TableCell>
                                            <TableCell className="text-xs">{neg.our_budget ? formatCurrency(neg.our_budget) : '-'}</TableCell>
                                            <TableCell>
                                                {neg.final_price ? (
                                                    <div>
                                                        <span className="text-xs font-medium text-green-600">{formatCurrency(neg.final_price)}</span>
                                                        {savings && <Badge className="ml-1 bg-green-100 text-green-700 text-[9px]">-{savings}%</Badge>}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${STATUS_CONFIG[neg.status]?.color} text-[10px]`}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {STATUS_CONFIG[neg.status]?.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                {neg.status === 'negotiating' && (
                                                    <div className="flex gap-1">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="h-7 text-[10px] text-green-600"
                                                            onClick={() => handleQuickAction(neg.id, 'agreed', neg.counter_offer || neg.our_counter || neg.initial_quote)}
                                                        >
                                                            <CheckCircle className="w-3 h-3 mr-1" /> Close Deal
                                                        </Button>
                                                    </div>
                                                )}
                                                {neg.status === 'pending' && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="h-7 text-[10px]"
                                                        onClick={() => { setSelectedNeg(neg); setShowDetailModal(true); }}
                                                    >
                                                        <ArrowRight className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Start New Negotiation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-mono">Influencer *</Label>
                            <Select value={newNeg.influencer_id} onValueChange={(v) => setNewNeg({ ...newNeg, influencer_id: v })}>
                                <SelectTrigger data-testid="neg-influencer-select"><SelectValue placeholder="Select influencer" /></SelectTrigger>
                                <SelectContent>
                                    {influencers.filter(i => i.status !== 'confirmed' && i.status !== 'completed').map(inf => (
                                        <SelectItem key={inf.id} value={inf.id}>{inf.name} (@{inf.instagram_handle})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-mono">Campaign (Optional)</Label>
                            <Select value={newNeg.campaign_id || "none"} onValueChange={(v) => setNewNeg({ ...newNeg, campaign_id: v === "none" ? "" : v })}>
                                <SelectTrigger><SelectValue placeholder="Link to campaign" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No campaign</SelectItem>
                                    {campaigns.filter(c => c.status !== 'completed').map(camp => (
                                        <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Influencer's Quote (₹) *</Label>
                                <Input 
                                    type="number" 
                                    value={newNeg.initial_quote} 
                                    onChange={(e) => setNewNeg({ ...newNeg, initial_quote: e.target.value })}
                                    placeholder="50000"
                                    data-testid="neg-quote-input"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Our Budget (₹)</Label>
                                <Input 
                                    type="number" 
                                    value={newNeg.our_budget} 
                                    onChange={(e) => setNewNeg({ ...newNeg, our_budget: e.target.value })}
                                    placeholder="35000"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-mono">Deliverables *</Label>
                            <Textarea 
                                value={newNeg.deliverables} 
                                onChange={(e) => setNewNeg({ ...newNeg, deliverables: e.target.value })}
                                placeholder="2 Reels + 3 Stories + 1 Post"
                                rows={2}
                                data-testid="neg-deliverables-input"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-mono">Deadline</Label>
                                <Input 
                                    type="date" 
                                    value={newNeg.deadline} 
                                    onChange={(e) => setNewNeg({ ...newNeg, deadline: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-mono">Notes</Label>
                            <Textarea 
                                value={newNeg.notes} 
                                onChange={(e) => setNewNeg({ ...newNeg, notes: e.target.value })}
                                placeholder="Any notes..."
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1 rounded-none">Cancel</Button>
                            <Button onClick={handleCreate} disabled={actionLoading} className="flex-1 rounded-none bg-gold text-white hover:bg-gold/90" data-testid="create-neg-btn">
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Negotiation'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {selectedNeg && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center justify-between">
                                    <span>Negotiation with {selectedNeg.influencer_name}</span>
                                    <Badge className={`${STATUS_CONFIG[selectedNeg.status]?.color}`}>
                                        {STATUS_CONFIG[selectedNeg.status]?.label}
                                    </Badge>
                                </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6 mt-4">
                                {/* Summary */}
                                <div className="grid grid-cols-4 gap-3">
                                    <Card className="border">
                                        <CardContent className="p-3 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase">Their Quote</p>
                                            <p className="font-medium">{formatCurrency(selectedNeg.initial_quote)}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border">
                                        <CardContent className="p-3 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase">Our Budget</p>
                                            <p className="font-medium">{selectedNeg.our_budget ? formatCurrency(selectedNeg.our_budget) : '-'}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border">
                                        <CardContent className="p-3 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase">Counter</p>
                                            <p className="font-medium">{selectedNeg.counter_offer ? formatCurrency(selectedNeg.counter_offer) : '-'}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className={`border ${selectedNeg.final_price ? 'border-green-300 bg-green-50' : ''}`}>
                                        <CardContent className="p-3 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase">Final Price</p>
                                            <p className={`font-medium ${selectedNeg.final_price ? 'text-green-600' : ''}`}>
                                                {selectedNeg.final_price ? formatCurrency(selectedNeg.final_price) : '-'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Deliverables */}
                                <div className="p-3 bg-muted/30 rounded">
                                    <p className="text-[10px] uppercase font-mono text-muted-foreground mb-1">Deliverables</p>
                                    <p className="text-sm">{selectedNeg.deliverables}</p>
                                </div>

                                {/* Timeline */}
                                <div>
                                    <p className="text-[10px] uppercase font-mono text-muted-foreground mb-3">Timeline</p>
                                    <ScrollArea className="h-[200px]">
                                        <div className="space-y-3">
                                            {selectedNeg.timeline?.map((event, i) => {
                                                const EventIcon = EVENT_CONFIG[event.event_type]?.icon || MessageSquare;
                                                const iconColor = EVENT_CONFIG[event.event_type]?.color || 'text-gray-500';
                                                return (
                                                    <div key={event.id || i} className="flex gap-3 text-sm">
                                                        <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                                                            <EventIcon className={`w-4 h-4 ${iconColor}`} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm">{event.note}</p>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {new Date(event.timestamp).toLocaleString()} • {event.created_by}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </div>

                                {/* Add Event Form */}
                                {selectedNeg.status !== 'agreed' && selectedNeg.status !== 'rejected' && (
                                    <div className="border-t pt-4">
                                        <p className="text-[10px] uppercase font-mono text-muted-foreground mb-3">Add Update</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="counter_sent">Send Counter</SelectItem>
                                                    <SelectItem value="counter_received">Received Counter</SelectItem>
                                                    <SelectItem value="agreed">Deal Agreed</SelectItem>
                                                    <SelectItem value="rejected">Rejected</SelectItem>
                                                    <SelectItem value="note_added">Add Note</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {['counter_sent', 'counter_received', 'agreed'].includes(newEvent.event_type) && (
                                                <Input 
                                                    type="number" 
                                                    value={newEvent.amount} 
                                                    onChange={(e) => setNewEvent({ ...newEvent, amount: e.target.value })}
                                                    placeholder="Amount (₹)"
                                                    className="h-8 text-xs"
                                                />
                                            )}
                                            <Input 
                                                value={newEvent.note} 
                                                onChange={(e) => setNewEvent({ ...newEvent, note: e.target.value })}
                                                placeholder="Note (optional)"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <Button 
                                            onClick={handleAddEvent} 
                                            disabled={actionLoading}
                                            className="mt-3 rounded-none bg-gold text-white hover:bg-gold/90"
                                            size="sm"
                                        >
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Update'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
