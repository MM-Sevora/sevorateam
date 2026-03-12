import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  TrendingUp, TrendingDown, Users, Eye, Heart, MessageSquare, Share2,
  BarChart3, PieChart, Calendar, RefreshCw, Loader2, ChevronDown,
  ArrowUpRight, ArrowDownRight, Target, Zap
} from 'lucide-react';
import { FaLinkedin, FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PLATFORMS = {
  linkedin: { icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn' },
  twitter: { icon: FaTwitter, color: '#1DA1F2', label: 'Twitter/X' },
  instagram: { icon: FaInstagram, color: '#E4405F', label: 'Instagram' },
  facebook: { icon: FaFacebook, color: '#1877F2', label: 'Facebook' },
};

const COLORS = ['#0A66C2', '#E4405F', '#1DA1F2', '#1877F2', '#FF6B6B', '#4ECDC4'];

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num?.toString() || '0';
};

const MetricCard = ({ title, value, change, changeUp, icon: Icon, subtitle }) => (
  <div className="bg-white border border-[#E8D5C4] rounded-xl p-5 hover:border-[#D4BBA6] transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-amber-600" />
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${changeUp ? 'text-green-600' : 'text-red-500'}`}>
          {changeUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}%
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-[#4A3728]">{typeof value === 'number' ? formatNumber(value) : value}</p>
    <p className="text-xs text-[#5D4A3A] mt-1">{title}</p>
    {subtitle && <p className="text-[10px] text-[#9ca3af] mt-0.5">{subtitle}</p>}
  </div>
);

const PlatformMetric = ({ platform, metrics }) => {
  const P = PLATFORMS[platform];
  const Icon = P?.icon || BarChart3;
  return (
    <div className="flex items-center justify-between p-3 bg-[#F5EDE5] rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${P?.color}15` }}>
          <Icon className="w-4 h-4" style={{ color: P?.color }} />
        </div>
        <div>
          <p className="text-sm font-medium text-[#4A3728]">{P?.label || platform}</p>
          <p className="text-xs text-[#5D4A3A]">{formatNumber(metrics.followers)} followers</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xs font-medium ${metrics.growth > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {metrics.growth > 0 ? '+' : ''}{metrics.growth}%
        </p>
        <p className="text-[10px] text-[#9ca3af]">growth</p>
      </div>
    </div>
  );
};

