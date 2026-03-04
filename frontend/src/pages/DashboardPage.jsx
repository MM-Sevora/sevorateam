import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { 
    Users, 
    Megaphone, 
    Wallet, 
    TrendingUp,
    ArrowUpRight,
    Send,
    Star
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#C5A059', '#1C1917', '#78716C', '#E7E5E4', '#A8A29E'];

const StatCard = ({ title, value, icon: Icon, subtitle, trend }) => (
    <Card className="border border-border hover:border-gold/30 transition-all duration-300">
        <CardContent className="p-6">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                        {title}
                    </p>
                    <p className="font-serif text-3xl">{value}</p>
                    {subtitle && (
                        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                    )}
                </div>
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gold" strokeWidth={1.5} />
                </div>
            </div>
            {trend && (
                <div className="flex items-center gap-1 mt-3 text-xs text-gold">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>{trend}</span>
                </div>
            )}
        </CardContent>
    </Card>
);

export const DashboardPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await analyticsApi.getDashboard();
            setData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const statusData = data?.status_distribution 
        ? Object.entries(data.status_distribution).map(([name, value]) => ({ name, value }))
        : [];

    const categoryData = data?.category_distribution
        ? Object.entries(data.category_distribution).map(([name, value]) => ({ name, value }))
        : [];

    if (loading) {
        return (
            <div className="p-8 space-y-8">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8" data-testid="dashboard-page">
            {/* Header */}
            <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Overview
                </p>
                <h1 className="font-serif text-4xl">Dashboard</h1>
            </div>

            {/* Stats Grid - Bento Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
                <StatCard
                    title="Total Influencers"
                    value={data?.total_influencers || 0}
                    icon={Users}
                    trend="+12% this month"
                />
                <StatCard
                    title="Active Campaigns"
                    value={data?.active_campaigns || 0}
                    icon={Megaphone}
                    subtitle="Running now"
                />
                <StatCard
                    title="Total Budget"
                    value={`₹${((data?.total_budget || 0) / 100000).toFixed(1)}L`}
                    icon={Wallet}
                    subtitle={`₹${((data?.total_spent || 0) / 100000).toFixed(1)}L spent`}
                />
                <StatCard
                    title="Budget Remaining"
                    value={`₹${((data?.budget_remaining || 0) / 100000).toFixed(1)}L`}
                    icon={TrendingUp}
                    trend="On track"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status Distribution */}
                <Card className="border border-border lg:col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="font-serif text-lg">Pipeline Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {statusData.length > 0 ? (
                            <div className="h-[200px] w-full min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                background: 'hsl(var(--card))', 
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '2px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm text-center py-8">No data available</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-4">
                            {statusData.map((item, i) => (
                                <Badge key={item.name} variant="outline" className="text-xs capitalize">
                                    <span 
                                        className="w-2 h-2 rounded-full mr-1.5"
                                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                    />
                                    {item.name}: {item.value}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card className="border border-border lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="font-serif text-lg">Category Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {categoryData.length > 0 ? (
                            <div className="h-[200px] w-full min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={categoryData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#C5A059" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#C5A059" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                        />
                                        <YAxis 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                background: 'hsl(var(--card))', 
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '2px'
                                            }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#C5A059" 
                                            strokeWidth={1.5}
                                            fillOpacity={1} 
                                            fill="url(#colorValue)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm text-center py-8">No data available</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Outreach */}
                <Card className="border border-border">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="font-serif text-lg">Recent Outreach</CardTitle>
                            <Send className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data?.recent_outreach?.length > 0 ? (
                                data.recent_outreach.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                        <div>
                                            <p className="font-medium text-sm">{item.influencer_name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{item.channel}</p>
                                        </div>
                                        <Badge variant={item.replied ? 'default' : 'outline'} className="text-xs">
                                            {item.replied ? 'Replied' : item.opened ? 'Opened' : 'Sent'}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-sm text-center py-4">No recent outreach</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Influencers */}
                <Card className="border border-border">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="font-serif text-lg">Top Influencers</CardTitle>
                            <Star className="w-4 h-4 text-gold" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data?.top_influencers?.length > 0 ? (
                                data.top_influencers.map((inf, i) => (
                                    <div key={inf.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                                            <span className="font-serif text-sm text-gold">{i + 1}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{inf.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {inf.followers?.toLocaleString()} followers • {inf.engagement_rate}% eng
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs bg-gold/5 border-gold/20 text-gold">
                                            Score: {inf.score}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-sm text-center py-4">No influencers yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
