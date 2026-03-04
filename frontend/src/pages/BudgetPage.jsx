import React, { useState, useEffect } from 'react';
import { paymentsApi, campaignApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
    Wallet, 
    TrendingUp,
    TrendingDown,
    DollarSign,
    Megaphone,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const COLORS = ['#C5A059', '#1C1917', '#78716C', '#E7E5E4'];

const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700'
};

export const BudgetPage = () => {
    const [payments, setPayments] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [paymentsRes, campaignsRes] = await Promise.all([
                paymentsApi.getAll(),
                campaignApi.getAll()
            ]);
            setPayments(paymentsRes.data);
            setCampaigns(campaignsRes.data);
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentStatusUpdate = async (id, status) => {
        try {
            await paymentsApi.updateStatus(id, status);
            toast.success('Payment status updated');
            fetchData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
    const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    const totalCompleted = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

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
        <div className="p-8 space-y-8" data-testid="budget-page">
            {/* Header */}
            <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Financial Overview
                </p>
                <h1 className="font-serif text-4xl">Budget & Payments</h1>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border border-border">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                                    Total Budget
                                </p>
                                <p className="font-serif text-3xl">₹{(totalBudget / 100000).toFixed(1)}L</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-gold" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                                    Total Spent
                                </p>
                                <p className="font-serif text-3xl">₹{(totalSpent / 100000).toFixed(1)}L</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5 text-destructive" />
                            </div>
                        </div>
                        <Progress value={(totalSpent / totalBudget) * 100} className="h-1.5 mt-4" />
                    </CardContent>
                </Card>

                <Card className="border border-border">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                                    Pending Payments
                                </p>
                                <p className="font-serif text-3xl">₹{(totalPending / 1000).toFixed(0)}K</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-yellow-700" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                                    Completed Payments
                                </p>
                                <p className="font-serif text-3xl">₹{(totalCompleted / 1000).toFixed(0)}K</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-700" />
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
                <CardHeader>
                    <CardTitle className="font-serif text-lg">Payment History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-12">
                            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-serif text-xl mb-2">No Payments Yet</h3>
                            <p className="text-muted-foreground text-sm">
                                Payments will appear here when influencers are assigned to campaigns
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-mono text-xs uppercase">Influencer</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Campaign</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Amount</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Date</TableHead>
                                    <TableHead className="font-mono text-xs uppercase">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">{payment.influencer_name}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {campaigns.find(c => c.id === payment.campaign_id)?.name || '-'}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            ₹{(payment.amount / 1000).toFixed(0)}K
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(payment.created_at).toLocaleDateString('en-IN')}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={payment.status}
                                                onValueChange={(v) => handlePaymentStatusUpdate(payment.id, v)}
                                            >
                                                <SelectTrigger className={`w-[130px] text-xs ${STATUS_COLORS[payment.status]}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {['pending', 'processing', 'completed', 'failed'].map(s => (
                                                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
