import React, { useState } from 'react';
import api from '../../lib/api';
import {
  Lightbulb, Wand2, Zap, BarChart3, Image, Send, Copy, Loader2, Check, Download,
  Globe, CheckCircle, XCircle, Hash, Clock, TrendingUp, Target, AlertTriangle, Sparkles,
  Link, RefreshCw, Users, Repeat, FileText, Layers, Plus, X
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
        <IdeasTab platform={platform} tone={tone} ideas={ideas} setIdeas={setIdeas} loadingIdeas={loadingIdeas} setLoadingIdeas={setLoadingIdeas}
          ideaTopic={ideaTopic} setIdeaTopic={setIdeaTopic} setTopic={setTopic} setTab={setTab} generateIdeas={generateIdeas} />
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
        <ReviewTab />
      )}
    </div>
  );
}

function ReviewTab() {
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState({});
  const [actionable, setActionable] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState({});
  const [reviewing, setReviewing] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, actionRes] = await Promise.all([api.get('/api/approvals/stats'), api.get('/api/approvals/actionable')]);
      setStats(statsRes.data); setActionable(actionRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { fetchData(); }, []);

  const handleReview = async (id, action) => {
    setReviewing(id);
    try {
      const res = await api.post(`/api/approvals/${id}/review`, { action, feedback: reviewFeedback[id] || '' });
      if (res.data.auto_queued) alert('Approved! Post automatically moved to Posts & Schedule queue.');
      await fetchData();
    }
    catch (err) { console.error(err); }
    finally { setReviewing(''); }
  };

  const handleMoveToQueue = async (id) => {
    try { await api.post(`/api/approvals/${id}/move-to-queue?status=scheduled`); await fetchData(); alert('Moved to schedule queue!'); }
    catch (err) { alert(err.response?.data?.detail || 'Failed'); }
  };

  const handleResubmit = async (id) => {
    try { await api.post(`/api/approvals/${id}/resubmit`); await fetchData(); alert('Resubmitted for review!'); }
    catch (err) { alert(err.response?.data?.detail || 'Failed'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-accent-violet animate-spin" /></div>;

  const sections = [
    { key: 'needs_review', title: 'Needs Review', color: '#f59e0b', icon: Clock, items: actionable?.needs_review || [] },
    { key: 'approved_ready', title: 'Approved - In Schedule Queue', color: '#10b981', icon: CheckCircle, items: actionable?.approved_ready || [] },
    { key: 'needs_edit', title: 'Needs Edit (Rejected/Changes)', color: '#ef4444', icon: XCircle, items: actionable?.needs_edit || [] },
    { key: 'completed', title: 'Completed', color: '#71717a', icon: CheckCircle, items: actionable?.completed || [] },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: stats.pending || 0, color: '#f59e0b' },
          { label: 'Approved', value: stats.approved || 0, color: '#10b981' },
          { label: 'Rejected', value: stats.rejected || 0, color: '#ef4444' },
          { label: 'Changes', value: stats.changes_requested || 0, color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
            <p className="text-[10px] text-zinc-500 uppercase">{s.label}</p>
            <p className="text-xl font-heading font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actionable Sections */}
      {sections.map(section => section.items.length > 0 && (
        <div key={section.key} className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2">
            <section.icon className="w-4 h-4" style={{ color: section.color }} /> {section.title}
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{section.items.length}</span>
          </h3>
          <div className="space-y-2">
            {section.items.slice(0, 10).map(a => (
              <div key={a.approval_id} className="bg-zinc-800/60 rounded-lg p-4 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium text-white capitalize">{a.post_platform}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : a.status === 'rejected' ? 'bg-red-500/10 text-red-400' : a.status === 'changes_requested' ? 'bg-accent-violet/10 text-accent-violet' : 'bg-amber-500/10 text-amber-400'}`}>{a.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2">{a.post_content || a.content_preview}</p>
                    {a.reviews?.length > 0 && (
                      <div className="mt-2 space-y-1">{a.reviews.map((r, i) => (
                        <p key={i} className={`text-[10px] p-1.5 rounded ${r.action === 'approve' ? 'bg-emerald-500/10 text-emerald-400' : r.action === 'reject' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {r.reviewer}: {r.action} {r.feedback && `- "${r.feedback}"`}
                        </p>
                      ))}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {/* Actions based on status */}
                    {section.key === 'needs_review' && (
                      <>
                        <input type="text" value={reviewFeedback[a.approval_id] || ''} onChange={(e) => setReviewFeedback(prev => ({ ...prev, [a.approval_id]: e.target.value }))}
                          className="bg-zinc-950/50 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white placeholder-zinc-600 w-44" placeholder="Feedback..." />
                        <div className="flex gap-1">
                          <button onClick={() => handleReview(a.approval_id, 'approve')} disabled={!!reviewing} className="flex-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1.5 flex items-center justify-center gap-1 disabled:opacity-50"><CheckCircle className="w-3 h-3" /> Approve</button>
                          <button onClick={() => handleReview(a.approval_id, 'reject')} disabled={!!reviewing} className="flex-1 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded-lg py-1.5 flex items-center justify-center gap-1 disabled:opacity-50"><XCircle className="w-3 h-3" /> Reject</button>
                        </div>
                      </>
                    )}
                    {section.key === 'approved_ready' && (
                      <a href="/posts" className="text-[10px] bg-emerald-600/20 text-emerald-400 rounded-lg px-3 py-2 flex items-center gap-1 hover:bg-emerald-600/30">
                        <Send className="w-3 h-3" /> View in Schedule
                      </a>
                    )}
                    {section.key === 'needs_edit' && (
                      <button onClick={() => handleResubmit(a.approval_id)} className="text-[10px] bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg px-3 py-2 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Resubmit</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!actionable || Object.values(actionable).every(v => v.length === 0) && (
        <div className="text-center py-16"><CheckCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" /><h3 className="text-lg font-heading font-semibold text-zinc-400">No Reviews</h3><p className="text-sm text-zinc-600 mt-1">Submit content for review from Create & Refine tab</p></div>
      )}
    </div>
  );
}

function IdeasTab({ platform, tone, ideas, setIdeas, loadingIdeas, setLoadingIdeas, ideaTopic, setIdeaTopic, setTopic, setTab, generateIdeas }) {
  const [pillars, setPillars] = useState([]);
  const [selectedPillar, setSelectedPillar] = useState('');
  const [showAddPillar, setShowAddPillar] = useState(false);
  const [newPillar, setNewPillar] = useState({ name: '', description: '', color: '#7c3aed', target_percentage: 20 });
  const [savingPillar, setSavingPillar] = useState(false);

  React.useEffect(() => { fetchPillars(); }, []);

  const fetchPillars = async () => {
    try { const res = await api.get('/api/pillars'); setPillars(res.data); } catch (err) { console.error(err); }
  };

  const handleAddPillar = async () => {
    if (!newPillar.name.trim()) return;
    setSavingPillar(true);
    try { await api.post('/api/pillars', newPillar); await fetchPillars(); setShowAddPillar(false); setNewPillar({ name: '', description: '', color: '#7c3aed', target_percentage: 20 }); }
    catch (err) { console.error(err); }
    finally { setSavingPillar(false); }
  };

  const handleDeletePillar = async (id) => {
    try { await api.delete(`/api/pillars/${id}`); setPillars(prev => prev.filter(p => p.pillar_id !== id)); } catch (err) { console.error(err); }
  };

  const generateByPillar = async () => {
    setLoadingIdeas(true);
    try {
      const res = await api.post(`/api/content/ideas-by-pillar?pillar=${selectedPillar}`, { platform, topic: ideaTopic, tone });
      setIdeas(res.data.ideas || []);
    } catch (err) { console.error(err); }
    finally { setLoadingIdeas(false); }
  };

  return (
    <div className="space-y-4">
      {/* Content Pillars */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-accent-violet" /> Content Pillars</h3>
          <button onClick={() => setShowAddPillar(!showAddPillar)} className="text-[10px] text-accent-violet hover:text-accent-violet-hover flex items-center gap-1"><Plus className="w-3 h-3" /> Add Pillar</button>
        </div>
        {showAddPillar && (
          <div className="flex gap-2 mb-3 flex-wrap p-3 bg-zinc-800/60 rounded-lg">
            <input type="text" value={newPillar.name} onChange={(e) => setNewPillar(prev => ({ ...prev, name: e.target.value }))} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-zinc-500 w-32" placeholder="Pillar name" />
            <input type="text" value={newPillar.description} onChange={(e) => setNewPillar(prev => ({ ...prev, description: e.target.value }))} className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-zinc-500 min-w-[150px]" placeholder="Description..." />
            <input type="number" value={newPillar.target_percentage} onChange={(e) => setNewPillar(prev => ({ ...prev, target_percentage: parseInt(e.target.value) || 0 }))} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2 px-3 text-xs text-white w-16" />
            <span className="text-[10px] text-zinc-500 self-center">%</span>
            <input type="color" value={newPillar.color} onChange={(e) => setNewPillar(prev => ({ ...prev, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
            <button onClick={handleAddPillar} disabled={savingPillar} className="text-[10px] bg-accent-violet text-white rounded-lg px-3 py-2 disabled:opacity-50">{savingPillar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}</button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelectedPillar('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!selectedPillar ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-500 hover:text-white'}`}>All</button>
          {pillars.map(p => (
            <div key={p.pillar_id} className="flex items-center gap-1">
              <button onClick={() => setSelectedPillar(p.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${selectedPillar === p.name ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-500 hover:text-white'}`}
              ><div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} /> {p.name} <span className="text-[9px] text-zinc-600">{p.target_percentage}%</span></button>
              <button onClick={() => handleDeletePillar(p.pillar_id)} className="p-1 text-zinc-700 hover:text-red-400"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
        {pillars.length > 0 && (
          <div className="mt-3 flex gap-1 h-2 rounded-full overflow-hidden bg-zinc-800">
            {pillars.map(p => <div key={p.pillar_id} className="h-full rounded-full" style={{ backgroundColor: p.color, width: `${p.target_percentage}%` }} title={`${p.name}: ${p.target_percentage}% target, ${p.actual_percentage || 0}% actual`} />)}
          </div>
        )}
      </div>

      {/* Generate Ideas */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 flex gap-3">
        <input type="text" value={ideaTopic} onChange={(e) => setIdeaTopic(e.target.value)}
          className="flex-1 bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500"
          placeholder={selectedPillar ? `Topic for "${selectedPillar}" pillar...` : "Topic (optional)..."}
        />
        <button onClick={selectedPillar ? generateByPillar : generateIdeas} disabled={loadingIdeas}
          className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
        >{loadingIdeas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate {selectedPillar ? `"${selectedPillar}" Ideas` : 'Ideas'}</button>
      </div>

      {/* Ideas Grid */}
      {ideas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ideas.map((idea, i) => (
            <div key={i} onClick={() => { setTopic(idea.title + ' - ' + idea.description); setTab('create'); }}
              className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 hover:border-accent-violet/20 transition-all hover:-translate-y-0.5 cursor-pointer group"
            >
              {idea.pillar && <span className="text-[9px] bg-accent-violet/10 text-accent-violet px-2 py-0.5 rounded-full mb-2 inline-block">{idea.pillar}</span>}
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
        <div className="text-center py-16"><Lightbulb className="w-12 h-12 text-zinc-700 mx-auto mb-4" /><h3 className="text-lg font-heading font-semibold text-zinc-400">Get AI Content Ideas</h3><p className="text-sm text-zinc-600 mt-1">{selectedPillar ? `Select "${selectedPillar}" pillar and generate ideas` : 'Select a platform, set up pillars, and generate ideas'}</p></div>
      )}
    </div>
  );
}

function ReviewLoader({ fetchApprovals }) {
  React.useEffect(() => { fetchApprovals(); }, []);
  return null;
}

