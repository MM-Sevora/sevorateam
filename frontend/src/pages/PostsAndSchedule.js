import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import {
  FileText, Trash2, Send, Filter, Clock, CheckCircle, Calendar as CalIcon,
  ChevronLeft, ChevronRight, Loader2, TrendingUp, Eye, Heart, MessageSquare,
  Share2, BarChart3, Plus, X, Image, Globe, Zap, List, Grid3X3, CalendarDays,
  Edit3, ExternalLink, AlertTriangle, Upload
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';

const platforms = [
  { key: 'linkedin', icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn' },
  { key: 'facebook', icon: FaFacebook, color: '#1877F2', label: 'Facebook' },
  { key: 'instagram', icon: FaInstagram, color: '#E4405F', label: 'Instagram' },
  { key: 'twitter', icon: FaTwitter, color: '#1DA1F2', label: 'Twitter/X' },
  { key: 'youtube', icon: FaYoutube, color: '#FF0000', label: 'YouTube' },
];
const statusColors = {
  draft: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', label: 'Draft' },
  scheduled: { bg: 'bg-accent-violet/15', text: 'text-accent-violet', label: 'Scheduled' },
  published: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Published' },
};
function formatNum(n) { if (!n) return '0'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toString(); }

export default function PostsAndSchedule() {
  const [view, setView] = useState('week'); // week | month | list
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [composerDate, setComposerDate] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');

  // Composer state
  const [cPlatforms, setCPlatforms] = useState(['linkedin']);
  const [cContent, setCContent] = useState('');
  const [cImageUrl, setCImageUrl] = useState('');
  const [cDate, setCDate] = useState('');
  const [cTime, setCTime] = useState('10:00');
  const [cAction, setCAction] = useState('schedule'); // schedule | post_now
  const [cSaving, setCSaving] = useState(false);
  const [cError, setCError] = useState('');
  const [cResult, setCResult] = useState(null);
  const [publishing, setPublishing] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    try { const res = await api.get('/api/posts'); setPosts(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchPosts(); }, []);

  const getPostsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return posts.filter(p => {
      const pDate = (p.scheduled_at || p.created_at || '').slice(0, 10);
      return pDate === dateStr;
    }).filter(p => !filterPlatform || p.platform === filterPlatform);
  };

  const openComposer = (date) => {
    const d = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    setCDate(d); setComposerDate(d);
    setCContent(''); setCImageUrl(''); setCTime('10:00');
    setCPlatforms(['linkedin']); setCAction('schedule');
    setCError(''); setCResult(null); setShowComposer(true);
  };

  const toggleComposerPlatform = (p) => {
    setCPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleComposerSubmit = async () => {
    if (!cContent.trim()) { setCError('Content is required'); return; }
    if (cPlatforms.length === 0) { setCError('Select at least one platform'); return; }
    setCSaving(true); setCError(''); setCResult(null);

    if (cAction === 'post_now') {
      // Publish to all selected platforms
      const results = {};
      for (const p of cPlatforms) {
        try {
          const res = await api.post('/api/publish/real', { content: cContent, platform: p, image_url: cImageUrl });
          results[p] = res.data;
        } catch (err) {
          results[p] = { success: false, error: err.response?.data?.detail || 'Failed' };
        }
      }
      setCResult(results);
      await fetchPosts();
    } else {
      // Schedule for each platform
      for (const p of cPlatforms) {
        try {
          await api.post('/api/posts', {
            platform: p, content: cContent, image_url: cImageUrl,
            scheduled_at: `${cDate}T${cTime}`, status: 'scheduled',
          });
        } catch (err) { setCError(`Failed for ${p}`); }
      }
      await fetchPosts();
      setCResult({ _scheduled: true });
    }
    setCSaving(false);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try { await api.delete(`/api/posts/${postId}`); setPosts(prev => prev.filter(p => p.post_id !== postId)); setSelectedPost(null); }
    catch (err) { console.error(err); }
  };

  const handlePublishPost = async (post) => {
    setPublishing(post.post_id);
    try {
      if (['linkedin', 'facebook', 'instagram'].includes(post.platform)) {
        const res = await api.post('/api/publish/real', { content: post.content, platform: post.platform, image_url: post.image_url || '' });
        if (res.data.success) { await api.put(`/api/posts/${post.post_id}`, { status: 'published' }); }
      } else {
        await api.post(`/api/posts/${post.post_id}/publish`);
      }
      await fetchPosts(); setSelectedPost(null);
    } catch (err) { console.error(err); }
    finally { setPublishing(''); }
  };

  // Week view dates
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month view dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const monthPad = monthStart.getDay();

  const filteredPosts = posts.filter(p => !filterPlatform || p.platform === filterPlatform);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="posts-schedule-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Posts & Schedule</h1>
          <p className="text-zinc-400 mt-1">Plan, create, schedule, and publish your content</p>
        </div>
        <button onClick={() => openComposer(null)}
          className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 rounded-lg font-medium px-5 py-2.5 flex items-center gap-2"
          data-testid="new-post-btn"
        ><Plus className="w-4 h-4" /> New Post</button>
      </div>

      {/* Toolbar: View Toggle + Platform Filter + Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {/* View toggles */}
          <div className="flex bg-zinc-900/50 rounded-lg border border-white/5 p-0.5">
            {[{ k: 'week', icon: CalendarDays, l: 'Week' }, { k: 'month', icon: Grid3X3, l: 'Month' }, { k: 'list', icon: List, l: 'List' }].map(v => (
              <button key={v.k} onClick={() => setView(v.k)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === v.k ? 'bg-accent-violet/15 text-accent-violet' : 'text-zinc-500 hover:text-white'}`}
                data-testid={`view-${v.k}`}
              ><v.icon className="w-3.5 h-3.5" /> {v.l}</button>
            ))}
          </div>
          {/* Date nav */}
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="text-xs text-accent-violet hover:text-accent-violet-hover px-2 py-1 rounded-lg hover:bg-accent-violet/5">Today</button>
            <button onClick={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <span className="text-sm font-heading font-semibold text-white ml-2">
            {view === 'month' ? format(currentDate, 'MMMM yyyy') : `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}
          </span>
        </div>

        {/* Platform filter */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFilterPlatform('')} className={`text-[10px] px-2.5 py-1.5 rounded-lg transition-all ${!filterPlatform ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}>All</button>
          {platforms.map(p => (
            <button key={p.key} onClick={() => setFilterPlatform(filterPlatform === p.key ? '' : p.key)}
              className={`p-1.5 rounded-lg transition-all ${filterPlatform === p.key ? 'bg-white/10' : 'hover:bg-white/5'}`}>
              <p.icon className="w-3.5 h-3.5" style={{ color: filterPlatform === p.key ? p.color : '#71717a' }} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex gap-4">
        {/* Calendar / List */}
        <div className="flex-1 min-w-0">
          {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-accent-violet animate-spin" /></div> : (
            <>
              {/* WEEK VIEW */}
              {view === 'week' && (
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-white/5">
                    {weekDays.map(day => (
                      <div key={day.toISOString()} className={`p-3 text-center border-r border-white/5 last:border-r-0 ${isToday(day) ? 'bg-accent-violet/5' : ''}`}>
                        <p className="text-[10px] text-zinc-500 uppercase">{format(day, 'EEE')}</p>
                        <p className={`text-lg font-heading font-bold mt-0.5 ${isToday(day) ? 'text-accent-violet' : 'text-white'}`}>{format(day, 'd')}</p>
                        <p className="text-[10px] text-zinc-600">{getPostsForDay(day).length} posts</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 min-h-[350px]">
                    {weekDays.map(day => {
                      const dayPosts = getPostsForDay(day);
                      return (
                        <div key={day.toISOString()} className={`p-2 border-r border-white/5 last:border-r-0 ${isToday(day) ? 'bg-accent-violet/5' : ''}`}>
                          <div className="space-y-1.5">
                            {dayPosts.slice(0, 4).map(post => {
                              const meta = platforms.find(p => p.key === post.platform);
                              const Icon = meta?.icon;
                              const st = statusColors[post.status] || statusColors.draft;
                              return (
                                <div key={post.post_id} onClick={() => setSelectedPost(post)}
                                  className="p-2 rounded-lg bg-zinc-800/80 border border-white/5 hover:border-white/15 cursor-pointer transition-all group"
                                  data-testid={`cal-post-${post.post_id}`}
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {Icon && <Icon className="w-3 h-3" style={{ color: meta?.color }} />}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-300 line-clamp-2 leading-relaxed">{post.content}</p>
                                  {post.scheduled_at && <p className="text-[9px] text-zinc-600 mt-1 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{post.scheduled_at.split('T')[1]?.slice(0,5)}</p>}
                                </div>
                              );
                            })}
                            {dayPosts.length > 4 && <p className="text-[10px] text-zinc-500 text-center">+{dayPosts.length - 4} more</p>}
                          </div>
                          <button onClick={() => openComposer(day)} className="w-full mt-2 p-1.5 rounded-lg border border-dashed border-white/10 hover:border-accent-violet/30 hover:bg-accent-violet/5 text-zinc-600 hover:text-accent-violet text-[10px] flex items-center justify-center gap-1 transition-all opacity-0 group-hover:opacity-100 hover:opacity-100" style={{ opacity: dayPosts.length === 0 ? 1 : undefined }}>
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MONTH VIEW */}
              {view === 'month' && (
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-7">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="p-2 text-center text-[10px] text-zinc-500 uppercase border-b border-white/5">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: monthPad }).map((_, i) => <div key={`pad-${i}`} className="p-2 border-r border-b border-white/5 min-h-[80px]" />)}
                    {monthDays.map(day => {
                      const dayPosts = getPostsForDay(day);
                      return (
                        <div key={day.toISOString()} className={`p-1.5 border-r border-b border-white/5 min-h-[80px] ${isToday(day) ? 'bg-accent-violet/5' : ''}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-medium ${isToday(day) ? 'text-accent-violet' : 'text-zinc-400'}`}>{format(day, 'd')}</span>
                            {dayPosts.length > 0 && <span className="text-[9px] text-zinc-500 bg-zinc-800 px-1 rounded">{dayPosts.length}</span>}
                          </div>
                          <div className="space-y-0.5">
                            {dayPosts.slice(0, 2).map(post => {
                              const meta = platforms.find(p => p.key === post.platform);
                              return (
                                <div key={post.post_id} onClick={() => setSelectedPost(post)} className="flex items-center gap-1 p-1 rounded bg-zinc-800/60 cursor-pointer hover:bg-zinc-700/60 transition-colors">
                                  {meta?.icon && <meta.icon className="w-2.5 h-2.5" style={{ color: meta?.color }} />}
                                  <span className="text-[9px] text-zinc-400 truncate">{post.content?.slice(0, 20)}</span>
                                </div>
                              );
                            })}
                            {dayPosts.length > 2 && <p className="text-[9px] text-zinc-600 text-center">+{dayPosts.length - 2}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LIST VIEW */}
              {view === 'list' && (
                <div className="space-y-2">
                  {filteredPosts.length > 0 ? filteredPosts.map(post => {
                    const meta = platforms.find(p => p.key === post.platform);
                    const Icon = meta?.icon;
                    const st = statusColors[post.status] || statusColors.draft;
                    const m = post.metrics || {};
                    return (
                      <div key={post.post_id} onClick={() => setSelectedPost(post)}
                        className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors cursor-pointer flex items-start gap-3"
                        data-testid={`list-post-${post.post_id}`}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta?.color}15` }}>
                          {Icon && <Icon className="w-4 h-4" style={{ color: meta?.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-white capitalize">{post.platform}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                            {post.is_real_post && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">Live</span>}
                            <span className="text-[10px] text-zinc-600">{new Date(post.scheduled_at || post.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-zinc-300 line-clamp-2">{post.content}</p>
                          {post.status === 'published' && (m.likes > 0 || m.comments > 0) && (
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500">
                              <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNum(m.likes)}</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{formatNum(m.comments)}</span>
                              {m.shares > 0 && <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{formatNum(m.shares)}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-16"><FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No posts yet</p></div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Panel: Post Detail or Composer */}
        {(selectedPost || showComposer) && (
          <div className="w-96 flex-shrink-0 bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden max-h-[calc(100vh-200px)] overflow-y-auto" data-testid="side-panel">
            {/* POST DETAIL */}
            {selectedPost && !showComposer && (
              <div>
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => { const m = platforms.find(p => p.key === selectedPost.platform); return m?.icon ? <m.icon className="w-4 h-4" style={{ color: m.color }} /> : null; })()}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${(statusColors[selectedPost.status] || {}).bg} ${(statusColors[selectedPost.status] || {}).text}`}>{(statusColors[selectedPost.status] || {}).label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedPost.status !== 'published' && (
                      <button onClick={() => handlePublishPost(selectedPost)} disabled={!!publishing}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50" data-testid="panel-publish">
                        {publishing === selectedPost.post_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Post now
                      </button>
                    )}
                    <button onClick={() => handleDeletePost(selectedPost.post_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => setSelectedPost(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="p-4">
                  {/* Post preview card */}
                  <div className="bg-zinc-800/80 rounded-xl p-4 border border-white/5 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      {(() => { const m = platforms.find(p => p.key === selectedPost.platform); return m?.icon ? <m.icon className="w-4 h-4" style={{ color: m.color }} /> : null; })()}
                      <span className="text-xs font-medium text-white capitalize">{selectedPost.platform}</span>
                      <span className="text-[10px] text-zinc-600 ml-auto">{new Date(selectedPost.scheduled_at || selectedPost.created_at).toLocaleString()}</span>
                    </div>
                    {selectedPost.image_url && selectedPost.image_url.startsWith('data:') && (
                      <img src={selectedPost.image_url} alt="" className="w-full rounded-lg mb-3 border border-white/5" />
                    )}
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{selectedPost.content}</p>
                  </div>
                  {/* Details */}
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between"><span className="text-zinc-500">Status</span><span className="text-white capitalize">{selectedPost.status}</span></div>
                    {selectedPost.scheduled_at && <div className="flex justify-between"><span className="text-zinc-500">Scheduled</span><span className="text-white">{selectedPost.scheduled_at}</span></div>}
                    {selectedPost.published_at && <div className="flex justify-between"><span className="text-zinc-500">Published</span><span className="text-white">{new Date(selectedPost.published_at).toLocaleString()}</span></div>}
                    {selectedPost.external_url && (
                      <a href={selectedPost.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent-violet hover:underline"><ExternalLink className="w-3 h-3" /> View live post</a>
                    )}
                    {selectedPost.is_real_post && <div className="flex justify-between"><span className="text-zinc-500">Type</span><span className="text-emerald-400">Published to real platform</span></div>}
                    {selectedPost.status === 'published' && selectedPost.metrics && (
                      <div className="pt-3 border-t border-white/5">
                        <p className="text-zinc-500 mb-2">Performance</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[{ l: 'Likes', v: selectedPost.metrics.likes, c: '#ec4899', i: Heart },
                            { l: 'Comments', v: selectedPost.metrics.comments, c: '#06b6d4', i: MessageSquare },
                            { l: 'Shares', v: selectedPost.metrics.shares, c: '#f97316', i: Share2 },
                            { l: 'Reach', v: selectedPost.metrics.reach, c: '#7c3aed', i: Eye }].map(m => (
                            <div key={m.l} className="bg-zinc-900/60 rounded-lg p-2">
                              <div className="flex items-center gap-1 mb-0.5"><m.i className="w-3 h-3" style={{ color: m.c }} /><span className="text-[9px] text-zinc-500">{m.l}</span></div>
                              <p className="text-sm font-heading font-bold" style={{ color: m.c }}>{formatNum(m.v)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* COMPOSER */}
            {showComposer && (
              <div>
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-accent-violet" /> New Post</h3>
                  <button onClick={() => { setShowComposer(false); setCResult(null); }} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-4 space-y-4">
                  {/* Platform Selection */}
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">Publish to</label>
                    <div className="flex gap-2">
                      {platforms.filter(p => ['linkedin', 'facebook', 'instagram'].includes(p.key)).map(p => (
                        <button key={p.key} onClick={() => toggleComposerPlatform(p.key)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${cPlatforms.includes(p.key) ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-500 opacity-50'}`}
                        ><p.icon className="w-4 h-4" style={{ color: cPlatforms.includes(p.key) ? p.color : '#555' }} /> {p.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">Content</label>
                    <textarea value={cContent} onChange={(e) => setCContent(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-3 px-4 text-sm text-white placeholder-zinc-500 resize-none"
                      rows={5} placeholder="Write your post content..." data-testid="composer-content"
                    />
                    <p className="text-[10px] text-zinc-600 mt-1">{cContent.length} characters</p>
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">Image URL (optional)</label>
                    <input type="text" value={cImageUrl} onChange={(e) => setCImageUrl(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-zinc-600"
                      placeholder="https://example.com/image.jpg" />
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">Date</label>
                      <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)}
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">Time</label>
                      <input type="time" value={cTime} onChange={(e) => setCTime(e.target.value)}
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white" />
                    </div>
                  </div>

                  {cError && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{cError}</div>}

                  {cResult && (
                    <div className="space-y-1.5">
                      {cResult._scheduled ? (
                        <div className="p-2.5 rounded-lg bg-accent-violet/10 border border-accent-violet/20 text-accent-violet text-xs flex items-center gap-2"><CalIcon className="w-4 h-4" /> Scheduled for {cDate} at {cTime}!</div>
                      ) : Object.entries(cResult).map(([p, r]) => (
                        <div key={p} className={`p-2 rounded-lg text-xs flex items-center gap-2 ${r.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {r.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          <span className="capitalize">{p}:</span> {r.success ? 'Published!' : r.error?.slice(0, 50)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setCAction('schedule'); handleComposerSubmit(); }}
                      disabled={cSaving || !cContent.trim()}
                      className="flex-1 bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all" data-testid="composer-schedule">
                      {cSaving && cAction === 'schedule' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} Schedule
                    </button>
                    <button onClick={() => { setCAction('post_now'); handleComposerSubmit(); }}
                      disabled={cSaving || !cContent.trim()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all" data-testid="composer-publish">
                      {cSaving && cAction === 'post_now' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} Post Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
