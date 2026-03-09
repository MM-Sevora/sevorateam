import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Upload, FileText, DollarSign, Clock, CheckCircle, 
  XCircle, Download, Eye, Filter, RefreshCw, Send, Receipt,
  TrendingUp, Calendar, Building2, User
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'others', label: 'Others' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const ExpenseManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('submit');
  const [loading, setLoading] = useState(false);
  
  // Stats
  const [myStats, setMyStats] = useState(null);
  const [hrStats, setHrStats] = useState(null);
  
  // Claims
  const [myClaims, setMyClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  
  // New claim form
  const [entries, setEntries] = useState([{
    expense_date_from: '',
    expense_date_to: '',
    category: '',
    description: '',
    amount: '',
    receipt_url: null,
    receipt_filename: null
  }]);
  const [notes, setNotes] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  
  // Review modal
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [hrNotes, setHrNotes] = useState('');
  
  const isHR = user?.role === 'admin' || user?.department === 'admin' || user?.department === 'hr';

  useEffect(() => {
    fetchMyStats();
    fetchMyClaims();
    if (isHR) {
      fetchHRStats();
      fetchAllClaims();
    }
  }, []);

  const fetchMyStats = async () => {
    try {
      const res = await api.get('/expense/claims/my/stats');
      setMyStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchHRStats = async () => {
    try {
      const res = await api.get('/expense/claims/stats');
      setHrStats(res.data);
    } catch (err) {
      console.error('Failed to fetch HR stats:', err);
    }
  };

  const fetchMyClaims = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/expense/claims/my${params}`);
      setMyClaims(res.data || []);
    } catch (err) {
      toast.error('Failed to load claims');
    }
    setLoading(false);
  };

  const fetchAllClaims = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/expense/claims${params}`);
      setAllClaims(res.data || []);
    } catch (err) {
      console.error('Failed to load all claims:', err);
    }
    setLoading(false);
  };

  const addEntry = () => {
    setEntries([...entries, {
      expense_date_from: '',
      expense_date_to: '',
      category: '',
      description: '',
      amount: '',
      receipt_url: null,
      receipt_filename: null
    }]);
  };

  const removeEntry = (index) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleFileUpload = async (index, file) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/expense/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      updateEntry(index, 'receipt_url', res.data.url);
      updateEntry(index, 'receipt_filename', res.data.filename);
      toast.success('Receipt uploaded');
    } catch (err) {
      toast.error('Failed to upload receipt');
    }
  };

  const calculateTotal = () => {
    return entries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  };

  const handleSubmit = async () => {
    // Validate
    if (!declarationAccepted) {
      toast.error('Please accept the declaration');
      return;
    }
    
    const validEntries = entries.filter(e => 
      e.expense_date_from && e.category && e.description && e.amount
    );
    
    if (validEntries.length === 0) {
      toast.error('Please add at least one complete expense entry');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        entries: validEntries.map(e => ({
          ...e,
          amount: parseFloat(e.amount),
          expense_date_to: e.expense_date_to || e.expense_date_from
        })),
        declaration_accepted: true,
        notes
      };
      
      const res = await api.post('/expense/claims', payload);
      toast.success(`Claim submitted! ID: ${res.data.claim_id}`);
      
      // Reset form
      setEntries([{
        expense_date_from: '',
        expense_date_to: '',
        category: '',
        description: '',
        amount: '',
        receipt_url: null,
        receipt_filename: null
      }]);
      setNotes('');
      setDeclarationAccepted(false);
      
      // Refresh data
      fetchMyStats();
      fetchMyClaims();
      setActiveTab('history');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit claim');
    }
    setSubmitting(false);
  };

  const handleApprove = async () => {
    if (!selectedClaim) return;
    
    try {
      await api.put(`/expense/claims/${selectedClaim.id}/approve`, null, {
        params: { hr_notes: hrNotes || undefined }
      });
      toast.success('Claim approved');
      setShowReviewModal(false);
      setSelectedClaim(null);
      fetchAllClaims();
      fetchHRStats();
    } catch (err) {
      toast.error('Failed to approve claim');
    }
  };

  const handleReject = async () => {
    if (!selectedClaim || !rejectReason) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    try {
      await api.put(`/expense/claims/${selectedClaim.id}/reject`, null, {
        params: { rejection_reason: rejectReason, hr_notes: hrNotes || undefined }
      });
      toast.success('Claim rejected');
      setShowReviewModal(false);
      setSelectedClaim(null);
      setRejectReason('');
      fetchAllClaims();
      fetchHRStats();
    } catch (err) {
      toast.error('Failed to reject claim');
    }
  };

  const openReview = (claim) => {
    setSelectedClaim(claim);
    setRejectReason('');
    setHrNotes('');
    setShowReviewModal(true);
  };

  const exportCSV = async () => {
    try {
      const res = await api.get('/expense/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expense_claims.csv';
      a.click();
    } catch (err) {
      toast.error('Failed to export');
    }
  };

  return (
    <div className="p-8 space-y-6" data-testid="expense-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Expense & Reimbursement</h1>
          <p className="text-[#6B5D52] mt-1">Submit and track expense claims</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchMyClaims(); if(isHR) fetchAllClaims(); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          {isHR && (
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Claims</p>
                <p className="text-2xl font-bold text-blue-700">{myStats?.total_claims || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">Pending</p>
                <p className="text-2xl font-bold text-amber-700">{myStats?.pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Total Claimed</p>
                <p className="text-2xl font-bold text-green-700">₹{(myStats?.total_claimed || 0).toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600">Total Approved</p>
                <p className="text-2xl font-bold text-emerald-700">₹{(myStats?.total_approved || 0).toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5EDE4]">
          <TabsTrigger value="submit" data-testid="tab-submit">
            <Plus className="w-4 h-4 mr-2" /> Submit Claim
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <FileText className="w-4 h-4 mr-2" /> My Claims
          </TabsTrigger>
          {isHR && (
            <TabsTrigger value="approval" data-testid="tab-approval">
              <CheckCircle className="w-4 h-4 mr-2" /> HR Approval
            </TabsTrigger>
          )}
        </TabsList>

        {/* Submit Claim Tab */}
        <TabsContent value="submit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" /> New Expense Claim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employee Info (Auto-filled) */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-xs text-gray-500">Employee Name</Label>
                  <p className="font-medium">{user?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="font-medium">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Date of Submission</Label>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Expense Entries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Expense Entries</Label>
                  <Button variant="outline" size="sm" onClick={addEntry}>
                    <Plus className="w-4 h-4 mr-2" /> Add Expense
                  </Button>
                </div>

                {entries.map((entry, index) => (
                  <Card key={index} className="border-dashed">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Entry {index + 1}</Badge>
                        {entries.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeEntry(index)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Expense Date (From) *</Label>
                          <Input
                            type="date"
                            value={entry.expense_date_from}
                            onChange={(e) => updateEntry(index, 'expense_date_from', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Expense Date (To)</Label>
                          <Input
                            type="date"
                            value={entry.expense_date_to}
                            onChange={(e) => updateEntry(index, 'expense_date_to', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Category *</Label>
                          <Select
                            value={entry.category}
                            onValueChange={(v) => updateEntry(index, 'category', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Amount (₹) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={entry.amount}
                            onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Description *</Label>
                        <Input
                          placeholder="Brief description of the expense"
                          value={entry.description}
                          onChange={(e) => updateEntry(index, 'description', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Upload Bill/Receipt *</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(index, e.target.files[0])}
                            className="flex-1"
                          />
                          {entry.receipt_filename && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {entry.receipt_filename}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                <span className="text-lg font-semibold text-emerald-700">Total Claimed Amount</span>
                <span className="text-2xl font-bold text-emerald-700">₹{calculateTotal().toLocaleString()}</span>
              </div>

              {/* Notes */}
              <div>
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  placeholder="Any additional information..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Declaration */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  id="declaration"
                  checked={declarationAccepted}
                  onCheckedChange={setDeclarationAccepted}
                />
                <Label htmlFor="declaration" className="text-sm leading-relaxed cursor-pointer">
                  I confirm that the above expenses were incurred for official purposes and the supporting documents uploaded are genuine.
                </Label>
              </div>

              {/* Submit Button */}
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSubmit}
                disabled={submitting || !declarationAccepted || calculateTotal() <= 0}
              >
                {submitting ? (
                  <>Submitting...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit Expense Claim</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Claims History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Claim History</CardTitle>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : myClaims.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No claims found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myClaims.map((claim) => {
                      const statusConfig = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
                      const StatusIcon = statusConfig.icon;
                      return (
                        <TableRow key={claim.id}>
                          <TableCell className="font-mono font-medium">{claim.claim_id}</TableCell>
                          <TableCell>{new Date(claim.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{claim.entries?.length || 0} items</TableCell>
                          <TableCell className="font-medium">₹{claim.total_amount?.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openReview(claim)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HR Approval Tab */}
        {isHR && (
          <TabsContent value="approval" className="mt-6">
            {/* HR Stats */}
            {hrStats && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-700">{hrStats.total_claims}</p>
                    <p className="text-sm text-blue-600">Total Claims</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-amber-700">{hrStats.pending}</p>
                    <p className="text-sm text-amber-600">Pending Review</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-700">₹{(hrStats.this_month?.approved_amount || 0).toLocaleString()}</p>
                    <p className="text-sm text-green-600">Approved (This Month)</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-purple-700">₹{(hrStats.this_month?.pending_amount || 0).toLocaleString()}</p>
                    <p className="text-sm text-purple-600">Pending (This Month)</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Expense Claims</CardTitle>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); fetchAllClaims(); }}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : allClaims.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No claims found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Claim ID</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allClaims.map((claim) => {
                        const statusConfig = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
                        const StatusIcon = statusConfig.icon;
                        return (
                          <TableRow key={claim.id}>
                            <TableCell className="font-mono font-medium">{claim.claim_id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{claim.employee_name}</p>
                                <p className="text-xs text-gray-500">{claim.employee_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{claim.department_name || '-'}</TableCell>
                            <TableCell>{new Date(claim.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">₹{claim.total_amount?.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant={claim.status === 'pending' ? 'default' : 'ghost'} 
                                size="sm" 
                                onClick={() => openReview(claim)}
                                className={claim.status === 'pending' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                              >
                                {claim.status === 'pending' ? 'Review' : <Eye className="w-4 h-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Claim Details - {selectedClaim?.claim_id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClaim && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Employee</p>
                    <p className="font-medium">{selectedClaim.employee_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="font-medium">{selectedClaim.department_name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Submitted</p>
                    <p className="font-medium">{new Date(selectedClaim.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="font-medium text-lg">₹{selectedClaim.total_amount?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Expense Entries */}
              <div>
                <Label className="text-sm font-semibold">Expense Entries</Label>
                <div className="space-y-2 mt-2">
                  {selectedClaim.entries?.map((entry, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {EXPENSE_CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                          </Badge>
                          <p className="font-medium">{entry.description}</p>
                          <p className="text-xs text-gray-500">
                            {entry.expense_date_from} {entry.expense_date_to && entry.expense_date_to !== entry.expense_date_from ? `- ${entry.expense_date_to}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{entry.amount?.toLocaleString()}</p>
                          {entry.receipt_url && (
                            <a 
                              href={`${process.env.REACT_APP_BACKEND_URL}${entry.receipt_url}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> View Receipt
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status & Actions */}
              {selectedClaim.status === 'pending' && isHR ? (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label>HR Notes (Optional)</Label>
                    <Textarea
                      placeholder="Add notes..."
                      value={hrNotes}
                      onChange={(e) => setHrNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Rejection Reason (Required if rejecting)</Label>
                    <Textarea
                      placeholder="Reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={handleReject}>
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={STATUS_CONFIG[selectedClaim.status]?.color}>
                      {STATUS_CONFIG[selectedClaim.status]?.label}
                    </Badge>
                    {selectedClaim.reviewed_at && (
                      <span className="text-xs text-gray-500">
                        on {new Date(selectedClaim.reviewed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {selectedClaim.rejection_reason && (
                    <p className="text-sm text-red-600">
                      <strong>Reason:</strong> {selectedClaim.rejection_reason}
                    </p>
                  )}
                  {selectedClaim.hr_notes && (
                    <p className="text-sm text-gray-600">
                      <strong>HR Notes:</strong> {selectedClaim.hr_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseManagement;
