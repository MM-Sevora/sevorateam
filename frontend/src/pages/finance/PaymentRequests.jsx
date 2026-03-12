import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import {
  CreditCard, Plus, Clock, CheckCircle, XCircle, DollarSign, Search,
  Building2, FileText, Send, Loader2, ArrowUpDown, ArrowUp, ArrowDown,
  X, Eye, Home, Zap, Users, Wrench, Receipt, Briefcase, Car, ShoppingCart,
  GraduationCap, Heart, Wifi, Package, AlertCircle, Banknote, History, ExternalLink, Settings
} from 'lucide-react';

// Payment categories with module mapping
const PAYMENT_CATEGORIES = [
  { value: 'rent', label: 'Rent', icon: Home, color: 'bg-blue-100 text-blue-700', module: 'finance' },
  { value: 'utilities', label: 'Utilities', icon: Zap, color: 'bg-amber-100 text-amber-700', module: 'finance' },
  { value: 'payroll', label: 'Payroll', icon: Users, color: 'bg-emerald-100 text-emerald-700', module: 'hr' },
  { value: 'tools', label: 'Tools & Equipment', icon: Wrench, color: 'bg-purple-100 text-purple-700', module: 'operations' },
  { value: 'reimbursement', label: 'Reimbursement', icon: Receipt, color: 'bg-orange-100 text-orange-700', module: 'hr', linkPath: '/hr/reimbursements' },
  { value: 'software', label: 'Software', icon: Package, color: 'bg-indigo-100 text-indigo-700', module: 'it' },
  { value: 'services', label: 'Services', icon: Briefcase, color: 'bg-teal-100 text-teal-700', module: 'operations' },
  { value: 'travel', label: 'Travel', icon: Car, color: 'bg-pink-100 text-pink-700', module: 'hr' },
  { value: 'supplies', label: 'Supplies', icon: ShoppingCart, color: 'bg-cyan-100 text-cyan-700', module: 'operations' },
  { value: 'training', label: 'Training', icon: GraduationCap, color: 'bg-violet-100 text-violet-700', module: 'hr' },
  { value: 'insurance', label: 'Insurance', icon: Heart, color: 'bg-rose-100 text-rose-700', module: 'finance' },
  { value: 'telecom', label: 'Telecom', icon: Wifi, color: 'bg-sky-100 text-sky-700', module: 'it' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'bg-slate-100 text-slate-700', module: 'operations' },
  { value: 'vendor', label: 'Vendor Payment', icon: Building2, color: 'bg-stone-100 text-stone-700', module: 'vendors', linkPath: '/vendors/work-orders' },
  { value: 'other', label: 'Other', icon: FileText, color: 'bg-gray-100 text-gray-700', module: 'finance' }
];

const SOURCE_TYPES = [
  { value: 'direct', label: 'Direct Request' },
  { value: 'work_order', label: 'Vendor Work Order' },
  { value: 'reimbursement', label: 'Employee Reimbursement' },
  { value: 'recurring', label: 'Recurring Payment' }
];

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production', 'IT'];

