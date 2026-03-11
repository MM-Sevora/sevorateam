import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowLeft, Plus, DollarSign, Clock, CheckCircle, Eye, Loader2,
  Instagram, Youtube, Twitter, Globe, Send, FileText, ExternalLink,
  CreditCard, AlertCircle
} from 'lucide-react';

const DEPARTMENTS = ['Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production', 'Content'];
const PAYMENT_TYPES = [
  { value: 'per_deliverable', label: 'Per Deliverable' },
  { value: 'per_campaign', label: 'Per Campaign' },
  { value: 'per_project', label: 'Per Project' },
  { value: 'monthly_retainer', label: 'Monthly Retainer' }
];
const DELIVERABLE_TYPES = [
  'Instagram Post', 'Instagram Reel', 'Instagram Story', 'YouTube Video', 
  'YouTube Shorts', 'Blog Post', 'Twitter Thread', 'LinkedIn Post',
  'Podcast Episode', 'Photography', 'Video Production', 'Other'
];

const CreatorPayments = () => {
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [creators, setCreators] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({
    creator_id: '',
    campaign_project: '',
    department: '',
    deliverable_type: '',
    agreed_fee: '',
    payment_type: 'per_deliverable',
    expected_payment_date: '',
    notes: '',
    contract_url: '',
    content_link: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, creatorsRes, statsRes] = await Promise.all([
        api.get('/vendors/creator-payments', { params: filter ? { status: filter } : {} }),
        api.get('/vendors', { params: { vendor_type: 'freelancer' } }),
        api.get('/vendors/creator-payments/dashboard/stats')
      ]);
      setPayments(paymentsRes.data.payments || []);
      
      // Get both freelancers and influencers
      const influencersRes = await api.get('/vendors', { params: { vendor_type: 'influencer' } });
      setCreators([...(creatorsRes.data.vendors || []), ...(influencersRes.data.vendors || [])]);
      setDashboardStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load creator payments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.creator_id || !formData.campaign_project || !formData.department || !formData.deliverable_type || !formData.agreed_fee) {
        toast.error('Please fill in all required fields');
        return;
      }
      await api.post('/vendors/creator-payments', {
        ...formData,
        agreed_fee: parseFloat(formData.agreed_fee)
      });
      toast.success('Creator payment record created');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment record');
    }
  };

  const handleMarkReady = async (paymentId) => {
    try {
      await api.post(`/vendors/creator-payments/${paymentId}/mark-ready`);
      toast.success('Deliverable marked as complete');
      fetchData();
      if (selectedPayment) {
        const res = await api.get(`/vendors/creator-payments/${paymentId}`);
        setSelectedPayment(res.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleCreatePaymentRequest = async (paymentId) => {
    try {
      await api.post(`/vendors/creator-payments/${paymentId}/create-payment-request`);
      toast.success('Payment request created');
      fetchData();
      if (selectedPayment) {
        const res = await api.get(`/vendors/creator-payments/${paymentId}`);
        setSelectedPayment(res.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment request');
    }
  };

  const openViewDialog = async (payment) => {
    try {
      const res = await api.get(`/vendors/creator-payments/${payment.id}`);
      setSelectedPayment(res.data);
      setShowViewDialog(true);
    } catch (error) {
      toast.error('Failed to load payment details');
    }
  };

  const resetForm = () => {
    setFormData({
      creator_id: '',
      campaign_project: '',
      department: '',
      deliverable_type: '',
      agreed_fee: '',
      payment_type: 'per_deliverable',
      expected_payment_date: '',
      notes: '',
      contract_url: '',
      content_link: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending_deliverable: 'bg-amber-100 text-amber-700',
      ready_for_payment: 'bg-blue-100 text-blue-700',
      payment_requested: 'bg-purple-100 text-purple-700',
      payment_approved: 'bg-indigo-100 text-indigo-700',
      paid: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getPlatformIcon = (platform) => {
    const icons = { instagram: Instagram, youtube: Youtube, twitter: Twitter };
    return icons[platform] || Globe;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="creator-payments">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/vendors')} className="text-[#8B7355]" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#4A3728]">Creator Payments</h1>
            <p className="text-[#8B7355]">Manage freelancer & influencer payments</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="new-payment-btn">
          <Plus className="w-4 h-4 mr-2" /> New Payment Record
        </Button>
      </div>

      {/* Summary Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-600">{dashboardStats.counts?.pending_deliverable || 0}</p>
                  <p className="text-sm text-amber-700">Pending Deliverable</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{dashboardStats.counts?.ready_for_payment || 0}</p>
                  <p className="text-sm text-blue-700">Ready for Payment</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(dashboardStats.amounts?.requested || 0)}</p>
                  <p className="text-sm text-purple-700">Payments Requested</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(dashboardStats.amounts?.paid || 0)}</p>
                  <p className="text-sm text-emerald-700">Total Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'pending_deliverable', 'ready_for_payment', 'payment_requested', 'paid'].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={filter === status ? 'default' : 'outline'}
                onClick={() => setFilter(status)}
                className={filter === status ? 'bg-[#4A3728] text-white' : 'border-[#D4BBA6]'}
              >
                {status?.replace(/_/g, ' ') || 'All'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
        </div>
      ) : payments.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-[#D4BBA6] mb-4" />
            <p className="text-[#8B7355]">No creator payments found</p>
            <p className="text-sm text-[#8B7355]">Create payment records for freelancers and influencers</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow" data-testid={`payment-${payment.payment_id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-medium text-[#8B7355]">{payment.payment_id}</span>
                      {getStatusBadge(payment.status)}
                      <Badge variant="outline" className="border-purple-300 text-purple-600">
                        {payment.creator_type}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-[#4A3728] mb-1">{payment.creator_name}</h3>
                    <p className="text-sm text-[#8B7355]">{payment.campaign_project} • {payment.deliverable_type}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-[#8B7355] mt-2">
                      <span>{payment.department}</span>
                      <span>Type: {payment.payment_type?.replace(/_/g, ' ')}</span>
                      {payment.expected_payment_date && (
                        <span>Expected: {formatDate(payment.expected_payment_date)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xl font-bold text-[#4A3728]">{formatCurrency(payment.agreed_fee)}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openViewDialog(payment)}>
                        <Eye className="w-4 h-4 text-[#8B7355]" />
                      </Button>
                      {payment.status === 'pending_deliverable' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleMarkReady(payment.id)}
                          className="border-blue-300 text-blue-600"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Complete
                        </Button>
                      )}
                      {payment.status === 'ready_for_payment' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleCreatePaymentRequest(payment.id)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Send className="w-4 h-4 mr-1" /> Request Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">New Creator Payment Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Creator/Freelancer *</label>
              <Select value={formData.creator_id || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, creator_id: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]" data-testid="creator-select">
                  <SelectValue placeholder="Select creator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select creator</SelectItem>
                  {creators.filter(c => c.status === 'active').map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.vendor_type}) {c.handle && `- ${c.handle}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {creators.length === 0 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> No creators found. Add vendors with type "Freelancer" or "Influencer" first.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-[#8B7355]">Campaign/Project *</label>
              <Input
                value={formData.campaign_project}
                onChange={(e) => setFormData(f => ({...f, campaign_project: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="e.g., Wedding Season Campaign"
                data-testid="campaign-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Department *</label>
                <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Payment Type *</label>
                <Select value={formData.payment_type} onValueChange={(v) => setFormData(f => ({...f, payment_type: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map(pt => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-[#8B7355]">Deliverable Type *</label>
              <Select value={formData.deliverable_type || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, deliverable_type: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]" data-testid="deliverable-select">
                  <SelectValue placeholder="Select deliverable type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select deliverable type</SelectItem>
                  {DELIVERABLE_TYPES.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Agreed Fee (INR) *</label>
                <Input
                  type="number"
                  value={formData.agreed_fee}
                  onChange={(e) => setFormData(f => ({...f, agreed_fee: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="25000"
                  data-testid="fee-input"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Expected Payment Date</label>
                <Input
                  type="date"
                  value={formData.expected_payment_date}
                  onChange={(e) => setFormData(f => ({...f, expected_payment_date: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-[#8B7355]">Contract/Agreement URL</label>
              <Input
                value={formData.contract_url}
                onChange={(e) => setFormData(f => ({...f, contract_url: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div>
              <label className="text-sm text-[#8B7355]">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(f => ({...f, notes: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Additional details about the payment..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="create-payment-btn">
              Create Payment Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8B7355]">{selectedPayment.payment_id}</span>
                {getStatusBadge(selectedPayment.status)}
              </div>

              <div className="p-4 bg-[#F5EDE5] rounded-lg">
                <h3 className="font-bold text-[#4A3728] text-lg">{selectedPayment.creator_name}</h3>
                <p className="text-sm text-[#8B7355]">{selectedPayment.creator_type}</p>
                {selectedPayment.creator_details && (
                  <div className="mt-2 text-sm text-[#8B7355]">
                    {selectedPayment.creator_details.platform && (
                      <p className="capitalize">{selectedPayment.creator_details.platform}</p>
                    )}
                    {selectedPayment.creator_details.handle && (
                      <p>{selectedPayment.creator_details.handle}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#8B7355]">Campaign/Project</p>
                  <p className="font-medium text-[#4A3728]">{selectedPayment.campaign_project}</p>
                </div>
                <div>
                  <p className="text-[#8B7355]">Deliverable</p>
                  <p className="font-medium text-[#4A3728]">{selectedPayment.deliverable_type}</p>
                </div>
                <div>
                  <p className="text-[#8B7355]">Payment Type</p>
                  <p className="font-medium text-[#4A3728] capitalize">{selectedPayment.payment_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-[#8B7355]">Agreed Fee</p>
                  <p className="font-bold text-[#4A3728] text-lg">{formatCurrency(selectedPayment.agreed_fee)}</p>
                </div>
              </div>

              {selectedPayment.notes && (
                <div>
                  <p className="text-sm text-[#8B7355]">Notes</p>
                  <p className="text-sm text-[#4A3728] bg-gray-50 p-2 rounded">{selectedPayment.notes}</p>
                </div>
              )}

              {(selectedPayment.contract_url || selectedPayment.content_link) && (
                <div className="flex gap-2">
                  {selectedPayment.contract_url && (
                    <Button size="sm" variant="outline" asChild className="border-[#D4BBA6]">
                      <a href={selectedPayment.contract_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="w-4 h-4 mr-1" /> Contract
                      </a>
                    </Button>
                  )}
                  {selectedPayment.content_link && (
                    <Button size="sm" variant="outline" asChild className="border-[#D4BBA6]">
                      <a href={selectedPayment.content_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" /> Content
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-[#E8D5C4]">
                {selectedPayment.status === 'pending_deliverable' && (
                  <Button onClick={() => handleMarkReady(selectedPayment.id)} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark Deliverable Complete
                  </Button>
                )}
                {selectedPayment.status === 'ready_for_payment' && (
                  <Button onClick={() => handleCreatePaymentRequest(selectedPayment.id)} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Send className="w-4 h-4 mr-2" /> Create Payment Request
                  </Button>
                )}
                {selectedPayment.status === 'payment_requested' && (
                  <p className="text-sm text-purple-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Payment request submitted - awaiting approval
                  </p>
                )}
                {selectedPayment.status === 'paid' && (
                  <p className="text-sm text-emerald-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Payment completed
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorPayments;
