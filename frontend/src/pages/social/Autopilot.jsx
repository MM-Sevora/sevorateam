import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Zap, Loader2, Calendar, Send, Trash2, CheckCircle, XCircle, Globe, Clock } from 'lucide-react';
import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';

const platformMeta = {
  linkedin: { icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn' },
  instagram: { icon: FaInstagram, color: '#E4405F', label: 'Instagram' },
  facebook: { icon: FaFacebook, color: '#1877F2', label: 'Facebook' },
};

export default function Autopilot() {
  const [industry, setIndustry] = useState('');
  const [topics, setTopics] = useState('');
  const [tone, setTone] = useState('professional');
  const [days, setDays] = useState(7);
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['linkedin', 'instagram', 'facebook']);
  const [generating, setGenerating] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState('');
  const [publishResults, setPublishResults] = useState({});

  useEffect(() => { fetchScheduled(); }, []);

  const fetchScheduled = async () => {
    try {
      const res = await api.get('/api/autopilot/scheduled');
      setScheduledPosts(res.data);
    } catch (err) { console.error(err); }
  };

  const togglePlatform = (p) => {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    try {
      const res = await api.post('/api/autopilot/generate', {
        industry, topics: topics.split(',').map(t => t.trim()).filter(Boolean),
        tone, platforms: selectedPlatforms, posts_per_day: postsPerDay, days,
      });
      setScheduledPosts(res.data.posts || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate content plan');
    } finally { setGenerating(false); }
  };

  const handlePublishPost = async (post) => {
    setPublishing(post.post_id);
    try {
      const res = await api.post('/api/publish/real', {
        content: post.content, platform: post.platform, image_url: post.image_url || '',
      });
      setPublishResults(prev => ({ ...prev, [post.post_id]: res.data }));
      if (res.data.success) {
        await api.put(`/api/posts/${post.post_id}`, { status: 'published' });
        setScheduledPosts(prev => prev.map(p => p.post_id === post.post_id ? { ...p, status: 'published' } : p));
      }
    } catch (err) {
      setPublishResults(prev => ({ ...prev, [post.post_id]: { success: false, error: err.response?.data?.detail || 'Failed' } }));
    } finally { setPublishing(''); }
  };

  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setScheduledPosts(prev => prev.filter(p => p.post_id !== postId));
    } catch (err) { console.error(err); }
  };

  const groupedByDay = {};
  scheduledPosts.forEach(p => {
    const day = p.scheduled_at?.split('T')[0] || 'unscheduled';
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(p);
  });

  return (
    <div className="space-y-6 animate-fade-in" data-testid="autopilot-page">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight flex items-center gap-3">
          <Zap className="w-8 h-8 text-amber-400" /> Content Autopilot
        </h1>
        <p className="text-zinc-400 mt-1">AI generates and schedules a full week of content across your platforms</p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="autopilot-config">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Industry</label>
            <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
              placeholder="e.g., Fashion, Technology" data-testid="autopilot-industry"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Topics (comma-separated)</label>
            <input type="text" value={topics} onChange={(e) => setTopics(e.target.value)}
              className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
              placeholder="e.g., styling tips, new arrivals" data-testid="autopilot-topics"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}
              className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white transition-all" data-testid="autopilot-tone"
            >
              {['professional', 'casual', 'inspirational', 'humorous', 'educational'].map(t => (
                <option key={t} value={t} className="bg-zinc-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Days</label>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white" data-testid="autopilot-days"
            >{[3,5,7,14].map(d => <option key={d} value={d} className="bg-zinc-900">{d} days</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Posts per Day</label>
            <select value={postsPerDay} onChange={(e) => setPostsPerDay(Number(e.target.value))}
              className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white" data-testid="autopilot-ppd"
            >{[1,2,3].map(n => <option key={n} value={n} className="bg-zinc-900">{n}/day</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Platforms</label>
            <div className="flex gap-2">
              {Object.entries(platformMeta).map(([key, meta]) => {
                const Icon = meta.icon;
                const active = selectedPlatforms.includes(key);
                return (
                  <button key={key} onClick={() => togglePlatform(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${active ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-500'}`}
                    data-testid={`autopilot-platform-${key}`}
                  ><Icon className="w-3.5 h-3.5" style={{ color: active ? meta.color : undefined }} /> {meta.label}</button>
                );
              })}
            </div>
          </div>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
        <button onClick={handleGenerate} disabled={generating}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          data-testid="generate-autopilot-button"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {generating ? `Generating ${days * postsPerDay} posts...` : `Generate ${days * postsPerDay} Posts for ${days} Days`}
        </button>
      </div>

      {/* Content Calendar */}
      {Object.keys(groupedByDay).length > 0 && (
        <div className="space-y-4" data-testid="autopilot-calendar">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent-violet" /> Content Calendar ({scheduledPosts.length} posts)
            </h2>
          </div>
          {Object.entries(groupedByDay).sort().map(([day, posts]) => (
            <div key={day} className="space-y-2">
              <h3 className="text-sm font-heading font-semibold text-zinc-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                {new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                <span className="text-xs text-zinc-600 font-normal">({posts.length} posts)</span>
              </h3>
              {posts.map(post => {
                const meta = platformMeta[post.platform] || {};
                const Icon = meta.icon;
                const result = publishResults[post.post_id];
                return (
                  <div key={post.post_id} className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors" data-testid={`autopilot-post-${post.post_id}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${meta.color}20` }}>
                        {Icon && <Icon className="w-4 h-4" style={{ color: meta.color }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-white capitalize">{post.platform}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-accent-violet/10 text-accent-violet'}`}>
                            {post.status}
                          </span>
                          <span className="text-[10px] text-zinc-600">{post.scheduled_at}</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">{post.content}</p>
                        {post.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {post.hashtags.slice(0, 5).map((tag, i) => (
                              <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">#{tag.replace('#','')}</span>
                            ))}
                          </div>
                        )}
                        {result && (
                          <div className={`mt-2 text-xs p-2 rounded-lg ${result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {result.success ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Published!{result.url && <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline ml-1">View</a>}</span>
                            : <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> {result.error}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {post.status !== 'published' && (
                          <button onClick={() => handlePublishPost(post)} disabled={!!publishing}
                            className="p-2 rounded-lg hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                            title="Publish now" data-testid={`publish-post-${post.post_id}`}
                          >{publishing === post.post_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
                        )}
                        <button onClick={() => handleDeletePost(post.post_id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Delete" data-testid={`delete-post-${post.post_id}`}
                        ><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {scheduledPosts.length === 0 && !generating && (
        <div className="text-center py-16">
          <Zap className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-heading font-semibold text-zinc-400">No autopilot content yet</h3>
          <p className="text-sm text-zinc-600 mt-1">Configure your preferences and click Generate to create a content calendar</p>
        </div>
      )}
    </div>
  );
}