export default function SocialAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [reach, setReach] = useState(null);
  const [audience, setAudience] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [overviewRes, engagementRes, reachRes, audienceRes, comparisonRes] = await Promise.all([
        api.get(`/social/analytics/overview?period=${period}`),
        api.get(`/social/analytics/engagement?period=${period}`),
        api.get(`/social/analytics/reach?period=${period}`),
        api.get('/social/analytics/audience'),
        api.get(`/social/analytics/comparison?period=${period}`),
      ]);
      setOverview(overviewRes.data);
      setEngagement(engagementRes.data);
      setReach(reachRes.data);
      setAudience(audienceRes.data);
      setComparison(comparisonRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'engagement', label: 'Engagement' },
    { id: 'audience', label: 'Audience' },
    { id: 'platforms', label: 'Platforms' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 animate-fade-in" data-testid="analytics-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#5D4A3A] mb-1">SOCIAL MEDIA</p>
          <h1 className="text-2xl font-bold text-[#4A3728] tracking-tight">Analytics Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-[#5D4A3A]">Track your social media performance</p>
            {overview?.data_source === 'live' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live Data
              </span>
            )}
          </div>
          {overview?.connected_platforms?.length > 0 && (
            <p className="text-xs text-[#9ca3af] mt-1">
              Connected: {overview.connected_platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={fetchAllData}
            className="p-2 hover:bg-[#F5EDE5] rounded-lg text-[#5D4A3A]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F5EDE5] p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-[#4A3728] shadow-sm'
                : 'text-[#5D4A3A] hover:text-[#4A3728]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="Total Followers"
              value={overview.metrics.total_followers}
              change={overview.metrics.follower_growth}
              changeUp={overview.trends.followers_up}
              icon={Users}
            />
            <MetricCard
              title="Total Impressions"
              value={overview.metrics.total_impressions}
              change={5.2}
              changeUp={true}
              icon={Eye}
            />
            <MetricCard
              title="Total Engagement"
              value={overview.metrics.total_engagement}
              change={overview.metrics.engagement_rate}
              changeUp={overview.trends.engagement_up}
              icon={Heart}
            />
            <MetricCard
              title="Engagement Rate"
              value={`${overview.metrics.engagement_rate}%`}
              icon={TrendingUp}
              subtitle="Avg across platforms"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Engagement Over Time */}
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Engagement Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={engagement?.time_series?.likes || []}>
                  <defs>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5D4A3A' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#5D4A3A' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8D5C4', borderRadius: '8px' }}
                    labelStyle={{ color: '#4A3728' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#F59E0B" fill="url(#colorEngagement)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Reach Over Time */}
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Reach & Impressions</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={reach?.time_series?.impressions || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5D4A3A' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#5D4A3A' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8D5C4', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#0A66C2" strokeWidth={2} dot={false} name="Impressions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Post Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-[#4A3728]">{overview.metrics.total_posts}</p>
              <p className="text-xs text-[#5D4A3A]">Total Posts</p>
            </div>
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{overview.metrics.published_posts}</p>
              <p className="text-xs text-[#5D4A3A]">Published</p>
            </div>
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{overview.metrics.scheduled_posts}</p>
              <p className="text-xs text-[#5D4A3A]">Scheduled</p>
            </div>
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-[#9ca3af]">{overview.metrics.draft_posts}</p>
              <p className="text-xs text-[#5D4A3A]">Drafts</p>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && engagement && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <MetricCard title="Likes" value={engagement.metrics.total_likes} icon={Heart} />
            <MetricCard title="Comments" value={engagement.metrics.total_comments} icon={MessageSquare} />
            <MetricCard title="Shares" value={engagement.metrics.total_shares} icon={Share2} />
            <MetricCard title="Saves" value={engagement.metrics.total_saves} icon={Target} />
            <MetricCard title="Clicks" value={engagement.metrics.total_clicks} icon={Zap} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Engagement Breakdown */}
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Engagement Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: 'Likes', value: engagement.by_type.likes, fill: '#F59E0B' },
                  { name: 'Comments', value: engagement.by_type.comments, fill: '#0A66C2' },
                  { name: 'Shares', value: engagement.by_type.shares, fill: '#E4405F' },
                  { name: 'Saves', value: engagement.by_type.saves, fill: '#10B981' },
                  { name: 'Clicks', value: engagement.by_type.clicks, fill: '#8B5CF6' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5D4A3A' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#5D4A3A' }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[0,1,2,3,4].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Engagement Trend */}
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Daily Engagement</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5D4A3A' }} tickFormatter={(v) => v?.slice(5)} data={engagement.time_series.likes} />
                  <YAxis tick={{ fontSize: 10, fill: '#5D4A3A' }} />
                  <Tooltip />
                  <Legend />
                  <Line data={engagement.time_series.likes} type="monotone" dataKey="value" stroke="#F59E0B" name="Likes" dot={false} />
                  <Line data={engagement.time_series.comments} type="monotone" dataKey="value" stroke="#0A66C2" name="Comments" dot={false} />
                  <Line data={engagement.time_series.shares} type="monotone" dataKey="value" stroke="#E4405F" name="Shares" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Audience Tab */}
      {activeTab === 'audience' && audience && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Follower Growth */}
            <div className="col-span-2 bg-white border border-[#E8D5C4] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#4A3728]">Follower Growth</h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#4A3728]">{formatNumber(audience.total_followers)}</span>
                  <span className={`text-xs font-medium ${audience.follower_growth.growth_rate > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    +{audience.follower_growth.net_change_30d} ({audience.follower_growth.growth_rate}%)
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={audience.follower_growth.daily}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5D4A3A' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#5D4A3A' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#10B981" fill="url(#colorFollowers)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Platform Breakdown */}
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#4A3728] mb-4">By Platform</h3>
              <div className="space-y-3">
                {Object.entries(audience.by_platform).map(([platform, metrics]) => (
                  <PlatformMetric key={platform} platform={platform} metrics={metrics} />
                ))}
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="grid grid-cols-3 gap-6">
            {/* Age Groups */}
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Age Distribution</h3>
              <div className="space-y-2">
                {audience.demographics.age_groups.map((group, i) => (
                  <div key={group.range} className="flex items-center gap-2">
                    <span className="text-xs text-[#5D4A3A] w-12">{group.range}</span>
                    <div className="flex-1 bg-[#F5EDE5] rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${group.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <span className="text-xs font-medium text-[#4A3728] w-10">{group.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Gender</h3>
              <ResponsiveContainer width="100%" height={150}>
                <RechartsPie>
                  <Pie
                    data={[
                      { name: 'Male', value: audience.demographics.gender.male },
                      { name: 'Female', value: audience.demographics.gender.female },
                      { name: 'Other', value: audience.demographics.gender.other },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#0A66C2" />
                    <Cell fill="#E4405F" />
                    <Cell fill="#9ca3af" />
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            {/* Top Locations */}
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Top Locations</h3>
              <div className="space-y-2">
                {audience.demographics.top_locations.map((loc, i) => (
                  <div key={loc.country} className="flex items-center justify-between">
                    <span className="text-xs text-[#5D4A3A]">{loc.country}</span>
                    <span className="text-xs font-medium text-[#4A3728]">{loc.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Best Times */}
          <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Best Times to Post</h3>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-[#5D4A3A] mb-2">Best Days</p>
                <div className="flex gap-2">
                  {audience.active_times.best_days.map(day => (
                    <span key={day} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium">{day}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-[#5D4A3A] mb-2">Best Hours</p>
                <div className="flex gap-2">
                  {audience.active_times.best_hours.map(hour => (
                    <span key={hour} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">{hour}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platforms Tab */}
      {activeTab === 'platforms' && comparison && (
        <div className="space-y-6">
          {/* Platform Comparison */}
          <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Platform Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparison.platforms} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#5D4A3A' }} />
                <YAxis type="category" dataKey="platform" tick={{ fontSize: 10, fill: '#5D4A3A' }} width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="metrics.followers" fill="#0A66C2" name="Followers" />
                <Bar dataKey="metrics.engagement" fill="#F59E0B" name="Engagement" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Platform Cards */}
          <div className="grid grid-cols-4 gap-4">
            {comparison.platforms.map(p => {
              const platform = PLATFORMS[p.platform];
              const Icon = platform?.icon || BarChart3;
              const isLive = p.data_source === 'live';
              return (
                <div key={p.platform} className={`bg-white border rounded-xl p-5 ${isLive ? 'border-green-300' : 'border-[#E8D5C4]'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${platform?.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: platform?.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#4A3728]">{platform?.label}</p>
                        {isLive && (
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Live Data" />
                        )}
                      </div>
                      <p className={`text-xs ${p.metrics.growth_rate > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {p.metrics.growth_rate > 0 ? '+' : ''}{p.metrics.growth_rate}% growth
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#5D4A3A]">Followers</span>
                      <span className="font-medium text-[#4A3728]">{formatNumber(p.metrics.followers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5D4A3A]">Impressions</span>
                      <span className="font-medium text-[#4A3728]">{formatNumber(p.metrics.impressions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5D4A3A]">Engagement</span>
                      <span className="font-medium text-[#4A3728]">{formatNumber(p.metrics.engagement)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5D4A3A]">Eng. Rate</span>
                      <span className="font-medium text-[#4A3728]">{p.metrics.engagement_rate}%</span>
                    </div>
                  </div>
                  {!isLive && (
                    <p className="text-[10px] text-[#9ca3af] mt-3 text-center">Simulated data</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Best Performer</p>
                <p className="text-xs text-green-600">{PLATFORMS[comparison.best_performer]?.label || comparison.best_performer} - Highest engagement rate</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Fastest Growing</p>
                <p className="text-xs text-blue-600">{PLATFORMS[comparison.fastest_growing]?.label || comparison.fastest_growing} - Highest growth rate</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
