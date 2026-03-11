import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  DollarSign, Loader2, Play, Package, Receipt, CreditCard, FileCheck,
  ArrowUpCircle, CircleDollarSign, Milestone, CheckCircle2, ArrowLeft
} from 'lucide-react';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production'];
const PAYMENT_TYPES = [
  { value: 'advance', label: 'Advance Payment', icon: ArrowUpCircle, description: 'Upfront payment before work starts' },
  { value: 'partial', label: 'Partial Payment', icon: CircleDollarSign, description: 'Partial payment during work' },
  { value: 'milestone', label: 'Milestone Payment', icon: Milestone, description: 'Payment on milestone completion' },
  { value: 'final', label: 'Final Payment', icon: CheckCircle2, description: 'Final payment after work completion' },
  { value: 'full', label: 'Full Payment', icon: DollarSign, description: 'Complete payment in one go' }
];

const WorkOrders = () => {
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPODialog, setShowPODialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentsData, setPaymentsData] = useState(null);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    vendor_id: '',
    department: '',
    work_description: '',
    start_date: '',
    expected_completion_date: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_type: 'full',
    description: '',
    invoice_number: '',
    po_number: ''
  });
  const [poForm, setPOForm] = useState({
    po_number: '',
    invoice_number: '',
    invoice_date: '',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, vendorsRes, usersRes] = await Promise.all([
        api.get('/vendors/work-orders', { params: filter ? { status: filter } : {} }),
        api.get('/vendors'),
        api.get('/admin/users')
      ]);
      setOrders(ordersRes.data.work_orders || []);
      setVendors(vendorsRes.data.vendors || []);
      // Users endpoint returns array directly
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || []);
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      if (!formData.vendor_id || !formData.department || !formData.work_description) {
        toast.error('Please fill in all required fields');
        return;
      }
      await api.post('/vendors/work-orders', formData);
      toast.success('Work order created');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create work order');
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await api.put(`/vendors/work-orders/${orderId}`, { status });
      toast.success('Status updated');
      fetchData();
      if (showViewDialog && selectedOrder) {
        const res = await api.get(`/vendors/work-orders/${orderId}`);
        setSelectedOrder(res.data);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openViewDialog = async (order) => {
    try {
      const res = await api.get(`/vendors/work-orders/${order.id}`);
      setSelectedOrder(res.data);
      setShowViewDialog(true);
      setActiveTab('details');
      fetchPayments(order.id);
    } catch (error) {
      toast.error('Failed to load order details');
    }
  };

  const fetchPayments = async (orderId) => {
    try {
      const res = await api.get(`/vendors/work-orders/${orderId}/payments`);
      setPaymentsData(res.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  const handleCreatePayment = async () => {
    try {
      if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      await api.post(`/vendors/work-orders/${selectedOrder.id}/payments`, {
        amount: parseFloat(paymentForm.amount),
        payment_type: paymentForm.payment_type,
        description: paymentForm.description,
        invoice_number: paymentForm.invoice_number,
        po_number: paymentForm.po_number
      });
      toast.success(`${paymentForm.payment_type.charAt(0).toUpperCase() + paymentForm.payment_type.slice(1)} payment request created`);
      setShowPaymentDialog(false);
      setPaymentForm({ amount: '', payment_type: 'full', description: '', invoice_number: '', po_number: '' });
      fetchPayments(selectedOrder.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment request');
    }
  };

  const handleCreatePOInvoice = async () => {
    try {
      if (!poForm.amount || parseFloat(poForm.amount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      await api.post('/vendors/po-invoices', {
        work_order_id: selectedOrder.id,
        po_number: poForm.po_number,
        invoice_number: poForm.invoice_number,
        invoice_date: poForm.invoice_date,
        amount: parseFloat(poForm.amount),
        notes: poForm.notes
      });
      toast.success('PO/Invoice record added');
      setShowPODialog(false);
      setPOForm({ po_number: '', invoice_number: '', invoice_date: '', amount: '', notes: '' });
      // Refresh order details
      const res = await api.get(`/vendors/work-orders/${selectedOrder.id}`);
      setSelectedOrder(res.data);
    } catch (error) {
      toast.error('Failed to add PO/Invoice record');
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      department: '',
      work_description: '',
      start_date: '',
      expected_completion_date: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      assigned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      delivered: 'bg-purple-100 text-purple-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getPaymentTypeBadge = (type) => {
    const styles = {
      advance: 'bg-blue-100 text-blue-700',
      partial: 'bg-indigo-100 text-indigo-700',
      milestone: 'bg-purple-100 text-purple-700',
      final: 'bg-emerald-100 text-emerald-700',
      full: 'bg-teal-100 text-teal-700'
    };
    return <Badge className={styles[type] || 'bg-gray-100'}>{type}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      completed: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="work-orders">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/vendors')} className="text-[#8B7355] hover:text-[#4A3728]" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Work Orders</h1>
          <p className="text-[#8B7355]">Track vendor work assignments and payments</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="new-order-btn">
          <Plus className="w-4 h-4 mr-2" /> New Work Order
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'assigned', 'in_progress', 'delivered', 'completed'].map((status) => (
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

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-[#D4BBA6] mb-4" />
            <p className="text-[#8B7355]">No work orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow" data-testid={`order-card-${order.work_order_id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-medium text-[#4A3728]">{order.work_order_id}</span>
                      {getStatusBadge(order.status)}
                      {order.payment_requests?.length > 0 && (
                        <Badge variant="outline" className="border-green-300 text-green-600">
                          {order.payment_requests.length} payment{order.payment_requests.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {order.po_invoices?.length > 0 && (
                        <Badge variant="outline" className="border-purple-300 text-purple-600">
                          <Receipt className="w-3 h-3 mr-1" /> {order.po_invoices.length} PO/Invoice
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#8B7355] mb-2 line-clamp-2">{order.work_description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-[#8B7355]">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {order.vendor_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" /> {order.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {order.assigned_owner_name}
                      </span>
                      {order.expected_completion_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Due: {formatDate(order.expected_completion_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => openViewDialog(order)} data-testid={`view-${order.work_order_id}`}>
                      <Eye className="w-4 h-4 text-[#8B7355]" />
                    </Button>
                    {order.status === 'assigned' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleUpdateStatus(order.id, 'in_progress')}
                        className="border-[#D4BBA6]"
                      >
                        <Play className="w-4 h-4 mr-1" /> Start
                      </Button>
                    )}
                    {order.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        className="border-[#D4BBA6]"
                      >
                        Mark Delivered
                      </Button>
                    )}
                    {order.status === 'delivered' && (
                      <Button 
                        size="sm" 
                        variant="default" 
                        onClick={() => handleUpdateStatus(order.id, 'completed')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Complete
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
            <DialogTitle className="text-[#4A3728]">New Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Vendor *</label>
              <Select value={formData.vendor_id || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, vendor_id: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]" data-testid="order-vendor-select">
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
            <div>
              <label className="text-sm text-[#8B7355]">Department *</label>
              <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]" data-testid="order-department-select">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select department</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Start Date</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(f => ({...f, start_date: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Expected Completion</label>
                <Input
                  type="date"
                  value={formData.expected_completion_date}
                  onChange={(e) => setFormData(f => ({...f, expected_completion_date: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Work Description *</label>
              <Textarea
                value={formData.work_description}
                onChange={(e) => setFormData(f => ({...f, work_description: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Describe the work to be done..."
                rows={4}
                data-testid="order-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="create-order-btn">
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog with Tabs */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Work Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#F5EDE5]">
                <TabsTrigger value="details" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">Details</TabsTrigger>
                <TabsTrigger value="payments" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                  Payments {paymentsData?.payments?.length > 0 && `(${paymentsData.payments.length})`}
                </TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                  PO/Invoice {selectedOrder.po_invoices?.length > 0 && `(${selectedOrder.po_invoices.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#4A3728]">{selectedOrder.work_order_id}</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#8B7355]">Vendor</p>
                    <p className="font-medium text-[#4A3728]">{selectedOrder.vendor_name}</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355]">Department</p>
                    <p className="font-medium text-[#4A3728]">{selectedOrder.department}</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355]">Assigned To</p>
                    <p className="font-medium text-[#4A3728]">{selectedOrder.assigned_owner_name}</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355]">Created By</p>
                    <p className="font-medium text-[#4A3728]">{selectedOrder.created_by_name}</p>
                  </div>
                  {selectedOrder.start_date && (
                    <div>
                      <p className="text-[#8B7355]">Start Date</p>
                      <p className="font-medium text-[#4A3728]">{formatDate(selectedOrder.start_date)}</p>
                    </div>
                  )}
                  {selectedOrder.expected_completion_date && (
                    <div>
                      <p className="text-[#8B7355]">Expected Completion</p>
                      <p className="font-medium text-[#4A3728]">{formatDate(selectedOrder.expected_completion_date)}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="text-[#8B7355] text-sm mb-1">Work Description</p>
                  <p className="text-sm text-[#4A3728] bg-[#F5EDE5] p-3 rounded">{selectedOrder.work_description}</p>
                </div>
                
                {selectedOrder.vendor_details && (
                  <div className="border-t border-[#E8D5C4] pt-4">
                    <p className="text-[#8B7355] text-sm mb-2">Vendor Contact</p>
                    <div className="text-sm text-[#4A3728]">
                      {selectedOrder.vendor_details.email && <p>Email: {selectedOrder.vendor_details.email}</p>}
                      {selectedOrder.vendor_details.phone && <p>Phone: {selectedOrder.vendor_details.phone}</p>}
                    </div>
                  </div>
                )}
                
                {/* Status update buttons */}
                <div className="flex gap-2 pt-4 border-t border-[#E8D5C4]">
                  {selectedOrder.status === 'assigned' && (
                    <Button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'in_progress')}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Play className="w-4 h-4 mr-2" /> Start Work
                    </Button>
                  )}
                  {selectedOrder.status === 'in_progress' && (
                    <Button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Mark as Delivered
                    </Button>
                  )}
                  {selectedOrder.status === 'delivered' && (
                    <Button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[#4A3728]">Payment Requests</h4>
                  <Button size="sm" onClick={() => setShowPaymentDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="create-payment-btn">
                    <Plus className="w-4 h-4 mr-1" /> New Payment
                  </Button>
                </div>

                {/* Payment Summary */}
                {paymentsData?.summary && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-[#F5EDE5] rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-[#8B7355]">Total Requested</p>
                      <p className="text-lg font-bold text-[#4A3728]">{formatCurrency(paymentsData.summary.total_requested)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#8B7355]">Total Paid</p>
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(paymentsData.summary.total_paid)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#8B7355]">Pending</p>
                      <p className="text-lg font-bold text-amber-600">{formatCurrency(paymentsData.summary.pending)}</p>
                    </div>
                  </div>
                )}

                {paymentsData?.payments?.length > 0 ? (
                  <div className="space-y-3">
                    {paymentsData.payments.map((payment) => (
                      <div key={payment.id} className="p-3 border border-[#E8D5C4] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getPaymentTypeBadge(payment.payment_type)}
                            {getPaymentStatusBadge(payment.status)}
                          </div>
                          <span className="font-bold text-[#4A3728]">{formatCurrency(payment.amount)}</span>
                        </div>
                        <p className="text-sm text-[#8B7355]">{payment.title}</p>
                        {payment.description && (
                          <p className="text-xs text-[#8B7355] mt-1">{payment.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-[#8B7355]">
                          {payment.invoice_number && <span>Invoice: {payment.invoice_number}</span>}
                          {payment.po_number && <span>PO: {payment.po_number}</span>}
                          <span>Created: {formatDate(payment.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#8B7355]">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                    <p>No payments yet</p>
                    <p className="text-sm">Create advance, milestone, or final payments</p>
                  </div>
                )}

                {/* Payment Type Guide */}
                <div className="border-t border-[#E8D5C4] pt-4">
                  <p className="text-xs text-[#8B7355] mb-2">Payment Types:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {PAYMENT_TYPES.slice(0, 4).map(pt => (
                      <div key={pt.value} className="flex items-start gap-2 text-[#8B7355]">
                        <pt.icon className="w-3 h-3 mt-0.5" />
                        <span>{pt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* PO/Invoice Tab */}
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[#4A3728]">PO & Invoice Records</h4>
                  <Button size="sm" onClick={() => setShowPODialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="add-po-invoice-btn">
                    <Plus className="w-4 h-4 mr-1" /> Add Record
                  </Button>
                </div>

                {selectedOrder.po_invoices?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedOrder.po_invoices.map((record) => (
                      <div key={record.id} className="p-3 border border-[#E8D5C4] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {record.po && <Badge variant="outline" className="border-blue-300 text-blue-600">PO: {record.po}</Badge>}
                            {record.invoice && <Badge variant="outline" className="border-purple-300 text-purple-600">Invoice: {record.invoice}</Badge>}
                          </div>
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#8B7355]">
                    <Receipt className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                    <p>No PO/Invoice records yet</p>
                    <p className="text-sm">Add purchase orders and invoices for tracking</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Create Payment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#8B7355]">
              Create a payment request for work order {selectedOrder?.work_order_id}
            </p>
            
            <div>
              <label className="text-sm text-[#8B7355]">Payment Type *</label>
              <Select value={paymentForm.payment_type} onValueChange={(v) => setPaymentForm(f => ({...f, payment_type: v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]" data-testid="payment-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(pt => (
                    <SelectItem key={pt.value} value={pt.value}>
                      <div className="flex items-center gap-2">
                        <pt.icon className="w-4 h-4" />
                        {pt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#8B7355] mt-1">
                {PAYMENT_TYPES.find(pt => pt.value === paymentForm.payment_type)?.description}
              </p>
            </div>

            <div>
              <label className="text-sm text-[#8B7355]">Amount (INR) *</label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(f => ({...f, amount: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="0.00"
                data-testid="payment-amount-input"
              />
            </div>

            <div>
              <label className="text-sm text-[#8B7355]">Description</label>
              <Textarea
                value={paymentForm.description}
                onChange={(e) => setPaymentForm(f => ({...f, description: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Payment description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">PO Number</label>
                <Input
                  value={paymentForm.po_number}
                  onChange={(e) => setPaymentForm(f => ({...f, po_number: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="PO-XXXX"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Invoice Number</label>
                <Input
                  value={paymentForm.invoice_number}
                  onChange={(e) => setPaymentForm(f => ({...f, invoice_number: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="INV-XXXX"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreatePayment} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="submit-payment-btn">
              Create Payment Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO/Invoice Dialog */}
      <Dialog open={showPODialog} onOpenChange={setShowPODialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Add PO/Invoice Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">PO Number</label>
                <Input
                  value={poForm.po_number}
                  onChange={(e) => setPOForm(f => ({...f, po_number: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="PO-XXXX"
                  data-testid="po-number-input"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Invoice Number</label>
                <Input
                  value={poForm.invoice_number}
                  onChange={(e) => setPOForm(f => ({...f, invoice_number: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="INV-XXXX"
                  data-testid="invoice-number-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Invoice Date</label>
                <Input
                  type="date"
                  value={poForm.invoice_date}
                  onChange={(e) => setPOForm(f => ({...f, invoice_date: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Amount *</label>
                <Input
                  type="number"
                  value={poForm.amount}
                  onChange={(e) => setPOForm(f => ({...f, amount: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="0.00"
                  data-testid="po-amount-input"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Notes</label>
              <Textarea
                value={poForm.notes}
                onChange={(e) => setPOForm(f => ({...f, notes: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPODialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreatePOInvoice} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="save-po-invoice-btn">
              Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkOrders;
