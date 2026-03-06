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
        <div className="space-y-4">
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

          {topPosts.length > 0 ? (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Top Performing Posts</h3>
              <div className="space-y-2">
                {topPosts.map((post, i) => {
                  const pMeta = platformIcons[post.platform]; const PIcon = pMeta?.icon;
                  const m = post.metrics || {};
                  return (
                    <div key={post.post_id} className="flex items-start gap-3 p-3 bg-zinc-800/80 rounded-lg border border-white/5">
                      <span className="text-lg font-heading font-bold text-zinc-600 w-6 text-right flex-shrink-0">#{i+1}</span>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${pMeta?.color}20` }}>
                        {PIcon && <PIcon className="w-4 h-4" style={{ color: pMeta?.color }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300 line-clamp-2 mb-1">{post.content}</p>
                        <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{formatNum(m.likes)}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-cyan-400" />{formatNum(m.comments)}</span>
                          <span className="flex items-center gap-1"><Share2 className="w-3 h-3 text-orange-400" />{formatNum(m.shares)}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-violet-400" />{formatNum(m.reach)}</span>
                        </div>
                      </div>
                      {post.external_url && <a href={post.external_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent-violet flex-shrink-0">View</a>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12"><BarChart3 className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No published posts yet. Publish content to track performance.</p></div>
          )}
        </div>
      )}
    </div>
  );
}
