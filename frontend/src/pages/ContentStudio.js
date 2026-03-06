import React, { useState } from 'react';
import api from '../api';
import {
  Lightbulb, Wand2, Zap, BarChart3, Image, Send, Copy, Loader2, Check, Download,
  Globe, CheckCircle, XCircle, Hash, Clock, TrendingUp, Target, AlertTriangle, Sparkles
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const platformOptions = [
  { value: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2' },
  { value: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E4405F' },
  { value: 'twitter', label: 'Twitter/X', icon: FaTwitter, color: '#1DA1F2' },
  { value: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2' },
  { value: 'youtube', label: 'YouTube', icon: FaYoutube, color: '#FF0000' },
];
const toneOptions = ['professional', 'casual', 'humorous', 'inspirational', 'educational'];
const contentTypes = ['post', 'story', 'reel', 'article'];

function ScoreRing({ score, size = 80 }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-heading font-bold text-white">{score}</span>
    </div>
  );
}

export default function ContentStudio() {
  const [tab, setTab] = useState('create'); // create | ideas | autopilot | predict
  // Create state
  const [platform, setPlatform] = useState('linkedin');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [contentType, setContentType] = useState('post');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loadingText, setLoadingText] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [savingPost, setSavingPost] = useState(false);
  const [publishing, setPublishing] = useState('');
  const [publishResults, setPublishResults] = useState({});
  // Ideas state
  const [ideaTopic, setIdeaTopic] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  // Autopilot state
  const [apIndustry, setApIndustry] = useState('');
  const [apTopics, setApTopics] = useState('');
  const [apDays, setApDays] = useState(7);
  const [apPpd, setApPpd] = useState(1);
  const [apPlatforms, setApPlatforms] = useState(['linkedin', 'instagram', 'facebook']);
  const [apPosts, setApPosts] = useState([]);
  const [generatingAp, setGeneratingAp] = useState(false);
  // Predict state
  const [predictContent, setPredictContent] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [loadingPredict, setLoadingPredict] = useState(false);

  // === Handlers ===
  const generateContent = async () => {
    if (!topic.trim()) return;
    setLoadingText(true); setError(''); setGeneratedContent(null);
    try {
      const res = await api.post('/api/content/generate', { platform, topic, tone, content_type: contentType });
      setGeneratedContent(res.data);
    } catch (err) { setError(err.response?.data?.detail || 'Failed'); }
    finally { setLoadingText(false); }
  };

  const generateImage = async () => {
    const prompt = generatedContent?.image_prompt || topic;
    if (!prompt) return;
    setLoadingImage(true);
    try {
      const res = await api.post('/api/content/generate-image', { prompt, style: 'modern social media' });
      setGeneratedImage(res.data.image_data);
    } catch (err) { setError(err.response?.data?.detail || 'Failed'); }
    finally { setLoadingImage(false); }
  };

  const copyContent = () => {
    if (generatedContent?.content) { navigator.clipboard.writeText(generatedContent.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const saveAsPost = async (status) => {
    if (!generatedContent?.content) return;
    setSavingPost(true);
    try { await api.post('/api/posts', { platform, content: generatedContent.content, image_url: generatedImage || '', status }); alert(`Saved as ${status}!`); }
    catch (err) { setError('Failed to save'); }
    finally { setSavingPost(false); }
  };

  const publishToReal = async (targetPlatform) => {
    if (!generatedContent?.content) return;
    setPublishing(targetPlatform); setPublishResults(prev => ({ ...prev, [targetPlatform]: null }));
    try {
      const res = await api.post('/api/publish/real', { content: generatedContent.content, platform: targetPlatform, image_url: generatedImage || '' });
      setPublishResults(prev => ({ ...prev, [targetPlatform]: res.data }));
    } catch (err) { setPublishResults(prev => ({ ...prev, [targetPlatform]: { success: false, error: err.response?.data?.detail || 'Failed' } })); }
    finally { setPublishing(''); }
  };

  const publishAll = async () => {
    if (!generatedContent?.content) return;
    setPublishing('all');
    try { const res = await api.post('/api/publish/multi', { content: generatedContent.content, platform: 'all', image_url: generatedImage || '' }); setPublishResults(res.data.results || {}); }
    catch (err) { setError('Failed'); }
    finally { setPublishing(''); }
  };

  const generateIdeas = async () => {
    setLoadingIdeas(true); setError('');
    try { const res = await api.post('/api/content/ideas', { platform, topic: ideaTopic, tone }); setIdeas(res.data.ideas || []); }
    catch (err) { setError(err.response?.data?.detail || 'Failed'); }
    finally { setLoadingIdeas(false); }
  };

  const generateAutopilot = async () => {
    setGeneratingAp(true); setError('');
    try {
      const res = await api.post('/api/autopilot/generate', { industry: apIndustry, topics: apTopics.split(',').map(t => t.trim()).filter(Boolean), tone, platforms: apPlatforms, posts_per_day: apPpd, days: apDays });
      setApPosts(res.data.posts || []);
    } catch (err) { setError(err.response?.data?.detail || 'Failed'); }
    finally { setGeneratingAp(false); }
  };

  const handlePredict = async () => {
    const text = predictContent || generatedContent?.content;
    if (!text?.trim()) return;
    setLoadingPredict(true); setPrediction(null);
    try { const res = await api.post('/api/predict/performance', { content: text, platform }); setPrediction(res.data); }
    catch (err) { setError(err.response?.data?.detail || 'Failed'); }
    finally { setLoadingPredict(false); }
  };

  const applyIdea = (idea) => { setTopic(idea.title + ' - ' + idea.description); setTab('create'); };

  const tabs = [
    { key: 'create', label: 'Create & Publish', icon: Wand2 },
    { key: 'ideas', label: 'Ideas', icon: Lightbulb },
    { key: 'autopilot', label: 'Autopilot', icon: Zap },
    { key: 'predict', label: 'Predict', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="content-studio-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Content Studio</h1>
          <p className="text-zinc-400 mt-1">Create, predict, and publish content across all platforms</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-xl border border-white/5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-accent-violet/15 text-accent-violet' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            data-testid={`studio-tab-${t.key}`}
          ><t.icon className="w-4 h-4" /> {t.label}</button>
        ))}
      </div>

      {/* Platform & Tone selector - shared */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {platformOptions.map(p => (
            <button key={p.value} onClick={() => setPlatform(p.value)}
              className={`p-2.5 rounded-lg transition-all border ${platform === p.value ? 'bg-white/10 border-white/20' : 'border-transparent hover:bg-white/5'}`}
              data-testid={`studio-platform-${p.value}`}
            ><p.icon className="w-4 h-4" style={{ color: platform === p.value ? p.color : '#71717a' }} /></button>
          ))}
        </div>
        <select value={tone} onChange={(e) => setTone(e.target.value)}
          className="bg-zinc-900/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white"
        >{toneOptions.map(t => <option key={t} value={t} className="bg-zinc-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* CREATE TAB */}
      {tab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5">
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-3 px-4 text-sm text-white placeholder-zinc-500 resize-none"
                rows={3} placeholder="What do you want to post about?" data-testid="studio-topic"
              />
              <div className="flex items-center gap-3 mt-3">
                <select value={contentType} onChange={(e) => setContentType(e.target.value)}
                  className="bg-zinc-950/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white"
                >{contentTypes.map(t => <option key={t} value={t} className="bg-zinc-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select>
                <button onClick={generateContent} disabled={loadingText || !topic.trim()}
                  className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] rounded-lg font-medium px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                  data-testid="studio-generate-text"
                >{loadingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Generate</button>
                <button onClick={generateImage} disabled={loadingImage || !topic.trim()}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg font-medium px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                  data-testid="studio-generate-image"
                >{loadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />} Image</button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {generatedContent ? (
              <>
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-heading font-semibold text-white">Generated Content</h3>
                    <button onClick={copyContent} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5" data-testid="studio-copy">
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5 mb-3">
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed" data-testid="studio-generated-text">{generatedContent.content}</p>
                  </div>
                  {generatedContent.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {generatedContent.hashtags.map((tag, i) => <span key={i} className="text-xs bg-accent-violet/10 text-accent-violet px-2 py-1 rounded-md">#{tag.replace('#', '')}</span>)}
                    </div>
                  )}
                </div>

                {generatedImage && (
                  <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-4">
                    <img src={generatedImage} alt="Generated" className="w-full rounded-lg border border-white/5" data-testid="studio-image" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => saveAsPost('draft')} disabled={savingPost} className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg px-4 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"><Download className="w-3.5 h-3.5" /> Draft</button>
                  <button onClick={() => saveAsPost('scheduled')} disabled={savingPost} className="bg-accent-violet/80 hover:bg-accent-violet text-white rounded-lg px-4 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"><Clock className="w-3.5 h-3.5" /> Schedule</button>
                  <button onClick={() => { setPredictContent(generatedContent.content); setTab('predict'); }} className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg px-4 py-2 text-xs flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Predict</button>
                </div>

                {/* Publish to Real Platforms */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-emerald-500/10 rounded-xl p-4" data-testid="studio-publish-panel">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-heading font-semibold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-400" /> Publish Live</h4>
                    <button onClick={publishAll} disabled={!!publishing} className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50" data-testid="studio-publish-all">
                      {publishing === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} All Platforms
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ key: 'linkedin', icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn' }, { key: 'instagram', icon: FaInstagram, color: '#E4405F', label: 'Instagram' }, { key: 'facebook', icon: FaFacebook, color: '#1877F2', label: 'Facebook' }].map(p => {
                      const result = publishResults[p.key];
                      return (
                        <div key={p.key}>
                          <button onClick={() => publishToReal(p.key)} disabled={!!publishing}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-white/10 bg-zinc-800/80 hover:bg-zinc-700 text-white transition-all disabled:opacity-50"
                            data-testid={`studio-publish-${p.key}`}
                          >{publishing === p.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <p.icon className="w-3 h-3" style={{ color: p.color }} />} {p.label}</button>
                          {result && <div className={`text-[10px] p-1.5 rounded-lg mt-1 ${result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {result.success ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Done!</span> : <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> {result.error?.substring(0, 40)}</span>}
                          </div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : !loadingText && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-12 text-center">
                <Wand2 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Enter a topic and click Generate</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IDEAS TAB */}
      {tab === 'ideas' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 flex gap-3">
            <input type="text" value={ideaTopic} onChange={(e) => setIdeaTopic(e.target.value)}
              className="flex-1 bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500"
              placeholder="Topic (optional) e.g., product launch, tips..." data-testid="studio-idea-topic"
            />
            <button onClick={generateIdeas} disabled={loadingIdeas}
              className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
              data-testid="studio-generate-ideas"
            >{loadingIdeas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Ideas</button>
          </div>
          {ideas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ideas.map((idea, i) => (
                <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all hover:-translate-y-0.5 cursor-pointer" onClick={() => applyIdea(idea)} data-testid={`studio-idea-${i}`}>
                  <h3 className="text-sm font-heading font-semibold text-white mb-2">{idea.title}</h3>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{idea.description}</p>
                  {idea.hashtags?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{idea.hashtags.slice(0, 4).map((t, j) => <span key={j} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded"><Hash className="w-2.5 h-2.5 inline" />{t.replace('#','')}</span>)}</div>}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{idea.best_time}</span>
                    <span className={`px-2 py-0.5 rounded-full ${idea.estimated_engagement?.toLowerCase() === 'high' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{idea.estimated_engagement}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : !loadingIdeas && (
            <div className="text-center py-12"><Lightbulb className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">Click Generate Ideas to get AI-powered suggestions</p><p className="text-xs text-zinc-600 mt-1">Click any idea to use it in the Create tab</p></div>
          )}
        </div>
      )}

      {/* AUTOPILOT TAB */}
      {tab === 'autopilot' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input type="text" value={apIndustry} onChange={(e) => setApIndustry(e.target.value)} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="Industry" data-testid="studio-ap-industry" />
              <input type="text" value={apTopics} onChange={(e) => setApTopics(e.target.value)} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="Topics (comma-sep)" data-testid="studio-ap-topics" />
              <select value={apDays} onChange={(e) => setApDays(Number(e.target.value))} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white">{[3,5,7,14].map(d => <option key={d} value={d} className="bg-zinc-900">{d} days</option>)}</select>
              <select value={apPpd} onChange={(e) => setApPpd(Number(e.target.value))} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white">{[1,2,3].map(n => <option key={n} value={n} className="bg-zinc-900">{n} post/day</option>)}</select>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">{['linkedin','instagram','facebook'].map(p => { const m = platformOptions.find(x => x.value === p); const active = apPlatforms.includes(p); return (
                <button key={p} onClick={() => setApPlatforms(prev => active ? prev.filter(x=>x!==p) : [...prev,p])} className={`p-2 rounded-lg text-xs border transition-all ${active ? 'bg-white/10 border-white/20' : 'border-white/5 opacity-50'}`}>
                  <m.icon className="w-4 h-4" style={{ color: active ? m.color : '#555' }} />
                </button>);})}</div>
              <button onClick={generateAutopilot} disabled={generatingAp}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                data-testid="studio-generate-autopilot"
              >{generatingAp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Generate {apDays * apPpd} Posts</button>
            </div>
          </div>
          {apPosts.length > 0 && (
            <div className="space-y-2">
              {apPosts.map((post, i) => { const m = platformOptions.find(x => x.value === post.platform); return (
                <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-start gap-3" data-testid={`studio-ap-post-${i}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${m?.color}20` }}>
                    {m?.icon && <m.icon className="w-4 h-4" style={{ color: m.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-white capitalize">{post.platform}</span>
                      <span className="text-[10px] text-zinc-500">{post.scheduled_at}</span>
                      <span className="text-[10px] bg-accent-violet/10 text-accent-violet px-2 py-0.5 rounded-full">scheduled</span>
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-2">{post.content}</p>
                  </div>
                </div>
              );})}
            </div>
          )}
          {apPosts.length === 0 && !generatingAp && <div className="text-center py-12"><Zap className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">Generate a full content calendar with one click</p></div>}
        </div>
      )}

      {/* PREDICT TAB */}
      {tab === 'predict' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
            <textarea value={predictContent || generatedContent?.content || ''} onChange={(e) => setPredictContent(e.target.value)}
              className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-3 px-4 text-sm text-white placeholder-zinc-500 resize-none"
              rows={6} placeholder="Paste content to predict performance..." data-testid="studio-predict-input"
            />
            <button onClick={handlePredict} disabled={loadingPredict}
              className="mt-3 bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
              data-testid="studio-predict-button"
            >{loadingPredict ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />} Predict Performance</button>
          </div>
          <div>
            {prediction ? (
              <div className="space-y-4">
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                  <div className="flex justify-center gap-6 mb-4">
                    <div className="text-center"><ScoreRing score={prediction.engagement_score || 0} /><p className="text-xs text-zinc-400 mt-1">Engagement</p></div>
                    <div className="text-center"><ScoreRing score={prediction.content_score || 0} /><p className="text-xs text-zinc-400 mt-1">Quality</p></div>
                  </div>
                  <div className="text-center mb-3">
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${prediction.virality_potential === 'High' || prediction.virality_potential === 'Very High' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {prediction.virality_potential} Virality
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[{l:'Likes',v:prediction.predicted_likes,c:'#ec4899'},{l:'Comments',v:prediction.predicted_comments,c:'#06b6d4'},{l:'Shares',v:prediction.predicted_shares,c:'#f97316'},{l:'Reach',v:prediction.predicted_reach,c:'#7c3aed'}].map(m=>(
                      <div key={m.l} className="bg-zinc-800/80 rounded-lg p-3 border border-white/5"><p className="text-[10px] text-zinc-500">{m.l}</p><p className="text-sm font-heading font-bold" style={{color:m.c}}>{m.v}</p></div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 mt-3"><Clock className="w-3 h-3 inline mr-1" />Best: {prediction.best_time} ({prediction.best_day})</p>
                </div>
                {prediction.suggestions?.length > 0 && (
                  <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1"><Target className="w-3.5 h-3.5 text-accent-cyan" /> Suggestions</h4>
                    {prediction.suggestions.map((s,i) => <p key={i} className="text-xs text-zinc-400 flex items-start gap-2 mb-1.5"><AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />{s}</p>)}
                  </div>
                )}
              </div>
            ) : !loadingPredict && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-12 text-center">
                <BarChart3 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Predict how your content will perform</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
