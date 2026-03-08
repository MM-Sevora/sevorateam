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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { toast } from 'sonner';
import api from '../../lib/api';
import {
  Users, Search, RefreshCw, MoreHorizontal, Mail, MessageSquare,
  DollarSign, ChevronDown, ChevronRight, Send, Clock, CheckCircle2,
  XCircle, Package, Trash2, Instagram, Youtube, Phone, ArrowRight,
  Plus, Eye, Edit2, TrendingUp, Sparkles, ExternalLink, Star,
  Zap, Target, Award, Briefcase
} from 'lucide-react';

// Enhanced Pipeline stages with gradients
const PIPELINE_STAGES = [
  { 
    id: 'identified', 
    label: 'Identified', 
    icon: Users,
    gradient: 'from-slate-600 to-slate-700',
    cardAccent: 'border-l-slate-500',
    lightBg: 'bg-slate-50',
    textColor: 'text-slate-700'
  },
  { 
    id: 'contacted', 
    label: 'Contacted', 
    icon: Send,
    gradient: 'from-blue-500 to-blue-600',
    cardAccent: 'border-l-blue-500',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  { 
    id: 'replied', 
    label: 'Replied', 
    icon: MessageSquare,
    gradient: 'from-violet-500 to-purple-600',
    cardAccent: 'border-l-violet-500',
    lightBg: 'bg-violet-50',
    textColor: 'text-violet-700'
  },
  { 
    id: 'negotiating', 
    label: 'Negotiating', 
    icon: DollarSign,
    gradient: 'from-amber-500 to-orange-500',
    cardAccent: 'border-l-amber-500',
    lightBg: 'bg-amber-50',
    textColor: 'text-amber-700'
  },
  { 
    id: 'agreed', 
    label: 'Agreed', 
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-green-600',
    cardAccent: 'border-l-emerald-500',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-700'
  },
  { 
    id: 'delivering', 
    label: 'Delivering', 
    icon: Package,
    gradient: 'from-cyan-500 to-teal-500',
    cardAccent: 'border-l-cyan-500',
    lightBg: 'bg-cyan-50',
    textColor: 'text-cyan-700'
  },
  { 
    id: 'completed', 
    label: 'Completed', 
    icon: Award,
    gradient: 'from-green-600 to-emerald-600',
    cardAccent: 'border-l-green-600',
    lightBg: 'bg-green-50',
    textColor: 'text-green-700'
  },
  { 
    id: 'lost', 
    label: 'Lost', 
    icon: XCircle,
    gradient: 'from-red-500 to-rose-600',
    cardAccent: 'border-l-red-500',
    lightBg: 'bg-red-50',
    textColor: 'text-red-700'
  },
];

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Enhanced Pipeline Card Component
const PipelineCard = ({ contact, stage, onStageChange, onViewDetails, onSendMessage, isSelected, onToggleSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('contactId', contact.id);
    e.dataTransfer.setData('currentStage', contact.pipeline_stage);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
  };

  const communications = contact.communications || [];
  const deal = contact.deal || {};
  const hasNegotiationData = ['negotiating', 'agreed', 'delivering', 'completed'].includes(contact.pipeline_stage);
  const isHighValue = (deal.initial_quote || 0) >= 50000;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative bg-white rounded-xl border-l-4 ${stage.cardAccent}
        shadow-sm hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing
        ${isSelected ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
        ${isHovered ? 'transform -translate-y-0.5' : ''}
      `}
      data-testid={`pipeline-card-${contact.id}`}
    >
      {/* High Value Indicator */}
      {isHighValue && hasNegotiationData && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
          <Star className="w-3 h-3 text-white fill-white" />
        </div>
      )}

      <div className="p-3">
        {/* Header Row */}
        <div className="flex items-start gap-2 mb-2">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(contact.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          />
          
          {/* Avatar with platform indicator */}
          <div 
            className="relative cursor-pointer"
            onClick={() => onViewDetails(contact)}
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm
              bg-gradient-to-br ${stage.gradient} shadow-md
            `}>
              {contact.name?.charAt(0).toUpperCase() || '?'}
            </div>
            {contact.instagram_handle && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow">
                <Instagram className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            {!contact.instagram_handle && contact.youtube_handle && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center shadow">
                <Youtube className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Name & Info */}
          <div className="flex-1 min-w-0">
            <p 
              className="font-semibold text-gray-900 text-sm truncate cursor-pointer hover:text-amber-600 transition-colors"
              onClick={() => onViewDetails(contact)}
              title={contact.name}
            >
              {contact.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {contact.instagram_handle && (
                <span className="flex items-center gap-0.5">
                  <span className="text-pink-500 font-medium">{formatNumber(contact.followers)}</span>
                </span>
              )}
              {contact.youtube_handle && (
                <span className="flex items-center gap-0.5">
                  <span className="text-red-500 font-medium">{formatNumber(contact.youtube_subscribers)}</span>
                </span>
              )}
              {contact.engagement_rate > 0 && (
                <span className="flex items-center gap-0.5 text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  {contact.engagement_rate.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onViewDetails(contact)}>
                <Eye className="w-4 h-4 mr-2" /> View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSendMessage(contact)}>
                <Mail className="w-4 h-4 mr-2" /> Send Message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onStageChange(contact.id, 'agreed')}
                className="text-emerald-600"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Agreed
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onStageChange(contact.id, 'lost')}
                className="text-red-600"
              >
                <XCircle className="w-4 h-4 mr-2" /> Mark Lost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Deal Info Card */}
        {hasNegotiationData && (deal.initial_quote || deal.deliverables) && (
          <div className={`${stage.lightBg} rounded-lg p-2 mb-2`}>
            {deal.initial_quote && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Deal Value</span>
                <span className={`text-sm font-bold ${stage.textColor}`}>
                  {formatCurrency(deal.final_amount || deal.initial_quote)}
                </span>
              </div>
            )}
            {deal.deliverables && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                {deal.deliverables}
              </p>
            )}
          </div>
        )}

        {/* Campaign Badge */}
        {contact.campaign_name && (
          <div className="mb-2">
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-0">
              <Target className="w-3 h-3 mr-1" />
              {contact.campaign_name}
            </Badge>
          </div>
        )}

        {/* Communication Summary */}
        {communications.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 w-full py-1 rounded hover:bg-gray-50 transition-colors">
              <MessageSquare className="w-3 h-3" />
              <span>{communications.length} message{communications.length > 1 ? 's' : ''}</span>
              <ChevronDown className="w-3 h-3 ml-auto transition-transform ui-open:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto">
                {communications.slice(0, 3).map((comm, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs p-1.5 bg-gray-50 rounded-lg">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      comm.status === 'replied' ? 'bg-emerald-500' : 
                      comm.status === 'opened' ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <span className="text-gray-600 truncate flex-1">
                      {comm.subject || comm.message?.substring(0, 40) + '...'}
                    </span>
                    <span className="text-gray-400 flex-shrink-0">{formatDate(comm.sent_at)}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {formatDate(contact.updated_at || contact.created_at)}
          </span>
          <div className="flex items-center gap-1">
            {contact.contact_type === 'journalist' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">PR</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Pipeline Column Component
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
      className={`
        flex-shrink-0 w-80 rounded-xl flex flex-col max-h-full
        bg-gradient-to-b from-gray-50 to-gray-100/50
        ${isDragOver ? 'ring-2 ring-amber-400 ring-inset bg-amber-50/30' : ''}
        transition-all duration-200
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`pipeline-column-${stage.id}`}
    >
      {/* Column Header */}
      <div className={`bg-gradient-to-r ${stage.gradient} text-white px-4 py-3 rounded-t-xl shadow-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <StageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{stage.label}</h3>
              {totalValue > 0 && (
                <p className="text-[10px] text-white/70">{formatCurrency(totalValue)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-white/20 text-white border-0 text-xs px-2">
              {contacts.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${stage.gradient} opacity-20 flex items-center justify-center mb-3`}>
              <StageIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">No contacts</p>
            <p className="text-xs">Drag cards here</p>
          </div>
        ) : (
          contacts.map(contact => (
            <PipelineCard
              key={contact.id}
              contact={contact}
              stage={stage}
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
  const [filterType, setFilterType] = useState('all');
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
      const contactsRes = await api.get('/marketing/v2/contacts');
      const allContacts = contactsRes.data || [];

      const campaignsRes = await api.get('/marketing/v2/unified-campaigns');
      setCampaigns(campaignsRes.data || []);

      const enrichedContacts = await Promise.all(
        allContacts.map(async (contact) => {
          try {
            const commsRes = await api.get(`/marketing/v2/contacts/${contact.id}/communications`);
            const communications = commsRes.data || [];

            const dealsRes = await api.get(`/marketing/v2/contacts/${contact.id}/deals`);
            const deals = dealsRes.data || [];
            const activeDeal = deals.find(d => !['completed', 'lost'].includes(d.status)) || deals[0];

            let pipeline_stage = contact.pipeline_stage || contact.status || 'identified';
            
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
      
      const stageName = PIPELINE_STAGES.find(s => s.id === newStage)?.label;
      toast.success(`Moved to ${stageName}`);
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  const handleViewDetails = (contact) => {
    const path = contact.contact_type === 'journalist' 
      ? `/marketing/publications/${contact.publication_id}`
      : `/marketing/influencer/${contact.id}`;
    navigate(path);
  };

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
      
      if (selectedContact.pipeline_stage === 'identified') {
        handleStageChange(selectedContact.id, 'contacted');
      }
      
      fetchData();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

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
    inProgress: (contactsByStage.contacted?.length || 0) + (contactsByStage.replied?.length || 0) + (contactsByStage.negotiating?.length || 0),
    agreed: contactsByStage.agreed?.length || 0,
    completed: contactsByStage.completed?.length || 0,
    totalValue: filteredContacts.reduce((sum, c) => {
      const deal = c.deal || {};
      return sum + (deal.final_amount || deal.initial_quote || 0);
    }, 0),
    conversionRate: filteredContacts.length > 0 
      ? (((contactsByStage.agreed?.length || 0) + (contactsByStage.completed?.length || 0)) / filteredContacts.length * 100).toFixed(0)
      : 0
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" data-testid="unified-pipeline-page">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
                <p className="text-sm text-gray-500">Track contacts from discovery to delivery</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="shadow-sm">
                <Trash2 className="w-4 h-4 mr-1" /> Delete ({selectedIds.length})
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData} 
              disabled={loading}
              className="shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-6 gap-3 mb-4">
          <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total</p>
                  <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-500 uppercase tracking-wider font-medium">In Progress</p>
                  <p className="text-xl font-bold text-blue-900">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-medium">Agreed</p>
                  <p className="text-xl font-bold text-emerald-900">{stats.agreed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-white border-green-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Award className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] text-green-500 uppercase tracking-wider font-medium">Completed</p>
                  <p className="text-xl font-bold text-green-900">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-500 uppercase tracking-wider font-medium">Pipeline Value</p>
                  <p className="text-lg font-bold text-amber-900">{formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-[10px] text-violet-500 uppercase tracking-wider font-medium">Conversion</p>
                  <p className="text-xl font-bold text-violet-900">{stats.conversionRate}%</p>
                </div>
              </div>
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
              className="pl-10 bg-white shadow-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-white shadow-sm">
              <SelectValue placeholder="Contact Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="influencer">Influencers</SelectItem>
              <SelectItem value="journalist">Journalists</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger className="w-48 bg-white shadow-sm">
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
        <div className="flex gap-4 h-full min-w-max pb-4">
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
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              Send Message to {selectedContact?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Channel</Label>
              <Select value={messageForm.comm_type} onValueChange={(v) => setMessageForm({ ...messageForm, comm_type: v })}>
                <SelectTrigger className="mt-1">
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
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Message</Label>
              <Textarea
                placeholder="Write your message..."
                value={messageForm.message}
                onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                rows={5}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowSendModal(false)}>Cancel</Button>
              <Button onClick={submitMessage} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md">
                <Send className="w-4 h-4 mr-1" /> Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedPipeline;
