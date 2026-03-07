import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Progress } from '../../components/ui/progress';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
    Wallet, 
    TrendingUp,
    TrendingDown,
    DollarSign,
    Megaphone,
    CheckCircle,
    Clock,
    AlertCircle,
    Plus,
    Filter,
    Search,
    MoreHorizontal,
    Edit2,
    Trash2,
    Users,
    Newspaper,
    User
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const COLORS = ['#C5A059', '#1C1917', '#78716C', '#E7E5E4'];

const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    paid: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700'
};

export const BudgetPage = () => {
    const { api } = useAuth();
    const [payments, setPayments] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [unifiedStats, setUnifiedStats] = useState({});
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterCampaign, setFilterCampaign] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    
    // New Payment Modal
    const [showNewPayment, setShowNewPayment] = useState(false);
    const [newPayment, setNewPayment] = useState({
        contact_id: '',
        campaign_id: '',
        amount: '',
        description: '',
        payment_type: 'influencer_fee',
        payment_method: 'bank_transfer',
        due_date: ''
    });
    
    // Edit Payment Modal
    const [showEditPayment, setShowEditPayment] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [paymentsRes, campaignsRes, statsRes, contactsRes] = await Promise.all([
                api.get('/marketing/payments'),
                api.get('/marketing/v2/unified-campaigns'),
                api.get('/marketing/v2/unified-campaigns/stats'),
                api.get('/marketing/v2/contacts', { params: { limit: 500 } })
            ]);
            setPayments(paymentsRes.data || []);
            setCampaigns(campaignsRes.data || []);
            setUnifiedStats(statsRes.data || {});
            setContacts(contactsRes.data || []);
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentStatusUpdate = async (id, status) => {
        try {
            await api.put(`/marketing/v2/payments/${id}/status?status=${status}`);
            toast.success('Payment status updated');
            fetchData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleCreatePayment = async () => {
        if (!newPayment.contact_id || !newPayment.amount) {
            toast.error('Contact and amount are required');
            return;
        }
        try {
            await api.post('/marketing/v2/payments', {
                ...newPayment,
                amount: parseFloat(newPayment.amount)
            });
            toast.success('Payment created');
            setShowNewPayment(false);
            setNewPayment({ contact_id: '', campaign_id: '', amount: '', description: '', payment_type: 'influencer_fee', payment_method: 'bank_transfer', due_date: '' });
            fetchData();
        } catch (error) {
            toast.error('Failed to create payment');
        }
    };

    const handleEditPayment = (payment) => {
        setEditingPayment({
            ...payment,
            amount: payment.amount || 0,
            description: payment.description || '',
            payment_type: payment.payment_type || 'influencer_fee',
            payment_method: payment.payment_method || 'bank_transfer',
            due_date: payment.due_date || ''
        });
        setShowEditPayment(true);
    };

    const handleUpdatePayment = async () => {
        if (!editingPayment) return;
        try {
            await api.put(`/marketing/v2/payments/${editingPayment.id}`, {
                amount: parseFloat(editingPayment.amount),
                description: editingPayment.description,
                payment_type: editingPayment.payment_type,
                payment_method: editingPayment.payment_method,
                due_date: editingPayment.due_date
            });
            toast.success('Payment updated');
            setShowEditPayment(false);
            setEditingPayment(null);
            fetchData();
        } catch (error) {
            toast.error('Failed to update payment');
        }
    };

    const handleDeletePayment = async (paymentId) => {
        if (!window.confirm('Delete this payment? This action cannot be undone.')) return;
        try {
            await api.delete(`/marketing/v2/payments/${paymentId}`);
            toast.success('Payment deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete payment');
        }
    };

    // Get contact info for display
    const getContactInfo = (payment) => {
        const contact = contacts.find(c => c.id === payment.contact_id);
        return {
            name: payment.contact_name || contact?.name || 'Unknown',
            type: contact?.contact_type || 'influencer'
        };
    };

    // Filter payments
    const filteredPayments = payments.filter(p => {
        const contactInfo = getContactInfo(p);
        const matchesSearch = contactInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             p.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || p.payment_type === filterType;
        const matchesCampaign = filterCampaign === 'all' || p.campaign_id === filterCampaign;
        const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
        return matchesSearch && matchesType && matchesCampaign && matchesStatus;
    });

    const PAYMENT_TYPES = [
        { value: 'influencer_fee', label: 'Influencer Fee' },
        { value: 'pr_placement', label: 'PR Placement' },
        { value: 'advertorial', label: 'Advertorial' },
        { value: 'bonus', label: 'Bonus' },
        { value: 'reimbursement', label: 'Reimbursement' },
        { value: 'advance', label: 'Advance' },
        { value: 'other', label: 'Other' }
    ];

    // Use unified stats when available
    const totalBudget = unifiedStats.total_budget || campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalSpent = unifiedStats.total_spent || campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
    const totalPending = unifiedStats.total_pending || payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    const totalCompleted = unifiedStats.total_paid || payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

    const budgetByStatus = [
        { name: 'Spent', value: totalSpent },
        { name: 'Remaining', value: totalBudget - totalSpent }
    ];

    const campaignBudgetData = campaigns.map(c => ({
        name: c.name?.slice(0, 15) + (c.name?.length > 15 ? '...' : ''),
        budget: c.budget / 1000,
        spent: c.spent / 1000
    }));

    return (
        <div className="p-8 space-y-6" data-testid="budget-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">
                        Financial Overview
                    </p>
                    <h1 className="text-3xl font-semibold text-gray-900">Budget & Payments</h1>
                </div>
                <Button 
                    onClick={() => setShowNewPayment(true)}
                    className="bg-[#c4a35a] hover:bg-[#b39349] text-white"
                    data-testid="new-payment-btn"
                >
                    <Plus className="w-4 h-4 mr-2" /> New Payment
                </Button>
            </div>

            {/* Stats - Gradient Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-600 uppercase tracking-wider">Total Budget</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">₹{(totalBudget / 100000).toFixed(1)}L</p>
                                <p className="text-xs text-gray-500 mt-1">Allocated</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Wallet className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-red-600 uppercase tracking-wider">Total Spent</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">₹{(totalSpent / 100000).toFixed(1)}L</p>
                                <p className="text-xs text-gray-500 mt-1">{totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% of budget</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                                <TrendingDown className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                        <Progress value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} className="h-1.5 mt-3" />
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-yellow-600 uppercase tracking-wider">Pending</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">₹{(totalPending / 1000).toFixed(0)}K</p>
                                <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 uppercase tracking-wider">Completed</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">₹{(totalCompleted / 1000).toFixed(0)}K</p>
                                <p className="text-xs text-gray-500 mt-1">Payments done</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Budget Utilization Pie */}
                <Card className="border border-border">
                    <CardHeader>
                        <CardTitle className="font-serif text-lg">Budget Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={budgetByStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {budgetByStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                                        contentStyle={{ 
                                            background: 'hsl(var(--card))', 
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '2px'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gold" />
                                <span className="text-xs">Spent</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-foreground" />
                                <span className="text-xs">Remaining</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Campaign Budget Bar */}
                <Card className="border border-border lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="font-serif text-lg">Campaign Budget vs Spent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {campaignBudgetData.length > 0 ? (
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={campaignBudgetData}>
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10 }}
                                        />
                                        <YAxis 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(v) => `₹${v}K`}
                                        />
                                        <Tooltip 
                                            formatter={(value) => `₹${value}K`}
                                            contentStyle={{ 
                                                background: 'hsl(var(--card))', 
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '2px'
                                            }}
                                        />
                                        <Bar dataKey="budget" fill="#E7E5E4" name="Budget" />
                                        <Bar dataKey="spent" fill="#C5A059" name="Spent" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm text-center py-12">
                                No campaign data available
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Payments Table */}
            <Card className="border border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="font-serif text-lg">Payment History</CardTitle>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search payments..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 w-[200px] h-9"
                                />
                            </div>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-[150px] h-9">
                                    <SelectValue placeholder="Payment Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {PAYMENT_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                                <SelectTrigger className="w-[150px] h-9">
                                    <SelectValue placeholder="Campaign" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Campaigns</SelectItem>
                                    {campaigns.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[130px] h-9">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="text-center py-12">
                            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-serif text-xl mb-2">No Payments Found</h3>
                            <p className="text-muted-foreground text-sm">
                                {payments.length === 0 ? 'Create your first payment to track expenses' : 'Try adjusting your filters'}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-mono text-xs uppercase">Contact</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Type</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Campaign</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Amount</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Date</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Status</TableHead>
                                    <TableHead className="font-mono text-xs uppercase w-[80px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments.map((payment) => {
                                    const contactInfo = getContactInfo(payment);
                                    return (
                                        <TableRow key={payment.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                        contactInfo.type === 'journalist' ? 'bg-purple-100' : 'bg-amber-100'
                                                    }`}>
                                                        {contactInfo.type === 'journalist' ? 
                                                            <Newspaper className="w-3 h-3 text-purple-600" /> :
                                                            <User className="w-3 h-3 text-amber-600" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">{contactInfo.name}</span>
                                                        <Badge variant="outline" className={`ml-2 text-[10px] ${
                                                            contactInfo.type === 'journalist' ? 'border-purple-200 text-purple-600' : 'border-amber-200 text-amber-600'
                                                        }`}>
                                                            {contactInfo.type === 'journalist' ? 'PR' : 'Influencer'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize text-xs">
                                                    {payment.payment_type?.replace(/_/g, ' ') || 'Fee'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {campaigns.find(c => c.id === payment.campaign_id)?.name || '-'}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                ₹{(payment.amount / 1000).toFixed(1)}K
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(payment.created_at).toLocaleDateString('en-IN')}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={payment.status}
                                                    onValueChange={(v) => handlePaymentStatusUpdate(payment.id, v)}
                                                >
                                                    <SelectTrigger className={`w-[120px] text-xs ${STATUS_COLORS[payment.status]}`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['pending', 'processing', 'paid', 'failed'].map(s => (
                                                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => handleDeletePayment(payment.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* New Payment Modal */}
            <Dialog open={showNewPayment} onOpenChange={setShowNewPayment}>
                <DialogContent className="max-w-lg" data-testid="new-payment-modal">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            Record New Payment
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">CONTACT *</Label>
                            <Select value={newPayment.contact_id} onValueChange={v => setNewPayment(prev => ({ ...prev, contact_id: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select contact..." /></SelectTrigger>
                                <SelectContent>
                                    {contacts.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <div className="flex items-center gap-2">
                                                {c.contact_type === 'journalist' ? 
                                                    <Newspaper className="w-3 h-3 text-purple-500" /> :
                                                    <User className="w-3 h-3 text-amber-500" />
                                                }
                                                {c.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">CAMPAIGN (Optional)</Label>
                            <Select value={newPayment.campaign_id || "none"} onValueChange={v => setNewPayment(prev => ({ ...prev, campaign_id: v === "none" ? "" : v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Link to campaign..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Campaign</SelectItem>
                                    {campaigns.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-gray-500">AMOUNT (₹) *</Label>
                                <Input
                                    type="number"
                                    value={newPayment.amount}
                                    onChange={e => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="50000"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-gray-500">PAYMENT TYPE</Label>
                                <Select value={newPayment.payment_type} onValueChange={v => setNewPayment(prev => ({ ...prev, payment_type: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-gray-500">PAYMENT METHOD</Label>
                                <Select value={newPayment.payment_method} onValueChange={v => setNewPayment(prev => ({ ...prev, payment_method: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="upi">UPI</SelectItem>
                                        <SelectItem value="cheque">Cheque</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="card">Card</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-gray-500">DUE DATE</Label>
                                <Input
                                    type="date"
                                    value={newPayment.due_date}
                                    onChange={e => setNewPayment(prev => ({ ...prev, due_date: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">DESCRIPTION</Label>
                            <Input
                                value={newPayment.description}
                                onChange={e => setNewPayment(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Payment for 2 reels + 1 story..."
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" onClick={() => setShowNewPayment(false)}>Cancel</Button>
                        <Button onClick={handleCreatePayment} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
                            <Plus className="w-4 h-4 mr-2" /> Create Payment
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Payment Modal */}
            <Dialog open={showEditPayment} onOpenChange={setShowEditPayment}>
                <DialogContent className="max-w-lg" data-testid="edit-payment-modal">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-amber-500" />
                            Edit Payment
                        </DialogTitle>
                    </DialogHeader>
                    {editingPayment && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">Contact: <span className="font-medium text-gray-900">{editingPayment.contact_name}</span></p>
                                <p className="text-sm text-gray-600">Invoice: <span className="font-medium text-gray-900">{editingPayment.invoice_number}</span></p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-gray-500">AMOUNT (₹)</Label>
                                    <Input
                                        type="number"
                                        value={editingPayment.amount}
                                        onChange={e => setEditingPayment(prev => ({ ...prev, amount: e.target.value }))}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-gray-500">PAYMENT TYPE</Label>
                                    <Select value={editingPayment.payment_type} onValueChange={v => setEditingPayment(prev => ({ ...prev, payment_type: v }))}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-gray-500">PAYMENT METHOD</Label>
                                    <Select value={editingPayment.payment_method} onValueChange={v => setEditingPayment(prev => ({ ...prev, payment_method: v }))}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="upi">UPI</SelectItem>
                                            <SelectItem value="cheque">Cheque</SelectItem>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="card">Card</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-gray-500">DUE DATE</Label>
                                    <Input
                                        type="date"
                                        value={editingPayment.due_date || ''}
                                        onChange={e => setEditingPayment(prev => ({ ...prev, due_date: e.target.value }))}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-gray-500">DESCRIPTION</Label>
                                <Input
                                    value={editingPayment.description}
                                    onChange={e => setEditingPayment(prev => ({ ...prev, description: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" onClick={() => { setShowEditPayment(false); setEditingPayment(null); }}>Cancel</Button>
                        <Button onClick={handleUpdatePayment} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
                            Save Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BudgetPage;
