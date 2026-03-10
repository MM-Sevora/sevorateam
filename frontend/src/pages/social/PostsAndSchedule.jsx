import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import {
  FileText, Trash2, Send, Clock, CheckCircle, Calendar as CalIcon,
  ChevronLeft, ChevronRight, Loader2, Heart, MessageSquare, Share2,
  Plus, X, Image, Globe, List, Grid3X3, CalendarDays, Eye, Upload, AlertTriangle, Info, ExternalLink, Sparkles, Edit3, Check, Users, Repeat, RotateCcw
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import RichTextEditor, { htmlToPlainText } from '../../components/shared/RichTextEditor';

const platforms = [
  { key: 'linkedin', icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn', maxChars: 3000, optimalChars: '100-300' },
  { key: 'facebook', icon: FaFacebook, color: '#1877F2', label: 'Facebook', maxChars: 63206, optimalChars: '40-80' },
  { key: 'instagram', icon: FaInstagram, color: '#E4405F', label: 'Instagram', maxChars: 2200, optimalChars: '138-150', imageRequired: true },
  { key: 'twitter', icon: FaTwitter, color: '#1DA1F2', label: 'Twitter/X', maxChars: 280, optimalChars: '71-100' },
];
const statusColors = {
  draft: { bg: 'bg-zinc-500/15', text: 'text-[#5D4A3A]', label: 'Draft' },
  scheduled: { bg: 'bg-amber-800/15', text: 'text-amber-600', label: 'Scheduled' },
  published: { bg: 'bg-stone-600/15', text: 'text-stone-400', label: 'Published' },
};
function formatNum(n) { if (!n) return '0'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toString(); }

// Platform preview mockups - Convert HTML to plain text for preview
function renderContent(content, maxLength) {
  if (!content) return '';
  // If content looks like HTML, extract text
  if (content.includes('<')) {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    // Convert lists to text with bullets
    doc.querySelectorAll('ul li').forEach(li => { li.textContent = '• ' + li.textContent; });
    doc.querySelectorAll('ol li').forEach((li, i) => { li.textContent = (i + 1) + '. ' + li.textContent; });
    doc.querySelectorAll('p, li').forEach(el => { el.textContent = el.textContent + '\n'; });
    content = doc.body.textContent?.trim() || '';
  }
  const trimmed = content.slice(0, maxLength);
  return trimmed + (content.length > maxLength ? '...' : '');
}

function LinkedInPreview({ content, image, userName }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden text-black text-xs" data-testid="preview-linkedin">
      <div className="p-3 flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{userName?.charAt(0) || 'S'}</div>
        <div><p className="font-semibold text-[11px]">{userName || 'Sevora'}</p><p className="text-[9px] text-[#5D4A3A]">Just now</p></div>
      </div>
      <div className="px-3 pb-2"><p className="text-[11px] leading-relaxed whitespace-pre-wrap">{renderContent(content, 300) || 'Your LinkedIn post preview...'}</p></div>
      {image && <img src={image} alt="" className="w-full max-h-48 object-cover" />}
      <div className="px-3 py-2 border-t border-[#E8D5C4] flex gap-4 text-[10px] text-[#5D4A3A]">
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
      {image ? <img src={image} alt="" className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-[#E8D5C4] flex items-center justify-center text-[#5D4A3A] text-xs"><Image className="w-8 h-8" /><span className="ml-2">Image required</span></div>}
      <div className="p-2.5">
        <div className="flex gap-3 mb-2 text-black"><Heart className="w-4 h-4" /><MessageSquare className="w-4 h-4" /><Send className="w-4 h-4" /></div>
        <p className="text-[11px] leading-relaxed"><span className="font-semibold">{userName || 'shopsevora'}</span> {renderContent(content, 125) || 'Your Instagram caption...'}</p>
      </div>
    </div>
  );
}

function FacebookPreview({ content, image, userName }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden text-black text-xs" data-testid="preview-facebook">
      <div className="p-3 flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">{userName?.charAt(0) || 'S'}</div>
        <div><p className="font-semibold text-[11px]">{userName || 'Sevora'}</p><p className="text-[9px] text-[#5D4A3A]">Just now · Public</p></div>
      </div>
      <div className="px-3 pb-2"><p className="text-[11px] leading-relaxed whitespace-pre-wrap">{renderContent(content, 200) || 'Your Facebook post preview...'}</p></div>
      {image && <img src={image} alt="" className="w-full max-h-48 object-cover" />}
      <div className="px-3 py-2 border-t border-[#E8D5C4] flex justify-around text-[10px] text-[#5D4A3A]">
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
          <div className="flex items-center gap-1"><p className="font-semibold text-[11px]">{userName || 'Sevora'}</p><p className="text-[9px] text-[#5D4A3A]">@sevora · now</p></div>
          <p className="text-[11px] leading-relaxed mt-0.5 whitespace-pre-wrap">{renderContent(content, 280) || 'Your tweet...'}</p>
          {image && <img src={image} alt="" className="w-full max-h-36 object-cover rounded-xl mt-2" />}
          <div className="flex gap-8 mt-2 text-[10px] text-[#5D4A3A]"><MessageSquare className="w-3.5 h-3.5" /><span>Repost</span><Heart className="w-3.5 h-3.5" /><Eye className="w-3.5 h-3.5" /></div>
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
  const [cContents, setCContents] = useState({}); // per-platform content (HTML)
  const [cPlainTexts, setCPlainTexts] = useState({}); // per-platform plain text for char counting
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
  const [skipApproval, setSkipApproval] = useState(false); // Flexible approval toggle
  
  // Recurring post settings
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('weekly'); // daily, weekly, biweekly, monthly, custom
  const [recurrenceDays, setRecurrenceDays] = useState([]); // For custom: [0,1,2,3,4,5,6]
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  
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

  const getContent = (platform) => {
    // Check if platform has its own content (including empty string)
    if (cContents.hasOwnProperty(platform)) {
      return cContents[platform];
    }
    // Fall back to shared content
    return cContents._shared || '';
  };
  const getPlainText = (platform) => {
    if (cPlainTexts.hasOwnProperty(platform)) {
      return cPlainTexts[platform];
    }
    return cPlainTexts._shared || '';
  };
  const setContent = (platform, html, plainText) => {
    setCContents(prev => {
      const next = { ...prev, [platform]: html };
      if (prev._shared === undefined) {
        next._shared = html;
      }
      return next;
    });
    setCPlainTexts(prev => {
      const next = { ...prev, [platform]: plainText };
      if (prev._shared === undefined) {
        next._shared = plainText;
      }
      return next;
    });
  };
  const setSharedContent = (html, plainText) => {
    setCContents(prev => {
      const next = { _shared: html };
      cPlatforms.forEach(p => { if (!prev[p] || prev[p] === prev._shared) next[p] = html; else next[p] = prev[p]; });
      return next;
    });
    setCPlainTexts(prev => {
      const next = { _shared: plainText };
      cPlatforms.forEach(p => { if (!prev[p] || prev[p] === prev._shared) next[p] = plainText; else next[p] = prev[p]; });
      return next;
    });
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const token = localStorage.getItem('sevora_token');
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
    const hasContent = cPlatforms.some(p => getPlainText(p).trim());
    if (!hasContent) { setCError('Content is required'); return; }
    setCSaving(true); setCError(''); setCResult(null);

    // Convert HTML to plain text for storage (most social platforms don't support HTML)
    const getPlainContent = (platform) => {
      const html = getContent(platform);
      return htmlToPlainText(html);
    };

    if (editingPost) {
      // UPDATE existing post
      try {
        await api.put(`/api/posts/${editingPost.post_id}`, {
          content: getPlainContent(editingPost.platform),
          content_html: getContent(editingPost.platform), // Store HTML for future editing
          image_url: primaryImage,
          scheduled_at: `${cDate}T${cTime}`,
          status: action === 'post_now' ? 'published' : (action === 'draft' ? 'draft' : 'scheduled'),
        });
        if (action === 'post_now') {
          const res = await api.post('/api/publish/real', { content: getPlainContent(editingPost.platform), platform: editingPost.platform, image_url: primaryImage });
          setCResult({ [editingPost.platform]: res.data });
        } else {
          setCResult({ _scheduled: true });
        }
      } catch (err) { setCError(err.response?.data?.detail || 'Update failed'); }
    } else if (action === 'post_now' && skipApproval) {
      const results = {};
      for (const p of cPlatforms) {
        const text = getPlainContent(p);
        if (!text.trim()) continue;
        try {
          const res = await api.post('/api/publish/real', { content: text, platform: p, image_url: primaryImage });
          results[p] = res.data;
        } catch (err) { results[p] = { success: false, error: err.response?.data?.detail || 'Failed' }; }
      }
      setCResult(results);
    } else {
      // Schedule/Draft - per-platform times (with approval workflow if enabled)
      const requiresApproval = !skipApproval && action === 'schedule';
      
      for (const p of cPlatforms) {
        const text = getPlainContent(p);
        if (!text.trim()) continue;
        const sched = getSchedule(p);
        try {
          const postData = {
            platform: p, 
            content: text, 
            content_html: getContent(p),
            image_url: primaryImage,
            scheduled_at: `${sched.date}T${sched.time}`,
            status: action === 'draft' ? 'draft' : (requiresApproval ? 'pending_review' : 'scheduled'),
          };
          const postRes = await api.post('/api/posts', postData);
          
          // If requires approval, submit for review
          if (requiresApproval && postRes.data?.post_id) {
            await api.post('/api/approvals/submit', {
              post_id: postRes.data.post_id,
              note: 'Submitted via Posts & Schedule'
            });
          }
        } catch (err) { setCError(`Failed for ${p}`); }
      }
      setCResult({ _scheduled: true, _requiresApproval: requiresApproval });
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
  const currentPlainText = getPlainText(previewPlatform);
  const charPercent = Math.min((currentPlainText.length / currentPlatformConfig.maxChars) * 100, 100);
  const charColor = charPercent > 90 ? '#ef4444' : charPercent > 70 ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-5 animate-fade-in p-8" data-testid="posts-schedule-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#5D4A3A] mb-1">SOCIAL MEDIA</p>
          <h1 className="text-2xl font-bold text-[#4A3728] tracking-tight">Posts & Schedule</h1>
          <p className="text-sm text-[#5D4A3A] mt-1">Plan, create, schedule, and publish your content</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchPosts} className="flex items-center gap-2 px-4 py-2 border border-[#E8D5C4] rounded-lg text-sm text-[#5D4A3A] hover:bg-[#F5EDE5] transition-colors">
            <ChevronLeft className="w-4 h-4" style={{ transform: 'rotate(0deg)' }} />
            <span className="sr-only">Refresh</span>
          </button>
          <button onClick={() => openComposer(null)} className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2.5 flex items-center gap-2" data-testid="new-post-btn"><Plus className="w-4 h-4" /> New Post</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-lg border border-[#E8D5C4] p-0.5">
            {[{ k: 'week', icon: CalendarDays, l: 'Week' }, { k: 'month', icon: Grid3X3, l: 'Month' }, { k: 'list', icon: List, l: 'List' }].map(v => (
              <button key={v.k} onClick={() => setView(v.k)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === v.k ? 'bg-rose-100 text-rose-700' : 'text-[#5D4A3A] hover:text-[#4A3728] hover:bg-[#F5EDE5]'}`}><v.icon className="w-3.5 h-3.5" /> {v.l}</button>
            ))}
          </div>
          <button onClick={() => setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-[#F5EDE5] text-[#5D4A3A]"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50">Today</button>
          <button onClick={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-[#F5EDE5] text-[#5D4A3A]"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-[#4A3728] ml-2">{view === 'month' ? format(currentDate, 'MMMM yyyy') : `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}</span>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E8D5C4] rounded-lg p-1">
          <button onClick={() => setFilterPlatform('')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${!filterPlatform ? 'bg-[#E8D5C4] text-[#4A3728]' : 'text-[#5D4A3A] hover:bg-[#F5EDE5]'}`}>All</button>
          {platforms.map(p => (
            <button key={p.key} onClick={() => setFilterPlatform(filterPlatform === p.key ? '' : p.key)} 
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterPlatform === p.key ? 'bg-[#E8D5C4]' : 'hover:bg-[#F5EDE5]'}`}
              title={p.label}
            >
              <p.icon className="w-3.5 h-3.5" style={{ color: filterPlatform === p.key ? p.color : '#71717a' }} />
              <span className={filterPlatform === p.key ? 'text-[#4A3728]' : 'text-[#5D4A3A] hidden sm:inline'}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Calendar/List */}
        <div className="flex-1 min-w-0">
          {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div> : (
            <>
              {/* WEEK */}
              {view === 'week' && (
                <div className="bg-white border border-[#E8D5C4] rounded-xl overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-[#E8D5C4]">
                    {weekDays.map(day => <div key={day.toISOString()} className={`p-3 text-center border-r border-[#E8D5C4] last:border-r-0 ${isToday(day) ? 'bg-amber-800/5' : ''}`}><p className="text-[10px] text-[#5D4A3A] uppercase">{format(day, 'EEE')}</p><p className={`text-lg font-heading font-bold mt-0.5 ${isToday(day) ? 'text-amber-600' : 'text-white'}`}>{format(day, 'd')}</p></div>)}
                  </div>
                  <div className="grid grid-cols-7 min-h-[350px]">
                    {weekDays.map(day => {
                      const dayPosts = getPostsForDay(day);
                      return (
                        <div key={day.toISOString()} className={`p-2 border-r border-[#E8D5C4] last:border-r-0 ${isToday(day) ? 'bg-amber-800/5' : ''}`}>
                          {dayPosts.slice(0, 4).map(post => {
                            const meta = platforms.find(p => p.key === post.platform); const st = statusColors[post.status] || statusColors.draft;
                            return (
                              <div key={post.post_id} onClick={() => { setSelectedPost(post); setShowComposer(false); }} className="p-2 rounded-lg bg-[#E8D5C4]/80 border border-[#E8D5C4] hover:border-white/15 cursor-pointer mb-1.5">
                                <div className="flex items-center gap-1.5 mb-1">{meta?.icon && <meta.icon className="w-3 h-3" style={{ color: meta?.color }} />}<span className={`text-[9px] px-1.5 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span></div>
                                <p className="text-[10px] text-[#4A3728] line-clamp-2">{post.content}</p>
                              </div>
                            );
                          })}
                          {dayPosts.length > 4 && <p className="text-[10px] text-[#5D4A3A] text-center">+{dayPosts.length - 4}</p>}
                          <button onClick={() => openComposer(day)} className="w-full mt-1 p-1.5 rounded-lg border border-dashed border-[#D4BBA6] hover:border-amber-600/30 text-[#5D4A3A] hover:text-amber-600 text-[10px] flex items-center justify-center gap-1 transition-all"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* MONTH */}
              {view === 'month' && (
                <div className="bg-white border border-[#E8D5C4] rounded-xl overflow-hidden">
                  <div className="grid grid-cols-7">{['S','M','T','W','T','F','S'].map(d => <div key={d} className="p-2 text-center text-[10px] text-[#5D4A3A] border-b border-[#E8D5C4]">{d}</div>)}</div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: monthPad }).map((_, i) => <div key={`p-${i}`} className="p-1.5 border-r border-b border-[#E8D5C4] min-h-[70px]" />)}
                    {monthDays.map(day => {
                      const dp = getPostsForDay(day);
                      return (
                        <div key={day.toISOString()} className={`p-1.5 border-r border-b border-[#E8D5C4] min-h-[70px] ${isToday(day) ? 'bg-amber-800/5' : ''}`}>
                          <span className={`text-[10px] ${isToday(day) ? 'text-amber-600 font-bold' : 'text-[#5D4A3A]'}`}>{format(day, 'd')}</span>
                          {dp.slice(0, 2).map(post => { const m = platforms.find(p => p.key === post.platform); return (
                            <div key={post.post_id} onClick={() => { setSelectedPost(post); setShowComposer(false); }} className="flex items-center gap-1 p-0.5 rounded bg-[#F5EDE5] cursor-pointer mt-0.5">{m?.icon && <m.icon className="w-2.5 h-2.5" style={{ color: m?.color }} />}<span className="text-[9px] text-[#5D4A3A] truncate">{post.content?.slice(0, 15)}</span></div>
                          ); })}
                          {dp.length > 2 && <p className="text-[9px] text-[#5D4A3A]">+{dp.length - 2}</p>}
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
                      <div key={post.post_id} onClick={() => { setSelectedPost(post); setShowComposer(false); }} className="bg-white border border-[#E8D5C4] rounded-xl p-4 hover:border-[#D4BBA6] cursor-pointer flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta?.color}15` }}>{meta?.icon && <meta.icon className="w-4 h-4" style={{ color: meta?.color }} />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium text-white capitalize">{post.platform}</span><span className={`text-[10px] px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>{post.is_real_post && <span className="text-[10px] bg-stone-600/10 text-stone-400 px-1.5 py-0.5 rounded-full">Live</span>}<span className="text-[10px] text-[#5D4A3A]">{new Date(post.scheduled_at || post.created_at).toLocaleString()}</span></div>
                          <p className="text-sm text-[#4A3728] line-clamp-2">{post.content}</p>
                          {post.status === 'published' && (m.likes > 0 || m.comments > 0) && <div className="flex gap-3 mt-1.5 text-[10px] text-[#5D4A3A]"><span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNum(m.likes)}</span><span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{formatNum(m.comments)}</span></div>}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-16 bg-white border border-[#E8D5C4] rounded-xl">
                      <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                        <CalIcon className="w-8 h-8 text-rose-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#4A3728]">Plan Your First Post</h3>
                      <p className="text-sm text-[#5D4A3A] mt-2 max-w-md mx-auto">
                        Start building your content calendar by creating and scheduling your first social media post
                      </p>
                      <button 
                        onClick={() => openComposer(null)} 
                        className="mt-6 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-6 py-2.5 text-sm inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Create First Post
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Side Panel - Post Detail Only */}
        {selectedPost && !showComposer && (
          <div className="w-[420px] flex-shrink-0 bg-white border border-[#E8D5C4] rounded-xl overflow-hidden max-h-[calc(100vh-200px)] overflow-y-auto" data-testid="side-panel">
            {/* SELECTED POST DETAIL */}
            {selectedPost && (
              <div>
                <div className="p-3 border-b border-[#E8D5C4] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => { const m = platforms.find(p => p.key === selectedPost.platform); return m?.icon ? <m.icon className="w-4 h-4" style={{ color: m.color }} /> : null; })()}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${(statusColors[selectedPost.status]||{}).bg} ${(statusColors[selectedPost.status]||{}).text}`}>{(statusColors[selectedPost.status]||{}).label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedPost.status !== 'published' && (
                      <>
                        <button onClick={() => openComposer(null, selectedPost)} className="text-xs bg-gray-200 hover:bg-zinc-600 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
                        <button onClick={() => handlePublishPost(selectedPost)} disabled={!!publishing} className="text-xs bg-stone-700 hover:bg-stone-700 text-white rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50">{publishing === selectedPost.post_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Post now</button>
                      </>
                    )}
                    {selectedPost.status === 'published' && <button onClick={() => openComposer(null, selectedPost)} className="text-xs bg-gray-200 hover:bg-zinc-600 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Reuse</button>}
                    <button onClick={() => handleDeletePost(selectedPost.post_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#5D4A3A] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => setSelectedPost(null)} className="p-1.5 rounded-lg hover:bg-[#F5EDE5] text-[#5D4A3A]"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                {/* Preview */}
                <div className="p-3">
                  <p className="text-[10px] text-[#5D4A3A] uppercase tracking-wider mb-2">Preview</p>
                  <div className="rounded-xl overflow-hidden border border-[#D4BBA6]">
                    {selectedPost.platform === 'linkedin' && <LinkedInPreview content={selectedPost.content} image={selectedPost.image_url} />}
                    {selectedPost.platform === 'instagram' && <InstagramPreview content={selectedPost.content} image={selectedPost.image_url} />}
                    {selectedPost.platform === 'facebook' && <FacebookPreview content={selectedPost.content} image={selectedPost.image_url} />}
                    {selectedPost.platform === 'twitter' && <TwitterPreview content={selectedPost.content} image={selectedPost.image_url} />}
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    {selectedPost.scheduled_at && <div className="flex justify-between"><span className="text-[#5D4A3A]">Scheduled</span><span className="text-[#4A3728]">{selectedPost.scheduled_at}</span></div>}
                    {selectedPost.external_url && <a href={selectedPost.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-amber-600"><ExternalLink className="w-3 h-3" /> View live</a>}
                    {selectedPost.status === 'published' && selectedPost.metrics && (
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#E8D5C4]">
                        {[{l:'Likes',v:selectedPost.metrics.likes,c:'#ec4899'},{l:'Comments',v:selectedPost.metrics.comments,c:'#06b6d4'},{l:'Shares',v:selectedPost.metrics.shares,c:'#f97316'},{l:'Reach',v:selectedPost.metrics.reach,c:'#7c3aed'}].map(m=>(
                          <div key={m.l} className="bg-[#E8D5C4]/80 rounded-lg p-2 text-center"><p className="text-[9px] text-[#5D4A3A]">{m.l}</p><p className="text-sm font-bold" style={{color:m.c}}>{formatNum(m.v)}</p></div>
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
              <div className="fixed inset-0 z-[100] bg-black/70 flex items-start justify-center pt-8" onClick={(e) => { if (e.target === e.currentTarget) setShowComposer(false); }}>
                <div className="bg-white rounded-2xl border border-[#D4BBA6] w-[900px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative z-[101]" data-testid="composer-modal">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D5C4] bg-gradient-to-r from-rose-50 to-pink-50">
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-bold text-[#4A3728]">{editingPost ? 'Edit Post' : 'Create Post'}</h2>
                      <button className="text-xs text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-rose-50 transition-colors"><Sparkles className="w-3.5 h-3.5" /> AI Assistant</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-white rounded-lg border border-[#E8D5C4] p-0.5">
                        <button className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${previewTab === 'compose' ? 'bg-rose-100 text-rose-700' : 'text-[#5D4A3A] hover:text-[#4A3728]'}`} onClick={() => setPreviewTab('compose')}>Compose</button>
                        <button className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${previewTab === 'preview' ? 'bg-rose-100 text-rose-700' : 'text-[#5D4A3A] hover:text-[#4A3728]'}`} onClick={() => setPreviewTab('preview')}>Preview</button>
                      </div>
                      <button onClick={() => setShowComposer(false)} className="p-2 rounded-lg hover:bg-rose-100 text-[#5D4A3A] ml-2"><X className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {/* Body - Split Layout */}
                  <div className="flex flex-1 overflow-hidden">
                    {/* Left: Compose */}
                    <div className="flex-1 flex flex-col border-r border-[#E8D5C4] overflow-y-auto bg-white">
                      {/* Platform Selection */}
                      <div className="px-6 pt-5 pb-3">
                        <p className="text-[10px] text-[#5D4A3A] uppercase tracking-wider mb-3 font-medium">Select Platforms</p>
                        <div className="flex items-center gap-3">
                          {platforms.map(p => {
                            const active = cPlatforms.includes(p.key);
                            return (
                              <button key={p.key} onClick={() => togglePlatform(p.key)} className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${active ? 'border-rose-300 bg-rose-50' : 'border-[#E8D5C4] hover:border-rose-200 hover:bg-rose-50/50'}`} title={p.label}>
                                <p.icon className="w-5 h-5" style={{ color: active ? p.color : '#9ca3af' }} />
                                <span className={`text-[10px] font-medium ${active ? 'text-[#4A3728]' : 'text-[#5D4A3A]'}`}>{p.label}</span>
                                {active && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Text Area */}
                      <div className="flex-1 px-6 pb-3">
                        {/* Platform content tabs */}
                        {cPlatforms.length > 1 && (
                          <div className="flex gap-1 mb-3 bg-[#F5EDE5] rounded-lg p-1">
                            {cPlatforms.map(p => { const m = platforms.find(x => x.key === p); return (
                              <button key={p} onClick={() => setPreviewPlatform(p)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewPlatform === p ? 'bg-white text-[#4A3728] shadow-sm' : 'text-[#5D4A3A] hover:text-[#4A3728]'}`}>
                                <m.icon className="w-3.5 h-3.5" style={{ color: previewPlatform === p ? m.color : '#9ca3af' }} /> {m.label}
                              </button>
                            ); })}
                          </div>
                        )}
                        <RichTextEditor 
                          value={getContent(previewPlatform)} 
                          onChange={(html, plainText) => setContent(previewPlatform, html, plainText)}
                          placeholder="What would you like to share?"
                          maxLength={currentPlatformConfig.maxChars}
                          minHeight="180px"
                        />
                        {/* Char count */}
                        <div className="flex items-center justify-between text-xs mt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-[#E8D5C4] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${charPercent}%`, backgroundColor: charColor }} /></div>
                            <span style={{ color: charColor }} className="font-medium">{currentPlainText.length}/{currentPlatformConfig.maxChars}</span>
                          </div>
                          <span className="text-[#5D4A3A]">Optimal: {currentPlatformConfig.optimalChars} chars</span>
                        </div>
                      </div>

                      {/* Image Upload Area - Multiple Images */}
                      <div className="px-6 pb-3">
                        <p className="text-[10px] text-[#5D4A3A] uppercase tracking-wider mb-2 font-medium">Media</p>
                        {cImages.length > 0 && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {cImages.map((img, i) => (
                              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-[#E8D5C4] group hover:border-rose-300 transition-colors">
                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                {i === 0 && <span className="absolute bottom-1 left-1 text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded font-medium">Primary</span>}
                              </div>
                            ))}
                            <button onClick={() => fileRef.current?.click()} disabled={uploading}
                              className="w-24 h-24 rounded-xl border-2 border-dashed border-[#D4BBA6] hover:border-rose-400 text-[#5D4A3A] hover:text-rose-500 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50">
                              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                              <span className="text-[9px] font-medium">Add More</span>
                            </button>
                          </div>
                        )}
                        {cImages.length === 0 && (
                          <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="w-full h-28 rounded-xl border-2 border-dashed border-[#D4BBA6] hover:border-rose-400 bg-[#F5EDE5] hover:bg-rose-50 text-[#5D4A3A] hover:text-rose-500 flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50">
                            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                            <span className="text-xs font-medium">{uploading ? 'Uploading...' : 'Drop images here or click to upload'}</span>
                            <span className="text-[10px] text-[#9ca3af]">PNG, JPG, GIF up to 10MB</span>
                          </button>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                      </div>

                      {/* Bottom Toolbar */}
                      <div className="px-6 py-3 border-t border-[#E8D5C4] flex items-center justify-between bg-[#F5EDE5]">
                        <div className="flex items-center gap-1">
                          <button className="p-2 rounded-lg hover:bg-white text-[#5D4A3A] hover:text-rose-500 transition-colors" title="Add media" onClick={() => fileRef.current?.click()}><Plus className="w-4 h-4" /></button>
                          <span className="w-px h-5 bg-[#D4BBA6]" />
                          <button className="p-2 rounded-lg hover:bg-white text-[#5D4A3A] hover:text-rose-500 transition-colors" title="Emoji">
                            <span className="text-sm">😊</span>
                          </button>
                          <button className="p-2 rounded-lg hover:bg-white text-[#5D4A3A] hover:text-rose-500 text-sm font-bold transition-colors" title="Hashtag">#</button>
                        </div>
                        {currentPlatformConfig.imageRequired && !primaryImage && (
                          <span className="text-[10px] text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg"><AlertTriangle className="w-3 h-3" /> {currentPlatformConfig.label} requires an image</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="w-[360px] flex-shrink-0 bg-gradient-to-b from-[#F5EDE5] to-white overflow-y-auto relative z-10">
                      <div className="p-5">
                        <h3 className="text-sm font-semibold text-[#4A3728] mb-4">Live Preview</h3>
                        {/* Preview tabs - horizontal scroll for many platforms */}
                        <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border border-[#E8D5C4] overflow-x-auto">
                          {cPlatforms.map(p => { const m = platforms.find(x => x.key === p); return (
                            <button key={p} onClick={() => setPreviewPlatform(p)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${previewPlatform === p ? 'bg-rose-100 text-rose-700' : 'text-[#5D4A3A] hover:text-[#4A3728]'}`}>
                              <m.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: previewPlatform === p ? m.color : '#9ca3af' }} /> {m.label}
                            </button>
                          ); })}
                        </div>
                        {/* Preview - isolated container */}
                        <div className="rounded-xl overflow-hidden border border-[#D4BBA6] shadow-lg bg-white isolate">
                          {previewPlatform === 'linkedin' && <LinkedInPreview content={getContent('linkedin')} image={primaryImage} />}
                          {previewPlatform === 'instagram' && <InstagramPreview content={getContent('instagram')} image={primaryImage} />}
                          {previewPlatform === 'facebook' && <FacebookPreview content={getContent('facebook')} image={primaryImage} />}
                          {previewPlatform === 'twitter' && <TwitterPreview content={getContent('twitter')} image={primaryImage} />}
                        </div>
                        {/* Platform tip */}
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-start gap-2 border border-blue-100">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                          <span>
                            {currentPlatformConfig.key === 'twitter' ? 'Keep under 280 chars. Tweets with images get 150% more retweets.' :
                             currentPlatformConfig.key === 'instagram' ? 'First 125 chars visible. Image required. Use up to 30 hashtags.' :
                             currentPlatformConfig.key === 'linkedin' ? 'Start with a hook. Use line breaks for readability. 3-5 hashtags.' :
                             'Shorter posts get more engagement. Questions drive comments.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer - Scheduling */}
                  <div className="px-6 py-4 border-t border-[#E8D5C4] bg-white">
                    {/* Per-platform scheduling toggle */}
                    {cPlatforms.length > 1 && (
                      <div className="flex items-center gap-3 mb-3">
                        <label className="flex items-center gap-2 text-xs text-[#5D4A3A] cursor-pointer">
                          <input type="checkbox" checked={cSameTime} onChange={(e) => setCSameTime(e.target.checked)} className="rounded bg-white border-[#D4BBA6] text-rose-500 focus:ring-rose-500/20" />
                          Same time for all platforms
                        </label>
                      </div>
                    )}

                    {!cSameTime && cPlatforms.length > 1 ? (
                      <div className="space-y-2 mb-3">
                        {cPlatforms.map(p => { const m = platforms.find(x => x.key === p); const s = getSchedule(p); return (
                          <div key={p} className="flex items-center gap-3 bg-[#F5EDE5] rounded-lg px-3 py-2">
                            <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                            <span className="text-xs text-[#4A3728] font-medium w-20">{m.label}</span>
                            <input type="date" value={s.date} onChange={(e) => setPlatformSchedule(p, 'date', e.target.value)} className="bg-white border border-[#D4BBA6] rounded-lg px-2 py-1 text-xs text-[#4A3728]" />
                            <input type="time" value={s.time} onChange={(e) => setPlatformSchedule(p, 'time', e.target.value)} className="bg-white border border-[#D4BBA6] rounded-lg px-2 py-1 text-xs text-[#4A3728]" />
                          </div>
                        ); })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-[#F5EDE5] rounded-lg px-4 py-3 border border-[#E8D5C4] mb-3 w-fit">
                        <Clock className="w-4 h-4 text-rose-500" />
                        <div className="flex items-center gap-2">
                          <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} className="bg-white border border-[#D4BBA6] rounded-lg px-2 py-1 text-xs text-[#4A3728] w-32" />
                          <input type="time" value={cTime} onChange={(e) => setCTime(e.target.value)} className="bg-white border border-[#D4BBA6] rounded-lg px-2 py-1 text-xs text-[#4A3728] w-24" />
                        </div>
                      </div>
                    )}

                    {/* Recurring Post Options */}
                    <div className="bg-[#F5EDE5] rounded-lg p-4 border border-[#E8D5C4] mb-3">
                      <label className="flex items-center gap-2 text-sm text-[#4A3728] font-medium cursor-pointer mb-3">
                        <input 
                          type="checkbox" 
                          checked={isRecurring} 
                          onChange={(e) => setIsRecurring(e.target.checked)} 
                          className="rounded bg-white border-[#D4BBA6] text-rose-500 focus:ring-rose-500/20" 
                        />
                        <Repeat className="w-4 h-4 text-rose-500" />
                        <span>Make this a recurring post</span>
                      </label>
                      
                      {isRecurring && (
                        <div className="space-y-3 pl-6 border-l-2 border-rose-200">
                          {/* Recurrence Pattern */}
                          <div>
                            <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Repeat</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { value: 'daily', label: 'Daily' },
                                { value: 'weekly', label: 'Weekly' },
                                { value: 'biweekly', label: 'Every 2 weeks' },
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'custom', label: 'Custom days' },
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setRecurrencePattern(opt.value)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    recurrencePattern === opt.value
                                      ? 'bg-rose-500 text-white'
                                      : 'bg-white text-[#5D4A3A] border border-[#D4BBA6] hover:border-rose-300'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Custom Days Selection */}
                          {recurrencePattern === 'custom' && (
                            <div>
                              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Post on these days</label>
                              <div className="flex gap-1">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                      setRecurrenceDays(prev => 
                                        prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                                      );
                                    }}
                                    className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${
                                      recurrenceDays.includes(i)
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-white text-[#5D4A3A] border border-[#D4BBA6] hover:border-rose-300'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* End Options */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Number of posts</label>
                              <input
                                type="number"
                                min="1"
                                max="52"
                                value={recurrenceCount}
                                onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 4)}
                                className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-1.5 text-xs text-[#4A3728]"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Or end by date</label>
                              <input
                                type="date"
                                value={recurrenceEndDate}
                                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-1.5 text-xs text-[#4A3728]"
                              />
                            </div>
                          </div>
                          
                          {/* Summary */}
                          <div className="bg-white rounded-lg p-2 text-xs text-[#5D4A3A] flex items-center gap-2">
                            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                            {recurrencePattern === 'daily' && `Will create ${recurrenceCount} daily posts`}
                            {recurrencePattern === 'weekly' && `Will post every week (${recurrenceCount} times)`}
                            {recurrencePattern === 'biweekly' && `Will post every 2 weeks (${recurrenceCount} times)`}
                            {recurrencePattern === 'monthly' && `Will post every month (${recurrenceCount} times)`}
                            {recurrencePattern === 'custom' && recurrenceDays.length > 0 && 
                              `Will post on ${recurrenceDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')} (${recurrenceCount} times)`}
                            {recurrencePattern === 'custom' && recurrenceDays.length === 0 && 'Select days to post'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Approval Options */}
                    <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[#E8D5C4]">
                      <label className="flex items-center gap-2 text-xs text-[#5D4A3A] cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={skipApproval} 
                          onChange={(e) => setSkipApproval(e.target.checked)} 
                          className="rounded bg-white border-[#D4BBA6] text-rose-500 focus:ring-rose-500/20" 
                        />
                        <span>Skip team approval</span>
                      </label>
                      {!skipApproval && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Users className="w-3 h-3" /> Post will be sent for review before publishing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {cError && <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-lg">{cError}</span>}
                        {cResult && cResult._scheduled && (
                          <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg ${cResult._requiresApproval ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'}`}>
                            <CheckCircle className="w-3.5 h-3.5" /> 
                            {editingPost ? 'Updated!' : cResult._requiresApproval ? 'Sent for approval!' : 'Scheduled!'}
                          </span>
                        )}
                        {cResult && !cResult._scheduled && Object.entries(cResult).map(([p, r]) => (
                          <span key={p} className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg ${r.success ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                            {r.success ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {p}: {r.success ? 'Done!' : 'Failed'}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleSubmit('draft')} disabled={cSaving}
                          className="bg-white hover:bg-[#F5EDE5] text-[#4A3728] border border-[#D4BBA6] rounded-lg font-medium px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                        ><FileText className="w-4 h-4" /> Save Draft</button>
                        <button onClick={() => handleSubmit('schedule')} disabled={cSaving}
                          className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                          data-testid="composer-schedule"
                        >{cSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} {skipApproval ? 'Schedule' : 'Submit for Review'}</button>
                        {skipApproval && (
                          <button onClick={() => handleSubmit('post_now')} disabled={cSaving}
                            className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg transition-all"
                            data-testid="composer-publish"
                          >{cSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publish Now</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
    </div>
  );
}
