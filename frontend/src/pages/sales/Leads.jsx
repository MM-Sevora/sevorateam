import React, { useEffect, useState, useCallback } from 'react';
import { salesAPI } from '../../lib/api';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { 
    Search, Plus, Phone, Mail, MapPin, Calendar, UserPlus, ClipboardList, MoreVertical, 
    Edit2, Trash2, Eye, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, X, Filter
} from 'lucide-react';
import CreateTaskDialog from '../../components/shared/CreateTaskDialog';
import EntityIntegrationCheck from '../../components/shared/EntityIntegrationCheck';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { ExportButton } from '../../lib/exportUtils';

const STAGE_COLORS = {
    'New Lead': 'bg-blue-500',
    'Contacted': 'bg-stone-700',
    'Styling Session Scheduled': 'bg-amber-600',
    'Styling Completed': 'bg-amber-700',
    'Trial / Selection': 'bg-orange-500',
    'Order Confirmed': 'bg-stone-600',
    'Closed Lost': 'bg-gray-400'
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
    const [filters, setFilters] = useState({ source: '', stage: '', city: '', added_by: '' });
    const [sorting, setSorting] = useState({ sort_by: 'created_at', sort_order: 'desc' });
    const [filtersMeta, setFiltersMeta] = useState({ creators: [], cities: [], sources: [], stages: [] });
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
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

    const handleDeleteLead = async (lead) => {
        if (!window.confirm(`Are you sure you want to delete lead "${lead.name}"?`)) return;
        try {
            await salesAPI.deleteLead(lead.id);
            toast.success('Lead deleted');
            fetchLeads();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete lead');
        }
    };

    const fetchLeads = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page,
                page_size: pagination.pageSize,
                sort_by: sorting.sort_by,
                sort_order: sorting.sort_order,
                ...(search && { search }),
                ...(filters.source && { source: filters.source }),
                ...(filters.stage && { stage: filters.stage }),
                ...(filters.city && { city: filters.city }),
                ...(filters.added_by && { added_by: filters.added_by })
            });
            const response = await api.get(`/sales/leads/paginated?${params.toString()}`);
            setLeads(response.data.leads || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.total,
                totalPages: response.data.total_pages
            }));
            if (response.data.filters_meta) {
                setFiltersMeta(response.data.filters_meta);
            }
        } catch (error) {
            console.error('Failed to fetch leads:', error);
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, sorting, search, filters]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const handleSort = (field) => {
        setSorting(prev => ({
            sort_by: field,
            sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc'
        }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const SortIcon = ({ field }) => {
        if (sorting.sort_by !== field) {
            return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        }
        return sorting.sort_order === 'asc' 
            ? <ArrowUp className="h-4 w-4 ml-1 text-stone-700" />
            : <ArrowDown className="h-4 w-4 ml-1 text-stone-700" />;
    };

    const handleAddLead = async () => {
        try {
            const response = await salesAPI.createLead(newLead);
            const createdLead = response.data;
            toast.success('Lead added successfully');
            setShowAddModal(false);
            
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

    const hasActiveFilters = filters.source || filters.stage || filters.city || filters.added_by || search;

    const clearAllFilters = () => {
        setFilters({ source: '', stage: '', city: '', added_by: '' });
        setSearch('');
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    return (
        <div className="p-8 space-y-6" data-testid="leads-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#4A3728]">Leads</h1>
                    <p className="text-[#5D4A3A] mt-1">Manage your sales leads</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButton 
                        data={leads}
                        filename="leads-export"
                        columns={[
                            { key: 'name', label: 'Name' },
                            { key: 'email', label: 'Email' },
                            { key: 'phone', label: 'Phone' },
                            { key: 'source', label: 'Source' },
                            { key: 'stage', label: 'Stage' },
                            { key: 'city', label: 'City' },
                            { key: 'created_by_name', label: 'Created By' },
                            { key: 'created_at', label: 'Created At' },
                        ]}
                    />
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
            </div>

            {/* Search & Filters */}
            <Card className="border-[#E8D5C4] bg-white/80">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9C8C74]" />
                            <Input
                                placeholder="Search leads..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 border-[#E8D5C4]"
                                data-testid="lead-search-input"
                            />
                        </div>
                        <Select value={filters.source || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, source: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-[160px]" data-testid="filter-source">
                                <SelectValue placeholder="All Sources" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sources</SelectItem>
                                {(filtersMeta.sources?.length > 0 ? filtersMeta.sources : ['Instagram Ads', 'Facebook Ads', 'Influencer', 'Event', 'QR Code', 'Website', 'Referral']).map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filters.stage || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, stage: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-[180px]" data-testid="filter-stage">
                                <SelectValue placeholder="All Stages" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                {(filtersMeta.stages?.length > 0 ? filtersMeta.stages : Object.keys(STAGE_COLORS)).map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filters.city || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, city: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-[150px]" data-testid="filter-city">
                                <SelectValue placeholder="All Cities" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Cities</SelectItem>
                                {filtersMeta.cities?.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filters.added_by || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, added_by: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-[180px]" data-testid="filter-added-by">
                                <SelectValue placeholder="Added by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Team Members</SelectItem>
                                {filtersMeta.creators?.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchLeads} className="border-[#E8D5C4]">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-gray-500">
                                <X className="w-4 h-4 mr-1" /> Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Leads Table */}
            <Card className="border-[#E8D5C4]">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center">
                                        Name
                                        <SortIcon field="name" />
                                    </div>
                                </TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('city')}
                                >
                                    <div className="flex items-center">
                                        City
                                        <SortIcon field="city" />
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('source')}
                                >
                                    <div className="flex items-center">
                                        Source
                                        <SortIcon field="source" />
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('stage')}
                                >
                                    <div className="flex items-center">
                                        Stage
                                        <SortIcon field="stage" />
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="cursor-pointer hover:bg-gray-50 select-none"
                                    onClick={() => handleSort('created_at')}
                                >
                                    <div className="flex items-center">
                                        Added
                                        <SortIcon field="created_at" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-stone-600 mx-auto"></div>
                                    </TableCell>
                                </TableRow>
                            ) : leads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        No leads found. Add your first lead to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                leads.map((lead) => (
                                    <TableRow key={lead.id} className="hover:bg-gray-50" data-testid={`lead-row-${lead.id}`}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A3728] to-[#5D4A3A] flex items-center justify-center text-white font-bold text-sm">
                                                    {lead.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-[#4A3728]">{lead.name}</div>
                                                    {lead.occasion && (
                                                        <div className="text-xs text-[#5D4A3A]">{lead.occasion}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-sm text-[#5D4A3A]">
                                                    <Phone className="w-3 h-3" /> {lead.phone}
                                                </div>
                                                {lead.email && (
                                                    <div className="flex items-center gap-1 text-sm text-[#5D4A3A]">
                                                        <Mail className="w-3 h-3" /> {lead.email}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {lead.city && (
                                                <div className="flex items-center gap-1 text-sm text-[#5D4A3A]">
                                                    <MapPin className="w-3 h-3" /> {lead.city}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${SOURCE_COLORS[lead.source] || 'bg-gray-400'} text-white text-xs`}>
                                                {lead.source}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${STAGE_COLORS[lead.stage] || 'bg-gray-400'} text-white text-xs`}>
                                                {lead.stage}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-[#5D4A3A]">
                                                {formatDate(lead.created_at)}
                                            </div>
                                            {lead.created_by_name && (
                                                <div className="text-xs text-[#8B7355]">
                                                    by {lead.created_by_name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreVertical className="h-4 w-4 text-[#5D4A3A]" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => window.location.href = `/sales/leads/${lead.id}`}>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    {lead._permissions?.can_edit !== false && (
                                                        <DropdownMenuItem onClick={() => window.location.href = `/sales/leads/${lead.id}/edit`}>
                                                            <Edit2 className="w-4 h-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => handleCreateTask(lead)}>
                                                        <ClipboardList className="w-4 h-4 mr-2" />
                                                        Create Task
                                                    </DropdownMenuItem>
                                                    {lead._permissions?.can_delete ? (
                                                        <DropdownMenuItem onClick={() => handleDeleteLead(lead)} className="text-red-600">
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                            <span className="ml-1 text-xs">(Owner only)</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} leads
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={pagination.page === pagination.totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
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
