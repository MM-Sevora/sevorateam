import React, { useState, useEffect } from 'react';
import { analyticsApi, campaignApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
    BarChart3, 
    TrendingUp,
    Users,
    Eye,
    MousePointer,
    ShoppingCart,
    Target
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

const COLORS = ['#C5A059', '#1C1917', '#78716C', '#E7E5E4', '#A8A29E'];

// Mock data for analytics demonstration
const mockEngagementData = [
    { week: 'W1', reach: 45000, engagement: 2800, clicks: 420 },
    { week: 'W2', reach: 62000, engagement: 3900, clicks: 580 },
    { week: 'W3', reach: 78000, engagement: 4600, clicks: 720 },
    { week: 'W4', reach: 95000, engagement: 5200, clicks: 890 },
];

const mockROIData = [
    { name: 'Content Cost', value: 150000 },
    { name: 'Revenue Generated', value: 420000 },
];

export const AnalyticsPage = () => {
    const [dashboard, setDashboard] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dashboardRes, campaignsRes] = await Promise.all([
                analyticsApi.getDashboard(),
                campaignApi.getAll()
            ]);
            setDashboard(dashboardRes.data);
            setCampaigns(campaignsRes.data);
        } catch (error) {
            toast.error('Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    const categoryData = dashboard?.category_distribution
        ? Object.entries(dashboard.category_distribution).map(([name, value]) => ({ name, value }))
        : [];

    const statusData = dashboard?.status_distribution
        ? Object.entries(dashboard.status_distribution).map(([name, value]) => ({ name, value }))
        : [];

    // Calculate some metrics
    const totalReach = mockEngagementData.reduce((sum, d) => sum + d.reach, 0);
    const totalEngagement = mockEngagementData.reduce((sum, d) => sum + d.engagement, 0);
    const totalClicks = mockEngagementData.reduce((sum, d) => sum + d.clicks, 0);
    const roi = ((420000 - 150000) / 150000 * 100).toFixed(0);

    if (loading) {
        return (
            <div className="p-8 space-y-8">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8" data-testid="analytics-page">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Performance Insights
                    </p>
                    <h1 className="font-serif text-4xl">Analytics</h1>
                </div>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Campaigns" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Campaigns</SelectItem>
                        {campaigns.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card className="border border-border">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                                    Total Reach
                                </p>
                                <p className="font-serif text-3xl">{(totalReach / 1000).toFixed(0)}K</p>
                                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                    <TrendingUp className="w-3 h-3" /> +24% vs last month
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                                <Eye className="w-5 h-5 text-gold" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                                    Engagement
                                </p>
                                <p className="font-serif text-3xl">{(totalEngagement / 1000).toFixed(1)}K</p>
                                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                    <TrendingUp className="w-3 h-3" /> +18% vs last month
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Target className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                                    Click-throughs
                                </p>
                                <p className="font-serif text-3xl">{totalClicks.toLocaleString()}</p>
                                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                    <TrendingUp className="w-3 h-3" /> +32% vs last month
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <MousePointer className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                                    Campaign ROI
                                </p>
                                <p className="font-serif text-3xl">{roi}%</p>
                                <p className="text-xs text-gold flex items-center gap-1 mt-1">
                                    Revenue: ₹4.2L
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Engagement Over Time */}
                <Card className="border border-border">
                    <CardHeader>
                        <CardTitle className="font-serif text-lg">Engagement Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mockEngagementData}>
                                    <defs>
                                        <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#C5A059" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#C5A059" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="week" 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
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
                                        dataKey="reach" 
                                        stroke="#C5A059" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorReach)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* ROI Breakdown */}
                <Card className="border border-border">
                    <CardHeader>
                        <CardTitle className="font-serif text-lg">ROI Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mockROIData} layout="vertical">
                                    <XAxis 
                                        type="number"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                                    />
                                    <YAxis 
                                        type="category"
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11 }}
                                        width={120}
                                    />
                                    <Tooltip 
                                        formatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                                        contentStyle={{ 
                                            background: 'hsl(var(--card))', 
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '2px'
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#C5A059" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Net Profit: ₹2.7L
                            </Badge>
                            <Badge variant="outline" className="bg-gold/10 text-gold border-gold/20">
                                ROI: 180%
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Influencer Category Distribution */}
                <Card className="border border-border">
                    <CardHeader>
                        <CardTitle className="font-serif text-lg">By Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {categoryData.length > 0 ? (
                            <>
                                <div className="h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={70}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {categoryData.slice(0, 4).map((item, i) => (
                                        <Badge key={item.name} variant="outline" className="text-xs capitalize">
                                            <span 
                                                className="w-2 h-2 rounded-full mr-1.5"
                                                style={{ backgroundColor: COLORS[i] }}
                                            />
                                            {item.name}
                                        </Badge>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-muted-foreground text-sm text-center py-8">No data available</p>
                        )}
                    </CardContent>
                </Card>

                {/* Pipeline Status */}
                <Card className="border border-border">
                    <CardHeader>
                        <CardTitle className="font-serif text-lg">Pipeline Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {statusData.length > 0 ? (
                            <>
                                <div className="h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={statusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={70}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {statusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {statusData.slice(0, 4).map((item, i) => (
                                        <Badge key={item.name} variant="outline" className="text-xs capitalize">
                                            <span 
                                                className="w-2 h-2 rounded-full mr-1.5"
                                                style={{ backgroundColor: COLORS[i] }}
                                            />
                                            {item.name}: {item.value}
                                        </Badge>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-muted-foreground text-sm text-center py-8">No data available</p>
                        )}
                    </CardContent>
                </Card>

                {/* Conversion Funnel */}
                <Card className="border border-border">
                    <CardHeader>
                        <CardTitle className="font-serif text-lg">Conversion Funnel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { label: 'Impressions', value: 280000, percent: 100 },
                                { label: 'Reach', value: totalReach, percent: Math.round((totalReach / 280000) * 100) },
                                { label: 'Engagement', value: totalEngagement, percent: Math.round((totalEngagement / 280000) * 100) },
                                { label: 'Clicks', value: totalClicks, percent: Math.round((totalClicks / 280000) * 100) },
                                { label: 'Conversions', value: 89, percent: Math.round((89 / 280000) * 100) },
                            ].map((item, i) => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>{item.label}</span>
                                        <span className="text-muted-foreground">
                                            {item.value >= 1000 ? `${(item.value / 1000).toFixed(0)}K` : item.value}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gold transition-all duration-500"
                                            style={{ width: `${item.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Performers */}
            <Card className="border border-border">
                <CardHeader>
                    <CardTitle className="font-serif text-lg">Top Performing Influencers</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {dashboard?.top_influencers?.slice(0, 5).map((inf, i) => (
                            <Card key={inf.id} className="border">
                                <CardContent className="p-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
                                        <span className="font-serif text-lg text-gold">{i + 1}</span>
                                    </div>
                                    <p className="font-medium text-sm truncate">{inf.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(inf.followers / 1000).toFixed(0)}K • {inf.engagement_rate}%
                                    </p>
                                    <Badge className="mt-2 bg-gold/10 text-gold border-0 text-xs">
                                        Score: {inf.score}
                                    </Badge>
                                </CardContent>
                            </Card>
                        )) || (
                            <p className="text-muted-foreground text-sm col-span-5 text-center py-8">
                                No influencer data available
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
