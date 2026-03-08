import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Briefcase, Plus, DollarSign, User, Calendar, Clock, ArrowRight, 
  CheckCircle, XCircle, AlertCircle, MessageSquare, TrendingUp, Target,
  GripVertical, MoreVertical, ChevronRight, Edit2, Trash2, Eye,
  Building2, Instagram, Youtube, RefreshCw, Zap, Filter
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';

// Pipeline Stages Configuration
const PIPELINE_STAGES = [
  { 
    id: 'lead', 
    label: 'Lead', 
    color: 'bg-gray-100 border-gray-300',
    headerColor: 'bg-gray-500',
    description: 'New opportunities'
  },
  { 
    id: 'contacted', 
    label: 'Contacted', 
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-500',
    description: 'Initial outreach sent'
  },
  { 
    id: 'negotiating', 
    label: 'Negotiating', 
    color: 'bg-amber-50 border-amber-200',
    headerColor: 'bg-amber-500',
    description: 'In active discussion'
  },
  { 
    id: 'proposal_sent', 
    label: 'Proposal Sent', 
    color: 'bg-purple-50 border-purple-200',
    headerColor: 'bg-purple-500',
    description: 'Awaiting response'
  },
  { 
    id: 'agreed', 
    label: 'Won', 
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-500',
    description: 'Deal closed'
  },
  { 
    id: 'lost', 
    label: 'Lost', 
    color: 'bg-red-50 border-red-200',
    headerColor: 'bg-red-500',
    description: 'Rejected or passed'
  }
];

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

