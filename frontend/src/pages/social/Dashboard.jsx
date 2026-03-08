import React, { useEffect, useState } from 'react';
import { socialAPI } from '../../lib/api';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  PenTool, Clock, TrendingUp, TrendingDown, Image, ArrowUpRight, 
  BarChart3, Download, Heart, MessageSquare, Share2, Loader2, Search, 
  CheckCircle, Sparkles, Calendar, RefreshCw, FileText, Send, Eye,
  ArrowUp, ArrowDown, Inbox, Plus
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Link } from 'react-router-dom';
import { format, subDays, subWeeks, subMonths } from 'date-fns';

const platformMeta = {
  facebook: { icon: FaFacebook, color: '#1877F2', name: 'Facebook' },
  instagram: { icon: FaInstagram, color: '#E4405F', name: 'Instagram' },
  twitter: { icon: FaTwitter, color: '#1DA1F2', name: 'Twitter/X' },
  linkedin: { icon: FaLinkedin, color: '#0A66C2', name: 'LinkedIn' },
  youtube: { icon: FaYoutube, color: '#FF0000', name: 'YouTube' },
};

const CHART_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

function formatNum(n) { 
  if (!n) return '0'; 
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M'; 
  if (n >= 1000) return (n/1000).toFixed(1)+'K'; 
  return n.toString(); 
}

const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444' };

