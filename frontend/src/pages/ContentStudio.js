import React, { useState } from 'react';
import api from '../api';
import {
  Lightbulb, Wand2, Zap, BarChart3, Image, Send, Copy, Loader2, Check, Download,
  Globe, CheckCircle, XCircle, Hash, Clock, TrendingUp, Target, AlertTriangle, Sparkles,
  Link, RefreshCw, Users, Repeat, FileText
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
  const [tab, setTab] = useState('ideas'); // ideas | create | review
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
  const [refining, setRefining] = useState('');
  const [qualityScore, setQualityScore] = useState(null);
  const [checkingQuality, setCheckingQuality] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
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
    try { await api.post('/api/posts', { platform, content: generatedContent.content, image_url: generatedImage || '', status }); alert(`Saved as ${status}! Go to Posts & Schedule to publish.`); }
    catch (err) { setError('Failed to save'); }
    finally { setSavingPost(false); }
  };

  const refineContent = async (action, extra = {}) => {
    if (!generatedContent?.content) return;
    setRefining(action);
    try {
      const res = await api.post('/api/content/refine', { content: generatedContent.content, action, platform, ...extra });
      setGeneratedContent(prev => ({ ...prev, content: res.data.refined }));
    } catch (err) { setError(err.response?.data?.detail || 'Refine failed'); }
    finally { setRefining(''); }
  };

  const checkQuality = async () => {
    if (!generatedContent?.content) return;
    setCheckingQuality(true); setQualityScore(null);
    try {
      const res = await api.post('/api/content/quality-check', { platform, topic: generatedContent.content });
      setQualityScore(res.data);
    } catch (err) { setError('Quality check failed'); }
    finally { setCheckingQuality(false); }
  };

  const fetchTemplates = async () => {
    try { const res = await api.get('/api/templates'); setTemplates(res.data); } catch (err) {}
  };

  const applyTemplate = (template) => {
    setTopic(template.content);
    setShowTemplates(false);
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

  // AI Tools state
  const [toolResult, setToolResult] = useState(null);
  const [toolLoading, setToolLoading] = useState('');
  const [repurposeInput, setRepurposeInput] = useState('');
  const [hashtagTopic, setHashtagTopic] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [copyTopic, setCopyTopic] = useState('');
  const [copyFramework, setCopyFramework] = useState('aida');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [activeTool, setActiveTool] = useState('repurpose');

  const runTool = async (tool, payload) => {
    setToolLoading(tool); setToolResult(null); setError('');
    try {
      const endpoints = {
        repurpose: '/api/tools/repurpose',
        hashtags: '/api/tools/hashtags',
        urlpost: '/api/tools/url-to-post',
        copywriting: '/api/tools/copywriting',
        recycle: '/api/tools/recycle',
        competitor: '/api/tools/competitor/analyze',
      };
      const res = await api.post(endpoints[tool], payload);
      setToolResult({ tool, data: res.data });
    } catch (err) { setError(err.response?.data?.detail || 'Tool failed'); }
    finally { setToolLoading(''); }
  };

  const tabs = [
    { key: 'ideas', label: 'Ideas', icon: Lightbulb },
    { key: 'create', label: 'Create & Refine', icon: Wand2 },
    { key: 'review', label: 'Team Review', icon: Users },
  ];

  // Content type
  const [contentFormat, setContentFormat] = useState('text'); // text, image, video, carousel

  // Approvals for review tab
  const [approvals, setApprovals] = useState([]);
  const [approvalStats, setApprovalStats] = useState({});
  const [reviewFeedback, setReviewFeedback] = useState({});
  const [reviewing, setReviewing] = useState('');

  const fetchApprovals = async () => {
    try {
      const [appRes, statsRes] = await Promise.all([api.get('/api/approvals'), api.get('/api/approvals/stats')]);
      setApprovals(appRes.data); setApprovalStats(statsRes.data);
    } catch (err) { console.error(err); }
  };

  const handleReview = async (approvalId, action) => {
    setReviewing(approvalId);
    try { await api.post(`/api/approvals/${approvalId}/review`, { action, feedback: reviewFeedback[approvalId] || '' }); await fetchApprovals(); }
    catch (err) { console.error(err); }
    finally { setReviewing(''); }
  };

  // Team review
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  const submitForReview = async () => {
    if (!generatedContent?.content) return;
    setSubmittingReview(true); setSubmitResult(null);
    try {
      // Save as draft first, then submit for review
      const postRes = await api.post('/api/posts', { platform, content: generatedContent.content, image_url: generatedImage || '', status: 'draft' });
      const approvalRes = await api.post('/api/approvals/submit', { post_id: postRes.data.post_id, note: reviewNote });
      setSubmitResult({ success: true, approval_id: approvalRes.data.approval_id });
      setReviewNote('');
    } catch (err) { setSubmitResult({ success: false, error: err.response?.data?.detail || 'Failed' }); }
    finally { setSubmittingReview(false); }
  };

  // Ideas inline
  const [showIdeas, setShowIdeas] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="content-studio-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Content Studio</h1>
          <p className="text-zinc-400 mt-1">Ideate, create, refine, review, and queue content</p>
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
                <div key={i} onClick={() => { setTopic(idea.title + ' - ' + idea.description); setTab('create'); }}
                  className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 hover:border-accent-violet/20 transition-all hover:-translate-y-0.5 cursor-pointer group"
                  data-testid={`studio-idea-${i}`}
                >
                  <h3 className="text-sm font-heading font-semibold text-white mb-2">{idea.title}</h3>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{idea.description}</p>
                  {idea.hashtags?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{idea.hashtags.slice(0, 4).map((t, j) => <span key={j} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">#{t.replace('#','')}</span>)}</div>}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{idea.best_time}</span>
                    <span className={`px-2 py-0.5 rounded-full ${idea.estimated_engagement?.toLowerCase() === 'high' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{idea.estimated_engagement}</span>
                  </div>
                  <p className="text-[9px] text-accent-violet mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to use in Create &rarr;</p>
                </div>
              ))}
            </div>
          ) : !loadingIdeas && (
            <div className="text-center py-16"><Lightbulb className="w-12 h-12 text-zinc-700 mx-auto mb-4" /><h3 className="text-lg font-heading font-semibold text-zinc-400">Get AI Content Ideas</h3><p className="text-sm text-zinc-600 mt-1">Select a platform, enter a topic, and generate ideas. Click any idea to use it.</p></div>
          )}
        </div>
      )}

      {/* CREATE TAB */}
      {tab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {/* LEFT: Input (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5">
              {/* Content Format Selector */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Format:</span>
                {[
                  { key: 'text', label: 'Text Post', icon: '📝' },
                  { key: 'image', label: 'Image Post', icon: '🖼' },
                  { key: 'video', label: 'Video Script', icon: '🎬' },
                  { key: 'carousel', label: 'Carousel', icon: '📊' },
                  { key: 'story', label: 'Story/Reel', icon: '📱' },
                ].map(f => (
                  <button key={f.key} onClick={() => { setContentFormat(f.key); setContentType(f.key === 'text' ? 'post' : f.key); }}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${contentFormat === f.key ? 'bg-accent-violet/10 border-accent-violet/20 text-accent-violet' : 'border-white/5 text-zinc-500 hover:text-white hover:bg-white/5'}`}
                  >{f.icon} {f.label}</button>
                ))}
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Topic</span>
                <button onClick={() => { setShowIdeas(!showIdeas); if (!showIdeas && ideas.length === 0) generateIdeas(); }}
                  className={`text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${showIdeas ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-zinc-500 hover:text-white border border-white/5 hover:bg-white/5'}`}
                ><Lightbulb className="w-3 h-3" /> {showIdeas ? 'Hide Ideas' : 'Get Ideas'}</button>
              </div>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-3 px-4 text-sm text-white placeholder-zinc-500 resize-none"
                rows={3} placeholder="What do you want to post about?" data-testid="studio-topic"
              />
              {/* Inline Ideas */}
              {showIdeas && (
                <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {loadingIdeas ? <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 text-amber-400 animate-spin" /></div> :
                  ideas.length > 0 ? ideas.map((idea, i) => (
                    <button key={i} onClick={() => { setTopic(idea.title + ' - ' + idea.description); setShowIdeas(false); }}
                      className="w-full text-left p-2.5 bg-zinc-800/60 hover:bg-zinc-700/60 rounded-lg border border-white/5 hover:border-amber-500/20 transition-all"
                    >
                      <p className="text-xs text-white font-medium">{idea.title}</p>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{idea.description}</p>
                    </button>
                  )) : <p className="text-[10px] text-zinc-600 text-center py-2">Click to generate AI ideas for your platform</p>}
                </div>
              )}
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

            {generatedContent && (
              <>
                {/* AI Refine - Always visible on left */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-amber-500/10 rounded-xl p-4">
                  <h4 className="text-xs font-heading font-semibold text-white mb-3 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Refine</h4>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      { action: 'rewrite', label: 'Rewrite', icon: RefreshCw },
                      { action: 'shorten', label: 'Shorten', icon: Target },
                      { action: 'expand', label: 'Expand', icon: FileText },
                      { action: 'hook', label: 'Add Hook', icon: Zap },
                      { action: 'cta', label: 'Add CTA', icon: Send },
                      { action: 'emoji', label: 'Emojis', icon: Sparkles },
                    ].map(tool => (
                      <button key={tool.action} onClick={() => refineContent(tool.action)} disabled={!!refining}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${refining === tool.action ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'}`}
                      >{refining === tool.action ? <Loader2 className="w-3 h-3 animate-spin" /> : <tool.icon className="w-3 h-3" />} {tool.label}</button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[9px] text-zinc-600 mr-1 self-center">Tone:</span>
                    {['casual', 'professional', 'humorous', 'inspirational'].map(t => (
                      <button key={t} onClick={() => refineContent('change_tone', { tone: t })} disabled={!!refining} className="text-[10px] px-2 py-1 rounded border border-white/5 text-zinc-500 hover:text-white hover:bg-white/5 capitalize">{t}</button>
                    ))}
                    <span className="text-[9px] text-zinc-600 ml-2 mr-1 self-center">Lang:</span>
                    {['Spanish', 'Hindi', 'French'].map(l => (
                      <button key={l} onClick={() => refineContent('translate', { language: l })} disabled={!!refining} className="text-[10px] px-2 py-1 rounded border border-white/5 text-zinc-500 hover:text-white hover:bg-white/5">{l}</button>
                    ))}
                  </div>
                </div>

                {/* Quality + Team Review + Send to Queue */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-accent-violet/10 rounded-xl p-4 space-y-3">
                  {/* Step 1: Quality Check */}
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent-violet/15 text-accent-violet text-[10px] font-bold flex items-center justify-center">1</span>
                    <button onClick={checkQuality} disabled={checkingQuality} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50">
                      {checkingQuality ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Quality Check
                    </button>
                    {qualityScore && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qualityScore.score >= 70 ? 'bg-emerald-500/10 text-emerald-400' : qualityScore.score >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{qualityScore.score}/100</span>
                    )}
                  </div>
                  {qualityScore?.suggestions && (
                    <div className="space-y-1 pl-7">{qualityScore.suggestions.slice(0, 2).map((s, i) => (
                      <p key={i} className="text-[10px] text-zinc-400 flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />{s}</p>
                    ))}</div>
                  )}

                  {/* Step 2: Team Review (optional) */}
                  <div className="border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold flex items-center justify-center">2</span>
                      <span className="text-[10px] text-zinc-400">Team Review (optional)</span>
                    </div>
                    <div className="pl-7 flex gap-2">
                      <input type="text" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                        className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-1.5 px-3 text-[10px] text-white placeholder-zinc-600"
                        placeholder="Note for reviewer..." />
                      <button onClick={submitForReview} disabled={submittingReview || !generatedContent}
                        className="text-[10px] bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50 whitespace-nowrap">
                        {submittingReview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />} Submit for Review
                      </button>
                    </div>
                    {submitResult && (
                      <p className={`text-[10px] pl-7 mt-1 ${submitResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {submitResult.success ? 'Submitted! Reviewer will see it in Team & Voice → Approvals' : submitResult.error}
                      </p>
                    )}
                  </div>

                  {/* Step 3: Send to Queue */}
                  <div className="border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold flex items-center justify-center">3</span>
                      <span className="text-[10px] text-zinc-400">Send to Queue</span>
                    </div>
                    <div className="pl-7 flex gap-2">
                      <button onClick={() => saveAsPost('draft')} disabled={savingPost} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg px-3 py-2 text-[10px] flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all">
                        <Download className="w-3 h-3" /> Save Draft
                      </button>
                      <button onClick={() => saveAsPost('scheduled')} disabled={savingPost} className="flex-1 bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg px-3 py-2 text-[10px] flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_0_10px_rgba(124,58,237,0.2)] transition-all">
                        <Send className="w-3 h-3" /> Add to Queue
                      </button>
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-1.5 pl-7">Then go to Posts & Schedule to set timing and publish</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Generated Content + Preview (3 cols) */}
          <div className="lg:col-span-3">
            {generatedContent ? (
              <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                  <h3 className="text-sm font-heading font-semibold text-white">Generated Content</h3>
                  <button onClick={copyContent} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5" data-testid="studio-copy">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5 mb-3">
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed" data-testid="studio-generated-text">{generatedContent.content}</p>
                  </div>
                  {generatedContent.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {generatedContent.hashtags.map((tag, i) => <span key={i} className="text-xs bg-accent-violet/10 text-accent-violet px-2 py-1 rounded-md">#{tag.replace('#', '')}</span>)}
                    </div>
                  )}
                  {generatedContent.call_to_action && (
                    <p className="text-xs text-zinc-500 mb-4"><span className="text-zinc-400 font-medium">CTA:</span> {generatedContent.call_to_action}</p>
                  )}
                  {generatedImage && (
                    <div className="mb-4">
                      <img src={generatedImage} alt="Generated" className="w-full rounded-lg border border-white/5" data-testid="studio-image" />
                    </div>
                  )}
                </div>
              </div>
            ) : !loadingText ? (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-16 text-center h-full flex flex-col items-center justify-center">
                <Wand2 className="w-12 h-12 text-zinc-700 mb-4" />
                <h3 className="text-lg font-heading font-semibold text-zinc-400">Create Your Content</h3>
                <p className="text-sm text-zinc-600 mt-1">Enter a topic on the left and click Generate</p>
                <p className="text-xs text-zinc-700 mt-3">Then use AI Refine tools to perfect it before adding to queue</p>
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-16 text-center h-full flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent-violet animate-spin mb-3" />
                <p className="text-sm text-zinc-400">Generating content...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEAM REVIEW TAB */}
      {tab === 'review' && (
        <div className="space-y-4" data-testid="review-tab">
          {/* Auto-fetch approvals on tab open */}
          {approvals.length === 0 && <ReviewLoader fetchApprovals={fetchApprovals} />}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Pending', value: approvalStats.pending || 0, color: '#f59e0b', icon: Clock },
              { label: 'Approved', value: approvalStats.approved || 0, color: '#10b981', icon: CheckCircle },
              { label: 'Rejected', value: approvalStats.rejected || 0, color: '#ef4444', icon: XCircle },
              { label: 'Changes', value: approvalStats.changes_requested || 0, color: '#7c3aed', icon: RefreshCw },
            ].map(s => (
              <div key={s.label} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1"><s.icon className="w-3.5 h-3.5" style={{ color: s.color }} /><span className="text-[10px] text-zinc-500 uppercase">{s.label}</span></div>
                <p className="text-xl font-heading font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Approval list */}
          {approvals.length > 0 ? (
            <div className="space-y-2">
              {approvals.map(a => (
                <div key={a.approval_id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-white capitalize">{a.platform}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : a.status === 'rejected' ? 'bg-red-500/10 text-red-400' : a.status === 'changes_requested' ? 'bg-accent-violet/10 text-accent-violet' : 'bg-amber-500/10 text-amber-400'}`}>{a.status.replace('_', ' ')}</span>
                        <span className="text-[10px] text-zinc-600">{new Date(a.submitted_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-2">{a.content_preview}</p>
                      {a.note && <p className="text-xs text-zinc-500 mt-1">Note: {a.note}</p>}
                      {a.reviews?.map((r, i) => (
                        <div key={i} className={`mt-2 p-2 rounded-lg text-xs ${r.action === 'approve' ? 'bg-emerald-500/10 text-emerald-400' : r.action === 'reject' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          <span className="font-medium">{r.reviewer}</span>: {r.action} {r.feedback && `- "${r.feedback}"`}
                        </div>
                      ))}
                    </div>
                    {a.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <input type="text" value={reviewFeedback[a.approval_id] || ''} onChange={(e) => setReviewFeedback(prev => ({ ...prev, [a.approval_id]: e.target.value }))}
                          className="bg-zinc-950/50 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white placeholder-zinc-600 w-48" placeholder="Feedback..." />
                        <div className="flex gap-1">
                          <button onClick={() => handleReview(a.approval_id, 'approve')} disabled={!!reviewing} className="flex-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1.5 flex items-center justify-center gap-1 disabled:opacity-50"><CheckCircle className="w-3 h-3" /> Approve</button>
                          <button onClick={() => handleReview(a.approval_id, 'reject')} disabled={!!reviewing} className="flex-1 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded-lg py-1.5 flex items-center justify-center gap-1 disabled:opacity-50"><XCircle className="w-3 h-3" /> Reject</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16"><CheckCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" /><h3 className="text-lg font-heading font-semibold text-zinc-400">No Pending Reviews</h3><p className="text-sm text-zinc-600 mt-1">Submit content for review from the Create & Refine tab</p></div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewLoader({ fetchApprovals }) {
  React.useEffect(() => { fetchApprovals(); }, []);
  return null;
}

