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
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Search, Clock, CheckCircle, Building2,
  Calendar, User, Eye, DollarSign, Loader2, Play, Package
} from 'lucide-react';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production'];

const WorkOrders = () => {
  const { api, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [formData, setFormData] = useState({
    vendor_id: '',
    department: '',
    work_description: '',
    start_date: '',
    expected_completion_date: ''
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
      setUsers(usersRes.data.users || []);
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
      if (showViewDialog) {
        const res = await api.get(`/vendors/work-orders/${orderId}`);
        setSelectedOrder(res.data);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCreatePayment = async () => {
    try {
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      await api.post(`/vendors/work-orders/${selectedOrder.id}/create-payment-request?amount=${paymentAmount}`);
      toast.success('Payment request created');
      setShowPaymentDialog(false);
      setPaymentAmount('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment request');
    }
  };

  const openViewDialog = async (order) => {
    try {
      const res = await api.get(`/vendors/work-orders/${order.id}`);
      setSelectedOrder(res.data);
      setShowViewDialog(true);
    } catch (error) {
      toast.error('Failed to load order details');
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="work-orders">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Work Orders</h1>
          <p className="text-[#8B7355]">Track vendor work assignments</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
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
            <Card key={order.id} className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-[#4A3728]">{order.work_order_id}</span>
                      {getStatusBadge(order.status)}
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
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openViewDialog(order)}>
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
                <SelectTrigger className="bg-white border-[#D4BBA6]">
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
                <SelectTrigger className="bg-white border-[#D4BBA6]">
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Work Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
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
              
              {selectedOrder.status === 'completed' && !selectedOrder.payment_request_id && (
                <Button 
                  onClick={() => { setShowPaymentDialog(true); }}
                  className="w-full bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
                >
                  <DollarSign className="w-4 h-4 mr-2" /> Create Payment Request
                </Button>
              )}
              
              {selectedOrder.payment_request_id && (
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Payment request created
                  </p>
                  <Link to="/finance/payments" className="text-xs text-emerald-600 underline">
                    View in Payment Requests
                  </Link>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Create Payment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#8B7355]">
              Create a payment request for work order {selectedOrder?.work_order_id}
            </p>
            <div>
              <label className="text-sm text-[#8B7355]">Amount (INR) *</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="bg-white border-[#D4BBA6]"
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreatePayment} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              Create Payment Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkOrders;
