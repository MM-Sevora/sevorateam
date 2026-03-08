import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { toast } from 'sonner';
import api from '../../lib/api';
import {
  Users, Search, RefreshCw, Filter, MoreVertical, Mail, MessageSquare,
  DollarSign, ChevronDown, ChevronRight, Send, Clock, CheckCircle2,
  XCircle, Package, Trash2, Instagram, Youtube, Phone, ArrowRight,
  Plus, Eye, Edit2, TrendingUp, Calendar, FileText
} from 'lucide-react';

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: 'identified', label: 'Identified', color: 'bg-slate-500', headerColor: 'bg-slate-600', icon: Users },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-500', headerColor: 'bg-blue-600', icon: Send },
  { id: 'replied', label: 'Replied', color: 'bg-purple-500', headerColor: 'bg-purple-600', icon: MessageSquare },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-amber-500', headerColor: 'bg-amber-600', icon: DollarSign },
  { id: 'agreed', label: 'Agreed', color: 'bg-green-500', headerColor: 'bg-green-600', icon: CheckCircle2 },
  { id: 'delivering', label: 'Delivering', color: 'bg-cyan-500', headerColor: 'bg-cyan-600', icon: Package },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-500', headerColor: 'bg-emerald-600', icon: CheckCircle2 },
  { id: 'lost', label: 'Lost', color: 'bg-red-500', headerColor: 'bg-red-600', icon: XCircle },
];

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Pipeline Card Component
const PipelineCard = ({ contact, onStageChange, onViewDetails, onSendMessage, isSelected, onToggleSelect }) => {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const stage = PIPELINE_STAGES.find(s => s.id === contact.pipeline_stage) || PIPELINE_STAGES[0];
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('contactId', contact.id);
    e.dataTransfer.setData('currentStage', contact.pipeline_stage);
  };

  const communications = contact.communications || [];
  const deal = contact.deal || {};
  const hasNegotiationData = ['negotiating', 'agreed', 'delivering', 'completed'].includes(contact.pipeline_stage);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      data-testid={`pipeline-card-${contact.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(contact.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <div 
            className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
            onClick={() => onViewDetails(contact)}
          >
            {contact.name?.charAt(0) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 text-sm truncate cursor-pointer hover:text-amber-600" onClick={() => onViewDetails(contact)}>
              {contact.name}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {contact.instagram_handle && (
                <span className="flex items-center gap-0.5">
                  <Instagram className="w-3 h-3 text-pink-500" />
                  {formatNumber(contact.followers)}
                </span>
              )}
              {contact.youtube_handle && (
                <span className="flex items-center gap-0.5">
                  <Youtube className="w-3 h-3 text-red-500" />
                  {formatNumber(contact.youtube_subscribers)}
                </span>
              )}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(contact)}>
              <Eye className="w-4 h-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSendMessage(contact)}>
              <Mail className="w-4 h-4 mr-2" /> Send Message
            </DropdownMenuItem>
            {contact.pipeline_stage !== 'agreed' && (
              <DropdownMenuItem onClick={() => onStageChange(contact.id, 'agreed')} className="text-green-600">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Agreed
              </DropdownMenuItem>
            )}
            {contact.pipeline_stage !== 'lost' && (
              <DropdownMenuItem onClick={() => onStageChange(contact.id, 'lost')} className="text-red-600">
                <XCircle className="w-4 h-4 mr-2" /> Mark Lost
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Deal Info (for negotiating+ stages) */}
      {hasNegotiationData && deal.initial_quote && (
        <div className="bg-amber-50 rounded px-2 py-1.5 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Quote</span>
            <span className="font-semibold text-amber-700">{formatCurrency(deal.initial_quote)}</span>
          </div>
          {deal.final_amount && (
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-gray-600">Final</span>
              <span className="font-semibold text-green-700">{formatCurrency(deal.final_amount)}</span>
            </div>
          )}
        </div>
      )}

      {/* Deliverables */}
      {deal.deliverables && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-1">
          <Package className="w-3 h-3 inline mr-1" />
          {deal.deliverables}
        </p>
      )}

      {/* Campaign Badge */}
      {contact.campaign_name && (
        <Badge variant="outline" className="text-xs mb-2">
          {contact.campaign_name}
        </Badge>
      )}

      {/* Communication Timeline (Collapsible) */}
      {communications.length > 0 && (
        <Collapsible open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 w-full">
            {isTimelineOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <MessageSquare className="w-3 h-3" />
            {communications.length} message{communications.length > 1 ? 's' : ''}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {communications.slice(0, 5).map((comm, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs bg-gray-50 rounded p-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${comm.status === 'replied' ? 'bg-green-500' : comm.status === 'opened' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-600 truncate">{comm.subject || comm.message?.substring(0, 50)}</p>
                    <p className="text-gray-400">{formatDate(comm.sent_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Last Activity */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
        <span>{formatDate(contact.updated_at || contact.created_at)}</span>
        {contact.engagement_rate > 0 && (
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {contact.engagement_rate.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};

// Pipeline Column Component
const PipelineColumn = ({ stage, contacts, onDrop, onStageChange, onViewDetails, onSendMessage, selectedIds, onToggleSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const StageIcon = stage.icon;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const contactId = e.dataTransfer.getData('contactId');
    const currentStage = e.dataTransfer.getData('currentStage');
    if (currentStage !== stage.id) {
      onDrop(contactId, stage.id);
    }
  };

  const totalValue = contacts.reduce((sum, c) => {
    const deal = c.deal || {};
    return sum + (deal.final_amount || deal.our_budget || deal.initial_quote || 0);
  }, 0);

  return (
    <div
      className={`flex-shrink-0 w-72 bg-gray-50 rounded-lg flex flex-col max-h-full ${isDragOver ? 'ring-2 ring-amber-400' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`pipeline-column-${stage.id}`}
    >
      {/* Column Header */}
      <div className={`${stage.headerColor} text-white px-4 py-3 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StageIcon className="w-4 h-4" />
            <h3 className="font-semibold">{stage.label}</h3>
            <Badge className="bg-white/20 text-white">{contacts.length}</Badge>
          </div>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-white/80 mt-1">{formatCurrency(totalValue)} total</p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No contacts
          </div>
        ) : (
          contacts.map(contact => (
            <PipelineCard
              key={contact.id}
              contact={contact}
              onStageChange={onStageChange}
              onViewDetails={onViewDetails}
              onSendMessage={onSendMessage}
              isSelected={selectedIds.includes(contact.id)}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Main Component
const UnifiedPipeline = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, influencer, journalist
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  
  // Form states
  const [messageForm, setMessageForm] = useState({ subject: '', message: '', comm_type: 'email' });
  const [dealForm, setDealForm] = useState({ initial_quote: '', our_budget: '', deliverables: '', notes: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all contacts
      const contactsRes = await api.get('/marketing/v2/contacts');
      const allContacts = contactsRes.data || [];

      // Fetch campaigns
      const campaignsRes = await api.get('/marketing/v2/unified-campaigns');
      setCampaigns(campaignsRes.data || []);

      // Enrich contacts with communications and deals
      const enrichedContacts = await Promise.all(
        allContacts.map(async (contact) => {
          try {
            // Fetch communications
            const commsRes = await api.get(`/marketing/v2/contacts/${contact.id}/communications`);
            const communications = commsRes.data || [];

            // Fetch deals
            const dealsRes = await api.get(`/marketing/v2/contacts/${contact.id}/deals`);
            const deals = dealsRes.data || [];
            const activeDeal = deals.find(d => !['completed', 'lost'].includes(d.status)) || deals[0];

            // Determine pipeline stage based on status and data
            let pipeline_stage = contact.pipeline_stage || contact.status || 'identified';
            
            // Auto-determine stage if not explicitly set
            if (!contact.pipeline_stage) {
              if (activeDeal && ['agreed', 'completed'].includes(activeDeal.status)) {
                pipeline_stage = activeDeal.status;
              } else if (activeDeal) {
                pipeline_stage = 'negotiating';
              } else if (communications.some(c => c.status === 'replied')) {
                pipeline_stage = 'replied';
              } else if (communications.length > 0) {
                pipeline_stage = 'contacted';
              } else {
                pipeline_stage = 'identified';
              }
            }

            // Get campaign name
            let campaign_name = null;
            if (contact.campaign_id) {
              const campaign = campaignsRes.data?.find(c => c.id === contact.campaign_id);
              campaign_name = campaign?.name;
            }

            return {
              ...contact,
              pipeline_stage,
              communications,
              deal: activeDeal || {},
              campaign_name
            };
          } catch (error) {
            return { ...contact, pipeline_stage: contact.pipeline_stage || 'identified', communications: [], deal: {} };
          }
        })
      );

      setContacts(enrichedContacts);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!contact.name?.toLowerCase().includes(query) &&
          !contact.instagram_handle?.toLowerCase().includes(query) &&
          !contact.email?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (filterType !== 'all' && contact.contact_type !== filterType) return false;
    if (filterCampaign !== 'all' && contact.campaign_id !== filterCampaign) return false;
    return true;
  });

  // Group by stage
  const contactsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = filteredContacts.filter(c => c.pipeline_stage === stage.id);
    return acc;
  }, {});

  // Handle stage change
  const handleStageChange = async (contactId, newStage) => {
    try {
      await api.put(`/marketing/v2/contacts/${contactId}`, { 
        pipeline_stage: newStage,
        status: newStage 
      });
      
      setContacts(prev => prev.map(c => 
        c.id === contactId ? { ...c, pipeline_stage: newStage } : c
      ));
      
      toast.success(`Moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`);
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  // Handle view details
  const handleViewDetails = (contact) => {
    const path = contact.contact_type === 'journalist' 
      ? `/marketing/publications/${contact.publication_id}`
      : `/marketing/influencer/${contact.id}`;
    navigate(path);
  };

  // Handle send message
  const handleSendMessage = (contact) => {
    setSelectedContact(contact);
    setMessageForm({ subject: '', message: '', comm_type: 'email' });
    setShowSendModal(true);
  };

  const submitMessage = async () => {
    if (!selectedContact || !messageForm.message) {
      toast.error('Please enter a message');
      return;
    }
    
    try {
      await api.post(`/marketing/v2/contacts/${selectedContact.id}/communications`, {
        ...messageForm,
        direction: 'outbound'
      });
      
      toast.success('Message sent!');
      setShowSendModal(false);
      
      // Move to contacted if currently identified
      if (selectedContact.pipeline_stage === 'identified') {
        handleStageChange(selectedContact.id, 'contacted');
      }
      
      fetchData();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  // Handle add deal info
  const handleAddDeal = (contact) => {
    setSelectedContact(contact);
    setDealForm({ 
      initial_quote: contact.deal?.initial_quote || '', 
      our_budget: contact.deal?.our_budget || '',
      deliverables: contact.deal?.deliverables || '',
      notes: contact.deal?.notes || ''
    });
    setShowDealModal(true);
  };

  const submitDeal = async () => {
    if (!selectedContact) return;
    
    try {
      // Create or update deal
      if (selectedContact.deal?.id) {
        await api.put(`/marketing/v2/deals/${selectedContact.deal.id}`, {
          initial_quote: parseFloat(dealForm.initial_quote) || 0,
          our_budget: parseFloat(dealForm.our_budget) || null,
          deliverables: dealForm.deliverables,
          notes: dealForm.notes
        });
      } else {
        await api.post('/marketing/v2/deals', {
          contact_id: selectedContact.id,
          campaign_id: selectedContact.campaign_id,
          initial_quote: parseFloat(dealForm.initial_quote) || 0,
          our_budget: parseFloat(dealForm.our_budget) || null,
          deliverables: dealForm.deliverables,
          notes: dealForm.notes
        });
      }
      
      toast.success('Deal info saved!');
      setShowDealModal(false);
      
      // Move to negotiating if not already past that stage
      if (['identified', 'contacted', 'replied'].includes(selectedContact.pipeline_stage)) {
        handleStageChange(selectedContact.id, 'negotiating');
      }
      
      fetchData();
    } catch (error) {
      toast.error('Failed to save deal info');
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} contacts? This cannot be undone.`)) return;
    
    try {
      await api.post('/marketing/v2/contacts/bulk-delete', { ids: selectedIds });
      toast.success(`Deleted ${selectedIds.length} contacts`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete contacts');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Stats
  const stats = {
    total: filteredContacts.length,
    contacted: contactsByStage.contacted?.length || 0,
    negotiating: contactsByStage.negotiating?.length || 0,
    agreed: contactsByStage.agreed?.length || 0,
    totalValue: filteredContacts.reduce((sum, c) => {
      const deal = c.deal || {};
      return sum + (deal.final_amount || deal.initial_quote || 0);
    }, 0)
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100" data-testid="unified-pipeline-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
            <p className="text-sm text-gray-500">Track contacts from discovery to delivery</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-3">
              <p className="text-xs text-slate-600 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-3">
              <p className="text-xs text-blue-600 uppercase tracking-wider">Contacted</p>
              <p className="text-2xl font-bold text-blue-900">{stats.contacted}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-3">
              <p className="text-xs text-amber-600 uppercase tracking-wider">Negotiating</p>
              <p className="text-2xl font-bold text-amber-900">{stats.negotiating}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-3">
              <p className="text-xs text-green-600 uppercase tracking-wider">Agreed</p>
              <p className="text-2xl font-bold text-green-900">{stats.agreed}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-3">
              <p className="text-xs text-emerald-600 uppercase tracking-wider">Pipeline Value</p>
              <p className="text-xl font-bold text-emerald-900">{formatCurrency(stats.totalValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Contact Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="influencer">Influencers</SelectItem>
              <SelectItem value="journalist">Journalists</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {PIPELINE_STAGES.map(stage => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              contacts={contactsByStage[stage.id] || []}
              onDrop={handleStageChange}
              onStageChange={handleStageChange}
              onViewDetails={handleViewDetails}
              onSendMessage={handleSendMessage}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      </div>

      {/* Send Message Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-500" />
              Send Message to {selectedContact?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Channel</Label>
              <Select value={messageForm.comm_type} onValueChange={(v) => setMessageForm({ ...messageForm, comm_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="dm">Direct Message</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Subject</Label>
              <Input
                placeholder="Message subject..."
                value={messageForm.subject}
                onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Message</Label>
              <Textarea
                placeholder="Write your message..."
                value={messageForm.message}
                onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSendModal(false)}>Cancel</Button>
              <Button onClick={submitMessage} className="bg-amber-500 hover:bg-amber-600">
                <Send className="w-4 h-4 mr-1" /> Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Deal Modal */}
      <Dialog open={showDealModal} onOpenChange={setShowDealModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Deal Info - {selectedContact?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Their Quote (₹)</Label>
                <Input
                  type="number"
                  placeholder="Initial quote"
                  value={dealForm.initial_quote}
                  onChange={(e) => setDealForm({ ...dealForm, initial_quote: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Our Budget (₹)</Label>
                <Input
                  type="number"
                  placeholder="Our budget"
                  value={dealForm.our_budget}
                  onChange={(e) => setDealForm({ ...dealForm, our_budget: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Deliverables</Label>
              <Input
                placeholder="e.g., 2 Reels + 3 Stories"
                value={dealForm.deliverables}
                onChange={(e) => setDealForm({ ...dealForm, deliverables: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={dealForm.notes}
                onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDealModal(false)}>Cancel</Button>
              <Button onClick={submitDeal} className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Save Deal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedPipeline;
