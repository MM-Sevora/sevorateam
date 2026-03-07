import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import {
  FileText, Trash2, Send, Clock, CheckCircle, Calendar as CalIcon,
  ChevronLeft, ChevronRight, Loader2, Heart, MessageSquare, Share2,
  Plus, X, Image, Globe, List, Grid3X3, CalendarDays, Eye, Upload, AlertTriangle, Info, ExternalLink, Sparkles, Edit3
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';

const platforms = [
  { key: 'linkedin', icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn', maxChars: 3000, optimalChars: '100-300' },
  { key: 'facebook', icon: FaFacebook, color: '#1877F2', label: 'Facebook', maxChars: 63206, optimalChars: '40-80' },
  { key: 'instagram', icon: FaInstagram, color: '#E4405F', label: 'Instagram', maxChars: 2200, optimalChars: '138-150', imageRequired: true },
  { key: 'twitter', icon: FaTwitter, color: '#1DA1F2', label: 'Twitter/X', maxChars: 280, optimalChars: '71-100' },
];
const statusColors = {
  draft: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', label: 'Draft' },
  scheduled: { bg: 'bg-accent-violet/15', text: 'text-accent-violet', label: 'Scheduled' },
  published: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Published' },
};
function formatNum(n) { if (!n) return '0'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toString(); }

// Platform preview mockups
function LinkedInPreview({ content, image, userName }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden text-black text-xs" data-testid="preview-linkedin">
      <div className="p-3 flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{userName?.charAt(0) || 'S'}</div>
        <div><p className="font-semibold text-[11px]">{userName || 'Sevora'}</p><p className="text-[9px] text-gray-500">Just now</p></div>
      </div>
      <div className="px-3 pb-2"><p className="text-[11px] leading-relaxed whitespace-pre-wrap">{content?.slice(0, 300) || 'Your LinkedIn post preview...'}{content?.length > 300 ? '...more' : ''}</p></div>
      {image && <img src={image} alt="" className="w-full max-h-48 object-cover" />}
      <div className="px-3 py-2 border-t border-gray-200 flex gap-4 text-[10px] text-gray-500">
        <span>Like</span><span>Comment</span><span>Repost</span><span>Send</span>
      </div>
    </div>
  );
}

function InstagramPreview({ content, image, userName }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden text-black text-xs" data-testid="preview-instagram">
      <div className="p-2.5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white font-bold text-[10px]">{userName?.charAt(0) || 'S'}</div>
        <p className="font-semibold text-[11px]">{userName || 'shopsevora'}</p>
      </div>
      {image ? <img src={image} alt="" className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-xs"><Image className="w-8 h-8" /><span className="ml-2">Image required</span></div>}
      <div className="p-2.5">
        <div className="flex gap-3 mb-2 text-black"><Heart className="w-4 h-4" /><MessageSquare className="w-4 h-4" /><Send className="w-4 h-4" /></div>
        <p className="text-[11px] leading-relaxed"><span className="font-semibold">{userName || 'shopsevora'}</span> {content?.slice(0, 125) || 'Your Instagram caption...'}{content?.length > 125 ? '...more' : ''}</p>
      </div>
    </div>
  );
}

function FacebookPreview({ content, image, userName }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden text-black text-xs" data-testid="preview-facebook">
      <div className="p-3 flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">{userName?.charAt(0) || 'S'}</div>
        <div><p className="font-semibold text-[11px]">{userName || 'Sevora'}</p><p className="text-[9px] text-gray-500">Just now · Public</p></div>
      </div>
      <div className="px-3 pb-2"><p className="text-[11px] leading-relaxed whitespace-pre-wrap">{content?.slice(0, 200) || 'Your Facebook post preview...'}</p></div>
      {image && <img src={image} alt="" className="w-full max-h-48 object-cover" />}
      <div className="px-3 py-2 border-t border-gray-200 flex justify-around text-[10px] text-gray-500">
        <span>Like</span><span>Comment</span><span>Share</span>
      </div>
    </div>
  );
}

