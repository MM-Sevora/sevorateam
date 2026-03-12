import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  X, Eye, DollarSign, CheckCircle, Clock, Package, Play, Receipt, CreditCard,
  FileCheck, ArrowUpCircle, CircleDollarSign, Milestone, CheckCircle2, RefreshCw, User
} from 'lucide-react';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production'];
const ORDER_TYPES = [
  { value: 'one_time', label: 'One-Time', icon: FileText },
  { value: 'recurring', label: 'Recurring', icon: RefreshCw },
  { value: 'project', label: 'Project', icon: Package }
];
const PAYMENT_TYPES = [
  { value: 'advance', label: 'Advance Payment', icon: ArrowUpCircle, description: 'Upfront payment before work starts' },
  { value: 'partial', label: 'Partial Payment', icon: CircleDollarSign, description: 'Partial payment during work' },
  { value: 'milestone', label: 'Milestone Payment', icon: Milestone, description: 'Payment on milestone completion' },
  { value: 'final', label: 'Final Payment', icon: CheckCircle2, description: 'Final payment after work completion' },
  { value: 'full', label: 'Full Payment', icon: DollarSign, description: 'Complete payment in one go' }
];

const WorkOrders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: '', department: '', order_type: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    vendor_id: '', department: '', work_description: '', campaign_project: '', deliverable_type: '',
    start_date: '', expected_completion_date: '', order_type: 'one_time', agreed_amount: ''
  });
  const [paymentForm, setPaymentForm] = useState({ payment_type: 'full', amount: '', description: '', po_number: '', invoice_number: '' });
  const [poForm, setPoForm] = useState({ po_number: '', invoice_number: '', amount: '', notes: '' });

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const viewOrderId = searchParams.get('view');
    if (viewOrderId && orders.length > 0 && !showViewDialog) {
      const orderToView = orders.find(o => o.id === viewOrderId);
      if (orderToView) { openViewDialog(orderToView); setSearchParams({}); }
    }
  }, [orders, searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, vendorsRes, usersRes] = await Promise.all([
        api.get('/vendors/work-orders'),
        api.get('/vendors'),
        api.get('/admin/users')
      ]);
      setOrders(ordersRes.data.work_orders || []);
      setVendors(vendorsRes.data.vendors || []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || []);
    } catch (error) {
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
      const payload = { ...formData };
      if (formData.agreed_amount) payload.agreed_amount = parseFloat(formData.agreed_amount);
      await api.post('/vendors/work-orders', payload);
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
      if (!paymentForm.amount) { toast.error('Please enter an amount'); return; }
      await api.post(`/vendors/work-orders/${selectedOrder.id}/payments`, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      });
      toast.success('Payment request created');
      setShowPaymentDialog(false);
      setPaymentForm({ payment_type: 'full', amount: '', description: '', po_number: '', invoice_number: '' });
      fetchPayments(selectedOrder.id);
    } catch (error) {
      toast.error('Failed to create payment request');
    }
  };

  const handleCreatePO = async () => {
    try {
      if (!poForm.po_number && !poForm.invoice_number) { toast.error('Please enter PO or Invoice number'); return; }
      await api.post(`/vendors/work-orders/${selectedOrder.id}/po-invoice`, {
        ...poForm,
        amount: poForm.amount ? parseFloat(poForm.amount) : null
      });
      toast.success('PO/Invoice record added');
      setShowPODialog(false);
      setPoForm({ po_number: '', invoice_number: '', amount: '', notes: '' });
    } catch (error) {
      toast.error('Failed to add PO/Invoice');
    }
  };

  const resetForm = () => {
    setFormData({ vendor_id: '', department: '', work_description: '', campaign_project: '', deliverable_type: '', start_date: '', expected_completion_date: '', order_type: 'one_time', agreed_amount: '' });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => o.work_order_id?.toLowerCase().includes(q) || o.vendor_name?.toLowerCase().includes(q) || o.work_description?.toLowerCase().includes(q));
    }
    if (filters.status) result = result.filter(o => o.status === filters.status);
    if (filters.department) result = result.filter(o => o.department === filters.department);
    if (filters.order_type) result = result.filter(o => o.order_type === filters.order_type);
    result.sort((a, b) => {
      let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') aVal = aVal?.toLowerCase() || '';
      if (typeof bVal === 'string') bVal = bVal?.toLowerCase() || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [orders, searchQuery, filters, sortConfig]);

  const getStatusBadge = (status) => {
    const styles = {
      assigned: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700',
      delivered: 'bg-purple-100 text-purple-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getTypeBadge = (type) => {
    const orderType = type || 'one_time';
    const styles = {
      one_time: 'bg-blue-100 text-blue-700', recurring: 'bg-purple-100 text-purple-700', project: 'bg-teal-100 text-teal-700'
    };
    return <Badge className={styles[orderType] || 'bg-blue-100 text-blue-700'}>{orderType?.replace(/_/g, '-')}</Badge>;
  };

  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '-';
  const formatCurrency = (amount, currency = 'INR') => amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount) : '-';

  const SortHeader = ({ column, label }) => (
    <TableHead className="cursor-pointer hover:bg-[#F5EDE5] select-none" onClick={() => handleSort(column)}>
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === column ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
      </div>
    </TableHead>
  );

  const clearFilters = () => { setFilters({ status: '', department: '', order_type: '' }); setSearchQuery(''); };
  const hasActiveFilters = filters.status || filters.department || filters.order_type || searchQuery;

  const selectedVendor = vendors.find(v => v.id === formData.vendor_id);
  const isCreatorVendor = selectedVendor?.vendor_type === 'freelancer' || selectedVendor?.vendor_type === 'influencer';

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="work-orders">
      <Button variant="ghost" onClick={() => navigate('/vendors')} className="text-[#8B7355] hover:text-[#4A3728]">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Work Orders</h1>
          <p className="text-[#8B7355]">{filteredAndSortedOrders.length} of {orders.length} orders</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Work Order
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white border-[#D4BBA6]" />
            </div>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters(f => ({...f, status: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.department || "all"} onValueChange={(v) => setFilters(f => ({...f, department: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.order_type || "all"} onValueChange={(v) => setFilters(f => ({...f, order_type: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ORDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
          ) : filteredAndSortedOrders.length === 0 ? (
            <div className="text-center py-12 text-[#8B7355]"><Package className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" /><p>No work orders found</p></div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F5EDE5]">
                <TableRow>
                  <SortHeader column="work_order_id" label="ID" />
                  <SortHeader column="vendor_name" label="Vendor" />
                  <TableHead>Type</TableHead>
                  <SortHeader column="department" label="Department" />
                  <TableHead>Employee</TableHead>
                  <SortHeader column="status" label="Status" />
                  <SortHeader column="agreed_amount" label="Amount" />
                  <TableHead>Payments</TableHead>
                  <SortHeader column="created_at" label="Created" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-[#FDF8F3] cursor-pointer" onClick={() => openViewDialog(order)}>
                    <TableCell className="font-mono text-xs text-[#8B7355]">{order.work_order_id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-[#4A3728]">{order.vendor_name}</div>
                      <div className="text-xs text-[#8B7355] truncate max-w-[150px]">{order.work_description}</div>
                    </TableCell>
                    <TableCell>{getTypeBadge(order.order_type)}</TableCell>
                    <TableCell className="text-[#8B7355]">{order.department}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="text-[#4A3728]">{order.created_by_name}</div>
                        {order.assigned_owner_name && (
                          <div className="text-blue-600 flex items-center gap-1">
                            <User className="w-3 h-3" /> {order.assigned_owner_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="font-semibold text-[#4A3728]">{formatCurrency(order.agreed_amount)}</TableCell>
                    <TableCell>
                      {order.payment_requests?.length > 0 ? (
                        <Badge variant="outline" className="border-blue-300 text-blue-600">{order.payment_requests.length}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-[#8B7355]">{formatDate(order.created_at)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog(order)}><Eye className="w-4 h-4 text-[#8B7355]" /></Button>
                        {order.status === 'assigned' && (
                          <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(order.id, 'in_progress')}><Play className="w-4 h-4 text-blue-600" /></Button>
                        )}
                      </div>
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
        <DialogContent className="bg-white max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#4A3728]">New Work Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-[#4A3728]">Vendor *</label>
              <Select value={formData.vendor_id || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, vendor_id: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent><SelectItem value="placeholder" disabled>Select vendor</SelectItem>{vendors.filter(v => v.status === 'active').map(v => <SelectItem key={v.id} value={v.id}>{v.name} <span className="text-gray-500">({v.vendor_type})</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#4A3728]">Department *</label>
                <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="placeholder" disabled>Select</SelectItem>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium text-[#4A3728]">Order Type</label>
                <Select value={formData.order_type} onValueChange={(v) => setFormData(f => ({...f, order_type: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                  <SelectContent>{ORDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}><div className="flex items-center gap-2"><t.icon className="w-4 h-4" />{t.label}</div></SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {isCreatorVendor && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 font-medium mb-2">Creator Work Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-purple-700">Campaign/Project</label><Input value={formData.campaign_project} onChange={(e) => setFormData(f => ({...f, campaign_project: e.target.value}))} className="bg-white border-purple-200 mt-1" placeholder="Campaign name" /></div>
                  <div><label className="text-xs text-purple-700">Deliverable Type</label>
                    <Select value={formData.deliverable_type || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, deliverable_type: v === "placeholder" ? "" : v}))}>
                      <SelectTrigger className="bg-white border-purple-200 mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="placeholder" disabled>Select</SelectItem><SelectItem value="post">Post</SelectItem><SelectItem value="reel">Reel</SelectItem><SelectItem value="story">Story</SelectItem><SelectItem value="video">Video</SelectItem><SelectItem value="blog">Blog</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <div><label className="text-sm font-medium text-[#4A3728]">Work Description *</label><Textarea value={formData.work_description} onChange={(e) => setFormData(f => ({...f, work_description: e.target.value}))} className="bg-white border-[#D4BBA6]" rows={3} /></div>
            <div><label className="text-sm font-medium text-[#4A3728]">Agreed Amount</label><Input type="number" value={formData.agreed_amount} onChange={(e) => setFormData(f => ({...f, agreed_amount: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="0.00" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#4A3728]">Start Date</label><Input type="date" value={formData.start_date} onChange={(e) => setFormData(f => ({...f, start_date: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
              <div><label className="text-sm font-medium text-[#4A3728]">Expected Completion</label><Input type="date" value={formData.expected_completion_date} onChange={(e) => setFormData(f => ({...f, expected_completion_date: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleCreateOrder} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Work Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-[#F5EDE5]">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="payments">Payments {paymentsData?.payments?.length > 0 && `(${paymentsData.payments.length})`}</TabsTrigger>
                <TabsTrigger value="po-invoice">PO/Invoice</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[#8B7355]">{selectedOrder.work_order_id}</span>
                    {getStatusBadge(selectedOrder.status)}
                    {getTypeBadge(selectedOrder.order_type)}
                  </div>
                  {selectedOrder.status === 'in_progress' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')} className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Package className="w-4 h-4 mr-1" /> Mark as Delivered
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Vendor</p><p className="font-semibold text-[#4A3728]">{selectedOrder.vendor_name}</p></div>
                  <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Department</p><p className="font-semibold text-[#4A3728]">{selectedOrder.department}</p></div>
                  <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Assigned To</p><p className="font-semibold text-[#4A3728]">{selectedOrder.assigned_owner_name || '-'}</p></div>
                  <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Created By</p><p className="font-semibold text-[#4A3728]">{selectedOrder.created_by_name}</p></div>
                  {selectedOrder.start_date && <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Start Date</p><p className="font-semibold text-[#4A3728]">{formatDate(selectedOrder.start_date)}</p></div>}
                  {selectedOrder.agreed_amount && <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Agreed Amount</p><p className="font-semibold text-emerald-600">{formatCurrency(selectedOrder.agreed_amount)}</p></div>}
                </div>
                <div><p className="text-xs text-[#8B7355] mb-1">Work Description</p><p className="text-sm text-[#4A3728] bg-[#F5EDE5] p-3 rounded-lg">{selectedOrder.work_description}</p></div>
                {selectedOrder.campaign_project && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 font-medium mb-2">Creator Work Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-purple-600">Campaign:</span> {selectedOrder.campaign_project}</div>
                      <div><span className="text-purple-600">Deliverable:</span> {selectedOrder.deliverable_type || '-'}</div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[#4A3728]">Payment Requests</h4>
                  <Button size="sm" onClick={() => setShowPaymentDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"><Plus className="w-4 h-4 mr-1" /> New Payment</Button>
                </div>
                {paymentsData && (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-[#F5EDE5] rounded-lg">
                    <div className="text-center"><p className="text-xs text-[#8B7355]">Total Requested</p><p className="text-xl font-bold text-[#4A3728]">{formatCurrency(paymentsData.summary?.total_requested)}</p></div>
                    <div className="text-center border-l border-r border-[#D4BBA6]"><p className="text-xs text-[#8B7355]">Total Paid</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(paymentsData.summary?.total_paid)}</p></div>
                    <div className="text-center"><p className="text-xs text-[#8B7355]">Pending</p><p className="text-xl font-bold text-amber-600">{formatCurrency(paymentsData.summary?.pending)}</p></div>
                  </div>
                )}
                {paymentsData?.payments?.length > 0 ? (
                  <div className="space-y-2">
                    {paymentsData.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-[#E8D5C4] rounded-lg">
                        <div>
                          <p className="font-medium text-[#4A3728]">{p.title}</p>
                          <p className="text-xs text-[#8B7355]">{p.payment_type?.replace(/_/g, ' ')} - {formatDate(p.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#4A3728]">{formatCurrency(p.amount)}</p>
                          <Badge className={p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{p.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#8B7355]"><DollarSign className="w-12 h-12 mx-auto mb-2 text-[#D4BBA6]" /><p>No payment requests yet</p></div>
                )}
              </TabsContent>

              <TabsContent value="po-invoice" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[#4A3728]">PO/Invoice Records</h4>
                  <Button size="sm" onClick={() => setShowPODialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"><Plus className="w-4 h-4 mr-1" /> Add Record</Button>
                </div>
                {selectedOrder.po_invoices?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.po_invoices.map((po, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[#E8D5C4] rounded-lg">
                        <div>
                          {po.po_number && <p className="text-sm"><span className="text-[#8B7355]">PO:</span> <span className="font-mono">{po.po_number}</span></p>}
                          {po.invoice_number && <p className="text-sm"><span className="text-[#8B7355]">Invoice:</span> <span className="font-mono">{po.invoice_number}</span></p>}
                        </div>
                        <p className="font-bold text-[#4A3728]">{formatCurrency(po.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#8B7355]"><Receipt className="w-12 h-12 mx-auto mb-2 text-[#D4BBA6]" /><p>No PO/Invoice records yet</p></div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Create Payment Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-[#4A3728]">Payment Type</label>
              <Select value={paymentForm.payment_type} onValueChange={(v) => setPaymentForm(f => ({...f, payment_type: v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}><div className="flex items-center gap-2"><t.icon className="w-4 h-4" />{t.label}</div></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium text-[#4A3728]">Amount *</label><Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm(f => ({...f, amount: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="0.00" /></div>
            <div><label className="text-sm font-medium text-[#4A3728]">Description</label><Textarea value={paymentForm.description} onChange={(e) => setPaymentForm(f => ({...f, description: e.target.value}))} className="bg-white border-[#D4BBA6]" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#4A3728]">PO Number</label><Input value={paymentForm.po_number} onChange={(e) => setPaymentForm(f => ({...f, po_number: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
              <div><label className="text-sm font-medium text-[#4A3728]">Invoice Number</label><Input value={paymentForm.invoice_number} onChange={(e) => setPaymentForm(f => ({...f, invoice_number: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleCreatePayment} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Create Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Dialog */}
      <Dialog open={showPODialog} onOpenChange={setShowPODialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Add PO/Invoice Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-[#4A3728]">PO Number</label><Input value={poForm.po_number} onChange={(e) => setPoForm(f => ({...f, po_number: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
            <div><label className="text-sm font-medium text-[#4A3728]">Invoice Number</label><Input value={poForm.invoice_number} onChange={(e) => setPoForm(f => ({...f, invoice_number: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
            <div><label className="text-sm font-medium text-[#4A3728]">Amount</label><Input type="number" value={poForm.amount} onChange={(e) => setPoForm(f => ({...f, amount: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="0.00" /></div>
            <div><label className="text-sm font-medium text-[#4A3728]">Notes</label><Textarea value={poForm.notes} onChange={(e) => setPoForm(f => ({...f, notes: e.target.value}))} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPODialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleCreatePO} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Add Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkOrders;
