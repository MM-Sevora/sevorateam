import React, { useEffect, useState } from 'react';
import { salesAPI } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Search, Plus, Phone, Mail, MapPin, Calendar, UserPlus } from 'lucide-react';

const STAGE_COLORS = {
    'New Lead': 'bg-blue-500',
    'Contacted': 'bg-cyan-500',
    'Styling Session Scheduled': 'bg-purple-500',
    'Styling Completed': 'bg-violet-500',
    'Trial / Selection': 'bg-orange-500',
    'Order Confirmed': 'bg-emerald-500',
    'Closed Lost': 'bg-gray-500'
};

const SOURCE_COLORS = {
    'Instagram Ads': 'bg-pink-500',
    'Facebook Ads': 'bg-blue-600',
    'Influencer': 'bg-purple-500',
    'Event': 'bg-orange-500',
    'QR Code': 'bg-cyan-500',
    'Website': 'bg-green-500',
    'Referral': 'bg-yellow-500'
};

export const LeadsPage = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newLead, setNewLead] = useState({
        name: '',
        phone: '',
        email: '',
        source: 'Website',
        city: '',
        occasion: '',
        notes: ''
    });

    const fetchLeads = async () => {
        try {
            const response = await salesAPI.getLeads({ search });
            setLeads(response.data);
        } catch (error) {
            console.error('Failed to fetch leads:', error);
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [search]);

    const handleAddLead = async () => {
        try {
            await salesAPI.createLead(newLead);
            toast.success('Lead added successfully');
            setShowAddModal(false);
            setNewLead({
                name: '',
                phone: '',
                email: '',
                source: 'Website',
                city: '',
                occasion: '',
                notes: ''
            });
            fetchLeads();
        } catch (error) {
            toast.error('Failed to add lead');
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="p-8 space-y-6" data-testid="leads-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Leads</h1>
                    <p className="text-white/50 mt-1">Manage your sales leads</p>
                </div>
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="add-lead-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Lead
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add New Lead</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name *</Label>
                                    <Input
                                        value={newLead.name}
                                        onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                                        className="bg-white/5 border-white/10"
                                        required
                                        data-testid="lead-name-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone *</Label>
                                    <Input
                                        value={newLead.phone}
                                        onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                                        className="bg-white/5 border-white/10"
                                        required
                                        data-testid="lead-phone-input"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={newLead.email}
                                        onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input
                                        value={newLead.city}
                                        onChange={(e) => setNewLead({...newLead, city: e.target.value})}
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Source *</Label>
                                    <select
                                        value={newLead.source}
                                        onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                                        className="w-full p-2 bg-white/5 border border-white/10 rounded-md text-white"
                                    >
                                        <option value="Instagram Ads">Instagram Ads</option>
                                        <option value="Facebook Ads">Facebook Ads</option>
                                        <option value="Influencer">Influencer</option>
                                        <option value="Event">Event</option>
                                        <option value="QR Code">QR Code</option>
                                        <option value="Website">Website</option>
                                        <option value="Referral">Referral</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Occasion</Label>
                                    <Input
                                        value={newLead.occasion}
                                        onChange={(e) => setNewLead({...newLead, occasion: e.target.value})}
                                        placeholder="e.g., Wedding, Party"
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <textarea
                                    value={newLead.notes}
                                    onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                                    className="w-full p-2 bg-white/5 border border-white/10 rounded-md text-white min-h-[80px]"
                                    placeholder="Additional notes..."
                                />
                            </div>
                            <Button 
                                onClick={handleAddLead} 
                                className="w-full bg-emerald-500 hover:bg-emerald-600"
                                disabled={!newLead.name || !newLead.phone}
                                data-testid="save-lead-btn"
                            >
                                Add Lead
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    data-testid="lead-search-input"
                />
            </div>

            {/* Leads List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : leads.length === 0 ? (
                <div className="text-center py-20">
                    <UserPlus className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50">No leads found</p>
                    <Button 
                        onClick={() => setShowAddModal(true)} 
                        className="mt-4 bg-emerald-500 hover:bg-emerald-600"
                    >
                        Add Your First Lead
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {leads.map(lead => (
                        <Card key={lead.id} className="bg-[#12121a] border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer" data-testid={`lead-card-${lead.id}`}>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                                            {lead.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold">{lead.name}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-white/50 text-sm">
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {lead.phone}
                                                </span>
                                                {lead.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {lead.email}
                                                    </span>
                                                )}
                                                {lead.city && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {lead.city}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={`${SOURCE_COLORS[lead.source] || 'bg-gray-500'} text-white text-xs`}>
                                            {lead.source}
                                        </Badge>
                                        <Badge className={`${STAGE_COLORS[lead.stage] || 'bg-gray-500'} text-white text-xs`}>
                                            {lead.stage}
                                        </Badge>
                                        <span className="text-white/40 text-xs flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(lead.created_at)}
                                        </span>
                                    </div>
                                </div>
                                {(lead.occasion || lead.notes) && (
                                    <div className="mt-3 pl-16 text-white/40 text-sm">
                                        {lead.occasion && <span className="text-emerald-400">{lead.occasion}</span>}
                                        {lead.occasion && lead.notes && ' • '}
                                        {lead.notes}
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

export default LeadsPage;