function TwitterPreview({ content, image, userName }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden text-black text-xs" data-testid="preview-twitter">
      <div className="p-3 flex items-start gap-2">
        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm flex-shrink-0">{userName?.charAt(0) || 'S'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1"><p className="font-semibold text-[11px]">{userName || 'Sevora'}</p><p className="text-[9px] text-gray-400">@sevora · now</p></div>
          <p className="text-[11px] leading-relaxed mt-0.5 whitespace-pre-wrap">{content?.slice(0, 280) || 'Your tweet...'}</p>
          {image && <img src={image} alt="" className="w-full max-h-36 object-cover rounded-xl mt-2" />}
          <div className="flex gap-8 mt-2 text-[10px] text-gray-400"><MessageSquare className="w-3.5 h-3.5" /><span>Repost</span><Heart className="w-3.5 h-3.5" /><Eye className="w-3.5 h-3.5" /></div>
        </div>
      </div>
    </div>
  );
}

export default function PostsAndSchedule() {
  const [view, setView] = useState('week');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState('');

  // Composer
  const [cPlatforms, setCPlatforms] = useState(['linkedin']);
  const [cContents, setCContents] = useState({}); // per-platform content
  const [cImages, setCImages] = useState([]); // multiple images [{url, filename}]
  const [cSchedules, setCSchedules] = useState({}); // per-platform schedule {linkedin: {date, time}, ...}
  const [cDate, setCDate] = useState('');
  const [cTime, setCTime] = useState('10:00');
  const [cSameTime, setCSameTime] = useState(true); // same time for all platforms
  const [cSaving, setCSaving] = useState(false);
  const [cError, setCError] = useState('');
  const [cResult, setCResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState('linkedin');
  const [publishing, setPublishing] = useState('');
  const [previewTab, setPreviewTab] = useState('compose');
  const [editingPost, setEditingPost] = useState(null); // post being edited
  const fileRef = useRef(null);

  const fetchPosts = async () => {
    setLoading(true);
    try { const res = await api.get('/api/posts'); setPosts(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchPosts(); }, []);

  const getPostsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return posts.filter(p => (p.scheduled_at || p.created_at || '').slice(0, 10) === dateStr).filter(p => !filterPlatform || p.platform === filterPlatform);
  };

  const openComposer = (date, post = null) => {
    if (post) {
      // Edit mode
      setEditingPost(post);
      setCPlatforms([post.platform]);
      setCContents({ [post.platform]: post.content, _shared: post.content });
      setCImages(post.image_url ? [{ url: post.image_url }] : []);
      const sa = post.scheduled_at || '';
      setCDate(sa.split('T')[0] || format(new Date(), 'yyyy-MM-dd'));
      setCTime(sa.split('T')[1]?.slice(0, 5) || '10:00');
      setPreviewPlatform(post.platform);
    } else {
      // New post mode
      setEditingPost(null);
      setCDate(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setCContents({}); setCImages([]); setCTime('10:00');
      setCPlatforms(['linkedin']); setPreviewPlatform('linkedin');
    }
    setCSchedules({}); setCSameTime(true);
    setCError(''); setCResult(null); setShowComposer(true); setSelectedPost(null);
  };

  const togglePlatform = (p) => {
    setCPlatforms(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p];
      if (next.length > 0 && !next.includes(previewPlatform)) setPreviewPlatform(next[0]);
      return next;
    });
  };

  const getContent = (platform) => cContents[platform] || cContents._shared || '';
  const setContent = (platform, text) => {
    setCContents(prev => ({ ...prev, [platform]: text, _shared: prev._shared === undefined ? text : prev._shared }));
  };
  const setSharedContent = (text) => {
    setCContents(prev => {
      const next = { _shared: text };
      cPlatforms.forEach(p => { if (!prev[p] || prev[p] === prev._shared) next[p] = text; else next[p] = prev[p]; });
      return next;
    });
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const token = localStorage.getItem('sf_token');
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload/image`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
        });
        const data = await res.json();
        if (data.url) setCImages(prev => [...prev, { url: data.url, filename: data.filename }]);
        else setCError(data.detail || 'Upload failed');
      } catch (err) { setCError('Upload failed'); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (index) => { setCImages(prev => prev.filter((_, i) => i !== index)); };
  const primaryImage = cImages.length > 0 ? cImages[0].url : '';

  const getSchedule = (platform) => {
    if (cSameTime) return { date: cDate, time: cTime };
    return cSchedules[platform] || { date: cDate, time: cTime };
  };

  const setPlatformSchedule = (platform, field, value) => {
    setCSchedules(prev => ({ ...prev, [platform]: { ...getSchedule(platform), [field]: value } }));
  };

  const handleSubmit = async (action) => {
    if (cPlatforms.length === 0) { setCError('Select at least one platform'); return; }
    const hasContent = cPlatforms.some(p => getContent(p).trim());
    if (!hasContent) { setCError('Content is required'); return; }
    setCSaving(true); setCError(''); setCResult(null);

    if (editingPost) {
      // UPDATE existing post
      try {
        await api.put(`/api/posts/${editingPost.post_id}`, {
          content: getContent(editingPost.platform),
          image_url: primaryImage,
          scheduled_at: `${cDate}T${cTime}`,
          status: action === 'post_now' ? 'published' : (action === 'draft' ? 'draft' : 'scheduled'),
        });
        if (action === 'post_now') {
          const res = await api.post('/api/publish/real', { content: getContent(editingPost.platform), platform: editingPost.platform, image_url: primaryImage });
          setCResult({ [editingPost.platform]: res.data });
        } else {
          setCResult({ _scheduled: true });
        }
      } catch (err) { setCError(err.response?.data?.detail || 'Update failed'); }
    } else if (action === 'post_now') {
      const results = {};
      for (const p of cPlatforms) {
        const text = getContent(p);
        if (!text.trim()) continue;
        try {
          const res = await api.post('/api/publish/real', { content: text, platform: p, image_url: primaryImage });
          results[p] = res.data;
        } catch (err) { results[p] = { success: false, error: err.response?.data?.detail || 'Failed' }; }
      }
      setCResult(results);
    } else {
      // Schedule/Draft - per-platform times
      for (const p of cPlatforms) {
        const text = getContent(p);
        if (!text.trim()) continue;
        const sched = getSchedule(p);
        try {
          await api.post('/api/posts', {
            platform: p, content: text, image_url: primaryImage,
            scheduled_at: `${sched.date}T${sched.time}`,
            status: action === 'draft' ? 'draft' : 'scheduled',
          });
        } catch (err) { setCError(`Failed for ${p}`); }
      }
      setCResult({ _scheduled: true });
    }
    await fetchPosts();
    setCSaving(false);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete?')) return;
    try { await api.delete(`/api/posts/${postId}`); setPosts(prev => prev.filter(p => p.post_id !== postId)); setSelectedPost(null); } catch (err) { console.error(err); }
  };

  const handlePublishPost = async (post) => {
    setPublishing(post.post_id);
    try {
      if (['linkedin', 'facebook', 'instagram'].includes(post.platform)) {
        const res = await api.post('/api/publish/real', { content: post.content, platform: post.platform, image_url: post.image_url || '' });
        if (res.data.success) await api.put(`/api/posts/${post.post_id}`, { status: 'published' });
      } else { await api.post(`/api/posts/${post.post_id}/publish`); }
      await fetchPosts(); setSelectedPost(null);
    } catch (err) { console.error(err); }
    finally { setPublishing(''); }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart2 = startOfMonth(currentDate);
  const monthEnd2 = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart2, end: monthEnd2 });
  const monthPad = monthStart2.getDay();
  const filteredPosts = posts.filter(p => !filterPlatform || p.platform === filterPlatform);
  const currentPlatformConfig = platforms.find(p => p.key === previewPlatform) || platforms[0];
  const currentContent = getContent(previewPlatform);
  const charPercent = Math.min((currentContent.length / currentPlatformConfig.maxChars) * 100, 100);
  const charColor = charPercent > 90 ? '#ef4444' : charPercent > 70 ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-5 animate-fade-in" data-testid="posts-schedule-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-heading font-bold text-white tracking-tight">Posts & Schedule</h1><p className="text-zinc-400 mt-1">Plan, create, schedule, and publish your content</p></div>
        <button onClick={() => openComposer(null)} className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] rounded-lg font-medium px-5 py-2.5 flex items-center gap-2" data-testid="new-post-btn"><Plus className="w-4 h-4" /> New Post</button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-900/50 rounded-lg border border-white/5 p-0.5">
            {[{ k: 'week', icon: CalendarDays, l: 'Week' }, { k: 'month', icon: Grid3X3, l: 'Month' }, { k: 'list', icon: List, l: 'List' }].map(v => (
              <button key={v.k} onClick={() => setView(v.k)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === v.k ? 'bg-accent-violet/15 text-accent-violet' : 'text-zinc-500 hover:text-white'}`}><v.icon className="w-3.5 h-3.5" /> {v.l}</button>
            ))}
          </div>
          <button onClick={() => setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs text-accent-violet px-2 py-1 rounded-lg hover:bg-accent-violet/5">Today</button>
          <button onClick={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-heading font-semibold text-white ml-2">{view === 'month' ? format(currentDate, 'MMMM yyyy') : `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFilterPlatform('')} className={`text-[10px] px-2.5 py-1.5 rounded-lg ${!filterPlatform ? 'bg-white/10 text-white' : 'text-zinc-500'}`}>All</button>
          {platforms.map(p => <button key={p.key} onClick={() => setFilterPlatform(filterPlatform === p.key ? '' : p.key)} className={`p-1.5 rounded-lg ${filterPlatform === p.key ? 'bg-white/10' : 'hover:bg-white/5'}`}><p.icon className="w-3.5 h-3.5" style={{ color: filterPlatform === p.key ? p.color : '#71717a' }} /></button>)}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Calendar/List */}
        <div className="flex-1 min-w-0">
          {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-accent-violet animate-spin" /></div> : (
            <>
              {/* WEEK */}
              {view === 'week' && (
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-white/5">
                    {weekDays.map(day => <div key={day.toISOString()} className={`p-3 text-center border-r border-white/5 last:border-r-0 ${isToday(day) ? 'bg-accent-violet/5' : ''}`}><p className="text-[10px] text-zinc-500 uppercase">{format(day, 'EEE')}</p><p className={`text-lg font-heading font-bold mt-0.5 ${isToday(day) ? 'text-accent-violet' : 'text-white'}`}>{format(day, 'd')}</p></div>)}
                  </div>
                  <div className="grid grid-cols-7 min-h-[350px]">
                    {weekDays.map(day => {
                      const dayPosts = getPostsForDay(day);
                      return (
                        <div key={day.toISOString()} className={`p-2 border-r border-white/5 last:border-r-0 ${isToday(day) ? 'bg-accent-violet/5' : ''}`}>
                          {dayPosts.slice(0, 4).map(post => {
                            const meta = platforms.find(p => p.key === post.platform); const st = statusColors[post.status] || statusColors.draft;
                            return (
                              <div key={post.post_id} onClick={() => { setSelectedPost(post); setShowComposer(false); }} className="p-2 rounded-lg bg-zinc-800/80 border border-white/5 hover:border-white/15 cursor-pointer mb-1.5">
                                <div className="flex items-center gap-1.5 mb-1">{meta?.icon && <meta.icon className="w-3 h-3" style={{ color: meta?.color }} />}<span className={`text-[9px] px-1.5 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span></div>
                                <p className="text-[10px] text-zinc-300 line-clamp-2">{post.content}</p>
                              </div>
                            );
                          })}
                          {dayPosts.length > 4 && <p className="text-[10px] text-zinc-500 text-center">+{dayPosts.length - 4}</p>}
                          <button onClick={() => openComposer(day)} className="w-full mt-1 p-1.5 rounded-lg border border-dashed border-white/10 hover:border-accent-violet/30 text-zinc-600 hover:text-accent-violet text-[10px] flex items-center justify-center gap-1 transition-all"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* MONTH */}
              {view === 'month' && (
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-7">{['S','M','T','W','T','F','S'].map(d => <div key={d} className="p-2 text-center text-[10px] text-zinc-500 border-b border-white/5">{d}</div>)}</div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: monthPad }).map((_, i) => <div key={`p-${i}`} className="p-1.5 border-r border-b border-white/5 min-h-[70px]" />)}
                    {monthDays.map(day => {
                      const dp = getPostsForDay(day);
                      return (
                        <div key={day.toISOString()} className={`p-1.5 border-r border-b border-white/5 min-h-[70px] ${isToday(day) ? 'bg-accent-violet/5' : ''}`}>
                          <span className={`text-[10px] ${isToday(day) ? 'text-accent-violet font-bold' : 'text-zinc-400'}`}>{format(day, 'd')}</span>
                          {dp.slice(0, 2).map(post => { const m = platforms.find(p => p.key === post.platform); return (
                            <div key={post.post_id} onClick={() => { setSelectedPost(post); setShowComposer(false); }} className="flex items-center gap-1 p-0.5 rounded bg-zinc-800/60 cursor-pointer mt-0.5">{m?.icon && <m.icon className="w-2.5 h-2.5" style={{ color: m?.color }} />}<span className="text-[9px] text-zinc-400 truncate">{post.content?.slice(0, 15)}</span></div>
                          ); })}
                          {dp.length > 2 && <p className="text-[9px] text-zinc-600">+{dp.length - 2}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* LIST */}
              {view === 'list' && (
                <div className="space-y-2">
                  {filteredPosts.length > 0 ? filteredPosts.map(post => {
                    const meta = platforms.find(p => p.key === post.platform); const st = statusColors[post.status] || statusColors.draft; const m = post.metrics || {};
                    return (
                      <div key={post.post_id} onClick={() => { setSelectedPost(post); setShowComposer(false); }} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 hover:border-white/10 cursor-pointer flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta?.color}15` }}>{meta?.icon && <meta.icon className="w-4 h-4" style={{ color: meta?.color }} />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium text-white capitalize">{post.platform}</span><span className={`text-[10px] px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>{post.is_real_post && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">Live</span>}<span className="text-[10px] text-zinc-600">{new Date(post.scheduled_at || post.created_at).toLocaleString()}</span></div>
                          <p className="text-sm text-zinc-300 line-clamp-2">{post.content}</p>
                          {post.status === 'published' && (m.likes > 0 || m.comments > 0) && <div className="flex gap-3 mt-1.5 text-[10px] text-zinc-500"><span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNum(m.likes)}</span><span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{formatNum(m.comments)}</span></div>}
                        </div>
                      </div>
                    );
                  }) : <div className="text-center py-16"><FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No posts yet</p></div>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Side Panel - Post Detail Only */}
        {selectedPost && !showComposer && (
          <div className="w-[420px] flex-shrink-0 bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden max-h-[calc(100vh-200px)] overflow-y-auto" data-testid="side-panel">
            {/* SELECTED POST DETAIL */}
            {selectedPost && (
              <div>
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => { const m = platforms.find(p => p.key === selectedPost.platform); return m?.icon ? <m.icon className="w-4 h-4" style={{ color: m.color }} /> : null; })()}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${(statusColors[selectedPost.status]||{}).bg} ${(statusColors[selectedPost.status]||{}).text}`}>{(statusColors[selectedPost.status]||{}).label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedPost.status !== 'published' && (
                      <>
                        <button onClick={() => openComposer(null, selectedPost)} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
                        <button onClick={() => handlePublishPost(selectedPost)} disabled={!!publishing} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50">{publishing === selectedPost.post_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Post now</button>
                      </>
                    )}
                    {selectedPost.status === 'published' && <button onClick={() => openComposer(null, selectedPost)} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Reuse</button>}
                    <button onClick={() => handleDeletePost(selectedPost.post_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => setSelectedPost(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                {/* Preview */}
                <div className="p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Preview</p>
                  <div className="rounded-xl overflow-hidden border border-white/10">
                    {selectedPost.platform === 'linkedin' && <LinkedInPreview content={selectedPost.content} image={selectedPost.image_url} />}
                    {selectedPost.platform === 'instagram' && <InstagramPreview content={selectedPost.content} image={selectedPost.image_url} />}
                    {selectedPost.platform === 'facebook' && <FacebookPreview content={selectedPost.content} image={selectedPost.image_url} />}
                    {selectedPost.platform === 'twitter' && <TwitterPreview content={selectedPost.content} image={selectedPost.image_url} />}
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    {selectedPost.scheduled_at && <div className="flex justify-between"><span className="text-zinc-500">Scheduled</span><span className="text-white">{selectedPost.scheduled_at}</span></div>}
                    {selectedPost.external_url && <a href={selectedPost.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent-violet"><ExternalLink className="w-3 h-3" /> View live</a>}
                    {selectedPost.status === 'published' && selectedPost.metrics && (
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                        {[{l:'Likes',v:selectedPost.metrics.likes,c:'#ec4899'},{l:'Comments',v:selectedPost.metrics.comments,c:'#06b6d4'},{l:'Shares',v:selectedPost.metrics.shares,c:'#f97316'},{l:'Reach',v:selectedPost.metrics.reach,c:'#7c3aed'}].map(m=>(
                          <div key={m.l} className="bg-zinc-800/80 rounded-lg p-2 text-center"><p className="text-[9px] text-zinc-500">{m.l}</p><p className="text-sm font-bold" style={{color:m.c}}>{formatNum(m.v)}</p></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* COMPOSER - FULL SCREEN MODAL (Buffer-style) */}
      {showComposer && (
              <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-8" onClick={(e) => { if (e.target === e.currentTarget) setShowComposer(false); }}>
                <div className="bg-zinc-900 rounded-2xl border border-white/10 w-[900px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" data-testid="composer-modal">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-heading font-bold text-white">{editingPost ? 'Edit Post' : 'Create Post'}</h2>
                      <button className="text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/5"><Sparkles className="w-3.5 h-3.5" /> AI Assistant</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className={`text-xs px-3 py-1.5 rounded-lg transition-all ${previewTab === 'compose' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => setPreviewTab('compose')}>Compose</button>
                      <button className={`text-xs px-3 py-1.5 rounded-lg transition-all ${previewTab === 'preview' ? 'bg-accent-violet/15 text-accent-violet' : 'text-zinc-400 hover:text-white'}`} onClick={() => setPreviewTab('preview')}>Preview</button>
                      <button onClick={() => setShowComposer(false)} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 ml-2"><X className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {/* Body - Split Layout */}
                  <div className="flex flex-1 overflow-hidden">
                    {/* Left: Compose */}
                    <div className="flex-1 flex flex-col border-r border-white/5 overflow-y-auto">
                      {/* Platform Avatars */}
                      <div className="px-6 pt-5 pb-3 flex items-center gap-3">
                        {platforms.map(p => {
                          const active = cPlatforms.includes(p.key);
                          return (
                            <button key={p.key} onClick={() => togglePlatform(p.key)} className={`relative w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center ${active ? 'border-white/30 bg-white/10' : 'border-white/5 opacity-40 hover:opacity-70'}`} title={p.label}>
                              <p.icon className="w-5 h-5" style={{ color: active ? p.color : '#555' }} />
                              <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${active ? 'text-white' : 'bg-zinc-700 text-zinc-400'}`} style={active ? { backgroundColor: p.color } : {}}>
                                {p.label.charAt(0)}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Text Area */}
                      <div className="flex-1 px-6 pb-3">
                        {/* Platform content tabs */}
                        {cPlatforms.length > 1 && (
                          <div className="flex gap-1 mb-2">
                            {cPlatforms.map(p => { const m = platforms.find(x => x.key === p); return (
                              <button key={p} onClick={() => setPreviewPlatform(p)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${previewPlatform === p ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                <m.icon className="w-3 h-3" style={{ color: previewPlatform === p ? m.color : '#666' }} /> {m.label}
                              </button>
                            ); })}
                          </div>
                        )}
                        <textarea value={getContent(previewPlatform)} onChange={(e) => setContent(previewPlatform, e.target.value)}
                          className="w-full h-48 bg-transparent text-white text-[15px] leading-relaxed placeholder-zinc-600 resize-none focus:outline-none"
                          placeholder="What would you like to share?"
                          data-testid="composer-textarea"
                        />
                        {/* Char count */}
                        <div className="flex items-center justify-between text-[10px] mt-1">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${charPercent}%`, backgroundColor: charColor }} /></div>
                            <span style={{ color: charColor }}>{currentContent.length}/{currentPlatformConfig.maxChars}</span>
                          </div>
                          <span className="text-zinc-600">Optimal: {currentPlatformConfig.optimalChars} chars</span>
                        </div>
                      </div>

                      {/* Image Upload Area - Multiple Images */}
                      <div className="px-6 pb-3">
                        {cImages.length > 0 && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {cImages.map((img, i) => (
                              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                {i === 0 && <span className="absolute bottom-1 left-1 text-[8px] bg-accent-violet text-white px-1.5 py-0.5 rounded">Primary</span>}
                              </div>
                            ))}
                            <button onClick={() => fileRef.current?.click()} disabled={uploading}
                              className="w-24 h-24 rounded-xl border-2 border-dashed border-white/10 hover:border-accent-violet/30 text-zinc-600 hover:text-accent-violet flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50">
                              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                              <span className="text-[9px]">Add</span>
                            </button>
                          </div>
                        )}
                        {cImages.length === 0 && (
                          <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="w-32 h-24 rounded-xl border-2 border-dashed border-white/10 hover:border-accent-violet/30 text-zinc-600 hover:text-accent-violet flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 mb-2">
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span className="text-[10px]">{uploading ? 'Uploading...' : 'Drag & drop or select files'}</span>
                          </button>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                      </div>

                      {/* Bottom Toolbar */}
                      <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white" title="Add media" onClick={() => fileRef.current?.click()}><Plus className="w-4 h-4" /></button>
                          <span className="w-px h-5 bg-white/10" />
                          <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white" title="Emoji">
                            <span className="text-sm">&#128522;</span>
                          </button>
                          <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white text-sm font-bold" title="Hashtag">#</button>
                        </div>
                        {currentPlatformConfig.imageRequired && !primaryImage && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {currentPlatformConfig.label} requires an image</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="w-[360px] flex-shrink-0 bg-zinc-950/50 overflow-y-auto">
                      <div className="p-5">
                        <h3 className="text-sm font-heading font-semibold text-white mb-4">Post Previews</h3>
                        {/* Preview tabs */}
                        <div className="flex gap-1 mb-4">
                          {cPlatforms.map(p => { const m = platforms.find(x => x.key === p); return (
                            <button key={p} onClick={() => setPreviewPlatform(p)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${previewPlatform === p ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                              <m.icon className="w-3.5 h-3.5" style={{ color: previewPlatform === p ? m.color : '#666' }} /> {m.label}
                            </button>
                          ); })}
                        </div>
                        {/* Preview */}
                        <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
                          {previewPlatform === 'linkedin' && <LinkedInPreview content={getContent('linkedin')} image={primaryImage} />}
                          {previewPlatform === 'instagram' && <InstagramPreview content={getContent('instagram')} image={primaryImage} />}
                          {previewPlatform === 'facebook' && <FacebookPreview content={getContent('facebook')} image={primaryImage} />}
                          {previewPlatform === 'twitter' && <TwitterPreview content={getContent('twitter')} image={primaryImage} />}
                        </div>
                        {/* Platform tip */}
                        <div className="mt-3 p-2.5 bg-zinc-800/50 rounded-lg text-[10px] text-zinc-500 flex items-start gap-1.5">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-accent-violet" />
                          {currentPlatformConfig.key === 'twitter' ? 'Keep under 280 chars. Tweets with images get 150% more retweets.' :
                           currentPlatformConfig.key === 'instagram' ? 'First 125 chars visible. Image required. Use up to 30 hashtags.' :
                           currentPlatformConfig.key === 'linkedin' ? 'Start with a hook. Use line breaks for readability. 3-5 hashtags.' :
                           'Shorter posts get more engagement. Questions drive comments.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer - Scheduling */}
                  <div className="px-6 py-4 border-t border-white/5 bg-zinc-900">
                    {/* Per-platform scheduling toggle */}
                    {cPlatforms.length > 1 && (
                      <div className="flex items-center gap-3 mb-3">
                        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                          <input type="checkbox" checked={cSameTime} onChange={(e) => setCSameTime(e.target.checked)} className="rounded bg-zinc-800 border-white/10 text-accent-violet focus:ring-accent-violet/20" />
                          Same time for all platforms
                        </label>
                      </div>
                    )}

                    {!cSameTime && cPlatforms.length > 1 ? (
                      <div className="space-y-2 mb-3">
                        {cPlatforms.map(p => { const m = platforms.find(x => x.key === p); const s = getSchedule(p); return (
                          <div key={p} className="flex items-center gap-3 bg-zinc-800/60 rounded-lg px-3 py-2">
                            <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                            <span className="text-xs text-white w-20">{m.label}</span>
                            <input type="date" value={s.date} onChange={(e) => setPlatformSchedule(p, 'date', e.target.value)} className="bg-zinc-950/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white" />
                            <input type="time" value={s.time} onChange={(e) => setPlatformSchedule(p, 'time', e.target.value)} className="bg-zinc-950/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white" />
                          </div>
                        ); })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2 border border-white/10 mb-3 w-fit">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} className="bg-transparent text-xs text-white w-28" />
                        <input type="time" value={cTime} onChange={(e) => setCTime(e.target.value)} className="bg-transparent text-xs text-white w-20" />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {cError && <span className="text-xs text-red-400">{cError}</span>}
                        {cResult && cResult._scheduled && <span className="text-xs text-accent-violet flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {editingPost ? 'Updated!' : 'Scheduled!'}</span>}
                        {cResult && !cResult._scheduled && Object.entries(cResult).map(([p, r]) => (
                          <span key={p} className={`text-xs flex items-center gap-1 ${r.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {r.success ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {p}: {r.success ? 'Done!' : 'Failed'}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleSubmit('draft')} disabled={cSaving}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg font-medium px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                        ><FileText className="w-4 h-4" /> Save Draft</button>
                        <button onClick={() => handleSubmit('schedule')} disabled={cSaving}
                          className="bg-zinc-700 hover:bg-zinc-600 text-white border border-white/10 rounded-lg font-medium px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                          data-testid="composer-schedule"
                        >{cSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} Schedule</button>
                        <button onClick={() => handleSubmit('post_now')} disabled={cSaving}
                          className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
                          data-testid="composer-publish"
                        >{cSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} Publish Now</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
    </div>
  );
}
