import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  FileText, Trash2, Send, Filter, Clock, CheckCircle, Edit3, Calendar as CalIcon,
  ChevronLeft, ChevronRight, Loader2, TrendingUp, TrendingDown, Eye, Heart, MessageSquare, Share2, BarChart3
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

const platformIcons = {
  facebook: { icon: FaFacebook, color: '#1877F2' },
  instagram: { icon: FaInstagram, color: '#E4405F' },
  twitter: { icon: FaTwitter, color: '#1DA1F2' },
  linkedin: { icon: FaLinkedin, color: '#0A66C2' },
  youtube: { icon: FaYoutube, color: '#FF0000' },
};
const statusStyles = {
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'Draft' },
  scheduled: { bg: 'bg-accent-violet/10', text: 'text-accent-violet', label: 'Scheduled' },
  published: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Published' },
};

function formatNum(n) { if (!n) return '0'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toString(); }

export default function PostsAndSchedule() {
  const [tab, setTab] = useState('posts'); // posts | calendar | performance
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [publishing, setPublishing] = useState('');
  const [trackedPosts, setTrackedPosts] = useState([]);
  const [digest, setDigest] = useState(null);
  const [refreshing, setRefreshing] = useState('');
  const [cronStatus, setCronStatus] = useState(null);
  const [tracking, setTracking] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPlatform) params.platform = filterPlatform;
      const res = await api.get('/api/posts', { params });
      setPosts(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, [filterStatus, filterPlatform]);

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try { await api.delete(`/api/posts/${postId}`); setPosts(prev => prev.filter(p => p.post_id !== postId)); }
    catch (err) { console.error(err); }
  };

  const handlePublish = async (post) => {
    setPublishing(post.post_id);
    try {
      // Try real publish if platform supports it
      if (['linkedin', 'facebook'].includes(post.platform)) {
        const res = await api.post('/api/publish/real', { content: post.content, platform: post.platform, image_url: post.image_url || '' });
        if (res.data.success) {
          await api.put(`/api/posts/${post.post_id}`, { status: 'published' });
          setPosts(prev => prev.map(p => p.post_id === post.post_id ? { ...p, status: 'published', external_url: res.data.url } : p));
        } else {
          alert(`Publish failed: ${res.data.error}`);
        }
      } else {
        const res = await api.post(`/api/posts/${post.post_id}/publish`);
        setPosts(prev => prev.map(p => p.post_id === post.post_id ? res.data : p));
      }
    } catch (err) { console.error(err); }
    finally { setPublishing(''); }
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = monthStart.getDay();
  const getPostsForDay = (date) => posts.filter(p => { const d = p.scheduled_at ? new Date(p.scheduled_at) : new Date(p.created_at); return isSameDay(d, date); });
  const dayPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  // Performance data
  const publishedPosts = posts.filter(p => p.status === 'published');
  const topPosts = [...publishedPosts].sort((a, b) => (b.metrics?.likes || 0) - (a.metrics?.likes || 0)).slice(0, 5);
  const totalLikes = publishedPosts.reduce((s, p) => s + (p.metrics?.likes || 0), 0);
  const totalComments = publishedPosts.reduce((s, p) => s + (p.metrics?.comments || 0), 0);
  const totalShares = publishedPosts.reduce((s, p) => s + (p.metrics?.shares || 0), 0);
  const totalReach = publishedPosts.reduce((s, p) => s + (p.metrics?.reach || 0), 0);
  const avgEngagement = publishedPosts.length > 0 ? ((totalLikes + totalComments + totalShares) / publishedPosts.length).toFixed(1) : 0;

  const tabs = [
    { key: 'posts', label: 'All Posts', icon: FileText, count: posts.length },
    { key: 'calendar', label: 'Calendar', icon: CalIcon },
    { key: 'performance', label: 'Performance', icon: BarChart3, count: publishedPosts.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="posts-schedule-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Posts & Schedule</h1>
          <p className="text-zinc-400 mt-1">Manage posts, schedule content, and track performance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-xl border border-white/5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-accent-violet/15 text-accent-violet' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            data-testid={`posts-tab-${t.key}`}
          ><t.icon className="w-4 h-4" /> {t.label} {t.count !== undefined && <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded-full">{t.count}</span>}</button>
        ))}
      </div>

      {/* POSTS TAB */}
      {tab === 'posts' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-zinc-900/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white" data-testid="posts-filter-status">
              <option value="" className="bg-zinc-900">All Status</option>
              <option value="draft" className="bg-zinc-900">Drafts</option>
              <option value="scheduled" className="bg-zinc-900">Scheduled</option>
              <option value="published" className="bg-zinc-900">Published</option>
            </select>
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="bg-zinc-900/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white" data-testid="posts-filter-platform">
              <option value="" className="bg-zinc-900">All Platforms</option>
              {Object.keys(platformIcons).map(p => <option key={p} value={p} className="bg-zinc-900">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>

          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-accent-violet animate-spin" /></div> :
          posts.length === 0 ? <div className="text-center py-16"><FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No posts yet. Create content in Content Studio.</p></div> :
          <div className="space-y-2">
            {posts.map(post => {
              const pMeta = platformIcons[post.platform];
              const status = statusStyles[post.status] || statusStyles.draft;
              const PIcon = pMeta?.icon;
              return (
                <div key={post.post_id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors flex items-start gap-3" data-testid={`post-${post.post_id}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${pMeta?.color}20` }}>
                    {PIcon && <PIcon className="w-4 h-4" style={{ color: pMeta?.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium text-white capitalize">{post.platform}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                      {post.is_real_post && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Live</span>}
                      {post.is_autopilot && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">Autopilot</span>}
                      <span className="text-[10px] text-zinc-600">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2">{post.content}</p>
                    {post.status === 'published' && post.metrics && (
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNum(post.metrics.likes)}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{formatNum(post.metrics.comments)}</span>
                        <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{formatNum(post.metrics.shares)}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNum(post.metrics.reach)}</span>
                      </div>
                    )}
                    {post.external_url && <a href={post.external_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent-violet mt-1 inline-block">View live post</a>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {post.status !== 'published' && (
                      <button onClick={() => handlePublish(post)} disabled={!!publishing} className="p-2 rounded-lg hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 transition-colors disabled:opacity-50" data-testid={`publish-${post.post_id}`}>
                        {publishing === post.post_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    )}
                    <button onClick={() => handleDelete(post.post_id)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors" data-testid={`delete-${post.post_id}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
      )}

      {/* CALENDAR TAB */}
      {tab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400"><ChevronLeft className="w-5 h-5" /></button>
              <h3 className="text-base font-heading font-semibold text-white">{format(currentMonth, 'MMMM yyyy')}</h3>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">{['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[10px] text-zinc-500 py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} className="aspect-square" />)}
              {days.map(day => {
                const dayP = getPostsForDay(day);
                const sel = selectedDay && isSameDay(day, selectedDay);
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDay(day)}
                    className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-start pt-1 transition-all ${sel ? 'bg-accent-violet/20 border border-accent-violet/50' : isToday(day) ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}>
                    <span className={`text-[10px] ${isToday(day) ? 'text-accent-violet font-bold' : 'text-zinc-400'}`}>{format(day, 'd')}</span>
                    {dayP.length > 0 && <div className="flex gap-0.5 mt-0.5">{dayP.slice(0,3).map((p,i) => <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: platformIcons[p.platform]?.color || '#7c3aed' }} />)}</div>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
            <h3 className="text-sm font-heading font-semibold text-white mb-3">{selectedDay ? format(selectedDay, 'MMM d, yyyy') : 'Select a day'}</h3>
            {selectedDay && dayPosts.length > 0 ? dayPosts.map(post => {
              const pMeta = platformIcons[post.platform]; const PIcon = pMeta?.icon;
              return (
                <div key={post.post_id} className="bg-zinc-800/80 rounded-lg p-3 border border-white/5 mb-2">
                  <div className="flex items-center gap-2 mb-1">{PIcon && <PIcon className="w-3.5 h-3.5" style={{ color: pMeta?.color }} />}<span className="text-xs text-white capitalize">{post.platform}</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${(statusStyles[post.status]||{}).bg} ${(statusStyles[post.status]||{}).text}`}>{post.status}</span></div>
                  <p className="text-[11px] text-zinc-400 line-clamp-3">{post.content}</p>
                </div>
              );
            }) : <p className="text-xs text-zinc-500">{selectedDay ? 'No posts' : 'Click a day'}</p>}
          </div>
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {tab === 'performance' && (
        <PerformanceTab posts={posts} publishedPosts={publishedPosts} topPosts={topPosts}
          totalLikes={totalLikes} totalComments={totalComments} totalShares={totalShares} avgEngagement={avgEngagement}
          trackedPosts={trackedPosts} setTrackedPosts={setTrackedPosts} digest={digest} setDigest={setDigest}
          refreshing={refreshing} setRefreshing={setRefreshing} cronStatus={cronStatus} setCronStatus={setCronStatus}
          tracking={tracking} setTracking={setTracking}
        />
      )}
    </div>
  );
}

function PerformanceTab({ posts, publishedPosts, topPosts, totalLikes, totalComments, totalShares, avgEngagement,
  trackedPosts, setTrackedPosts, digest, setDigest, refreshing, setRefreshing, cronStatus, setCronStatus, tracking, setTracking }) {
  const [loading, setLoading] = useState(false);

  const fetchTracking = async () => {
    setLoading(true);
    try {
      const [digestRes, cronRes, trackedRes] = await Promise.all([
        api.get('/api/tracking/digest'),
        api.get('/api/cron/status'),
        api.get('/api/tracking/posts'),
      ]);
      setDigest(digestRes.data);
      setCronStatus(cronRes.data);
      setTrackedPosts(trackedRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTracking(); }, []);

  const handleTrackPost = async (postId) => {
    setTracking(postId);
    try { await api.post(`/api/tracking/track/${postId}`); await fetchTracking(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed to track'); }
    finally { setTracking(''); }
  };

  const handleRefresh = async (postId) => {
    setRefreshing(postId);
    try { await api.post(`/api/tracking/refresh/${postId}`); await fetchTracking(); }
    catch (err) { console.error(err); }
    finally { setRefreshing(''); }
  };

  const handleRunCron = async () => {
    try { const res = await api.post('/api/cron/run-now'); alert(`Auto-published ${res.data.published} posts, tracking refreshed`); await fetchTracking(); }
    catch (err) { console.error(err); }
  };

  const trackedPostIds = trackedPosts.map(t => t.post_id);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Published', value: publishedPosts.length, color: '#10b981', icon: CheckCircle },
          { label: 'Total Likes', value: formatNum(totalLikes), color: '#ec4899', icon: Heart },
          { label: 'Comments', value: formatNum(totalComments), color: '#06b6d4', icon: MessageSquare },
          { label: 'Shares', value: formatNum(totalShares), color: '#f97316', icon: Share2 },
          { label: 'Avg Engagement', value: avgEngagement, color: '#7c3aed', icon: TrendingUp },
        ].map(m => (
          <div key={m.label} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2"><m.icon className="w-3.5 h-3.5" style={{ color: m.color }} /><span className="text-[10px] text-zinc-500 uppercase tracking-wider">{m.label}</span></div>
            <p className="text-xl font-heading font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Cron & Tracking Status */}
      {cronStatus && (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Auto-publisher: {cronStatus.scheduler}</span>
            <span className="text-zinc-400">Interval: {cronStatus.interval}</span>
            <span className="text-zinc-400">Scheduled: {cronStatus.scheduled_posts}</span>
            <span className="text-amber-400">Due now: {cronStatus.due_now}</span>
            <span className="text-accent-violet">Tracking: {cronStatus.active_tracking} posts</span>
          </div>
          <button onClick={handleRunCron} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all" data-testid="run-cron-button">
            <Clock className="w-3 h-3" /> Run Now
          </button>
        </div>
      )}

      {/* Tracked Posts Performance */}
      {digest && digest.all_posts?.length > 0 && (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent-violet" /> Live Performance Tracking
            <span className="text-[10px] text-zinc-500 font-normal ml-2">{digest.total_tracked} posts tracked</span>
          </h3>
          <div className="space-y-3">
            {digest.all_posts.map((item, i) => {
              const pMeta = platformIcons[item.platform]; const PIcon = pMeta?.icon;
              const g = item.growth || {};
              const hasGrowth = item.total_growth > 0;
              return (
                <div key={item.post_id} className="bg-zinc-800/80 rounded-lg p-4 border border-white/5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${pMeta?.color}20` }}>
                      {PIcon && <PIcon className="w-4 h-4" style={{ color: pMeta?.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-white capitalize">{item.platform}</span>
                        <span className="text-[10px] text-zinc-500">{Math.round(item.hours_tracked)}h tracked</span>
                        <span className="text-[10px] text-zinc-600">{item.snapshots_count} snapshots</span>
                      </div>
                      <p className="text-xs text-zinc-300 line-clamp-1 mb-2">{item.content}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Likes', current: item.current_metrics?.likes, growth: g.likes, color: '#ec4899' },
                          { label: 'Comments', current: item.current_metrics?.comments, growth: g.comments, color: '#06b6d4' },
                          { label: 'Shares', current: item.current_metrics?.shares, growth: g.shares, color: '#f97316' },
                          { label: 'Reach', current: item.current_metrics?.reach, growth: g.reach, color: '#7c3aed' },
                        ].map(m => (
                          <div key={m.label} className="bg-zinc-900/80 rounded-lg p-2">
                            <p className="text-[9px] text-zinc-500">{m.label}</p>
                            <p className="text-sm font-heading font-bold" style={{ color: m.color }}>{formatNum(m.current || 0)}</p>
                            {m.growth > 0 && <p className="text-[9px] text-emerald-400 flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" />+{m.growth}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => handleRefresh(item.post_id)} disabled={refreshing === item.post_id}
                        className="p-1.5 rounded-lg hover:bg-accent-violet/10 text-zinc-500 hover:text-accent-violet transition-colors disabled:opacity-50" title="Refresh metrics">
                        {refreshing === item.post_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      </button>
                      {item.external_url && <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white"><Eye className="w-3.5 h-3.5" /></a>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Untracked published posts */}
      {publishedPosts.filter(p => !trackedPostIds.includes(p.post_id)).length > 0 && (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Published Posts - Start Tracking
          </h3>
          <div className="space-y-2">
            {publishedPosts.filter(p => !trackedPostIds.includes(p.post_id)).slice(0, 10).map(post => {
              const pMeta = platformIcons[post.platform]; const PIcon = pMeta?.icon;
              return (
                <div key={post.post_id} className="flex items-center gap-3 p-3 bg-zinc-800/60 rounded-lg border border-white/5">
                  {PIcon && <PIcon className="w-4 h-4 flex-shrink-0" style={{ color: pMeta?.color }} />}
                  <p className="text-xs text-zinc-300 flex-1 truncate">{post.content}</p>
                  <button onClick={() => handleTrackPost(post.post_id)} disabled={tracking === post.post_id}
                    className="text-[10px] bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/20 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50 transition-all flex-shrink-0"
                    data-testid={`track-${post.post_id}`}
                  >{tracking === post.post_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />} Track</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {publishedPosts.length === 0 && (
        <div className="text-center py-12"><BarChart3 className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No published posts yet. Publish content to track performance.</p></div>
      )}
    </div>
  );
}