// Deal Card Component
const DealCard = ({ deal, onStatusChange, onViewDetails, onEdit, isSelected, onToggleSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('dealId', deal.id);
    e.dataTransfer.setData('currentStatus', deal.status);
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const daysSinceCreated = Math.floor((Date.now() - new Date(deal.created_at)) / (1000 * 60 * 60 * 24));
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isSelected ? 'ring-2 ring-purple-400' : ''}`}
      data-testid={`deal-card-${deal.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            {deal.contact_name?.charAt(0) || 'D'}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm line-clamp-1">{deal.contact_name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{deal.contact_type || 'influencer'}</p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(deal)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(deal)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Deal
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-green-600"
              onClick={() => onStatusChange(deal.id, 'agreed')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Won
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onStatusChange(deal.id, 'lost')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Mark as Lost
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Deal Value */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-gray-900">
          {formatCurrency(deal.final_amount || deal.our_budget || deal.initial_quote)}
        </span>
        {deal.initial_quote && deal.final_amount && deal.initial_quote !== deal.final_amount && (
          <Badge className="bg-green-100 text-green-700 text-xs">
            {Math.round(((deal.initial_quote - deal.final_amount) / deal.initial_quote) * 100)}% saved
          </Badge>
        )}
      </div>
      
      {/* Deliverables */}
      {deal.deliverables && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-1">
          {deal.deliverables}
        </p>
      )}
      
      {/* Campaign Badge */}
      {deal.campaign_name && (
        <Badge variant="outline" className="text-xs mb-2">
          <Target className="w-3 h-3 mr-1" />
          {deal.campaign_name}
        </Badge>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {daysSinceCreated}d
        </span>
        
        {deal.timeline?.length > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {deal.timeline.length} updates
          </span>
        )}
      </div>
    </div>
  );
};

// Pipeline Column Component
const PipelineColumn = ({ stage, deals, onDrop, onStatusChange, onViewDetails, onEdit, selectedIds, onToggleSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const dealId = e.dataTransfer.getData('dealId');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    
    if (currentStatus !== stage.id) {
      onDrop(dealId, stage.id);
    }
  };
  
  const totalValue = deals.reduce((sum, d) => sum + (d.final_amount || d.our_budget || d.initial_quote || 0), 0);
  
  return (
    <div 
      className={`flex-shrink-0 w-[300px] flex flex-col bg-gray-50 rounded-lg ${
        isDragOver ? 'ring-2 ring-purple-400 ring-offset-2' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`pipeline-column-${stage.id}`}
    >
      {/* Column Header */}
      <div className={`${stage.headerColor} text-white px-4 py-3 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{stage.label}</h3>
            <Badge className="bg-white/20 text-white">{deals.length}</Badge>
          </div>
          <span className="text-sm font-medium">{formatCurrency(totalValue)}</span>
        </div>
        <p className="text-xs text-white/70 mt-1">{stage.description}</p>
      </div>
      
      {/* Cards Container */}
      <ScrollArea className="flex-1 p-3 max-h-[calc(100vh-320px)]">
        <div className="space-y-3">
          {deals.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No deals</p>
              <p className="text-xs">Drag deals here</p>
            </div>
          ) : (
            deals.map(deal => (
              <DealCard
                key={deal.id}
                deal={deal}
                onStatusChange={onStatusChange}
                onViewDetails={onViewDetails}
                onEdit={onEdit}
                isSelected={selectedIds.includes(deal.id)}
                onToggleSelect={() => onToggleSelect(deal.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Main Component
export const DealPipeline = () => {
  const navigate = useNavigate();
  
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  
  // New deal form
  const [newDeal, setNewDeal] = useState({
    contact_id: '',
    campaign_id: '',
    initial_quote: '',
    our_budget: '',
    deliverables: '',
    notes: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all contacts
      const contactsRes = await api.get('/marketing/v2/contacts');
      const allContacts = contactsRes.data || [];
      setContacts(allContacts);
      
      // Fetch all campaigns
      const campaignsRes = await api.get('/marketing/v2/campaigns');
      const allCampaigns = campaignsRes.data || [];
      setCampaigns(allCampaigns);
      
      // Fetch deals for all contacts
      const allDeals = [];
      for (const contact of allContacts) {
        try {
          const dealsRes = await api.get(`/marketing/v2/contacts/${contact.id}/deals`);
          const contactDeals = (dealsRes.data || []).map(d => ({
            ...d,
            contact_name: contact.name,
            contact_type: contact.contact_type,
            contact_id: contact.id
          }));
          allDeals.push(...contactDeals);
        } catch (err) {
          // No deals for this contact
        }
      }
      
      // Enrich with campaign names
      const enrichedDeals = allDeals.map(deal => {
        const campaign = allCampaigns.find(c => c.id === deal.campaign_id);
        return {
          ...deal,
          campaign_name: campaign?.name
        };
      });
      
      setDeals(enrichedDeals);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map deals to stages - with fallback mapping
  const mapStatusToStage = (status) => {
    const statusMap = {
      'pending': 'lead',
      'lead': 'lead',
      'contacted': 'contacted',
      'negotiating': 'negotiating',
      'proposal_sent': 'proposal_sent',
      'agreed': 'agreed',
      'completed': 'agreed',
      'rejected': 'lost',
      'lost': 'lost',
      'on_hold': 'negotiating'
    };
    return statusMap[status] || 'lead';
  };

  // Group deals by stage
  const dealsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(deal => {
      const mappedStage = mapStatusToStage(deal.status);
      const matchesStage = mappedStage === stage.id;
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          deal.contact_name?.toLowerCase().includes(query) ||
          deal.deliverables?.toLowerCase().includes(query) ||
          deal.campaign_name?.toLowerCase().includes(query);
        return matchesStage && matchesSearch;
      }
      
      return matchesStage;
    });
    return acc;
  }, {});

  // Calculate pipeline stats
  const stats = {
    totalDeals: deals.length,
    totalValue: deals.reduce((sum, d) => sum + (d.final_amount || d.our_budget || d.initial_quote || 0), 0),
    wonDeals: deals.filter(d => mapStatusToStage(d.status) === 'agreed').length,
    wonValue: deals.filter(d => mapStatusToStage(d.status) === 'agreed')
      .reduce((sum, d) => sum + (d.final_amount || d.our_budget || d.initial_quote || 0), 0),
    avgDealSize: deals.length > 0 
      ? deals.reduce((sum, d) => sum + (d.final_amount || d.our_budget || d.initial_quote || 0), 0) / deals.length 
      : 0,
    conversionRate: deals.length > 0 
      ? ((deals.filter(d => mapStatusToStage(d.status) === 'agreed').length / deals.length) * 100).toFixed(1)
      : 0
  };

  const handleDrop = async (dealId, newStatus) => {
    try {
      await api.put(`/marketing/v2/deals/${dealId}/status`, null, {
        params: { status: newStatus }
      });
      toast.success(`Deal moved to ${PIPELINE_STAGES.find(s => s.id === newStatus)?.label}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update deal status');
    }
  };

  const handleStatusChange = async (dealId, newStatus) => {
    try {
      await api.put(`/marketing/v2/deals/${dealId}/status`, null, {
        params: { status: newStatus }
      });
      toast.success(newStatus === 'agreed' ? 'Deal won!' : 'Deal updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update deal');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setBulkDeleting(true);
    try {
      const response = await api.post('/marketing/v2/deals/bulk-delete', { ids: selectedIds });
      toast.success(`Deleted ${response.data.deleted_count} deals`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete deals');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleCreateDeal = async () => {
    if (!newDeal.contact_id) {
      toast.error('Please select a contact');
      return;
    }
    
    try {
      await api.post('/marketing/v2/deals', {
        ...newDeal,
        initial_quote: newDeal.initial_quote ? parseFloat(newDeal.initial_quote) : null,
        our_budget: newDeal.our_budget ? parseFloat(newDeal.our_budget) : null,
        status: 'lead'
      });
      toast.success('Deal created');
      setShowCreateModal(false);
      setNewDeal({ contact_id: '', campaign_id: '', initial_quote: '', our_budget: '', deliverables: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create deal');
    }
  };

  const handleViewDetails = (deal) => {
    setSelectedDeal(deal);
    setShowDetailModal(true);
  };

  const handleEdit = (deal) => {
    navigate(`/marketing/influencers/${deal.contact_id}`);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100" data-testid="deal-pipeline-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-purple-600" />
              Deal Pipeline
            </h1>
            <p className="text-sm text-gray-500 mt-1">Drag and drop deals between stages</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[250px]"
                data-testid="search-deals"
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => setShowBulkDeleteConfirm(true)}
                data-testid="bulk-delete-deals-btn"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedIds.length})
              </Button>
            )}
            
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setShowCreateModal(true)}
              data-testid="new-deal-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Deal
            </Button>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.totalDeals}</p>
              <p className="text-xs text-gray-500">Total Deals</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
              <p className="text-xs text-gray-500">Pipeline Value</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.wonDeals}</p>
              <p className="text-xs text-gray-500">Won ({formatCurrency(stats.wonValue)})</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.conversionRate}%</p>
              <p className="text-xs text-gray-500">Win Rate</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.avgDealSize)}</p>
              <p className="text-xs text-gray-500">Avg Deal Size</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {loading ? (
          <div className="flex gap-4">
            {PIPELINE_STAGES.map(stage => (
              <div key={stage.id} className="w-[300px] flex-shrink-0">
                <Skeleton className="h-12 mb-3 rounded-t-lg" />
                <div className="space-y-3">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 min-h-full">
            {PIPELINE_STAGES.map(stage => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] || []}
                onDrop={handleDrop}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                selectedIds={selectedIds}
                onToggleSelect={(dealId) => {
                  setSelectedIds(prev => 
                    prev.includes(dealId) ? prev.filter(id => id !== dealId) : [...prev, dealId]
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Deal Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              Create New Deal
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Contact *</Label>
              <Select 
                value={newDeal.contact_id} 
                onValueChange={(v) => setNewDeal({ ...newDeal, contact_id: v })}
              >
                <SelectTrigger data-testid="select-contact">
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex items-center gap-2">
                        {contact.contact_type === 'influencer' ? (
                          <Instagram className="w-4 h-4 text-pink-500" />
                        ) : (
                          <Building2 className="w-4 h-4 text-blue-500" />
                        )}
                        {contact.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Campaign (optional)</Label>
              <Select 
                value={newDeal.campaign_id} 
                onValueChange={(v) => setNewDeal({ ...newDeal, campaign_id: v })}
              >
                <SelectTrigger data-testid="select-campaign">
                  <SelectValue placeholder="Link to campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Quote (₹)</Label>
                <Input
                  type="number"
                  placeholder="Their ask"
                  value={newDeal.initial_quote}
                  onChange={(e) => setNewDeal({ ...newDeal, initial_quote: e.target.value })}
                  data-testid="deal-initial-quote"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Our Budget (₹)</Label>
                <Input
                  type="number"
                  placeholder="Our offer"
                  value={newDeal.our_budget}
                  onChange={(e) => setNewDeal({ ...newDeal, our_budget: e.target.value })}
                  data-testid="deal-our-budget"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Deliverables</Label>
              <Textarea
                placeholder="e.g., 2 Reels, 4 Stories, 1 Post"
                value={newDeal.deliverables}
                onChange={(e) => setNewDeal({ ...newDeal, deliverables: e.target.value })}
                rows={2}
                data-testid="deal-deliverables"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={newDeal.notes}
                onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                rows={2}
                data-testid="deal-notes"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleCreateDeal}
                data-testid="create-deal-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Deal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deal Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              Deal Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedDeal && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-lg font-bold">
                  {selectedDeal.contact_name?.charAt(0) || 'D'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedDeal.contact_name}</p>
                  <p className="text-sm text-gray-500">{selectedDeal.contact_type}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Initial Quote</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedDeal.initial_quote)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Final Amount</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedDeal.final_amount || selectedDeal.our_budget)}</p>
                </div>
              </div>
              
              {selectedDeal.deliverables && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase mb-1">Deliverables</p>
                  <p className="text-sm text-gray-700">{selectedDeal.deliverables}</p>
                </div>
              )}
              
              {selectedDeal.campaign_name && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  <span className="text-sm">Campaign: {selectedDeal.campaign_name}</span>
                </div>
              )}
              
              {/* Timeline */}
              {selectedDeal.timeline?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase">Activity Timeline</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedDeal.timeline.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5" />
                        <div>
                          <p className="text-gray-700">{event.event?.replace(/_/g, ' ')}</p>
                          {event.note && <p className="text-gray-500 text-xs">{event.note}</p>}
                          <p className="text-gray-400 text-xs">
                            {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(`/marketing/influencers/${selectedDeal.contact_id}`)}
                >
                  <User className="w-4 h-4 mr-2" />
                  View Contact
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusChange(selectedDeal.id, 'agreed')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Won
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Bulk Delete
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{selectedIds.length}</strong> deal{selectedIds.length > 1 ? 's' : ''}?
            </p>
            <p className="text-sm text-red-500 mt-2">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              data-testid="confirm-bulk-delete-deals-btn"
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Deal${selectedIds.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealPipeline;
