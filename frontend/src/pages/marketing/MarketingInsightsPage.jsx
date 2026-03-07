import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Users, Target, MessageSquare, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight,
  Eye, MousePointer, ShoppingCart, BarChart3, PieChart as PieChartIcon, RefreshCw,
  Calendar, Sparkles, Activity, Clock, CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#c4a35a', '#1C1917', '#78716C', '#E7E5E4', '#A8A29E', '#d4af37'];

const MarketingInsightsPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview'); // overview, analytics
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  
  // Dashboard data
  const [stats, setStats] = useState({
    total_influencers: 0,
    active_campaigns: 0,
    pending_negotiations: 0,
    total_budget: 0,
    total_spent: 0,
    total_reach: 0,
    avg_engagement: 0
  });
  const [campaigns, setCampaigns] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  
  // Analytics data (mock for demo, replace with real data)
  const [engagementTrend, setEngagementTrend] = useState([
    { week: 'Week 1', reach: 45000, engagement: 2800, clicks: 420 },
    { week: 'Week 2', reach: 62000, engagement: 3900, clicks: 580 },
    { week: 'Week 3', reach: 78000, engagement: 4600, clicks: 720 },
    { week: 'Week 4', reach: 95000, engagement: 5200, clicks: 890 },
  ]);
  const [campaignPerformance, setCampaignPerformance] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch unified dashboard stats
      const [dashboardRes, unifiedCampaignsRes, unifiedStatsRes, contactsRes, paymentsRes] = await Promise.all([
        api.get('/dashboard/unified').catch(() => ({ data: {} })),
        api.get('/marketing/v2/unified-campaigns').catch(() => ({ data: [] })),
        api.get('/marketing/v2/unified-campaigns/stats').catch(() => ({ data: {} })),
        api.get('/marketing/v2/contacts?contact_type=influencer').catch(() => ({ data: [] })),
        api.get('/marketing/payments').catch(() => ({ data: [] }))
      ]);
      
      const dashboard = dashboardRes.data || {};
      const campaignsList = unifiedCampaignsRes.data || [];
      const unifiedStats = unifiedStatsRes.data || {};
      const contacts = contactsRes.data || [];
      const payments = paymentsRes.data || [];
      
      // Use unified stats for budget
      const totalBudget = unifiedStats.total_budget || campaignsList.reduce((sum, c) => sum + (c.budget || 0), 0);
      const totalSpent = unifiedStats.total_spent || campaignsList.reduce((sum, c) => sum + (c.spent || 0), 0);
      const activeCampaigns = unifiedStats.active_campaigns || campaignsList.filter(c => c.status === 'active').length;
      const pendingPayments = payments.filter(p => p.status === 'pending').length;
      
      // Status distribution
      const statusCounts = {};
      contacts.forEach(c => {
        const status = c.status || 'identified';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
      
      // Category distribution
      const categoryCounts = {};
      contacts.forEach(c => {
        const category = c.industry || 'Other';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
      
      // Campaign performance (both types)
      const perfData = campaignsList.slice(0, 6).map(c => ({
        name: c.name?.substring(0, 15) || 'Campaign',
        budget: c.budget || 0,
        spent: c.spent || 0,
        influencers: c.influencer_count || c.journalist_count || 0,
        type: c.campaign_type
      }));
      
      // Recent activity from multiple sources
      const activities = [];
      contacts.slice(0, 5).forEach(c => {
        activities.push({
          type: 'contact',
          title: `${c.name} added`,
          time: c.created_at,
          icon: Users
        });
      });
      payments.slice(0, 3).forEach(p => {
        activities.push({
          type: 'payment',
          title: `Payment ${p.status}: ₹${(p.amount || 0).toLocaleString()}`,
          time: p.created_at,
          icon: DollarSign
        });
      });
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      
      setStats({
        total_influencers: dashboard.influencer_count || contacts.length,
        active_campaigns: dashboard.campaign_count || activeCampaigns,
        pending_negotiations: contacts.filter(c => c.status === 'negotiation').length,
        total_budget: totalBudget,
        total_spent: totalSpent,
        pending_payments: pendingPayments,
        total_reach: contacts.reduce((sum, c) => sum + (c.followers || 0), 0),
        avg_engagement: contacts.length > 0 
          ? (contacts.reduce((sum, c) => sum + (c.engagement_rate || 0), 0) / contacts.length).toFixed(2)
          : 0
      });
      setCampaigns(campaignsList);
      setStatusDistribution(statusData);
      setCategoryDistribution(categoryData);
      setCampaignPerformance(perfData);
      setRecentActivity(activities.slice(0, 5));
      
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  // Calculate analytics metrics
  const totalReach = engagementTrend.reduce((sum, d) => sum + d.reach, 0);
  const totalEngagement = engagementTrend.reduce((sum, d) => sum + d.engagement, 0);
  const totalClicks = engagementTrend.reduce((sum, d) => sum + d.clicks, 0);
  const budgetUtilization = stats.total_budget > 0 ? ((stats.total_spent / stats.total_budget) * 100).toFixed(0) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" data-testid="marketing-insights-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Marketing Operations</p>
          <h1 className="text-3xl font-semibold text-gray-900">Insights & Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex">
            <Button
              variant={activeView === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('overview')}
              className={activeView === 'overview' ? 'bg-[#c4a35a] text-white' : ''}
            >
              <Activity className="w-4 h-4 mr-1" /> Overview
            </Button>
            <Button
              variant={activeView === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('analytics')}
              className={activeView === 'analytics' ? 'bg-[#c4a35a] text-white' : ''}
            >
              <BarChart3 className="w-4 h-4 mr-1" /> Analytics
            </Button>
          </div>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32 bg-white">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <>
          {/* Primary Stats - Gradient Style */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/marketing/influencers')}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600 uppercase tracking-wider">Influencers</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_influencers}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                      <ArrowUpRight className="w-3 h-3" /> Active pipeline
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/marketing/campaigns')}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Campaigns</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.active_campaigns}</p>
                    <p className="text-xs text-blue-600 flex items-center gap-1 mt-2">
                      <Target className="w-3 h-3" /> {campaigns.length} total
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 uppercase tracking-wider">Negotiations</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending_negotiations}</p>
                    <p className="text-xs text-purple-600 flex items-center gap-1 mt-2">
                      <MessageSquare className="w-3 h-3" /> In progress
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 uppercase tracking-wider">Budget Used</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{budgetUtilization}%</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatCurrency(stats.total_spent)} / {formatCurrency(stats.total_budget)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Status Distribution */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-amber-500" />
                  Pipeline Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {statusDistribution.map((item, idx) => (
                    <Badge key={item.name} variant="outline" className="capitalize text-xs">
                      <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      {item.name}: {item.value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  By Industry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryDistribution} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#c4a35a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
                  ) : (
                    recentActivity.map((activity, idx) => {
                      const Icon = activity.icon;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            activity.type === 'payment' ? 'bg-green-100' : 'bg-amber-100'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              activity.type === 'payment' ? 'text-green-600' : 'text-amber-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{activity.title}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(activity.time).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Performance */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Campaign Budget Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignPerformance}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="#c4a35a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" name="Spent" fill="#78716C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <>
          {/* Analytics KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total Reach</p>
                    <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.total_reach)}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                      <TrendingUp className="w-3 h-3" /> Combined followers
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Eye className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Avg Engagement</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.avg_engagement}%</p>
                    <p className="text-xs text-blue-600 flex items-center gap-1 mt-2">
                      <Target className="w-3 h-3" /> Across influencers
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Click-throughs</p>
                    <p className="text-3xl font-bold text-gray-900">{totalClicks.toLocaleString()}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                      <TrendingUp className="w-3 h-3" /> +32% vs last month
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <MousePointer className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Est. ROI</p>
                    <p className="text-3xl font-bold text-gray-900">180%</p>
                    <p className="text-xs text-amber-600 mt-2">
                      Revenue: {formatCurrency(stats.total_spent * 2.8)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Engagement Trend */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-base">Engagement Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={engagementTrend}>
                      <defs>
                        <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c4a35a" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#c4a35a" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="reach" name="Reach" stroke="#c4a35a" fillOpacity={1} fill="url(#colorReach)" />
                      <Area type="monotone" dataKey="engagement" name="Engagement" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEngagement)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Clicks & Conversions */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-base">Clicks & Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={engagementTrend}>
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#c4a35a" strokeWidth={2} dot={{ fill: '#c4a35a' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Filter + Table */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Campaign Performance</CardTitle>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Campaign</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Budget</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Spent</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Influencers</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.filter(c => selectedCampaign === 'all' || c.id === selectedCampaign).map(campaign => {
                      const utilization = campaign.budget > 0 ? ((campaign.spent / campaign.budget) * 100).toFixed(0) : 0;
                      return (
                        <tr 
                          key={campaign.id} 
                          className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/marketing/campaign/${campaign.id}`)}
                        >
                          <td className="py-3 px-2 font-medium text-gray-900">{campaign.name}</td>
                          <td className="py-3 px-2">
                            <Badge className={
                              campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                              campaign.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                              'bg-blue-100 text-blue-700'
                            }>
                              {campaign.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-right text-gray-700">{formatCurrency(campaign.budget)}</td>
                          <td className="py-3 px-2 text-right text-amber-600">{formatCurrency(campaign.spent)}</td>
                          <td className="py-3 px-2 text-right text-gray-700">{campaign.influencer_count || 0}</td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-2">
                                <div 
                                  className="bg-amber-500 h-2 rounded-full"
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-8">{utilization}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default MarketingInsightsPage;