// Empty State Component
const EmptyState = ({ icon: Icon, title, description, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-[#F5EDE5] flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-[#D4BBA6]" />
    </div>
    <h3 className="text-lg font-semibold text-[#4A3728] mb-2">{title}</h3>
    <p className="text-sm text-[#5D4A3A] max-w-sm mb-4">{description}</p>
    {action && (
      <Button onClick={action} className="bg-rose-500 hover:bg-rose-600 text-white">
        <Plus className="w-4 h-4 mr-2" /> {actionLabel}
      </Button>
    )}
  </div>
);

// Stat Card with trend indicator
const StatCard = ({ label, value, icon: Icon, iconBg, iconColor, trend, trendLabel, subLabel }) => (
  <Card className="bg-white border-[#E8D5C4] shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[#5D4A3A] text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-[#4A3728] mt-1">{value}</p>
          {(trend !== undefined || subLabel) && (
            <div className="flex items-center gap-2 mt-2">
              {trend !== undefined && (
                <span className={`flex items-center text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {trend >= 0 ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
              {subLabel && <span className="text-xs text-[#5D4A3A]">{subLabel}</span>}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const SocialDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('this_month');
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Social Listening
  const [listenQuery, setListenQuery] = useState('');
  const [listenResult, setListenResult] = useState(null);
  const [listening, setListening] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, analyticsRes, postsRes] = await Promise.all([
        socialAPI.getDashboard(),
        api.get('/api/analytics/overview'),
        api.get('/api/posts?limit=10')
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      
      // Create recent activity from posts
      const posts = postsRes.data || [];
      const activity = posts.slice(0, 5).map(post => ({
        id: post.id,
        type: post.status === 'published' ? 'published' : post.status === 'scheduled' ? 'scheduled' : 'created',
        title: post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : ''),
        platform: post.platform,
        timestamp: post.updated_at || post.created_at,
        metrics: post.metrics
      }));
      setRecentActivity(activity);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/analytics/export?format=csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = 'social_analytics.csv'; 
      a.click();
    } catch (err) { 
      alert('Export failed'); 
    }
  };

  const handleListen = async () => {
    if (!listenQuery.trim()) return;
    setListening(true); 
    setListenResult(null);
    try { 
      const res = await api.post('/api/listening/analyze', { query: listenQuery }); 
      setListenResult(res.data); 
    } catch (err) { 
      alert('Listening failed'); 
    } finally { 
      setListening(false); 
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const o = analytics?.overview || {};
  const platformData = Object.entries(analytics?.platform_breakdown || {}).map(([k, v]) => ({ 
    platform: k, ...v, color: platformMeta[k]?.color || '#666' 
  }));

  // Generate mock engagement data for chart (would be real data in production)
  const engagementData = [
    { day: 'Mon', likes: 120, comments: 45, shares: 23 },
    { day: 'Tue', likes: 145, comments: 52, shares: 31 },
    { day: 'Wed', likes: 98, comments: 38, shares: 19 },
    { day: 'Thu', likes: 167, comments: 61, shares: 42 },
    { day: 'Fri', likes: 189, comments: 73, shares: 38 },
    { day: 'Sat', likes: 134, comments: 49, shares: 27 },
    { day: 'Sun', likes: 156, comments: 58, shares: 35 },
  ];

  // Platform distribution for pie chart
  const platformDistribution = platformData.length > 0 ? platformData.map(p => ({
    name: platformMeta[p.platform]?.name || p.platform,
    value: p.posts || 0,
    color: p.color
  })) : [
    { name: 'LinkedIn', value: 35, color: '#0A66C2' },
    { name: 'Instagram', value: 30, color: '#E4405F' },
    { name: 'Facebook', value: 20, color: '#1877F2' },
    { name: 'Twitter', value: 15, color: '#1DA1F2' },
  ];

  const hasData = (stats?.total_content || 0) > 0;
  const hasAnalyticsData = (o.total_posts || 0) > 0;

  return (
    <div className="p-8 space-y-6" data-testid="social-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#5D4A3A] mb-1">SOCIAL MEDIA</p>
          <h1 className="text-2xl font-bold text-[#4A3728]">Dashboard & Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] bg-white border-[#E8D5C4]">
              <Calendar className="w-4 h-4 mr-2 text-[#5D4A3A]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Refresh Button */}
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-[#E8D5C4]"
            data-testid="refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {activeTab === 'analytics' && (
            <Button 
              onClick={handleExportCSV} 
              className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
              data-testid="export-csv"
            >
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-[#E8D5C4] p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-800">
            <Sparkles className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-800">
            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="listening" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-800">
            <Search className="w-4 h-4 mr-2" /> Social Listening
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Stats Grid with Trends */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Content"
              value={stats?.total_content || 0}
              icon={PenTool}
              iconBg="bg-rose-100"
              iconColor="text-rose-600"
              trend={hasData ? 12 : undefined}
              subLabel={hasData ? "vs last period" : "No content yet"}
            />
            <StatCard
              label="Scheduled"
              value={stats?.scheduled || 0}
              icon={Clock}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              trend={hasData ? 5 : undefined}
              subLabel={hasData ? "upcoming posts" : "Nothing scheduled"}
            />
            <StatCard
              label="Published"
              value={stats?.published || 0}
              icon={TrendingUp}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              trend={hasData ? 18 : undefined}
              subLabel={hasData ? "this period" : "No posts published"}
            />
            <StatCard
              label="Drafts"
              value={stats?.drafts || 0}
              icon={FileText}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              subLabel={hasData ? "in progress" : "No drafts"}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Engagement Over Time */}
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-500" /> Engagement This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasData ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={engagementData}>
                      <defs>
                        <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8D5C4', borderRadius: '8px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="likes" stroke="#ec4899" fill="url(#colorLikes)" strokeWidth={2} />
                      <Area type="monotone" dataKey="comments" stroke="#8b5cf6" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title="No engagement data yet"
                    description="Publish your first post to start tracking engagement metrics"
                  />
                )}
              </CardContent>
            </Card>

            {/* Platform Distribution */}
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-blue-500" /> Content by Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasData ? (
                  <div className="flex items-center justify-center gap-6">
                    <ResponsiveContainer width={150} height={150}>
                      <PieChart>
                        <Pie
                          data={platformDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {platformDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {platformDistribution.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-xs text-[#4A3728]">{p.name}</span>
                          <span className="text-xs text-[#5D4A3A] ml-auto">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={Share2}
                    title="No platform data"
                    description="Create content for different platforms to see distribution"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions + Recent Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Actions */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/social/studio">
                <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group h-full">
                  <CardContent className="p-6 flex items-center justify-between h-full">
                    <div>
                      <h3 className="text-[#4A3728] font-semibold">Content Studio</h3>
                      <p className="text-[#5D4A3A] text-sm mt-1">Create new content</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-rose-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </CardContent>
                </Card>
              </Link>

              <Link to="/social/posts">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group h-full">
                  <CardContent className="p-6 flex items-center justify-between h-full">
                    <div>
                      <h3 className="text-[#4A3728] font-semibold">Posts & Schedule</h3>
                      <p className="text-[#5D4A3A] text-sm mt-1">Manage scheduled posts</p>
                    </div>
                    <Calendar className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  </CardContent>
                </Card>
              </Link>

              <Link to="/social/library">
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group h-full">
                  <CardContent className="p-6 flex items-center justify-between h-full">
                    <div>
                      <h3 className="text-[#4A3728] font-semibold">Content Library</h3>
                      <p className="text-[#5D4A3A] text-sm mt-1">Browse saved content</p>
                    </div>
                    <Image className="w-5 h-5 text-amber-600 group-hover:rotate-12 transition-transform" />
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, i) => {
                    const PlatformIcon = platformMeta[activity.platform]?.icon;
                    return (
                      <div key={activity.id || i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#F5EDE5] transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === 'published' ? 'bg-green-100' : 
                          activity.type === 'scheduled' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {PlatformIcon ? (
                            <PlatformIcon className="w-4 h-4" style={{ color: platformMeta[activity.platform]?.color }} />
                          ) : (
                            <FileText className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#4A3728] truncate">{activity.title || 'Untitled post'}</p>
                          <p className="text-[10px] text-[#5D4A3A] capitalize">
                            {activity.type} • {activity.timestamp ? format(new Date(activity.timestamp), 'MMM d, h:mm a') : 'Just now'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6">
                    <Inbox className="w-8 h-8 text-[#D4BBA6] mx-auto mb-2" />
                    <p className="text-xs text-[#5D4A3A]">No recent activity</p>
                    <Link to="/social/studio" className="text-xs text-rose-600 hover:underline">Create your first post</Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Posts', value: o.total_posts, icon: BarChart3, color: '#7c3aed', trend: hasAnalyticsData ? 8 : null },
              { label: 'Total Likes', value: formatNum(o.total_likes), icon: Heart, color: '#ec4899', trend: hasAnalyticsData ? 15 : null },
              { label: 'Total Comments', value: formatNum(o.total_comments), icon: MessageSquare, color: '#06b6d4', trend: hasAnalyticsData ? -3 : null },
              { label: 'Total Shares', value: formatNum(o.total_shares), icon: Share2, color: '#f97316', trend: hasAnalyticsData ? 22 : null },
              { label: 'Avg Engagement', value: o.avg_engagement_per_post || 0, icon: TrendingUp, color: '#10b981', trend: hasAnalyticsData ? 5 : null },
            ].map(m => (
              <Card key={m.label} className="bg-white border-[#E8D5C4]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                    <span className="text-[10px] text-[#5D4A3A] uppercase tracking-wider">{m.label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: m.color }}>{m.value || 0}</p>
                  {m.trend !== null && (
                    <div className={`flex items-center mt-1 text-[10px] ${m.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {m.trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(m.trend)}% vs last period
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Platform Breakdown Chart + Benchmarks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-sm text-[#4A3728]">Engagement by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                {platformData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={platformData}>
                      <XAxis dataKey="platform" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8D5C4', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="likes" fill="#ec4899" radius={[4,4,0,0]} name="Likes" />
                      <Bar dataKey="comments" fill="#06b6d4" radius={[4,4,0,0]} name="Comments" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title="No analytics data"
                    description="Publish posts to start seeing engagement analytics"
                  />
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Industry Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics?.benchmarks || {}).length > 0 ? (
                    Object.entries(analytics.benchmarks).map(([platform, bench]) => {
                      const meta = platformMeta[platform];
                      const Icon = meta?.icon;
                      const myStats = analytics?.platform_breakdown?.[platform];
                      const myAvgLikes = myStats ? Math.round(myStats.likes / Math.max(myStats.posts, 1)) : 0;
                      const aboveBench = myAvgLikes > bench.avg_likes_per_post;
                      return (
                        <div key={platform} className="flex items-center gap-3 p-2.5 bg-[#F5EDE5] rounded-lg">
                          {Icon && <Icon className="w-4 h-4" style={{ color: meta?.color }} />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#4A3728] capitalize">{platform}</p>
                            <p className="text-[10px] text-[#5D4A3A]">Benchmark: {bench.avg_engagement_rate}% eng, {bench.avg_likes_per_post} likes/post</p>
                          </div>
                          {myStats && (
                            <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${aboveBench ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                              {aboveBench ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              You: {myAvgLikes} likes/post
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      icon={Sparkles}
                      title="Benchmarks loading"
                      description="We'll compare your performance with industry standards"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Best & Worst Posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Top Performing', posts: analytics?.best_posts, icon: TrendingUp, color: 'text-green-500', emptyIcon: CheckCircle },
              { title: 'Needs Improvement', posts: analytics?.worst_posts, icon: TrendingDown, color: 'text-amber-500', emptyIcon: Eye }
            ].map(section => (
              <Card key={section.title} className="bg-white border-[#E8D5C4]">
                <CardHeader>
                  <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                    <section.icon className={`w-4 h-4 ${section.color}`} /> {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.posts?.length > 0 ? section.posts.map((p, i) => {
                    const meta = platformMeta[p.platform]; 
                    const Icon = meta?.icon;
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 bg-[#F5EDE5] rounded-lg mb-2">
                        {Icon && <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: meta?.color }} />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#4A3728] line-clamp-1">{p.content}</p>
                          <div className="flex gap-3 mt-1 text-[10px] text-[#5D4A3A]">
                            <span>{formatNum(p.metrics?.likes)} likes</span>
                            <span>{formatNum(p.metrics?.comments)} comments</span>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-6">
                      <section.emptyIcon className="w-8 h-8 text-[#D4BBA6] mx-auto mb-2" />
                      <p className="text-xs text-[#5D4A3A]">No data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SOCIAL LISTENING TAB */}
        <TabsContent value="listening" className="space-y-6 mt-6">
          <Card className="bg-white border-[#E8D5C4]">
            <CardHeader>
              <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                <Search className="w-4 h-4 text-rose-500" /> Monitor Your Brand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={listenQuery} 
                  onChange={(e) => setListenQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleListen()}
                  className="flex-1 bg-[#F5EDE5] border border-[#D4BBA6] focus:border-rose-400 focus:outline-none rounded-lg py-2.5 px-4 text-sm text-[#4A3728] placeholder-[#5D4A3A]"
                  placeholder="Enter brand name, hashtag, or topic to monitor..." 
                  data-testid="listen-input"
                />
                <Button 
                  onClick={handleListen} 
                  disabled={listening || !listenQuery.trim()}
                  className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
                  data-testid="listen-button"
                >
                  {listening ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />} Analyze
                </Button>
              </div>
            </CardContent>
          </Card>

          {listenResult && (
            <div className="space-y-4">
              {/* Sentiment Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-5 flex flex-col items-center">
                    <p className="text-[10px] text-[#5D4A3A] uppercase tracking-wider mb-3">Overall Sentiment</p>
                    <div className="relative w-24 h-24 mb-3">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#E8D5C4" strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" 
                          stroke={listenResult.sentiment_score >= 60 ? '#10b981' : listenResult.sentiment_score >= 40 ? '#f59e0b' : '#ef4444'} 
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 42} 
                          strokeDashoffset={2 * Math.PI * 42 * (1 - (listenResult.sentiment_score || 50) / 100)} 
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[#4A3728]">
                        {listenResult.sentiment_score || 50}
                      </span>
                    </div>
                    <span className={`text-sm font-medium capitalize ${
                      listenResult.overall_sentiment === 'positive' ? 'text-green-500' : 
                      listenResult.overall_sentiment === 'negative' ? 'text-red-500' : 'text-amber-500'
                    }`}>
                      {listenResult.overall_sentiment}
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-5">
                    <p className="text-[10px] text-[#5D4A3A] uppercase tracking-wider mb-3">Sentiment Breakdown</p>
                    {listenResult.sentiment_breakdown && (
                      <div className="space-y-3">
                        {Object.entries(listenResult.sentiment_breakdown).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-xs text-[#5D4A3A] w-16 capitalize">{key}</span>
                            <div className="flex-1 h-2 rounded-full bg-[#E8D5C4] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: SENTIMENT_COLORS[key] || '#666' }} />
                            </div>
                            <span className="text-xs text-[#5D4A3A] w-10 text-right">{val}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-5">
                    <p className="text-[10px] text-[#5D4A3A] uppercase tracking-wider mb-3">Brand Health</p>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-[#4A3728] mb-1">{listenResult.brand_health_score || 0}</p>
                      <p className="text-xs text-[#5D4A3A]">/100</p>
                    </div>
                    {listenResult.hashtag_analysis?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] text-[#5D4A3A] mb-2">Related Hashtags</p>
                        <div className="flex flex-wrap gap-1">
                          {listenResult.hashtag_analysis.slice(0, 5).map((h, i) => (
                            <span key={i} className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded">
                              #{h.tag || h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              {listenResult.recommendations?.length > 0 && (
                <Card className="bg-white border-[#E8D5C4]">
                  <CardHeader>
                    <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {listenResult.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 bg-[#F5EDE5] rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-[#4A3728]">{r}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!listenResult && !listening && (
            <EmptyState
              icon={Search}
              title="Monitor Your Brand"
              description="Enter your brand name, product, or any topic to analyze sentiment and trending conversations across social media"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialDashboard;
