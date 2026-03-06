import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Users, TrendingUp, Eye, FileText, ArrowUpRight, ArrowDownRight, Calendar, Send, Clock, Zap, Sparkles, CheckCircle, BarChart3, Wand2, Globe, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
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

function StatCard({ title, value, change, icon: Icon, iconColor, onClick }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all cursor-pointer" onClick={onClick} data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${iconColor}15` }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase mb-0.5">{title}</p>
      <p className="text-2xl font-heading font-bold text-white">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [cronStatus, setCronStatus] = useState(null);
  const [approvalStats, setApprovalStats] = useState(null);
  const [activePlatform, setActivePlatform] = useState('facebook');
  const [loading, setLoading] = useState(true);
  const [quickPost, setQuickPost] = useState('');
  const [quickPlatform, setQuickPlatform] = useState('linkedin');
  const [quickPublishing, setQuickPublishing] = useState(false);
  const [quickResult, setQuickResult] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/metrics'),
      api.get('/api/dashboard/summary'),
      api.get('/api/platforms'),
      api.get('/api/posts').then(r => r.data).catch(() => []),
      api.get('/api/cron/status').catch(() => ({ data: null })),
      api.get('/api/approvals/stats').catch(() => ({ data: {} })),
    ]).then(([metricsRes, summaryRes, platformsRes, posts, cronRes, approvalRes]) => {
      setMetrics(metricsRes.data);
      setSummary(summaryRes.data);
      setConnectedPlatforms(platformsRes.data);
      setRecentPosts(posts.filter(p => p.status === 'published').slice(0, 5));
      setScheduledPosts(posts.filter(p => p.status === 'scheduled').slice(0, 5));
      setCronStatus(cronRes.data);
      setApprovalStats(approvalRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleQuickPublish = async () => {
    if (!quickPost.trim()) return;
    setQuickPublishing(true); setQuickResult(null);
    try {
      const res = await api.post('/api/publish/real', { content: quickPost, platform: quickPlatform, image_url: '' });
      setQuickResult(res.data);
      if (res.data.success) setQuickPost('');
    } catch (err) { setQuickResult({ success: false, error: err.response?.data?.detail || 'Failed' }); }
    finally { setQuickPublishing(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-full" data-testid="dashboard-loading"><div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" /></div>;

  const overview = metrics?.overview || {};
  const platformData = metrics?.platforms || {};
  const activeData = platformData[activePlatform];
  const chartData = activeData?.history?.map(h => ({ date: h.date?.slice(5), engagement: h.engagement, reach: h.reach, likes: h.likes })) || [];
  const connectedCount = connectedPlatforms.length;
  const hasApiKeys = connectedPlatforms.filter(p => p.has_api_credentials).length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      {/* Header with Quick Actions */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Your social media command center</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/studio')} className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(124,58,237,0.2)] transition-all" data-testid="quick-create-btn">
            <Wand2 className="w-4 h-4" /> Create Content
          </button>
          <button onClick={() => navigate('/studio?tab=tools')} className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2 transition-all">
            <Sparkles className="w-4 h-4" /> AI Tools
          </button>
        </div>
      </div>

      {/* Connection Status Banner */}
      {connectedCount < 3 && (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-amber-500/20 transition-all" onClick={() => navigate('/platforms')}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-400">Connect more platforms for better insights</p>
              <p className="text-xs text-zinc-500">{connectedCount}/5 platforms connected, {hasApiKeys} with API keys</p>
            </div>
          </div>
          <span className="text-xs text-amber-400">Set up &rarr;</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Followers" value={formatNum(overview.total_followers)} change={12.5} icon={Users} iconColor="#7c3aed" />
        <StatCard title="Avg Engagement" value={`${overview.avg_engagement}%`} change={3.2} icon={TrendingUp} iconColor="#06b6d4" />
        <StatCard title="Total Reach" value={formatNum(overview.total_reach)} change={-2.1} icon={Eye} iconColor="#ec4899" />
        <StatCard title="Total Posts" value={summary?.total_posts || 0} change={8.0} icon={FileText} iconColor="#f97316" onClick={() => navigate('/posts')} />
      </div>

      {/* Main Grid: Chart + Quick Compose + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart - 2 col */}
        <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5" data-testid="engagement-chart">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-heading font-semibold text-white">Engagement Overview</h3>
            <div className="flex gap-1">
              {Object.entries(platformIcons).map(([key, { icon: PIcon, color }]) => (
                <button key={key} onClick={() => setActivePlatform(key)} className={`p-1.5 rounded-lg transition-all ${activePlatform === key ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                  <PIcon className="w-3.5 h-3.5" style={{ color: activePlatform === key ? color : '#71717a' }} />
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs><linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
              <Area type="monotone" dataKey="engagement" stroke="#7c3aed" fill="url(#engGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Compose - 1 col */}
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5" data-testid="quick-compose">
          <h3 className="text-base font-heading font-semibold text-white mb-3 flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" /> Quick Publish
          </h3>
          <div className="flex gap-1.5 mb-3">
            {['linkedin', 'facebook', 'instagram'].map(p => {
              const meta = platformIcons[p];
              return (
                <button key={p} onClick={() => setQuickPlatform(p)}
                  className={`p-2 rounded-lg transition-all border ${quickPlatform === p ? 'bg-white/10 border-white/15' : 'border-transparent hover:bg-white/5'}`}>
                  <meta.icon className="w-4 h-4" style={{ color: quickPlatform === p ? meta.color : '#71717a' }} />
                </button>
              );
            })}
          </div>
          <textarea value={quickPost} onChange={(e) => setQuickPost(e.target.value)}
            className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-2.5 px-3 text-sm text-white placeholder-zinc-600 resize-none mb-3"
            rows={4} placeholder={`Write a quick ${quickPlatform} post...`} data-testid="quick-post-input"
          />
          <button onClick={handleQuickPublish} disabled={quickPublishing || !quickPost.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all" data-testid="quick-publish-btn"
          >{quickPublishing ? <><Zap className="w-4 h-4 animate-spin" /> Publishing...</> : <><Globe className="w-4 h-4" /> Publish to {quickPlatform}</>}</button>
          {quickResult && (
            <div className={`mt-2 p-2 rounded-lg text-xs ${quickResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {quickResult.success ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Published!{quickResult.url && <a href={quickResult.url} target="_blank" rel="noopener noreferrer" className="underline ml-1">View</a>}</span> : quickResult.error}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Platform Status + Upcoming + Recent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connected Platforms */}
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5" data-testid="platform-status">
          <h3 className="text-base font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent-violet" /> Platforms
            <span className="text-[10px] text-zinc-500 font-normal ml-auto">{connectedCount} connected</span>
          </h3>
          <div className="space-y-2.5">
            {Object.entries(platformIcons).map(([key, { icon: PIcon, color }]) => {
              const conn = connectedPlatforms.find(p => p.platform === key);
              return (
                <div key={key} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${conn ? 'hover:bg-white/5 cursor-pointer' : 'opacity-40'}`} onClick={() => conn && navigate('/platforms')}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <PIcon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white capitalize">{key}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{conn ? conn.page_name : 'Not connected'}</p>
                  </div>
                  {conn && (
                    <div className="flex items-center gap-1">
                      {conn.has_api_credentials && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      <span className="text-[10px] text-emerald-400">Live</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Scheduled */}
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5" data-testid="upcoming-posts">
          <h3 className="text-base font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" /> Upcoming
            <span className="text-[10px] text-zinc-500 font-normal ml-auto">{summary?.scheduled || 0} scheduled</span>
          </h3>
          {scheduledPosts.length > 0 ? (
            <div className="space-y-2">
              {scheduledPosts.map(post => {
                const meta = platformIcons[post.platform];
                return (
                  <div key={post.post_id} className="flex items-start gap-2.5 p-2 bg-zinc-950/30 rounded-lg">
                    {meta?.icon && <meta.icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: meta.color }} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 line-clamp-2">{post.content}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{post.scheduled_at}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No upcoming posts</p>
              <button onClick={() => navigate('/studio?tab=autopilot')} className="text-[10px] text-accent-violet mt-2 hover:underline">Generate with Autopilot</button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5" data-testid="recent-activity">
          <h3 className="text-base font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent-cyan" /> Recent Posts
          </h3>
          {recentPosts.length > 0 ? (
            <div className="space-y-2">
              {recentPosts.map(post => {
                const meta = platformIcons[post.platform];
                const m = post.metrics || {};
                return (
                  <div key={post.post_id} className="flex items-start gap-2.5 p-2 bg-zinc-950/30 rounded-lg">
                    {meta?.icon && <meta.icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: meta.color }} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 line-clamp-1">{post.content}</p>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-0.5">
                        {m.likes > 0 && <span>{formatNum(m.likes)} likes</span>}
                        {m.comments > 0 && <span>{formatNum(m.comments)} comments</span>}
                        {post.is_real_post && <span className="text-emerald-400">Live</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No published posts yet</p>
              <button onClick={() => navigate('/studio')} className="text-[10px] text-accent-violet mt-2 hover:underline">Create your first post</button>
            </div>
          )}
        </div>
      </div>

      {/* Auto-publisher & Approval Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cronStatus && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Zap className="w-5 h-5 text-emerald-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Auto-Publisher</p>
              <p className="text-xs text-zinc-500">Running every {cronStatus.interval} - {cronStatus.scheduled_posts} posts scheduled, {cronStatus.active_tracking} tracking</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        )}
        {approvalStats && approvalStats.total > 0 && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-white/10 transition-all" onClick={() => navigate('/team')}>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-amber-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Approvals</p>
              <p className="text-xs text-zinc-500">{approvalStats.pending} pending, {approvalStats.approved} approved, {approvalStats.rejected} rejected</p>
            </div>
            {approvalStats.pending > 0 && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{approvalStats.pending} pending</span>}
          </div>
        )}
      </div>
    </div>
  );
}
