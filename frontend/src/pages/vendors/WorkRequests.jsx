import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import {
  FileText, Plus, Clock, CheckCircle, Building2, Calendar, User, Eye, 
  Loader2, Send, DollarSign, Star, ThumbsUp, ThumbsDown, MessageSquare,
  ArrowRight, X, CheckCircle2, XCircle, AlertCircle, Scale
} from 'lucide-react';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production'];

const WorkRequests = () => {
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
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    expected_completion_date: ''
  });
  const [proposalForm, setProposalForm] = useState({
    vendor_id: '',
    amount: '',
    currency: 'INR',
    delivery_days: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, vendorsRes, usersRes] = await Promise.all([
        api.get('/vendors/requirements', { params: filter ? { status: filter } : {} }),
        api.get('/vendors'),
        api.get('/admin/users')
      ]);
      setRequests(requestsRes.data.requirements || []);
      setVendors(vendorsRes.data.vendors || []);
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
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
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create work request');
    }
  };

  const handleAssignOwner = async (requestId, ownerId) => {
    try {
      await api.post(`/vendors/requirements/${requestId}/assign-owner?owner_id=${ownerId}`);
      toast.success('Owner assigned');
      fetchData();
    } catch (error) {
      toast.error('Failed to assign owner');
    }
  };

  const handleUpdateStatus = async (requestId, status) => {
    try {
      await api.put(`/vendors/requirements/${requestId}`, { status });
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openViewDialog = async (request) => {
    try {
      const res = await api.get(`/vendors/requirements/${request.id}`);
      setSelectedRequest(res.data);
      setShowViewDialog(true);
      setActiveTab('details');
      // Fetch proposals if any
      if (res.data.proposals?.length > 0) {
        fetchProposals(request.id);
      }
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      department: '',
      expected_completion_date: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      proposal_requested: 'bg-indigo-100 text-indigo-700',
      proposals_received: 'bg-purple-100 text-purple-700',
      vendor_selected: 'bg-teal-100 text-teal-700',
      work_in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getApprovalStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      revision_requested: 'bg-orange-100 text-orange-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="work-requests">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Work Requests</h1>
          <p className="text-[#8B7355]">Manage vendor work requirements and proposals</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="new-request-btn">
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'draft', 'proposal_requested', 'proposals_received', 'vendor_selected', 'work_in_progress', 'completed'].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={filter === status ? 'default' : 'outline'}
                onClick={() => setFilter(status)}
                className={filter === status ? 'bg-[#4A3728] text-white' : 'border-[#D4BBA6]'}
                data-testid={`filter-${status || 'all'}`}
              >
                {status?.replace(/_/g, ' ') || 'All'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-[#D4BBA6] mb-4" />
            <p className="text-[#8B7355]">No work requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id} className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow" data-testid={`request-card-${req.requirement_id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm text-[#8B7355]">{req.requirement_id}</span>
                      {getStatusBadge(req.status)}
                      {req.proposals?.length > 0 && (
                        <Badge variant="outline" className="border-purple-300 text-purple-600">
                          {req.proposals.length} proposal{req.proposals.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {req.approval_status && getApprovalStatusBadge(req.approval_status)}
                    </div>
                    <h3 className="font-semibold text-[#4A3728] mb-1">{req.title}</h3>
                    <p className="text-sm text-[#8B7355] line-clamp-2 mb-2">{req.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-[#8B7355]">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {req.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {req.requested_by_name}
                      </span>
                      {req.expected_completion_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Due: {formatDate(req.expected_completion_date)}
                        </span>
                      )}
                      {req.assigned_owner_name && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <CheckCircle className="w-3 h-3" /> Assigned: {req.assigned_owner_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {!req.assigned_owner_id && (
                      <Select onValueChange={(v) => handleAssignOwner(req.id, v)}>
                        <SelectTrigger className="w-32 bg-white border-[#D4BBA6] text-xs">
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.slice(0, 10).map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openViewDialog(req)} data-testid={`view-${req.requirement_id}`}>
                      <Eye className="w-4 h-4 text-[#8B7355]" />
                    </Button>
                    {req.status === 'draft' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleUpdateStatus(req.id, 'proposal_requested')}
                        className="border-[#D4BBA6]"
                      >
                        Request Proposals
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">New Work Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(f => ({...f, title: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="e.g., Packaging materials for Q1"
                data-testid="request-title-input"
              />
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Department *</label>
              <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]" data-testid="request-department-select">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select department</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Expected Completion Date</label>
              <Input
                type="date"
                value={formData.expected_completion_date}
                onChange={(e) => setFormData(f => ({...f, expected_completion_date: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
              />
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(f => ({...f, description: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Describe the work requirement in detail..."
                rows={4}
                data-testid="request-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="create-request-btn">
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog with Tabs */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Work Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#F5EDE5]">
                <TabsTrigger value="details" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">Details</TabsTrigger>
                <TabsTrigger value="proposals" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                  Proposals {proposalsData?.proposal_count > 0 && `(${proposalsData.proposal_count})`}
                </TabsTrigger>
                <TabsTrigger value="approval" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">Approval</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8B7355]">{selectedRequest.requirement_id}</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <h3 className="text-lg font-bold text-[#4A3728]">{selectedRequest.title}</h3>
                <p className="text-sm text-[#8B7355]">{selectedRequest.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#8B7355]">Department</p>
                    <p className="font-medium text-[#4A3728]">{selectedRequest.department}</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355]">Requested By</p>
                    <p className="font-medium text-[#4A3728]">{selectedRequest.requested_by_name}</p>
                  </div>
                  {selectedRequest.assigned_owner_name && (
                    <div>
                      <p className="text-[#8B7355]">Assigned To</p>
                      <p className="font-medium text-[#4A3728]">{selectedRequest.assigned_owner_name}</p>
                    </div>
                  )}
                  {selectedRequest.expected_completion_date && (
                    <div>
                      <p className="text-[#8B7355]">Expected Completion</p>
                      <p className="font-medium text-[#4A3728]">{formatDate(selectedRequest.expected_completion_date)}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Proposals Tab */}
              <TabsContent value="proposals" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[#4A3728]">Vendor Proposals</h4>
                  {['proposal_requested', 'proposals_received'].includes(selectedRequest.status) && (
                    <Button size="sm" onClick={() => setShowProposalDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="add-proposal-btn">
                      <Plus className="w-4 h-4 mr-1" /> Add Proposal
                    </Button>
                  )}
                </div>

                {proposalsData?.proposals?.length > 0 ? (
                  <>
                    {/* Comparison Summary */}
                    <div className="grid grid-cols-3 gap-3 p-3 bg-[#F5EDE5] rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-[#8B7355]">Proposals</p>
                        <p className="text-lg font-bold text-[#4A3728]">{proposalsData.proposal_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#8B7355]">Lowest</p>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(proposalsData.lowest_amount)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#8B7355]">Highest</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(proposalsData.highest_amount)}</p>
                      </div>
                    </div>

                    {/* Proposals Table */}
                    <div className="border border-[#E8D5C4] rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F5EDE5]">
                          <tr>
                            <th className="text-left p-3 text-[#4A3728]">Vendor</th>
                            <th className="text-right p-3 text-[#4A3728]">Amount</th>
                            <th className="text-center p-3 text-[#4A3728]">Delivery</th>
                            <th className="text-center p-3 text-[#4A3728]">Rating</th>
                            <th className="text-center p-3 text-[#4A3728]">Status</th>
                            <th className="text-center p-3 text-[#4A3728]">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposalsData.proposals.map((p, idx) => (
                            <tr key={p.id} className={`border-t border-[#E8D5C4] ${p.status === 'selected' ? 'bg-emerald-50' : ''}`}>
                              <td className="p-3">
                                <p className="font-medium text-[#4A3728]">{p.vendor_name}</p>
                                {p.notes && <p className="text-xs text-[#8B7355] mt-1">{p.notes}</p>}
                              </td>
                              <td className="p-3 text-right">
                                <span className={`font-bold ${idx === 0 ? 'text-emerald-600' : 'text-[#4A3728]'}`}>
                                  {formatCurrency(p.amount, p.currency)}
                                </span>
                                {idx === 0 && <Badge className="ml-2 bg-emerald-100 text-emerald-700 text-xs">Lowest</Badge>}
                              </td>
                              <td className="p-3 text-center text-[#8B7355]">
                                {p.delivery_days ? `${p.delivery_days} days` : '-'}
                              </td>
                              <td className="p-3 text-center">
                                {p.vendor_rating ? (
                                  <span className="flex items-center justify-center gap-1">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    {p.vendor_rating.toFixed(1)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="p-3 text-center">
                                <Badge className={
                                  p.status === 'selected' ? 'bg-emerald-100 text-emerald-700' :
                                  p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }>
                                  {p.status}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                {p.status === 'submitted' && selectedRequest.status !== 'vendor_selected' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleSelectProposal(p.id)}
                                    className="border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                                    data-testid={`select-proposal-${p.id}`}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" /> Select
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-[#8B7355]">
                    <Scale className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                    <p>No proposals yet</p>
                    <p className="text-sm">Add proposals from different vendors to compare</p>
                  </div>
                )}
              </TabsContent>

              {/* Approval Tab */}
              <TabsContent value="approval" className="space-y-4 mt-4">
                {selectedRequest.status === 'vendor_selected' && !selectedRequest.approval_id && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 mb-3">
                      A vendor has been selected. Submit this request for approval to proceed with the work order.
                    </p>
                    <Button onClick={handleSubmitForApproval} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="submit-for-approval-btn">
                      <Send className="w-4 h-4 mr-2" /> Submit for Approval
                    </Button>
                  </div>
                )}

                {selectedRequest.approval_status && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-[#4A3728]">Approval Status</h4>
                      {getApprovalStatusBadge(selectedRequest.approval_status)}
                    </div>

                    {/* Approval Workflow Visual */}
                    <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                      {['team_lead', 'manager', 'finance'].map((level, idx) => (
                        <React.Fragment key={level}>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              selectedRequest.approval_status === 'approved' || 
                              (selectedRequest.approval_status === 'pending' && idx === 0) ? 
                              'bg-emerald-100' : 'bg-gray-100'
                            }`}>
                              {selectedRequest.approval_status === 'approved' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : selectedRequest.approval_status === 'rejected' ? (
                                <XCircle className="w-5 h-5 text-red-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-[#8B7355]" />
                              )}
                            </div>
                            <span className="text-xs text-[#8B7355] mt-1 capitalize">{level.replace('_', ' ')}</span>
                          </div>
                          {idx < 2 && <ArrowRight className="w-4 h-4 text-[#D4BBA6]" />}
                        </React.Fragment>
                      ))}
                    </div>

                    {selectedRequest.approval_status === 'approved' && (
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-sm text-emerald-700 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          This request has been fully approved. You can now create a work order.
                        </p>
                      </div>
                    )}

                    {selectedRequest.approval_status === 'rejected' && (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700 flex items-center gap-2">
                          <XCircle className="w-5 h-5" />
                          This request was rejected. Please review the feedback and resubmit if needed.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!selectedRequest.approval_status && selectedRequest.status !== 'vendor_selected' && (
                  <div className="text-center py-8 text-[#8B7355]">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                    <p>Approval not yet required</p>
                    <p className="text-sm">Select a vendor first to initiate the approval workflow</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Add Vendor Proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Vendor *</label>
              <Select value={proposalForm.vendor_id || "placeholder"} onValueChange={(v) => setProposalForm(f => ({...f, vendor_id: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]" data-testid="proposal-vendor-select">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select vendor</SelectItem>
                  {vendors.filter(v => v.status === 'active').map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name} ({v.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Amount *</label>
                <Input
                  type="number"
                  value={proposalForm.amount}
                  onChange={(e) => setProposalForm(f => ({...f, amount: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="0.00"
                  data-testid="proposal-amount-input"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Currency</label>
                <Select value={proposalForm.currency} onValueChange={(v) => setProposalForm(f => ({...f, currency: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Delivery Days</label>
              <Input
                type="number"
                value={proposalForm.delivery_days}
                onChange={(e) => setProposalForm(f => ({...f, delivery_days: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="e.g., 7"
              />
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Notes</label>
              <Textarea
                value={proposalForm.notes}
                onChange={(e) => setProposalForm(f => ({...f, notes: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Additional details about the quotation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposalDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleAddProposal} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="save-proposal-btn">
              Add Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkRequests;
