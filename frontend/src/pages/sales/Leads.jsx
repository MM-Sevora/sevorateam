import React, { useEffect, useState } from 'react';
import { salesAPI } from '../../lib/api';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Search, Plus, Phone, Mail, MapPin, Calendar, UserPlus, ClipboardList, MoreVertical } from 'lucide-react';
import CreateTaskDialog from '../../components/shared/CreateTaskDialog';
import EntityIntegrationCheck from '../../components/shared/EntityIntegrationCheck';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const STAGE_COLORS = {
    'New Lead': 'bg-blue-500',
    'Contacted': 'bg-stone-700',
    'Styling Session Scheduled': 'bg-amber-600',
    'Styling Completed': 'bg-amber-700',
    'Trial / Selection': 'bg-orange-500',
    'Order Confirmed': 'bg-stone-600',
    'Closed Lost': 'bg-[#F5EDE5]0'
};

const SOURCE_COLORS = {
    'Instagram Ads': 'bg-rose-600',
    'Facebook Ads': 'bg-blue-600',
    'Influencer': 'bg-amber-600',
    'Event': 'bg-orange-500',
    'QR Code': 'bg-stone-700',
    'Website': 'bg-stone-600',
    'Referral': 'bg-yellow-500'
};

export const LeadsPage = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showIntegrationCheck, setShowIntegrationCheck] = useState(false);
    const [createdEntity, setCreatedEntity] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);
    const [newLead, setNewLead] = useState({
        name: '',
        phone: '',
        email: '',
        source: 'Website',
        city: '',
        occasion: '',
        notes: ''
    });

    const handleCreateTask = (lead) => {
        setSelectedLead(lead);
        setShowCreateTask(true);
    };

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
            const response = await salesAPI.createLead(newLead);
            const createdLead = response.data;
            toast.success('Lead added successfully');
            setShowAddModal(false);
            
            // Show integration check dialog
            setCreatedEntity({
                id: createdLead.id,
                name: newLead.name
            });
            setShowIntegrationCheck(true);
            
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
                    <h1 className="text-2xl font-bold text-[#4A3728]">Leads</h1>
                    <p className="text-[#5D4A3A] mt-1">Manage your sales leads</p>
                </div>
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogTrigger asChild>
                        <Button className="bg-stone-600 hover:bg-stone-700" data-testid="add-lead-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Lead
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-[#E8D5C4] text-[#4A3728] max-w-lg">
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
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                        required
                                        data-testid="lead-name-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone *</Label>
                                    <Input
                                        value={newLead.phone}
                                        onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
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
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input
                                        value={newLead.city}
                                        onChange={(e) => setNewLead({...newLead, city: e.target.value})}
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Source *</Label>
                                    <select
                                        value={newLead.source}
                                        onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                                        className="w-full p-2 bg-[#F5EDE5] border border-[#D4BBA6] rounded-md text-[#4A3728]"
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
                                        className="bg-[#F5EDE5] border-[#D4BBA6]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <textarea
                                    value={newLead.notes}
                                    onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                                    className="w-full p-2 bg-[#F5EDE5] border border-[#D4BBA6] rounded-md text-[#4A3728] min-h-[80px]"
                                    placeholder="Additional notes..."
                                />
                            </div>
                            <Button 
                                onClick={handleAddLead} 
                                className="w-full bg-stone-600 hover:bg-stone-700"
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                <Input
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white border-[#D4BBA6] text-[#4A3728]"
                    data-testid="lead-search-input"
                />
            </div>

            {/* Leads List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-stone-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : leads.length === 0 ? (
                <div className="text-center py-20">
                    <UserPlus className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
                    <p className="text-[#5D4A3A]">No leads found</p>
                    <Button 
                        onClick={() => setShowAddModal(true)} 
                        className="mt-4 bg-stone-600 hover:bg-stone-700"
                    >
                        Add Your First Lead
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {leads.map(lead => (
                        <Card key={lead.id} className="bg-white border-[#E8D5C4] hover:border-stone-300 hover:shadow-md transition-all cursor-pointer" data-testid={`lead-card-${lead.id}`}>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A3728] to-[#5D4A3A] flex items-center justify-center text-white font-bold">
                                            {lead.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-[#4A3728] font-semibold">{lead.name}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-[#5D4A3A] text-sm">
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
                                        <Badge className={`${SOURCE_COLORS[lead.source] || 'bg-[#F5EDE5]0'} text-white text-xs`}>
                                            {lead.source}
                                        </Badge>
                                        <Badge className={`${STAGE_COLORS[lead.stage] || 'bg-[#F5EDE5]0'} text-white text-xs`}>
                                            {lead.stage}
                                        </Badge>
                                        <span className="text-[#5D4A3A] text-xs flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(lead.created_at)}
                                        </span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreVertical className="h-4 w-4 text-[#5D4A3A]" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleCreateTask(lead)}>
                                                    <ClipboardList className="w-4 h-4 mr-2" />
                                                    Create Task
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                {(lead.occasion || lead.notes) && (
                                    <div className="mt-3 pl-16 text-[#5D4A3A] text-sm">
                                        {lead.occasion && <span className="text-stone-600">{lead.occasion}</span>}
                                        {lead.occasion && lead.notes && ' • '}
                                        {lead.notes}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Task Dialog */}
            {selectedLead && (
                <CreateTaskDialog
                    open={showCreateTask}
                    onOpenChange={setShowCreateTask}
                    api={api}
                    sourceModule="sales"
                    sourceEntityType="lead"
                    sourceEntityId={selectedLead.id}
                    sourceEntityName={selectedLead.name}
                    onTaskCreated={() => setSelectedLead(null)}
                />
            )}

            {/* Integration Check Dialog */}
            {createdEntity && (
                <EntityIntegrationCheck
                    open={showIntegrationCheck}
                    onOpenChange={setShowIntegrationCheck}
                    api={api}
                    module="sales"
                    entityType="lead"
                    entityId={createdEntity.id}
                    entityName={createdEntity.name}
                    onComplete={() => setCreatedEntity(null)}
                />
            )}
        </div>
    );
};

export default LeadsPage;
