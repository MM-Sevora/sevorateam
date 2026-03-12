import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import {
  CreditCard, Plus, Clock, CheckCircle, XCircle, DollarSign, Search,
  Building2, FileText, Calendar, Send, Loader2, ArrowUpDown, ArrowUp, ArrowDown,
  X, Eye, Home, Zap, Users, Wrench, Receipt, Briefcase, Car, ShoppingCart,
  GraduationCap, Heart, Phone, Wifi, Package, AlertCircle
} from 'lucide-react';

// Expanded categories with icons
const PAYMENT_CATEGORIES = [
  { value: 'rent', label: 'Rent', icon: Home, color: 'bg-blue-100 text-blue-700' },
  { value: 'utilities', label: 'Utilities (Electricity/Water/Gas)', icon: Zap, color: 'bg-amber-100 text-amber-700' },
  { value: 'payroll', label: 'Payroll', icon: Users, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'tools', label: 'Tools & Equipment', icon: Wrench, color: 'bg-purple-100 text-purple-700' },
  { value: 'reimbursement', label: 'Reimbursement', icon: Receipt, color: 'bg-orange-100 text-orange-700' },
  { value: 'software', label: 'Software & Subscriptions', icon: Package, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'services', label: 'Professional Services', icon: Briefcase, color: 'bg-teal-100 text-teal-700' },
  { value: 'travel', label: 'Travel & Transport', icon: Car, color: 'bg-pink-100 text-pink-700' },
  { value: 'supplies', label: 'Office Supplies', icon: ShoppingCart, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'training', label: 'Training & Education', icon: GraduationCap, color: 'bg-violet-100 text-violet-700' },
  { value: 'insurance', label: 'Insurance', icon: Heart, color: 'bg-rose-100 text-rose-700' },
  { value: 'telecom', label: 'Telecom & Internet', icon: Wifi, color: 'bg-sky-100 text-sky-700' },
  { value: 'maintenance', label: 'Maintenance & Repairs', icon: Wrench, color: 'bg-slate-100 text-slate-700' },
  { value: 'vendor', label: 'Vendor Payment', icon: Building2, color: 'bg-stone-100 text-stone-700' },
  { value: 'other', label: 'Other', icon: FileText, color: 'bg-gray-100 text-gray-700' }
];

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production', 'IT'];

