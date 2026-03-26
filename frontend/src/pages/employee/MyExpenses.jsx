import React, { useState, useEffect } from 'react';
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
} from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Plus, Trash2, FileText, DollarSign, Clock, CheckCircle, 
  XCircle, Eye, RefreshCw, Send, Receipt,
  TrendingUp, Calendar, User, Edit2, UserCircle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

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

const MyExpenses = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('submit');
  const [loading, setLoading] = useState(false);
  
  // Stats
  const [myStats, setMyStats] = useState(null);
  
  // Claims
  const [myClaims, setMyClaims] = useState([]);
  
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
  
  // View modal
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // Edit and Delete
  const [editingClaim, setEditingClaim] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState(null);

  useEffect(() => {
    fetchMyStats();
    fetchMyClaims();
  }, []);

  const fetchMyStats = async () => {
    try {
      const res = await api.get('/expense/claims/my/stats');
      setMyStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchMyClaims = async (filterOverride = null) => {
    setLoading(true);
    try {
      const filter = filterOverride !== null ? filterOverride : statusFilter;
      const params = filter ? `?status=${filter}` : '';
      const res = await api.get(`/expense/claims/my${params}`);
      setMyClaims(res.data || []);
    } catch (err) {
      toast.error('Failed to load claims');
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

  const openView = (claim) => {
    setSelectedClaim(claim);
    setShowViewModal(true);
  };

  // Edit claim handler
  const openEditModal = (claim) => {
    setEditingClaim({
      ...claim,
      entries: claim.entries.map(e => ({
        ...e,
        amount: e.amount.toString()
      }))
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingClaim) return;
    
    try {
      const payload = {
        entries: editingClaim.entries.map(e => ({
          ...e,
          amount: parseFloat(e.amount)
        })),
        notes: editingClaim.notes
      };
      
      await api.put(`/expense/claims/${editingClaim.id}`, payload);
      toast.success('Claim updated successfully');
      setShowEditModal(false);
      setEditingClaim(null);
      fetchMyClaims();
      fetchMyStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update claim');
    }
  };

  const updateEditEntry = (index, field, value) => {
    setEditingClaim(prev => ({
      ...prev,
      entries: prev.entries.map((e, i) => i === index ? { ...e, [field]: value } : e)
    }));
  };

  const addEditEntry = () => {
    setEditingClaim(prev => ({
      ...prev,
      entries: [...prev.entries, {
        expense_date_from: '',
        expense_date_to: '',
        category: '',
        description: '',
        amount: '',
        receipt_url: null
      }]
    }));
  };

  const removeEditEntry = (index) => {
    if (editingClaim.entries.length <= 1) return;
    setEditingClaim(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  // Delete claim handler
  const confirmDelete = (claim) => {
    setClaimToDelete(claim);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!claimToDelete) return;
    
    try {
      await api.delete(`/expense/claims/${claimToDelete.id}`);
      toast.success('Claim cancelled successfully');
      setShowDeleteDialog(false);
      setClaimToDelete(null);
      fetchMyClaims();
      fetchMyStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel claim');
    }
  };

  return (
    <div className="p-8 space-y-6" data-testid="my-expenses-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-sky-100 rounded-lg">
              <UserCircle className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-sky-600 font-medium">Employee Self-Service</p>
              <h1 className="text-2xl font-bold text-[#4A3728]">My Expense Claims</h1>
            </div>
          </div>
          <p className="text-[#6B5D52] mt-1 ml-14">
            Submit and track your expense reimbursement claims
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchMyClaims()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
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
                <p className="text-sm text-emerald-600">Approved</p>
                <p className="text-2xl font-bold text-emerald-700">₹{(myStats?.total_approved || 0).toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-sky-50">
          <TabsTrigger value="submit" data-testid="tab-submit" className="data-[state=active]:bg-sky-100">
            <Plus className="w-4 h-4 mr-2" /> Submit New Claim
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history" className="data-[state=active]:bg-sky-100">
            <FileText className="w-4 h-4 mr-2" /> My Claims
          </TabsTrigger>
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
                        <Label>Upload Bill/Receipt</Label>
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
              <div className="flex items-center justify-between p-4 bg-sky-50 rounded-lg">
                <span className="text-lg font-semibold text-sky-700">Total Claimed Amount</span>
                <span className="text-2xl font-bold text-sky-700">₹{calculateTotal().toLocaleString()}</span>
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
                className="w-full bg-sky-600 hover:bg-sky-700"
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
                <Select value={statusFilter || "all"} onValueChange={(v) => { const newFilter = v === "all" ? "" : v; setStatusFilter(newFilter); fetchMyClaims(newFilter); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
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
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No claims found</p>
                  <Button variant="link" onClick={() => setActiveTab('submit')}>
                    Submit your first expense claim
                  </Button>
                </div>
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
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openView(claim)} title="View Details">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {claim.status === 'pending' && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => openEditModal(claim)} title="Edit Claim">
                                    <Edit2 className="w-4 h-4 text-blue-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => confirmDelete(claim)} title="Cancel Claim">
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
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
      </Tabs>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Claim Details - {selectedClaim?.claim_id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClaim && (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
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

              {/* Status */}
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
                    <strong>Notes:</strong> {selectedClaim.hr_notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Claim Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense Claim</DialogTitle>
          </DialogHeader>
          {editingClaim && (
            <div className="space-y-6">
              <div className="text-sm text-gray-500">
                Claim ID: <span className="font-mono">{editingClaim.claim_id}</span>
              </div>
              
              {/* Entries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Expense Entries</Label>
                  <Button variant="outline" size="sm" onClick={addEditEntry}>
                    <Plus className="w-4 h-4 mr-1" /> Add Entry
                  </Button>
                </div>
                
                {editingClaim.entries.map((entry, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date From</Label>
                        <Input
                          type="date"
                          value={entry.expense_date_from?.split('T')[0] || ''}
                          onChange={(e) => updateEditEntry(index, 'expense_date_from', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Date To (Optional)</Label>
                        <Input
                          type="date"
                          value={entry.expense_date_to?.split('T')[0] || ''}
                          onChange={(e) => updateEditEntry(index, 'expense_date_to', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select value={entry.category} onValueChange={(v) => updateEditEntry(index, 'category', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Amount (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.amount}
                          onChange={(e) => updateEditEntry(index, 'amount', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={entry.description || ''}
                          onChange={(e) => updateEditEntry(index, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                    {editingClaim.entries.length > 1 && (
                      <Button variant="ghost" size="sm" className="mt-2 text-red-600" onClick={() => removeEditEntry(index)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
              
              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingClaim.notes || ''}
                  onChange={(e) => setEditingClaim(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
              
              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-sky-600">
                  ₹{editingClaim.entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0).toLocaleString()}
                </span>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button onClick={handleEditSave} className="bg-sky-600 hover:bg-sky-700">Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Expense Claim?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this expense claim? 
              {claimToDelete && (
                <span className="block mt-2 font-medium">
                  Claim ID: {claimToDelete.claim_id} | Amount: ₹{claimToDelete.total_amount?.toLocaleString()}
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Claim</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Cancel Claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyExpenses;