const PaymentRequests = () => {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionComments, setActionComments] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ payment_reference: '', payment_date: '', payment_method: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: '', category: '', department: '', source_type: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [formData, setFormData] = useState({
    title: '', vendor_name: '', amount: '', currency: 'INR', category: '',
    description: '', due_date: '', invoice_number: '', department: '',
    payment_method: '', account_details: '', reference_number: '',
    source_type: 'direct', source_reference: '', requested_by_id: '', requested_by_name: ''
  });
  const [employees, setEmployees] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, statsRes, employeesRes, workOrdersRes] = await Promise.all([
        api.get('/finance/payment-requests'),
        api.get('/finance/payment-requests/summary/stats'),
        api.get('/employees').catch(() => ({ data: { employees: [] } })),
        api.get('/vendors/work-orders').catch(() => ({ data: { work_orders: [] } }))
      ]);
      setRequests(requestsRes.data.requests || []);
      setStats(statsRes.data);
      setEmployees(employeesRes.data.employees || []);
      setWorkOrders(workOrdersRes.data.work_orders || []);
    } catch (error) {
      console.error('Failed to fetch payment requests:', error);
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    try {
      if (!formData.title || !formData.amount || !formData.category) {
        toast.error('Please fill in all required fields');
        return;
      }
      await api.post('/finance/payment-requests', {
        ...formData,
        amount: parseFloat(formData.amount),
        vendor_name: formData.vendor_name || formData.category
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
      const payload = {
        action: actionType,
        comments: actionComments,
        level: selectedRequest?.current_approval_level
      };
      
      // Include payment details for mark_paid action
      if (actionType === 'mark_paid') {
        payload.payment_reference = paymentDetails.payment_reference;
        payload.payment_date = paymentDetails.payment_date;
      }
      
      await api.post(`/finance/payment-requests/${selectedRequest.id}/action`, payload);
      toast.success(`Request ${actionType.replace('_', ' ')} successful`);
      setShowActionDialog(false);
      setShowPaymentDialog(false);
      setSelectedRequest(null);
      setActionComments('');
      setPaymentDetails({ payment_reference: '', payment_date: '', payment_method: '' });
      fetchData();
    } catch (error) {
      toast.error(`Failed to ${actionType.replace('_', ' ')} request`);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      await api.put(`/finance/payment-requests/${selectedRequest.id}/payment-status`, {
        status: 'paid',
        payment_reference: paymentDetails.payment_reference,
        payment_date: paymentDetails.payment_date,
        payment_method: paymentDetails.payment_method,
        comments: actionComments
      });
      toast.success('Payment marked as paid');
      setShowPaymentDialog(false);
      setSelectedRequest(null);
      setPaymentDetails({ payment_reference: '', payment_date: '', payment_method: '' });
      setActionComments('');
      fetchData();
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const openViewDialog = (request) => {
    setSelectedRequest(request);
    setShowViewDialog(true);
  };

  const openActionDialog = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    if (action === 'mark_paid') {
      setShowPaymentDialog(true);
    } else {
      setShowActionDialog(true);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', vendor_name: '', amount: '', currency: 'INR', category: '',
      description: '', due_date: '', invoice_number: '', department: '',
      payment_method: '', account_details: '', reference_number: '',
      source_type: 'direct', source_reference: '', requested_by_id: '', requested_by_name: ''
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredAndSortedRequests = useMemo(() => {
    let result = [...requests];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.title?.toLowerCase().includes(q) || 
        r.vendor_name?.toLowerCase().includes(q) ||
        r.invoice_number?.toLowerCase().includes(q) ||
        r.requester_name?.toLowerCase().includes(q)
      );
    }
    if (filters.status) result = result.filter(r => r.status === filters.status);
    if (filters.category) result = result.filter(r => r.category === filters.category);
    if (filters.department) result = result.filter(r => r.requester_department === filters.department);
    if (filters.source_type) result = result.filter(r => r.source_type === filters.source_type);
    
    result.sort((a, b) => {
      let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
      if (sortConfig.key === 'amount') {
        aVal = parseFloat(aVal) || 0; bVal = parseFloat(bVal) || 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal?.toLowerCase() || ''; bVal = bVal?.toLowerCase() || '';
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [requests, searchQuery, filters, sortConfig]);

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-amber-100 text-amber-700',
      pending_approval: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      processing: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-slate-100 text-slate-700'
    };
    const labels = {
      pending_approval: 'Pending Approval',
      draft: 'Draft'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const styles = {
      unpaid: 'bg-red-50 text-red-600 border border-red-200',
      partial: 'bg-amber-50 text-amber-600 border border-amber-200',
      paid: 'bg-green-50 text-green-600 border border-green-200'
    };
    return <Badge className={styles[paymentStatus] || 'bg-gray-100'}>{paymentStatus || 'unpaid'}</Badge>;
  };

  const getApprovalBadge = (req) => {
    if (!req.requires_approval) return <Badge className="bg-gray-50 text-gray-500">N/A</Badge>;
    const approved = req.approvals?.filter(a => a.status === 'approved').length || 0;
    const total = req.approval_levels?.length || 0;
    if (req.approval_status === 'approved') return <Badge className="bg-green-50 text-green-600">{approved}/{total}</Badge>;
    if (req.approval_status === 'rejected') return <Badge className="bg-red-50 text-red-600">Rejected</Badge>;
    return <Badge className="bg-amber-50 text-amber-600">{approved}/{total}</Badge>;
  };

  const getCategoryBadge = (categoryValue) => {
    const category = PAYMENT_CATEGORIES.find(c => c.value === categoryValue);
    if (!category) return <Badge className="bg-gray-100 text-gray-700">{categoryValue}</Badge>;
    const Icon = category.icon;
    return (
      <Badge className={category.color}>
        <Icon className="w-3 h-3 mr-1" /> {category.label}
      </Badge>
    );
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount || 0);
  };

  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '-';

  const getSourceBadge = (sourceType, sourceRef) => {
    const styles = {
      direct: 'bg-gray-100 text-gray-600',
      work_order: 'bg-blue-100 text-blue-700',
      reimbursement: 'bg-orange-100 text-orange-700',
      recurring: 'bg-purple-100 text-purple-700'
    };
    const labels = { direct: 'Direct', work_order: 'Work Order', reimbursement: 'Reimbursement', recurring: 'Recurring' };
    return (
      <div>
        <Badge className={styles[sourceType] || 'bg-gray-100'}>{labels[sourceType] || sourceType || 'Direct'}</Badge>
        {sourceRef && <div className="text-xs text-[#8B7355] mt-0.5">{sourceRef}</div>}
      </div>
    );
  };

  const SortHeader = ({ column, label }) => (
    <TableHead className="cursor-pointer hover:bg-[#F5EDE5] select-none" onClick={() => handleSort(column)}>
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === column ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
      </div>
    </TableHead>
  );

  const clearFilters = () => { setFilters({ status: '', category: '', department: '', source_type: '' }); setSearchQuery(''); };
  const hasActiveFilters = filters.status || filters.category || filters.department || filters.source_type || searchQuery;

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="payment-requests-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Payment Requests</h1>
          <p className="text-[#8B7355]">{filteredAndSortedRequests.length} of {requests.length} requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/finance/payment-categories')} className="border-[#D4BBA6] text-[#4A3728]">
            <Settings className="w-4 h-4 mr-2" /> Categories
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="create-payment-btn">
            <Plus className="w-4 h-4 mr-2" /> New Payment Request
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-600" />
            <p className="text-2xl font-bold text-amber-600">{stats?.pending_count || 0}</p>
            <p className="text-xs text-[#8B7355]">Pending</p>
            <p className="text-xs font-medium text-amber-600">{formatCurrency(stats?.pending_amount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-600">{stats?.by_status?.approved?.count || 0}</p>
            <p className="text-xs text-[#8B7355]">Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Send className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{stats?.by_status?.processing?.count || 0}</p>
            <p className="text-xs text-[#8B7355]">Processing</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{stats?.by_status?.completed?.count || 0}</p>
            <p className="text-xs text-[#8B7355]">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <CreditCard className="w-6 h-6 mx-auto mb-2 text-[#4A3728]" />
            <p className="text-2xl font-bold text-[#4A3728]">{stats?.this_month?.count || 0}</p>
            <p className="text-xs text-[#8B7355]">This Month</p>
            <p className="text-xs font-medium text-[#4A3728]">{formatCurrency(stats?.this_month?.total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input placeholder="Search requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white border-[#D4BBA6]" />
            </div>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters(f => ({...f, status: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.category || "all"} onValueChange={(v) => setFilters(f => ({...f, category: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[180px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PAYMENT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.department || "all"} onValueChange={(v) => setFilters(f => ({...f, department: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.source_type || "all"} onValueChange={(v) => setFilters(f => ({...f, source_type: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
            <div className="text-center py-12 text-[#8B7355]"><CreditCard className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" /><p>No payment requests found</p></div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F5EDE5]">
                <TableRow>
                  <SortHeader column="title" label="Request" />
                  <TableHead>Source</TableHead>
                  <TableHead>Category</TableHead>
                  <SortHeader column="vendor_name" label="Payee" />
                  <SortHeader column="amount" label="Amount" />
                  <SortHeader column="requester_name" label="Requested By" />
                  <SortHeader column="due_date" label="Due Date" />
                  <TableHead>Approval</TableHead>
                  <TableHead>Payment</TableHead>
                  <SortHeader column="status" label="Status" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRequests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-[#FDF8F3] cursor-pointer" onClick={() => openViewDialog(req)}>
                    <TableCell>
                      <div className="font-medium text-[#4A3728]">{req.title}</div>
                      {req.request_number && <div className="text-xs text-[#8B7355]">{req.request_number}</div>}
                    </TableCell>
                    <TableCell>{getSourceBadge(req.source_type, req.source_reference)}</TableCell>
                    <TableCell>{getCategoryBadge(req.category)}</TableCell>
                    <TableCell className="text-[#8B7355] text-sm">{req.vendor_name || '-'}</TableCell>
                    <TableCell className="font-semibold text-[#4A3728]">{formatCurrency(req.amount, req.currency)}</TableCell>
                    <TableCell className="text-sm text-[#8B7355]">{req.requested_by_name || req.requester_name || '-'}</TableCell>
                    <TableCell className={`text-sm ${isOverdue(req.due_date) && req.status !== 'completed' && req.status !== 'paid' ? 'text-red-600 font-medium' : 'text-[#8B7355]'}`}>
                      {req.due_date ? formatDate(req.due_date) : '-'}
                    </TableCell>
                    <TableCell>{getApprovalBadge(req)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(req.payment_status)}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog(req)} title="View"><Eye className="w-4 h-4 text-[#8B7355]" /></Button>
                        {req.status === 'draft' && (
                          <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'submit')} title="Submit for Approval"><Send className="w-4 h-4 text-blue-600" /></Button>
                        )}
                        {req.status === 'pending_approval' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'approve')} title={`Approve (${req.current_approval_level})`}><CheckCircle className="w-4 h-4 text-emerald-600" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'reject')} title="Reject"><XCircle className="w-4 h-4 text-red-600" /></Button>
                          </>
                        )}
                        {(req.status === 'approved' || req.status === 'processing') && req.payment_status !== 'paid' && (
                          <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'mark_paid')} title="Mark as Paid"><Banknote className="w-4 h-4 text-green-600" /></Button>
                        )}
                        {req.status === 'paid' && (
                          <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'complete')} title="Complete"><CheckCircle className="w-4 h-4 text-purple-600" /></Button>
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
        <DialogContent className="bg-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#4A3728]">New Payment Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Source & Requester */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Request Source *</label>
                <Select value={formData.source_type} onValueChange={(v) => setFormData(f => ({...f, source_type: v, source_reference: ''}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">
                  {formData.source_type === 'work_order' ? 'Work Order' : 'Reference'}
                </label>
                {formData.source_type === 'work_order' ? (
                  <Select value={formData.source_reference || "placeholder"} onValueChange={(v) => {
                    if (v !== "placeholder") {
                      const wo = workOrders.find(w => w.work_order_id === v);
                      setFormData(f => ({
                        ...f, 
                        source_reference: v, 
                        vendor_name: wo?.vendor_name || f.vendor_name,
                        amount: wo?.agreed_amount || f.amount,
                        category: 'vendor'
                      }));
                    }
                  }}>
                    <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select WO" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>Select Work Order</SelectItem>
                      {workOrders.filter(wo => wo.status !== 'completed').map(wo => (
                        <SelectItem key={wo.work_order_id} value={wo.work_order_id}>{wo.work_order_id} - {wo.vendor_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={formData.source_reference} onChange={(e) => setFormData(f => ({...f, source_reference: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="Optional reference" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Requester</label>
                <Select value={formData.requested_by_id || "self"} onValueChange={(v) => {
                  if (v === "self") {
                    setFormData(f => ({...f, requested_by_id: '', requested_by_name: ''}));
                  } else {
                    const emp = employees.find(e => e.id === v);
                    setFormData(f => ({...f, requested_by_id: v, requested_by_name: emp?.name || ''}));
                  }
                }}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Self" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Self (Me)</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Department</label>
                <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#4A3728]">Payment Type *</label>
              <Select value={formData.category || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, category: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select payment type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select payment type</SelectItem>
                  {PAYMENT_CATEGORIES.map(c => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2"><Icon className="w-4 h-4" /> {c.label}</div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Title/Description *</label>
              <Input value={formData.title} onChange={(e) => setFormData(f => ({...f, title: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="e.g., March 2026 Office Rent" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Amount *</label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData(f => ({...f, amount: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="0.00" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Currency</label>
                <Select value={formData.currency} onValueChange={(v) => setFormData(f => ({...f, currency: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Payee/Vendor Name</label>
                <Input value={formData.vendor_name} onChange={(e) => setFormData(f => ({...f, vendor_name: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="Payee name" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Invoice/Reference #</label>
                <Input value={formData.invoice_number} onChange={(e) => setFormData(f => ({...f, invoice_number: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="INV-001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Due Date</label>
                <Input type="date" value={formData.due_date} onChange={(e) => setFormData(f => ({...f, due_date: e.target.value}))} className="bg-white border-[#D4BBA6]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Payment Method</label>
                <Select value={formData.payment_method || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, payment_method: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select method</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#4A3728]">Account/Payment Details</label>
              <Textarea value={formData.account_details} onChange={(e) => setFormData(f => ({...f, account_details: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="Bank account details, UPI ID, etc." rows={2} />
            </div>

            <div>
              <label className="text-sm font-medium text-[#4A3728]">Additional Notes</label>
              <Textarea value={formData.description} onChange={(e) => setFormData(f => ({...f, description: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="Any additional details..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleCreateRequest} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Payment Request Details</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#4A3728]">{selectedRequest.title}</h3>
                  {selectedRequest.invoice_number && <p className="text-sm text-[#8B7355]">#{selectedRequest.invoice_number}</p>}
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355]">Amount</p>
                  <p className="text-xl font-bold text-[#4A3728]">{formatCurrency(selectedRequest.amount, selectedRequest.currency)}</p>
                </div>
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355]">Category</p>
                  <div className="mt-1">{getCategoryBadge(selectedRequest.category)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355]">Payee</p>
                  <p className="font-medium text-[#4A3728]">{selectedRequest.vendor_name || '-'}</p>
                </div>
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355]">Due Date</p>
                  <p className={`font-medium ${isOverdue(selectedRequest.due_date) && selectedRequest.status !== 'completed' ? 'text-red-600' : 'text-[#4A3728]'}`}>
                    {formatDate(selectedRequest.due_date)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355]">Requested By</p>
                  <p className="font-medium text-[#4A3728]">{selectedRequest.requested_by_name || selectedRequest.requester_name}</p>
                  <p className="text-xs text-[#8B7355]">{selectedRequest.requester_department}</p>
                </div>
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355]">Payment Status</p>
                  <div className="mt-1">{getPaymentStatusBadge(selectedRequest.payment_status)}</div>
                  {selectedRequest.payment_reference && (
                    <p className="text-xs text-[#8B7355] mt-1">Ref: {selectedRequest.payment_reference}</p>
                  )}
                </div>
              </div>

              {/* Approval Status */}
              {selectedRequest.requires_approval && (
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355] mb-2">Approval Progress</p>
                  <div className="flex gap-2">
                    {selectedRequest.approval_levels?.map((level, i) => {
                      const approval = selectedRequest.approvals?.find(a => a.level === level);
                      return (
                        <div key={level} className={`flex-1 p-2 rounded text-center text-xs ${approval?.status === 'approved' ? 'bg-green-100 text-green-700' : approval?.status === 'rejected' ? 'bg-red-100 text-red-700' : selectedRequest.current_approval_level === level ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                          <p className="font-medium capitalize">{level}</p>
                          {approval && <p className="text-[10px] mt-1">{approval.approver_name}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Module Link */}
              {selectedRequest.source_reference && (
                <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600">Linked Source</p>
                    <p className="font-medium text-blue-700">{selectedRequest.source_reference}</p>
                  </div>
                  {PAYMENT_CATEGORIES.find(c => c.value === selectedRequest.category)?.linkPath && (
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => window.open(PAYMENT_CATEGORIES.find(c => c.value === selectedRequest.category)?.linkPath, '_blank')}>
                      <ExternalLink className="w-3 h-3 mr-1" /> View
                    </Button>
                  )}
                </div>
              )}

              {selectedRequest.description && (
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355] mb-1">Description</p>
                  <p className="text-sm text-[#4A3728]">{selectedRequest.description}</p>
                </div>
              )}

              {/* Activity Log */}
              {selectedRequest.activity_log?.length > 0 && (
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355] mb-2 flex items-center gap-1"><History className="w-3 h-3" /> Activity Log</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedRequest.activity_log.slice().reverse().map((a, i) => (
                      <div key={i} className="text-sm border-l-2 border-[#D4BBA6] pl-2">
                        <p className="text-[#4A3728]">{a.details || a.action}</p>
                        <p className="text-xs text-[#8B7355]">{a.user_name} - {formatDate(a.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedRequest.status === 'draft' && (
                  <Button onClick={() => { setShowViewDialog(false); openActionDialog(selectedRequest, 'submit'); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="w-4 h-4 mr-2" /> Submit for Approval
                  </Button>
                )}
                {selectedRequest.status === 'pending_approval' && (
                  <>
                    <Button onClick={() => { setShowViewDialog(false); openActionDialog(selectedRequest, 'approve'); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve ({selectedRequest.current_approval_level})
                    </Button>
                    <Button onClick={() => { setShowViewDialog(false); openActionDialog(selectedRequest, 'reject'); }} variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </>
                )}
                {(selectedRequest.status === 'approved' || selectedRequest.status === 'processing') && selectedRequest.payment_status !== 'paid' && (
                  <Button onClick={() => { setShowViewDialog(false); openActionDialog(selectedRequest, 'mark_paid'); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                    <Banknote className="w-4 h-4 mr-2" /> Mark as Paid
                  </Button>
                )}
                {selectedRequest.status === 'paid' && (
                  <Button onClick={() => { setShowViewDialog(false); openActionDialog(selectedRequest, 'complete'); }} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle className="text-[#4A3728] capitalize">{actionType?.replace('_', ' ')} Payment Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#8B7355]">
              {actionType === 'submit' && 'This will submit the request for approval.'}
              {actionType === 'approve' && `This will approve at ${selectedRequest?.current_approval_level} level.`}
              {actionType === 'reject' && 'This will reject the payment request.'}
              {actionType === 'process' && 'This will mark the payment as being processed.'}
              {actionType === 'complete' && 'This will mark the payment as completed.'}
            </p>
            {selectedRequest && (
              <div className="p-3 bg-[#F5EDE5] rounded-lg">
                <p className="font-medium text-[#4A3728]">{selectedRequest.title}</p>
                <p className="text-lg font-bold text-[#4A3728]">{formatCurrency(selectedRequest.amount, selectedRequest.currency)}</p>
                {selectedRequest.current_approval_level && (
                  <p className="text-xs text-[#8B7355] mt-1">Current Level: {selectedRequest.current_approval_level}</p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm text-[#8B7355]">Comments (optional)</label>
              <Textarea value={actionComments} onChange={(e) => setActionComments(e.target.value)} className="bg-white border-[#D4BBA6]" placeholder="Add a comment..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleAction} className={actionType === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#4A3728] hover:bg-[#5D4A3A] text-white'}>
              {actionType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Mark Payment as Paid</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedRequest && (
              <div className="p-3 bg-[#F5EDE5] rounded-lg">
                <p className="font-medium text-[#4A3728]">{selectedRequest.title}</p>
                <p className="text-lg font-bold text-[#4A3728]">{formatCurrency(selectedRequest.amount, selectedRequest.currency)}</p>
                <p className="text-xs text-[#8B7355]">Payee: {selectedRequest.vendor_name}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Payment Reference *</label>
                <Input 
                  value={paymentDetails.payment_reference} 
                  onChange={(e) => setPaymentDetails(p => ({...p, payment_reference: e.target.value}))} 
                  className="bg-white border-[#D4BBA6]" 
                  placeholder="UTR/Check #" 
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Payment Date</label>
                <Input 
                  type="date" 
                  value={paymentDetails.payment_date} 
                  onChange={(e) => setPaymentDetails(p => ({...p, payment_date: e.target.value}))} 
                  className="bg-white border-[#D4BBA6]" 
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Payment Method</label>
              <Select value={paymentDetails.payment_method || "placeholder"} onValueChange={(v) => setPaymentDetails(p => ({...p, payment_method: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select method</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Notes (optional)</label>
              <Textarea value={actionComments} onChange={(e) => setActionComments(e.target.value)} className="bg-white border-[#D4BBA6]" placeholder="Add payment notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleMarkAsPaid} className="bg-green-600 hover:bg-green-700 text-white">
              <Banknote className="w-4 h-4 mr-2" /> Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentRequests;
