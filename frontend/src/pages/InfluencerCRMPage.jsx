import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { influencerApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
    Search, 
    Instagram, 
    Youtube,
    Mail,
    Phone,
    MapPin,
    Users,
    TrendingUp,
    ExternalLink,
    MoreHorizontal,
    Star,
    Edit,
    Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

const STATUS_COLORS = {
    identified: 'bg-muted text-muted-foreground',
    contacted: 'bg-blue-100 text-blue-700',
    interested: 'bg-green-100 text-green-700',
    negotiation: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-gold/20 text-gold',
    completed: 'bg-emerald-100 text-emerald-700'
};

const STATUS_OPTIONS = ['identified', 'contacted', 'interested', 'negotiation', 'confirmed', 'completed'];

export const InfluencerCRMPage = () => {
    const navigate = useNavigate();
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInfluencer, setSelectedInfluencer] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchInfluencers();
    }, [statusFilter]);

    const fetchInfluencers = async () => {
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;
            const response = await influencerApi.getAll(params);
            setInfluencers(response.data);
        } catch (error) {
            toast.error('Failed to fetch influencers');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchInfluencers();
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await influencerApi.update(id, { status });
            toast.success('Status updated');
            fetchInfluencers();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this influencer?')) return;
        try {
            await influencerApi.delete(id);
            toast.success('Influencer deleted');
            fetchInfluencers();
        } catch (error) {
            toast.error('Failed to delete influencer');
        }
    };

    const openProfile = (influencer) => {
        setSelectedInfluencer(influencer);
        setShowProfileModal(true);
    };

    const statusCounts = influencers.reduce((acc, inf) => {
        acc[inf.status] = (acc[inf.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="p-8 space-y-8" data-testid="influencer-crm-page">
            {/* Header */}
            <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Relationship Management
                </p>
                <h1 className="font-serif text-4xl">Influencer CRM</h1>
            </div>

            {/* Pipeline Status */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {STATUS_OPTIONS.map((status) => (
                    <Card 
                        key={status}
                        className={`border cursor-pointer transition-all duration-200 ${
                            statusFilter === status ? 'border-gold' : 'border-border hover:border-gold/30'
                        }`}
                        onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                    >
                        <CardContent className="p-4 text-center">
                            <p className="font-serif text-2xl">{statusCounts[status] || 0}</p>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground capitalize">
                                {status}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search & Filter */}
            <Card className="border border-border">
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                data-testid="crm-search"
                                placeholder="Search by name or handle..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={handleSearch} variant="outline" className="rounded-none">
                            Search
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border border-border">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : influencers.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-serif text-xl mb-2">No Influencers</h3>
                            <p className="text-muted-foreground text-sm">
                                Add influencers from the Discovery page
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-mono text-xs uppercase">Influencer</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Contact</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Metrics</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Category</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Status</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Score</TableHead>
                                    <TableHead className="font-mono text-xs uppercase w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {influencers.map((inf) => (
                                    <TableRow 
                                        key={inf.id} 
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => openProfile(inf)}
                                        data-testid={`influencer-row-${inf.id}`}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                                                    <span className="font-serif text-gold">
                                                        {inf.name?.charAt(0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium">{inf.name}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {inf.city}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {inf.instagram_handle && (
                                                    <p className="text-xs flex items-center gap-1">
                                                        <Instagram className="w-3 h-3" />
                                                        @{inf.instagram_handle}
                                                    </p>
                                                )}
                                                {inf.email && (
                                                    <p className="text-xs flex items-center gap-1 text-muted-foreground">
                                                        <Mail className="w-3 h-3" />
                                                        {inf.email}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1 text-xs">
                                                <p className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {(inf.followers / 1000).toFixed(0)}K followers
                                                </p>
                                                <p className="flex items-center gap-1 text-muted-foreground">
                                                    <TrendingUp className="w-3 h-3" />
                                                    {inf.engagement_rate}% engagement
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {inf.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Select 
                                                value={inf.status} 
                                                onValueChange={(v) => handleStatusUpdate(inf.id, v)}
                                            >
                                                <SelectTrigger className={`w-[130px] text-xs ${STATUS_COLORS[inf.status]}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {STATUS_OPTIONS.map((s) => (
                                                        <SelectItem key={s} value={s} className="capitalize">
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-gold/10 text-gold border-0">
                                                <Star className="w-3 h-3 mr-1" />
                                                {inf.score}
                                            </Badge>
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openProfile(inf)}>
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        View Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/outreach?influencer=${inf.id}`)}>
                                                        <Mail className="w-4 h-4 mr-2" />
                                                        Send Outreach
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleDelete(inf.id)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Profile Modal */}
            <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
                <DialogContent className="max-w-2xl">
                    {selectedInfluencer && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="font-serif text-2xl flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                                        <span className="font-serif text-xl text-gold">
                                            {selectedInfluencer.name?.charAt(0)}
                                        </span>
                                    </div>
                                    {selectedInfluencer.name}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-6 mt-4">
                                <div className="space-y-4">
                                    <div>
                                        <p className="font-mono text-xs uppercase text-muted-foreground mb-1">Location</p>
                                        <p className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                            {selectedInfluencer.city}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-mono text-xs uppercase text-muted-foreground mb-1">Category</p>
                                        <Badge variant="outline" className="capitalize">{selectedInfluencer.category}</Badge>
                                    </div>
                                    <div>
                                        <p className="font-mono text-xs uppercase text-muted-foreground mb-1">Status</p>
                                        <Badge className={STATUS_COLORS[selectedInfluencer.status]}>
                                            {selectedInfluencer.status}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="font-mono text-xs uppercase text-muted-foreground mb-1">Style Tags</p>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedInfluencer.style_tags?.map((tag) => (
                                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="font-mono text-xs uppercase text-muted-foreground mb-1">Social Handles</p>
                                        <div className="space-y-2">
                                            {selectedInfluencer.instagram_handle && (
                                                <p className="flex items-center gap-2 text-sm">
                                                    <Instagram className="w-4 h-4" />
                                                    @{selectedInfluencer.instagram_handle}
                                                </p>
                                            )}
                                            {selectedInfluencer.youtube_handle && (
                                                <p className="flex items-center gap-2 text-sm">
                                                    <Youtube className="w-4 h-4" />
                                                    {selectedInfluencer.youtube_handle}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-mono text-xs uppercase text-muted-foreground mb-1">Contact</p>
                                        <div className="space-y-2">
                                            {selectedInfluencer.email && (
                                                <p className="flex items-center gap-2 text-sm">
                                                    <Mail className="w-4 h-4" />
                                                    {selectedInfluencer.email}
                                                </p>
                                            )}
                                            {selectedInfluencer.phone && (
                                                <p className="flex items-center gap-2 text-sm">
                                                    <Phone className="w-4 h-4" />
                                                    {selectedInfluencer.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-mono text-xs uppercase text-muted-foreground mb-1">Metrics</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="font-serif text-2xl">{(selectedInfluencer.followers / 1000).toFixed(0)}K</p>
                                                <p className="text-xs text-muted-foreground">Followers</p>
                                            </div>
                                            <div>
                                                <p className="font-serif text-2xl">{selectedInfluencer.engagement_rate}%</p>
                                                <p className="text-xs text-muted-foreground">Engagement</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-mono text-xs uppercase text-muted-foreground mb-1">Score</p>
                                        <Badge className="bg-gold text-white text-lg px-3 py-1">
                                            {selectedInfluencer.score}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            {selectedInfluencer.notes && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <p className="font-mono text-xs uppercase text-muted-foreground mb-2">Notes</p>
                                    <p className="text-sm">{selectedInfluencer.notes}</p>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
