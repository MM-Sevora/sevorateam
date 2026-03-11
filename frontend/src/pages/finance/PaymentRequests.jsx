import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import {
  CreditCard, Plus, Clock, CheckCircle, XCircle, DollarSign,
  Building2, FileText, Calendar, MessageSquare, Send, Loader2
} from 'lucide-react';

const CATEGORIES = ['Services', 'Software', 'Hardware', 'Subscriptions', 'Consulting', 'Supplies', 'Travel', 'Other'];

const PaymentRequests = () => {
  const { api, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionComments, setActionComments] = useState('');
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    vendor_name: '',
    amount: '',
    currency: 'USD',
    category: '',
    description: '',
    due_date: '',
    invoice_number: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, statsRes] = await Promise.all([
        api.get('/finance/payment-requests', { params: filter ? { status: filter } : {} }),
        api.get('/finance/payment-requests/summary/stats')
      ]);
      setRequests(requestsRes.data.requests || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch payment requests:', error);
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    try {
      if (!formData.title || !formData.vendor_name || !formData.amount || !formData.category) {
        toast.error('Please fill in all required fields');
        return;
      }
      await api.post('/finance/payment-requests', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success('Payment request created');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create payment request');
    }
  };

  const handleAction = async () => {
    try {
      await api.post(`/finance/payment-requests/${selectedRequest.id}/action`, {
        action: actionType,
        comments: actionComments
      });
      toast.success(`Request ${actionType}d successfully`);
      setShowActionDialog(false);
      setSelectedRequest(null);
      setActionComments('');
      fetchData();
    } catch (error) {
      toast.error(`Failed to ${actionType} request`);
    }
  };

  const openActionDialog = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setShowActionDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      vendor_name: '',
      amount: '',
      currency: 'USD',
      category: '',
      description: '',
      due_date: '',
      invoice_number: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-slate-100 text-slate-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="payment-requests-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Payment Requests</h1>
          <p className="text-[#8B7355]">Manage vendor payments and invoices</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
          data-testid="create-payment-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> New Payment Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-[#8B7355]">Pending</p>
                <p className="text-lg font-bold text-amber-600">{stats?.pending_count || 0}</p>
                <p className="text-xs text-[#8B7355]">{formatCurrency(stats?.pending_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-[#8B7355]">Approved</p>
                <p className="text-lg font-bold text-emerald-600">{stats?.by_status?.approved?.count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-[#8B7355]">Processing</p>
                <p className="text-lg font-bold text-blue-600">{stats?.by_status?.processing?.count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-[#8B7355]">This Month</p>
                <p className="text-lg font-bold text-purple-600">{stats?.this_month?.count || 0}</p>
                <p className="text-xs text-[#8B7355]">{formatCurrency(stats?.this_month?.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'pending', 'approved', 'processing', 'completed', 'rejected'].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={filter === status ? 'default' : 'outline'}
                onClick={() => setFilter(status)}
                className={filter === status ? 'bg-[#4A3728] text-white' : 'border-[#D4BBA6]'}
              >
                {status || 'All'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#4A3728]">Payment Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-[#8B7355]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-[#8B7355]">No payment requests found</div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="p-4 border border-[#E8D5C4] rounded-lg hover:bg-[#F5EDE5]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-[#4A3728]">{req.title}</h3>
                        {getStatusBadge(req.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-[#8B7355]">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {req.vendor_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {req.category}
                        </span>
                        {req.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Due: {formatDate(req.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#4A3728]">{formatCurrency(req.amount, req.currency)}</p>
                        <p className="text-xs text-[#8B7355]">by {req.requester_name}</p>
                      </div>
                      <div className="flex gap-1">
                        {req.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'approve')} title="Approve">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'reject')} title="Reject">
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'process')} title="Process">
                            <Send className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        {req.status === 'processing' && (
                          <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'complete')} title="Complete">
                            <CheckCircle className="w-4 h-4 text-purple-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">New Payment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(f => ({...f, title: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="e.g., Monthly SaaS Subscription"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Vendor *</label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => setFormData(f => ({...f, vendor_name: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="Vendor name"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Category *</label>
                <Select value={formData.category || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, category: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select Category</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Amount *</label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(f => ({...f, amount: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(f => ({...f, due_date: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Invoice Number</label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData(f => ({...f, invoice_number: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="INV-001"
              />
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(f => ({...f, description: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Additional details..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] capitalize">{actionType} Payment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#8B7355]">
              {actionType === 'approve' && 'This will approve the payment request for processing.'}
              {actionType === 'reject' && 'This will reject the payment request.'}
              {actionType === 'process' && 'This will mark the payment as being processed.'}
              {actionType === 'complete' && 'This will mark the payment as completed.'}
            </p>
            <div>
              <label className="text-sm text-[#8B7355]">Comments (optional)</label>
              <Textarea
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
                className="bg-white border-[#D4BBA6]"
                placeholder="Add a comment..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button 
              onClick={handleAction} 
              className={actionType === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#4A3728] hover:bg-[#5D4A3A] text-white'}
            >
              {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentRequests;
