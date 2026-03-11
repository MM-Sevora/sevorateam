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
  Receipt, Plus, Clock, CheckCircle, XCircle, DollarSign,
  Calendar, FileText, Upload, Eye, Send, Loader2, User,
  Building2, PieChart
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CATEGORIES = ['Travel', 'Meals', 'Supplies', 'Equipment', 'Software', 'Training', 'Other'];
const COLORS = ['#4A3728', '#8B7355', '#D4BBA6', '#6B8E23', '#CD853F', '#4682B4', '#9370DB'];

const Reimbursements = () => {
  const { api, user } = useAuth();
  const [reimbursements, setReimbursements] = useState([]);
  const [myReimbursements, setMyReimbursements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionComments, setActionComments] = useState('');
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    amount: '',
    currency: 'USD',
    description: '',
    expense_date: '',
    receipt_urls: []
  });

  useEffect(() => {
    fetchData();
  }, [filter, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allRes, myRes, statsRes] = await Promise.all([
        api.get('/finance/reimbursements', { params: filter ? { status: filter } : {} }),
        api.get('/finance/reimbursements/my'),
        api.get('/finance/reimbursements/summary/stats')
      ]);
      setReimbursements(allRes.data.reimbursements || []);
      setMyReimbursements(myRes.data.reimbursements || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch reimbursements:', error);
      toast.error('Failed to load reimbursements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReimbursement = async () => {
    try {
      if (!formData.title || !formData.category || !formData.amount || !formData.expense_date) {
        toast.error('Please fill in all required fields');
        return;
      }
      await api.post('/finance/reimbursements', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success('Reimbursement created as draft');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create reimbursement');
    }
  };

  const handleAction = async () => {
    try {
      await api.post(`/finance/reimbursements/${selectedReimbursement.id}/action`, {
        action: actionType,
        comments: actionComments
      });
      toast.success(`Reimbursement ${actionType}d successfully`);
      setShowActionDialog(false);
      setSelectedReimbursement(null);
      setActionComments('');
      fetchData();
    } catch (error) {
      toast.error(`Failed to ${actionType} reimbursement`);
    }
  };

  const openActionDialog = (reimbursement, action) => {
    setSelectedReimbursement(reimbursement);
    setActionType(action);
    setShowActionDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      amount: '',
      currency: 'USD',
      description: '',
      expense_date: '',
      receipt_urls: []
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-amber-100 text-amber-700',
      under_review: 'bg-blue-100 text-blue-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      processing: 'bg-purple-100 text-purple-700',
      paid: 'bg-teal-100 text-teal-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace('_', ' ')}</Badge>;
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const categoryPieData = stats?.by_category ? Object.entries(stats.by_category).map(([key, value]) => ({
    name: key,
    value: value.amount
  })) : [];

  const displayList = activeTab === 'my' ? myReimbursements : reimbursements;

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="reimbursements-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Reimbursements</h1>
          <p className="text-[#8B7355]">Submit and manage expense reimbursements</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
          data-testid="create-reimbursement-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> New Reimbursement
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
                <p className="text-xs text-[#8B7355]">Pending Review</p>
                <p className="text-lg font-bold text-amber-600">{stats?.pending_review?.count || 0}</p>
                <p className="text-xs text-[#8B7355]">{formatCurrency(stats?.pending_review?.amount)}</p>
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
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-[#8B7355]">Paid</p>
                <p className="text-lg font-bold text-teal-600">{stats?.by_status?.paid?.count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-purple-600" />
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

      {/* Category Breakdown */}
      {categoryPieData.length > 0 && (
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
              <PieChart className="w-5 h-5" /> Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {categoryPieData.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs and List */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <TabsList className="bg-[#E8D5C4]/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-white">
                  <FileText className="w-4 h-4 mr-2" /> All Requests
                </TabsTrigger>
                <TabsTrigger value="my" className="data-[state=active]:bg-white">
                  <User className="w-4 h-4 mr-2" /> My Requests
                </TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2 flex-wrap">
                {['', 'submitted', 'under_review', 'approved', 'paid', 'rejected'].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={filter === status ? 'default' : 'outline'}
                    onClick={() => setFilter(status)}
                    className={filter === status ? 'bg-[#4A3728] text-white' : 'border-[#D4BBA6]'}
                  >
                    {status?.replace('_', ' ') || 'All'}
                  </Button>
                ))}
              </div>
            </div>

            <TabsContent value="all" className="mt-0">
              {renderReimbursementList(displayList)}
            </TabsContent>
            <TabsContent value="my" className="mt-0">
              {renderReimbursementList(displayList)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">New Reimbursement Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(f => ({...f, title: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="e.g., Client Lunch Meeting"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="text-sm text-[#8B7355]">Expense Date *</label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData(f => ({...f, expense_date: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                />
              </div>
            </div>
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
              <label className="text-sm text-[#8B7355]">Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(f => ({...f, description: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Describe the expense..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreateReimbursement} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              Save as Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] capitalize">{actionType} Reimbursement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#8B7355]">
              {actionType === 'submit' && 'This will submit the reimbursement for approval.'}
              {actionType === 'approve' && 'This will approve the reimbursement for payment.'}
              {actionType === 'reject' && 'This will reject the reimbursement request.'}
              {actionType === 'pay' && 'This will mark the reimbursement as paid.'}
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

  function renderReimbursementList(list) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8 text-[#8B7355]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
        </div>
      );
    }

    if (list.length === 0) {
      return <div className="text-center py-8 text-[#8B7355]">No reimbursements found</div>;
    }

    return (
      <div className="space-y-3">
        {list.map((reimb) => (
          <div key={reimb.id} className="p-4 border border-[#E8D5C4] rounded-lg hover:bg-[#F5EDE5]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-[#4A3728]">{reimb.title}</h3>
                  {getStatusBadge(reimb.status)}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-[#8B7355]">
                  <span className="flex items-center gap-1">
                    <Receipt className="w-3 h-3" /> {reimb.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDate(reimb.expense_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {reimb.employee_name}
                  </span>
                </div>
                {reimb.description && (
                  <p className="text-xs text-[#8B7355] mt-1 line-clamp-1">{reimb.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xl font-bold text-[#4A3728]">{formatCurrency(reimb.amount, reimb.currency)}</p>
                </div>
                <div className="flex gap-1">
                  {reimb.status === 'draft' && reimb.employee_id === user?.id && (
                    <Button size="sm" variant="ghost" onClick={() => openActionDialog(reimb, 'submit')} title="Submit">
                      <Send className="w-4 h-4 text-blue-600" />
                    </Button>
                  )}
                  {(reimb.status === 'submitted' || reimb.status === 'under_review') && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openActionDialog(reimb, 'approve')} title="Approve">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openActionDialog(reimb, 'reject')} title="Reject">
                        <XCircle className="w-4 h-4 text-red-600" />
                      </Button>
                    </>
                  )}
                  {reimb.status === 'approved' && (
                    <Button size="sm" variant="ghost" onClick={() => openActionDialog(reimb, 'pay')} title="Mark Paid">
                      <DollarSign className="w-4 h-4 text-teal-600" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
};

export default Reimbursements;
