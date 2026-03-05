import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, TrendingUp, Eye, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const platformIcons = {
  facebook: { icon: FaFacebook, color: '#1877F2' },
  instagram: { icon: FaInstagram, color: '#E4405F' },
  twitter: { icon: FaTwitter, color: '#1DA1F2' },
  linkedin: { icon: FaLinkedin, color: '#0A66C2' },
  youtube: { icon: FaYoutube, color: '#FF0000' },
};

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n?.toString() || '0';
}

function StatCard({ title, value, change, icon: Icon, iconColor }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors duration-200" data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${iconColor}20` }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-sm text-zinc-500 font-medium tracking-wide uppercase mb-1">{title}</p>
      <p className="text-3xl font-heading font-bold text-white">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activePlatform, setActivePlatform] = useState('facebook');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/metrics'),
      api.get('/api/dashboard/summary'),
    ]).then(([metricsRes, summaryRes]) => {
      setMetrics(metricsRes.data);
      setSummary(summaryRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="dashboard-loading">
        <div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const overview = metrics?.overview || {};
  const platformData = metrics?.platforms || {};
  const activeData = platformData[activePlatform];
  const chartData = activeData?.history?.map(h => ({
    date: h.date?.slice(5),
    followers: h.followers,
    engagement: h.engagement,
    reach: h.reach,
    likes: h.likes,
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Your social media performance at a glance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Followers" value={formatNum(overview.total_followers)} change={12.5} icon={Users} iconColor="#7c3aed" />
        <StatCard title="Avg Engagement" value={`${overview.avg_engagement}%`} change={3.2} icon={TrendingUp} iconColor="#06b6d4" />
        <StatCard title="Total Reach" value={formatNum(overview.total_reach)} change={-2.1} icon={Eye} iconColor="#ec4899" />
        <StatCard title="Total Posts" value={overview.total_posts} change={8.0} icon={FileText} iconColor="#f97316" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="engagement-chart">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-white">Engagement Overview</h3>
            <div className="flex gap-1">
              {Object.entries(platformIcons).map(([key, { icon: PIcon, color }]) => (
                <button
                  key={key}
                  onClick={() => setActivePlatform(key)}
                  className={`p-2 rounded-lg transition-all duration-200 ${activePlatform === key ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  data-testid={`platform-tab-${key}`}
                >
                  <PIcon className="w-4 h-4" style={{ color: activePlatform === key ? color : '#71717a' }} />
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="engagement" stroke="#7c3aed" fill="url(#engGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="platform-breakdown">
          <h3 className="text-lg font-heading font-semibold text-white mb-6">Platform Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(platformData).map(([key, data]) => {
              const { icon: PIcon, color } = platformIcons[key] || {};
              if (!PIcon) return null;
              return (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" data-testid={`platform-stat-${key}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                    <PIcon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white capitalize">{key}</p>
                    <p className="text-xs text-zinc-500">{formatNum(data.current?.followers)} followers</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{data.current?.engagement}%</p>
                    <p className="text-xs text-zinc-500">engagement</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="reach-chart">
          <h3 className="text-lg font-heading font-semibold text-white mb-4">Reach Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              <Bar dataKey="reach" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="post-summary">
          <h3 className="text-lg font-heading font-semibold text-white mb-4">Post Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Published', value: summary?.published || 0, color: '#10b981' },
              { label: 'Scheduled', value: summary?.scheduled || 0, color: '#7c3aed' },
              { label: 'Drafts', value: summary?.drafts || 0, color: '#f59e0b' },
              { label: 'Platforms', value: summary?.platforms_connected || 0, color: '#06b6d4' },
            ].map(item => (
              <div key={item.label} className="bg-zinc-950/50 rounded-lg p-4 border border-white/5">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{item.label}</p>
                <p className="text-2xl font-heading font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
