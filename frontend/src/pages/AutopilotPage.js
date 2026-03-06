import React, { useState, useEffect } from 'react';
import api from '../api';
import { Zap, Loader2, Calendar, Send, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';

const platformMeta = {
  linkedin: { icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn' },
  instagram: { icon: FaInstagram, color: '#E4405F', label: 'Instagram' },
  facebook: { icon: FaFacebook, color: '#1877F2', label: 'Facebook' },
};

export default function AutopilotPage() {
  const [industry, setIndustry] = useState('');
  const [topics, setTopics] = useState('');
  const [tone, setTone] = useState('professional');
  const [days, setDays] = useState(7);
  const [ppd, setPpd] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['linkedin', 'instagram', 'facebook']);
  const [generating, setGenerating] = useState(false);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState('');

  useEffect(() => { api.get('/api/autopilot/scheduled').then(r => setPosts(r.data)).catch(() => {}); }, []);

  const togglePlatform = (p) => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    try {
      const res = await api.post('/api/autopilot/generate', { industry, topics: topics.split(',').map(t => t.trim()).filter(Boolean), tone, platforms: selectedPlatforms, posts_per_day: ppd, days });
      setPosts(res.data.posts || []);
    } catch (err) { setError(err.response?.data?.detail || 'Failed'); }
    finally { setGenerating(false); }
  };

  const handlePublish = async (post) => {
    setPublishing(post.post_id);
    try { await api.post('/api/publish/real', { content: post.content, platform: post.platform, image_url: '' }); await api.put(`/api/posts/${post.post_id}`, { status: 'published' }); setPosts(prev => prev.map(p => p.post_id === post.post_id ? { ...p, status: 'published' } : p)); }
    catch (err) { console.error(err); }
    finally { setPublishing(''); }
  };

  const handleDelete = async (postId) => {
    try { await api.delete(`/api/posts/${postId}`); setPosts(prev => prev.filter(p => p.post_id !== postId)); } catch (err) { console.error(err); }
  };

  const grouped = {};
  posts.forEach(p => { const d = p.scheduled_at?.split('T')[0] || 'unscheduled'; if (!grouped[d]) grouped[d] = []; grouped[d].push(p); });

  return (
    <div className="space-y-6 animate-fade-in" data-testid="autopilot-page">
      <div><h1 className="text-3xl font-heading font-bold text-white tracking-tight flex items-center gap-3"><Zap className="w-8 h-8 text-amber-400" /> Content Autopilot</h1><p className="text-zinc-400 mt-1">AI generates a full content calendar across platforms</p></div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="Industry" />
          <input type="text" value={topics} onChange={(e) => setTopics(e.target.value)} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="Topics (comma-sep)" />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white">{[3,5,7,14].map(d => <option key={d} value={d} className="bg-zinc-900">{d} days</option>)}</select>
          <select value={ppd} onChange={(e) => setPpd(Number(e.target.value))} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white">{[1,2,3].map(n => <option key={n} value={n} className="bg-zinc-900">{n} post/day</option>)}</select>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">{Object.entries(platformMeta).map(([k, m]) => { const active = selectedPlatforms.includes(k); return <button key={k} onClick={() => togglePlatform(k)} className={`p-2 rounded-lg text-xs border transition-all ${active ? 'bg-white/10 border-white/20' : 'border-white/5 opacity-50'}`}><m.icon className="w-4 h-4" style={{ color: active ? m.color : '#555' }} /></button>; })}</div>
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button onClick={handleGenerate} disabled={generating} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.3)] ml-auto">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Generate {days * ppd} Posts
          </button>
        </div>
      </div>

      {Object.keys(grouped).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-accent-violet" /> Content Calendar ({posts.length} posts)</h2>
          {Object.entries(grouped).sort().map(([day, dayPosts]) => (
            <div key={day} className="space-y-2">
              <h3 className="text-sm font-heading font-semibold text-zinc-300 flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-500" />{new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
              {dayPosts.map(post => { const m = platformMeta[post.platform]; return (
                <div key={post.post_id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${m?.color}20` }}>{m?.icon && <m.icon className="w-4 h-4" style={{ color: m.color }} />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium text-white capitalize">{post.platform}</span><span className={`text-[10px] px-2 py-0.5 rounded-full ${post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-accent-violet/10 text-accent-violet'}`}>{post.status}</span><span className="text-[10px] text-zinc-600">{post.scheduled_at}</span></div>
                    <p className="text-xs text-zinc-300 line-clamp-2">{post.content}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {post.status !== 'published' && <button onClick={() => handlePublish(post)} disabled={!!publishing} className="p-2 rounded-lg hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 disabled:opacity-50">{publishing === post.post_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>}
                    <button onClick={() => handleDelete(post.post_id)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ); })}
            </div>
          ))}
        </div>
      )}
      {posts.length === 0 && !generating && <div className="text-center py-16"><Zap className="w-12 h-12 text-zinc-700 mx-auto mb-4" /><h3 className="text-lg font-heading font-semibold text-zinc-400">No autopilot content yet</h3><p className="text-sm text-zinc-600 mt-1">Configure and click Generate</p></div>}
    </div>
  );
}
