import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { 
  Send, Mail, MessageCircle, Clock, CheckCircle, XCircle, AlertTriangle,
  Reply, Eye, Calendar, Bell, Filter, Search, RefreshCw, Plus, ArrowRight,
  MoreVertical, Timer, User, TrendingUp, Zap, ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const STATUS_CONFIG = {
  sent: { label: 'Sent', color: 'bg-gray-100 text-gray-700', icon: Send },
  opened: { label: 'Opened', color: 'bg-blue-100 text-blue-700', icon: Eye },
  replied: { label: 'Replied', color: 'bg-green-100 text-green-700', icon: Reply },
  follow_up_needed: { label: 'Follow-up Needed', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  no_response: { label: 'No Response', color: 'bg-red-100 text-red-700', icon: XCircle },
  converted: { label: 'Converted', color: 'bg-purple-100 text-purple-700', icon: CheckCircle }
};

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'bg-red-500' },
  medium: { label: 'Medium', color: 'bg-amber-500' },
  low: { label: 'Low', color: 'bg-gray-400' }
};

export const OutreachDashboard = () => {
  const navigate = useNavigate();
  
  const [communications, setCommunications] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  
  // Follow-up modal
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedComm, setSelectedComm] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({
    scheduled_date: '',
    note: '',
    priority: 'medium'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all communications across all contacts
      const contactsRes = await api.get('/marketing/v2/contacts?contact_type=influencer');
      const allContacts = contactsRes.data || [];
      setContacts(allContacts);
      
      // Fetch communications for each contact
      const allComms = [];
      for (const contact of allContacts.slice(0, 50)) { // Limit to 50 contacts
        try {
          const commsRes = await api.get(`/marketing/v2/contacts/${contact.id}/communications`);
          const contactComms = (commsRes.data || []).map(c => ({
            ...c,
            contact_name: contact.name,
            contact_id: contact.id,
            contact_email: contact.email,
            contact_platform: contact.platform
          }));
          allComms.push(...contactComms);
        } catch (err) {
          // No communications for this contact
        }
      }
      
      // Sort by date descending
      allComms.sort((a, b) => new Date(b.sent_at || b.created_at) - new Date(a.sent_at || a.created_at));
      setCommunications(allComms);
    } catch (error) {
      console.error('Failed to fetch communications:', error);
      toast.error('Failed to load outreach data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate stats
  const stats = {
    total: communications.length,
    sent: communications.filter(c => c.status === 'sent').length,
    opened: communications.filter(c => c.status === 'opened').length,
    replied: communications.filter(c => c.status === 'replied').length,
    needsFollowUp: communications.filter(c => {
      const daysSinceSent = (Date.now() - new Date(c.sent_at || c.created_at)) / (1000 * 60 * 60 * 24);
      return c.status !== 'replied' && daysSinceSent > 3;
    }).length,
    responseRate: communications.length > 0 
      ? ((communications.filter(c => c.status === 'replied').length / communications.length) * 100).toFixed(1)
      : 0
  };

  // Filter communications
  const filteredComms = communications.filter(comm => {
    // Tab filter
    if (activeTab === 'needs_followup') {
      const daysSinceSent = (Date.now() - new Date(comm.sent_at || comm.created_at)) / (1000 * 60 * 60 * 24);
      if (comm.status === 'replied' || daysSinceSent <= 3) return false;
    } else if (activeTab === 'replied') {
      if (comm.status !== 'replied') return false;
    } else if (activeTab === 'pending') {
      if (comm.status === 'replied') return false;
    }
    
    // Status filter
    if (filterStatus !== 'all' && comm.status !== filterStatus) return false;
    
    // Channel filter
    if (filterChannel !== 'all' && comm.comm_type !== filterChannel) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        comm.contact_name?.toLowerCase().includes(query) ||
        comm.subject?.toLowerCase().includes(query) ||
        comm.message?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleUpdateStatus = async (commId, contactId, newStatus) => {
    try {
      await api.put(`/marketing/v2/contacts/${contactId}/communications/${commId}`, {
        status: newStatus
      });
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!followUpForm.scheduled_date) {
      toast.error('Please select a follow-up date');
      return;
    }
    
    try {
      await api.post(`/marketing/v2/contacts/${selectedComm.contact_id}/follow-ups`, {
        communication_id: selectedComm.id,
        scheduled_date: followUpForm.scheduled_date,
        note: followUpForm.note,
        priority: followUpForm.priority
      });
      toast.success('Follow-up scheduled');
      setShowFollowUpModal(false);
      setFollowUpForm({ scheduled_date: '', note: '', priority: 'medium' });
      fetchData();
    } catch (error) {
      toast.error('Failed to schedule follow-up');
    }
  };

  const getDaysSinceSent = (date) => {
    return Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (comm) => {
    const daysSince = getDaysSinceSent(comm.sent_at || comm.created_at);
    let status = comm.status || 'sent';
    
    // Auto-determine if follow-up needed
    if (status !== 'replied' && daysSince > 3) {
      status = 'follow_up_needed';
    }
    
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-xs`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen" data-testid="outreach-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track responses and manage follow-ups</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => navigate('/marketing/outreach')}
            data-testid="new-outreach-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Outreach
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Sent</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.opened}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Opened</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Replied</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Reply className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.needsFollowUp}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Needs Follow-up</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.responseRate}%</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Response Rate</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs uppercase tracking-wide opacity-80">Active Contacts</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, subject, or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="w-[140px]" data-testid="filter-channel">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="all" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
            All ({communications.length})
          </TabsTrigger>
          <TabsTrigger value="needs_followup" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Needs Follow-up ({stats.needsFollowUp})
          </TabsTrigger>
          <TabsTrigger value="replied" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
            <Reply className="w-4 h-4 mr-1" />
            Replied ({stats.replied})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <Clock className="w-4 h-4 mr-1" />
            Awaiting Response
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : filteredComms.length === 0 ? (
                <div className="text-center py-12">
                  <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Outreach Found</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {activeTab === 'needs_followup' 
                      ? 'No contacts need follow-up right now'
                      : 'Start reaching out to contacts'}
                  </p>
                  <Button 
                    onClick={() => navigate('/marketing/outreach')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Outreach
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredComms.map((comm, idx) => {
                    const daysSince = getDaysSinceSent(comm.sent_at || comm.created_at);
                    const needsFollowUp = comm.status !== 'replied' && daysSince > 3;
                    
                    return (
                      <div 
                        key={comm.id || idx}
                        className={`p-4 hover:bg-gray-50 transition-colors ${needsFollowUp ? 'bg-amber-50/50' : ''}`}
                        data-testid={`outreach-item-${idx}`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Channel Icon */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            comm.comm_type === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            {comm.comm_type === 'whatsapp' ? (
                              <MessageCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Mail className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className="font-medium text-gray-900 hover:text-purple-600 cursor-pointer"
                                onClick={() => navigate(`/marketing/influencers/${comm.contact_id}`)}
                              >
                                {comm.contact_name || 'Unknown'}
                              </span>
                              {getStatusBadge(comm)}
                              {needsFollowUp && (
                                <Badge className="bg-amber-500 text-white text-xs">
                                  <Timer className="w-3 h-3 mr-1" />
                                  {daysSince}d ago
                                </Badge>
                              )}
                            </div>
                            
                            {comm.subject && (
                              <p className="text-sm text-gray-700 font-medium truncate">{comm.subject}</p>
                            )}
                            
                            <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                              {comm.message?.substring(0, 100)}...
                            </p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {comm.sent_at 
                                  ? new Date(comm.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                  : 'N/A'
                                }
                              </span>
                              {comm.contact_email && (
                                <span className="truncate">{comm.contact_email}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {needsFollowUp && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                onClick={() => {
                                  setSelectedComm(comm);
                                  setShowFollowUpModal(true);
                                }}
                                data-testid={`schedule-followup-${idx}`}
                              >
                                <Calendar className="w-4 h-4 mr-1" />
                                Schedule Follow-up
                              </Button>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleUpdateStatus(comm.id, comm.contact_id, 'opened')}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Mark as Opened
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(comm.id, comm.contact_id, 'replied')}>
                                  <Reply className="w-4 h-4 mr-2" />
                                  Mark as Replied
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/marketing/influencers/${comm.contact_id}`)}>
                                  <User className="w-4 h-4 mr-2" />
                                  View Contact
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Follow-up Modal */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Schedule Follow-up
            </DialogTitle>
          </DialogHeader>
          
          {selectedComm && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedComm.contact_name}</p>
                <p className="text-sm text-gray-500 truncate">{selectedComm.subject}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Follow-up Date *</Label>
                <Input
                  type="datetime-local"
                  value={followUpForm.scheduled_date}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, scheduled_date: e.target.value })}
                  data-testid="followup-date"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={followUpForm.priority} 
                  onValueChange={(v) => setFollowUpForm({ ...followUpForm, priority: v })}
                >
                  <SelectTrigger data-testid="followup-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Textarea
                  placeholder="Add a note for this follow-up..."
                  value={followUpForm.note}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, note: e.target.value })}
                  rows={3}
                  data-testid="followup-note"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowFollowUpModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleScheduleFollowUp}
                  data-testid="confirm-followup-btn"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutreachDashboard;