const PaymentRequests = () => {
  const { api, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionComments, setActionComments] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: '', category: '', department: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [formData, setFormData] = useState({
    title: '', vendor_name: '', amount: '', currency: 'INR', category: '',
    description: '', due_date: '', invoice_number: '', department: '',
    payment_method: '', account_details: '', reference_number: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, statsRes] = await Promise.all([
        api.get('/finance/payment-requests'),
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

  const openViewDialog = (request) => {
    setSelectedRequest(request);
    setShowViewDialog(true);
  };

  const openActionDialog = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setShowActionDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '', vendor_name: '', amount: '', currency: 'INR', category: '',
      description: '', due_date: '', invoice_number: '', department: '',
      payment_method: '', account_details: '', reference_number: ''
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
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-slate-100 text-slate-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
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

  const SortHeader = ({ column, label }) => (
    <TableHead className="cursor-pointer hover:bg-[#F5EDE5] select-none" onClick={() => handleSort(column)}>
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === column ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
      </div>
    </TableHead>
  );

  const clearFilters = () => { setFilters({ status: '', category: '', department: '' }); setSearchQuery(''); };
  const hasActiveFilters = filters.status || filters.category || filters.department || searchQuery;

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
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="create-payment-btn">
          <Plus className="w-4 h-4 mr-2" /> New Payment Request
        </Button>
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
                  <TableHead>Category</TableHead>
                  <SortHeader column="vendor_name" label="Payee" />
                  <SortHeader column="requester_name" label="Requested By" />
                  <SortHeader column="amount" label="Amount" />
                  <SortHeader column="due_date" label="Due Date" />
                  <SortHeader column="status" label="Status" />
                  <SortHeader column="created_at" label="Created" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRequests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-[#FDF8F3] cursor-pointer" onClick={() => openViewDialog(req)}>
                    <TableCell>
                      <div className="font-medium text-[#4A3728]">{req.title}</div>
                      {req.invoice_number && <div className="text-xs text-[#8B7355]">#{req.invoice_number}</div>}
                    </TableCell>
                    <TableCell>{getCategoryBadge(req.category)}</TableCell>
                    <TableCell className="text-[#8B7355]">{req.vendor_name || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm text-[#4A3728]">{req.requester_name}</div>
                      <div className="text-xs text-[#8B7355]">{req.requester_department}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-[#4A3728]">{formatCurrency(req.amount, req.currency)}</TableCell>
                    <TableCell>
                      {req.due_date ? (
                        <div className={`flex items-center gap-1 ${isOverdue(req.due_date) && req.status !== 'completed' ? 'text-red-600' : 'text-[#8B7355]'}`}>
                          {isOverdue(req.due_date) && req.status !== 'completed' && <AlertCircle className="w-3 h-3" />}
                          {formatDate(req.due_date)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-xs text-[#8B7355]">{formatDate(req.created_at)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog(req)} title="View"><Eye className="w-4 h-4 text-[#8B7355]" /></Button>
                        {req.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'approve')} title="Approve"><CheckCircle className="w-4 h-4 text-emerald-600" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'reject')} title="Reject"><XCircle className="w-4 h-4 text-red-600" /></Button>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <Button size="sm" variant="ghost" onClick={() => openActionDialog(req, 'process')} title="Process"><Send className="w-4 h-4 text-blue-600" /></Button>
                        )}
                        {req.status === 'processing' && (
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Due Date</label>
                <Input type="date" value={formData.due_date} onChange={(e) => setFormData(f => ({...f, due_date: e.target.value}))} className="bg-white border-[#D4BBA6]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Invoice/Reference #</label>
                <Input value={formData.invoice_number} onChange={(e) => setFormData(f => ({...f, invoice_number: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="INV-001" />
              </div>
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
                  <p className="font-medium text-[#4A3728]">{selectedRequest.requester_name}</p>
                  <p className="text-xs text-[#8B7355]">{selectedRequest.requester_department}</p>
                </div>
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355]">Created</p>
                  <p className="font-medium text-[#4A3728]">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>

              {selectedRequest.description && (
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355] mb-1">Description</p>
                  <p className="text-sm text-[#4A3728]">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.comments?.length > 0 && (
                <div className="bg-[#F5EDE5] p-3 rounded-lg">
                  <p className="text-xs text-[#8B7355] mb-2">Activity</p>
                  <div className="space-y-2">
                    {selectedRequest.comments.map((c, i) => (
                      <div key={i} className="text-sm border-l-2 border-[#D4BBA6] pl-2">
                        <p className="text-[#4A3728]">{c.text}</p>
                        <p className="text-xs text-[#8B7355]">{c.user_name} - {formatDate(c.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button onClick={() => { setShowViewDialog(false); openActionDialog(selectedRequest, 'approve'); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </Button>
                    <Button onClick={() => { setShowViewDialog(false); openActionDialog(selectedRequest, 'reject'); }} variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </>
                )}
                {selectedRequest.status === 'approved' && (
                  <Button onClick={() => { setShowViewDialog(false); openActionDialog(selectedRequest, 'process'); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="w-4 h-4 mr-2" /> Process Payment
                  </Button>
                )}
                {selectedRequest.status === 'processing' && (
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
          <DialogHeader><DialogTitle className="text-[#4A3728] capitalize">{actionType} Payment Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#8B7355]">
              {actionType === 'approve' && 'This will approve the payment request for processing.'}
              {actionType === 'reject' && 'This will reject the payment request.'}
              {actionType === 'process' && 'This will mark the payment as being processed.'}
              {actionType === 'complete' && 'This will mark the payment as completed.'}
            </p>
            {selectedRequest && (
              <div className="p-3 bg-[#F5EDE5] rounded-lg">
                <p className="font-medium text-[#4A3728]">{selectedRequest.title}</p>
                <p className="text-lg font-bold text-[#4A3728]">{formatCurrency(selectedRequest.amount, selectedRequest.currency)}</p>
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
              {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentRequests;
