import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, Loader2, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown,
  X, Eye, Send, DollarSign, Star, CheckCircle, Clock, Scale, Package,
  ArrowRight, ArrowUpRight, Sparkles, ClipboardList, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production'];

const WorkRequests = () => {
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [proposalsData, setProposalsData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: '', department: '', approval_status: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [activeTab, setActiveTab] = useState('details');
  const [converting, setConverting] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', department: '', expected_completion_date: '' });
  const [proposalForm, setProposalForm] = useState({ vendor_id: '', amount: '', currency: 'INR', delivery_days: '', notes: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, vendorsRes, usersRes] = await Promise.all([
        api.get('/vendors/requirements'),
        api.get('/vendors'),
        api.get('/admin/users')
      ]);
      setRequests(requestsRes.data.requirements || []);
      setVendors(vendorsRes.data.vendors || []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || []);
    } catch (error) {
      toast.error('Failed to load work requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    try {
      if (!formData.title || !formData.description || !formData.department) {
        toast.error('Please fill in all required fields');
        return;
      }
      await api.post('/vendors/requirements', formData);
      toast.success('Work request created');
      setShowCreateDialog(false);
      setFormData({ title: '', description: '', department: '', expected_completion_date: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create work request');
    }
  };

  const openViewDialog = async (request) => {
    try {
      const res = await api.get(`/vendors/requirements/${request.id}`);
      setSelectedRequest(res.data);
      setShowViewDialog(true);
      setActiveTab('details');
      if (res.data.proposals?.length > 0) fetchProposals(request.id);
      else setProposalsData(null);
    } catch (error) {
      toast.error('Failed to load request details');
    }
  };

  const fetchProposals = async (requirementId) => {
    try {
      const res = await api.get(`/vendors/requirements/${requirementId}/proposals`);
      setProposalsData(res.data);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    }
  };

  const handleAddProposal = async () => {
    try {
      if (!proposalForm.vendor_id || !proposalForm.amount) {
        toast.error('Please select a vendor and enter an amount');
        return;
      }
      await api.post(`/vendors/requirements/${selectedRequest.id}/proposals`, {
        requirement_id: selectedRequest.id,
        vendor_id: proposalForm.vendor_id,
        amount: parseFloat(proposalForm.amount),
        currency: proposalForm.currency,
        delivery_days: proposalForm.delivery_days ? parseInt(proposalForm.delivery_days) : null,
        notes: proposalForm.notes
      });
      toast.success('Proposal added');
      setShowProposalDialog(false);
      setProposalForm({ vendor_id: '', amount: '', currency: 'INR', delivery_days: '', notes: '' });
      fetchProposals(selectedRequest.id);
      fetchData();
    } catch (error) {
      toast.error('Failed to add proposal');
    }
  };

  const handleSelectProposal = async (proposalId) => {
    try {
      await api.post(`/vendors/requirements/${selectedRequest.id}/proposals/${proposalId}/select`);
      toast.success('Vendor selected');
      fetchProposals(selectedRequest.id);
      const res = await api.get(`/vendors/requirements/${selectedRequest.id}`);
      setSelectedRequest(res.data);
      fetchData();
    } catch (error) {
      toast.error('Failed to select proposal');
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      await api.post(`/vendors/requirements/${selectedRequest.id}/submit-for-approval`);
      toast.success('Submitted for approval');
      const res = await api.get(`/vendors/requirements/${selectedRequest.id}`);
      setSelectedRequest(res.data);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit for approval');
    }
  };

  const handleConvertToWorkOrder = async () => {
    try {
      setConverting(true);
      await api.post(`/vendors/requirements/${selectedRequest.id}/convert-to-order`);
      toast.success('Work request converted to work order!', {
        action: { label: 'View Order', onClick: () => navigate('/vendors/work-orders') }
      });
      setShowViewDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to convert to work order');
    } finally {
      setConverting(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredAndSortedRequests = useMemo(() => {
    let result = [...requests];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.title?.toLowerCase().includes(q) || r.requirement_id?.toLowerCase().includes(q) || r.department?.toLowerCase().includes(q));
    }
    if (filters.status) result = result.filter(r => r.status === filters.status);
    if (filters.department) result = result.filter(r => r.department === filters.department);
    if (filters.approval_status) result = result.filter(r => r.approval_status === filters.approval_status);
    result.sort((a, b) => {
      let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') aVal = aVal?.toLowerCase() || '';
      if (typeof bVal === 'string') bVal = bVal?.toLowerCase() || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [requests, searchQuery, filters, sortConfig]);

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700', proposal_requested: 'bg-indigo-100 text-indigo-700',
      proposals_received: 'bg-purple-100 text-purple-700', vendor_selected: 'bg-teal-100 text-teal-700',
      work_in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getApprovalBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700', revision_requested: 'bg-orange-100 text-orange-700'
    };
    return status ? <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge> : '-';
  };

  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '-';
  const formatCurrency = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

  const SortHeader = ({ column, label }) => (
    <TableHead className="cursor-pointer hover:bg-[#F5EDE5] select-none" onClick={() => handleSort(column)}>
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === column ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
      </div>
    </TableHead>
  );

  const clearFilters = () => { setFilters({ status: '', department: '', approval_status: '' }); setSearchQuery(''); };
  const hasActiveFilters = filters.status || filters.department || filters.approval_status || searchQuery;
  const canConvertToOrder = selectedRequest && selectedRequest.approval_status === 'approved' && selectedRequest.selected_vendor_id && !selectedRequest.work_order_id;

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="work-requests">
      <Button variant="ghost" onClick={() => navigate('/vendors')} className="text-[#8B7355] hover:text-[#4A3728]">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Work Requests</h1>
          <p className="text-[#8B7355]">{filteredAndSortedRequests.length} of {requests.length} requests</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      {/* Workflow Banner */}
      <Card className="bg-gradient-to-r from-[#4A3728] to-[#5D4A3A] text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><ClipboardList className="w-4 h-4" /></div><span>Create Request</span></div>
            <ArrowRight className="w-4 h-4 text-white/60" />
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Scale className="w-4 h-4" /></div><span>Add Proposals</span></div>
            <ArrowRight className="w-4 h-4 text-white/60" />
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><CheckCircle className="w-4 h-4" /></div><span>Select & Approve</span></div>
            <ArrowRight className="w-4 h-4 text-white/60" />
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Package className="w-4 h-4" /></div><span>Convert to Order</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input placeholder="Search requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white border-[#D4BBA6]" />
            </div>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters(f => ({...f, status: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[150px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="proposal_requested">Proposal Requested</SelectItem>
                <SelectItem value="proposals_received">Proposals Received</SelectItem>
                <SelectItem value="vendor_selected">Vendor Selected</SelectItem>
                <SelectItem value="work_in_progress">Work In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.department || "all"} onValueChange={(v) => setFilters(f => ({...f, department: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.approval_status || "all"} onValueChange={(v) => setFilters(f => ({...f, approval_status: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Approval" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Approvals</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[#8B7355]"><X className="w-4 h-4 mr-1" /> Clear</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" /></div>
          ) : filteredAndSortedRequests.length === 0 ? (
            <div className="text-center py-12 text-[#8B7355]"><FileText className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" /><p>No work requests found</p></div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F5EDE5]">
                <TableRow>
                  <SortHeader column="requirement_id" label="ID" />
                  <SortHeader column="title" label="Title" />
                  <SortHeader column="department" label="Department" />
                  <SortHeader column="status" label="Status" />
                  <TableHead>Approval</TableHead>
                  <TableHead>Proposals</TableHead>
                  <TableHead>Vendor</TableHead>
                  <SortHeader column="created_at" label="Created" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRequests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-[#FDF8F3] cursor-pointer" onClick={() => openViewDialog(req)}>
                    <TableCell className="font-mono text-xs text-[#8B7355]">{req.requirement_id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-[#4A3728]">{req.title}</div>
                      <div className="text-xs text-[#8B7355] truncate max-w-[200px]">{req.description}</div>
                    </TableCell>
                    <TableCell className="text-[#8B7355]">{req.department}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell>{getApprovalBadge(req.approval_status)}</TableCell>
                    <TableCell>
                      {req.proposals?.length > 0 ? (
                        <Badge variant="outline" className="border-purple-300 text-purple-600">{req.proposals.length}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-[#8B7355] text-sm">{req.selected_vendor_name || '-'}</TableCell>
                    <TableCell className="text-xs text-[#8B7355]">{formatDate(req.created_at)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => openViewDialog(req)}><Eye className="w-4 h-4 text-[#8B7355]" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader><DialogTitle className="text-[#4A3728] flex items-center gap-2"><ClipboardList className="w-5 h-5" />New Work Request</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-[#8B7355] bg-[#F5EDE5] p-3 rounded-lg">Create a work request first. Then add proposals from different vendors to compare.</p>
            <div><label className="text-sm font-medium text-[#4A3728]">Title *</label><Input value={formData.title} onChange={(e) => setFormData(f => ({...f, title: e.target.value}))} className="bg-white border-[#D4BBA6] mt-1" placeholder="e.g., Packaging materials for Q1" /></div>
            <div><label className="text-sm font-medium text-[#4A3728]">Department *</label>
              <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6] mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent><SelectItem value="placeholder" disabled>Select department</SelectItem>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium text-[#4A3728]">Expected Completion Date</label><Input type="date" value={formData.expected_completion_date} onChange={(e) => setFormData(f => ({...f, expected_completion_date: e.target.value}))} className="bg-white border-[#D4BBA6] mt-1" /></div>
            <div><label className="text-sm font-medium text-[#4A3728]">Description *</label><Textarea value={formData.description} onChange={(e) => setFormData(f => ({...f, description: e.target.value}))} className="bg-white border-[#D4BBA6] mt-1" placeholder="Describe the work requirement in detail..." rows={4} /></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleCreateRequest} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Create Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {selectedRequest && (
            <>
              <div className="bg-gradient-to-r from-[#4A3728] to-[#5D4A3A] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded">{selectedRequest.requirement_id}</span>
                      {selectedRequest.work_order_id && <Badge className="bg-emerald-500 text-white border-0"><Package className="w-3 h-3 mr-1" /> Converted</Badge>}
                    </div>
                    <h2 className="text-xl font-bold mb-1">{selectedRequest.title}</h2>
                    <p className="text-white/70 text-sm">{selectedRequest.department} - Requested by {selectedRequest.requested_by_name}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">{getStatusBadge(selectedRequest.status)}{selectedRequest.approval_status && getApprovalBadge(selectedRequest.approval_status)}</div>
                </div>
              </div>

              {canConvertToOrder && (
                <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><Sparkles className="w-5 h-5 text-emerald-600" /></div>
                      <div><p className="font-semibold text-emerald-800">Ready to Convert!</p><p className="text-sm text-emerald-600">This request is approved. Convert it to a work order.</p></div>
                    </div>
                    <Button onClick={handleConvertToWorkOrder} disabled={converting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {converting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}Convert to Work Order
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-[#F5EDE5] p-1 rounded-lg">
                    <TabsTrigger value="details" className="data-[state=active]:bg-white">Details</TabsTrigger>
                    <TabsTrigger value="proposals" className="data-[state=active]:bg-white">Proposals {proposalsData?.proposal_count > 0 && `(${proposalsData.proposal_count})`}</TabsTrigger>
                    <TabsTrigger value="approval" className="data-[state=active]:bg-white">Approval</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-6">
                    <div className="space-y-6">
                      <div><h4 className="text-sm font-medium text-[#8B7355] mb-2">Description</h4><p className="text-[#4A3728] bg-[#F5EDE5] p-4 rounded-lg">{selectedRequest.description}</p></div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#F5EDE5] p-4 rounded-lg"><p className="text-xs text-[#8B7355] mb-1">Department</p><p className="font-semibold text-[#4A3728]">{selectedRequest.department}</p></div>
                        <div className="bg-[#F5EDE5] p-4 rounded-lg"><p className="text-xs text-[#8B7355] mb-1">Requested By</p><p className="font-semibold text-[#4A3728]">{selectedRequest.requested_by_name}</p></div>
                        {selectedRequest.assigned_owner_name && <div className="bg-[#F5EDE5] p-4 rounded-lg"><p className="text-xs text-[#8B7355] mb-1">Assigned To</p><p className="font-semibold text-[#4A3728]">{selectedRequest.assigned_owner_name}</p></div>}
                        {selectedRequest.expected_completion_date && <div className="bg-[#F5EDE5] p-4 rounded-lg"><p className="text-xs text-[#8B7355] mb-1">Expected Completion</p><p className="font-semibold text-[#4A3728]">{formatDate(selectedRequest.expected_completion_date)}</p></div>}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="proposals" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-[#4A3728]">Vendor Proposals</h4>
                        {['draft', 'proposal_requested', 'proposals_received'].includes(selectedRequest.status) && (
                          <Button size="sm" onClick={() => setShowProposalDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"><Plus className="w-4 h-4 mr-1" /> Add Proposal</Button>
                        )}
                      </div>
                      {proposalsData?.proposals?.length > 0 ? (
                        <>
                          <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-[#F5EDE5] to-[#FDF8F3] rounded-xl border border-[#E8D5C4]">
                            <div className="text-center"><p className="text-xs text-[#8B7355] mb-1">Total Proposals</p><p className="text-2xl font-bold text-[#4A3728]">{proposalsData.proposal_count}</p></div>
                            <div className="text-center border-l border-r border-[#E8D5C4]"><p className="text-xs text-[#8B7355] mb-1">Lowest Bid</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(proposalsData.lowest_amount)}</p></div>
                            <div className="text-center"><p className="text-xs text-[#8B7355] mb-1">Highest Bid</p><p className="text-2xl font-bold text-red-500">{formatCurrency(proposalsData.highest_amount)}</p></div>
                          </div>
                          <div className="space-y-3">
                            {proposalsData.proposals.map((p, idx) => (
                              <div key={p.id} className={`p-4 rounded-xl border-2 transition-all ${p.status === 'selected' ? 'bg-emerald-50 border-emerald-300' : p.status === 'rejected' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-[#E8D5C4] hover:border-[#D4BBA6]'}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${p.status === 'selected' ? 'bg-emerald-200 text-emerald-700' : 'bg-[#F5EDE5] text-[#4A3728]'}`}>{p.vendor_name?.charAt(0)}</div>
                                    <div>
                                      <div className="flex items-center gap-2"><p className="font-semibold text-[#4A3728]">{p.vendor_name}</p>{idx === 0 && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Lowest</Badge>}{p.status === 'selected' && <Badge className="bg-emerald-500 text-white text-xs">Selected</Badge>}</div>
                                      {p.notes && <p className="text-xs text-[#8B7355] mt-1">{p.notes}</p>}
                                      <div className="flex items-center gap-4 mt-2 text-xs text-[#8B7355]">{p.delivery_days && <span>Delivery: {p.delivery_days} days</span>}{p.vendor_rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" />{p.vendor_rating.toFixed(1)}</span>}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <p className={`text-xl font-bold ${idx === 0 ? 'text-emerald-600' : 'text-[#4A3728]'}`}>{formatCurrency(p.amount, p.currency)}</p>
                                    {p.status === 'submitted' && selectedRequest.status !== 'vendor_selected' && !selectedRequest.work_order_id && (
                                      <Button size="sm" onClick={() => handleSelectProposal(p.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle className="w-3 h-3 mr-1" /> Select</Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12 bg-[#F5EDE5] rounded-xl"><Scale className="w-16 h-16 mx-auto mb-4 text-[#D4BBA6]" /><p className="text-[#4A3728] font-medium">No proposals yet</p></div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="approval" className="mt-6">
                    <div className="space-y-6">
                      {selectedRequest.status === 'vendor_selected' && !selectedRequest.approval_id && (
                        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><Send className="w-6 h-6 text-blue-600" /></div>
                            <div className="flex-1"><p className="font-semibold text-blue-800">Ready for Approval</p><p className="text-sm text-blue-600">A vendor has been selected. Submit for approval to proceed.</p></div>
                            <Button onClick={handleSubmitForApproval} className="bg-blue-600 hover:bg-blue-700 text-white"><Send className="w-4 h-4 mr-2" /> Submit for Approval</Button>
                          </div>
                        </div>
                      )}
                      {selectedRequest.approval_status && (
                        <div className="space-y-6">
                          {selectedRequest.approval_status === 'pending' && (
                            <div className="p-5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center"><Clock className="w-6 h-6 text-amber-600" /></div>
                                <div><p className="font-semibold text-amber-800">Awaiting Approval</p><p className="text-sm text-amber-600">This request is pending approval from the approval chain.</p></div>
                              </div>
                            </div>
                          )}
                          <div className="p-6 bg-[#F5EDE5] rounded-xl">
                            <div className="flex items-center justify-between">
                              {['team_lead', 'manager', 'finance'].map((level, idx) => (
                                <React.Fragment key={level}>
                                  <div className="flex flex-col items-center flex-1">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${selectedRequest.approval_status === 'approved' ? 'bg-emerald-100 ring-2 ring-emerald-300' : selectedRequest.approval_status === 'rejected' ? 'bg-red-100 ring-2 ring-red-300' : 'bg-white ring-2 ring-[#D4BBA6]'}`}>
                                      {selectedRequest.approval_status === 'approved' ? <CheckCircle2 className="w-7 h-7 text-emerald-600" /> : selectedRequest.approval_status === 'rejected' ? <XCircle className="w-7 h-7 text-red-600" /> : <Clock className="w-7 h-7 text-[#8B7355]" />}
                                    </div>
                                    <span className="text-sm font-medium text-[#4A3728] mt-2 capitalize">{level.replace('_', ' ')}</span>
                                  </div>
                                  {idx < 2 && <div className={`h-1 flex-1 mx-2 rounded ${selectedRequest.approval_status === 'approved' ? 'bg-emerald-300' : 'bg-[#D4BBA6]'}`} />}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                          {selectedRequest.approval_status === 'approved' && !selectedRequest.work_order_id && (
                            <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                              <div className="flex items-center gap-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                <div className="flex-1"><p className="font-semibold text-emerald-800">Fully Approved!</p><p className="text-sm text-emerald-600">Convert this request to a work order to begin work.</p></div>
                                <Button onClick={handleConvertToWorkOrder} disabled={converting} className="bg-emerald-600 hover:bg-emerald-700 text-white">{converting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}Convert to Order</Button>
                              </div>
                            </div>
                          )}
                          {selectedRequest.approval_status === 'rejected' && (
                            <div className="p-5 bg-red-50 rounded-xl border border-red-200">
                              <div className="flex items-center gap-4"><XCircle className="w-8 h-8 text-red-600" /><div><p className="font-semibold text-red-800">Request Rejected</p><p className="text-sm text-red-600">Please review the feedback and resubmit if needed.</p></div></div>
                            </div>
                          )}
                          {selectedRequest.work_order_id && (
                            <div className="p-5 bg-[#F5EDE5] rounded-xl border border-[#D4BBA6]">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4"><Package className="w-8 h-8 text-[#4A3728]" /><div><p className="font-semibold text-[#4A3728]">Work Order Created</p><p className="text-sm text-[#8B7355]">This request has been converted to a work order.</p></div></div>
                                <Button variant="outline" onClick={() => { setShowViewDialog(false); navigate('/vendors/work-orders'); }} className="border-[#D4BBA6]">View Work Orders <ArrowUpRight className="w-4 h-4 ml-1" /></Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {!selectedRequest.approval_status && selectedRequest.status !== 'vendor_selected' && (
                        <div className="text-center py-12 bg-[#F5EDE5] rounded-xl"><AlertCircle className="w-16 h-16 mx-auto mb-4 text-[#D4BBA6]" /><p className="text-[#4A3728] font-medium">Approval Not Required Yet</p><p className="text-sm text-[#8B7355] mt-1">Select a vendor proposal first to initiate approval workflow</p></div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728] flex items-center gap-2"><DollarSign className="w-5 h-5" />Add Vendor Proposal</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-sm font-medium text-[#4A3728]">Vendor *</label>
              <Select value={proposalForm.vendor_id || "placeholder"} onValueChange={(v) => setProposalForm(f => ({...f, vendor_id: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6] mt-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent><SelectItem value="placeholder" disabled>Select vendor</SelectItem>{vendors.filter(v => v.status === 'active').map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.category})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#4A3728]">Amount *</label><Input type="number" value={proposalForm.amount} onChange={(e) => setProposalForm(f => ({...f, amount: e.target.value}))} className="bg-white border-[#D4BBA6] mt-1" placeholder="0.00" /></div>
              <div><label className="text-sm font-medium text-[#4A3728]">Currency</label>
                <Select value={proposalForm.currency} onValueChange={(v) => setProposalForm(f => ({...f, currency: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6] mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="INR">INR</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-sm font-medium text-[#4A3728]">Delivery Days</label><Input type="number" value={proposalForm.delivery_days} onChange={(e) => setProposalForm(f => ({...f, delivery_days: e.target.value}))} className="bg-white border-[#D4BBA6] mt-1" placeholder="e.g., 7" /></div>
            <div><label className="text-sm font-medium text-[#4A3728]">Notes</label><Textarea value={proposalForm.notes} onChange={(e) => setProposalForm(f => ({...f, notes: e.target.value}))} className="bg-white border-[#D4BBA6] mt-1" placeholder="Additional details..." rows={3} /></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowProposalDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleAddProposal} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Add Proposal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkRequests;
