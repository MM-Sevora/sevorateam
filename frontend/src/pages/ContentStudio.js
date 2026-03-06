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
    { key: 'create', label: 'Create & Publish', icon: Wand2 },
    { key: 'tools', label: 'AI Tools', icon: Sparkles },
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

                {/* AI Refinement Tools */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-4">
                  <h4 className="text-xs font-heading font-semibold text-white mb-3 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Refine</h4>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      { action: 'rewrite', label: 'Rewrite', icon: RefreshCw },
                      { action: 'shorten', label: 'Shorten', icon: Target },
                      { action: 'expand', label: 'Expand', icon: FileText },
                      { action: 'hook', label: 'Add Hook', icon: Zap },
                      { action: 'cta', label: 'Add CTA', icon: Send },
                      { action: 'emoji', label: 'Add Emojis', icon: Sparkles },
                    ].map(tool => (
                      <button key={tool.action} onClick={() => refineContent(tool.action)} disabled={!!refining}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${refining === tool.action ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'}`}
                      >{refining === tool.action ? <Loader2 className="w-3 h-3 animate-spin" /> : <tool.icon className="w-3 h-3" />} {tool.label}</button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => refineContent('change_tone', { tone: 'casual' })} disabled={!!refining} className="text-[10px] px-2 py-1 rounded border border-white/5 text-zinc-500 hover:text-white hover:bg-white/5">Casual</button>
                    <button onClick={() => refineContent('change_tone', { tone: 'professional' })} disabled={!!refining} className="text-[10px] px-2 py-1 rounded border border-white/5 text-zinc-500 hover:text-white hover:bg-white/5">Professional</button>
                    <button onClick={() => refineContent('change_tone', { tone: 'humorous' })} disabled={!!refining} className="text-[10px] px-2 py-1 rounded border border-white/5 text-zinc-500 hover:text-white hover:bg-white/5">Humorous</button>
                    <button onClick={() => refineContent('translate', { language: 'Spanish' })} disabled={!!refining} className="text-[10px] px-2 py-1 rounded border border-white/5 text-zinc-500 hover:text-white hover:bg-white/5">Spanish</button>
                    <button onClick={() => refineContent('translate', { language: 'Hindi' })} disabled={!!refining} className="text-[10px] px-2 py-1 rounded border border-white/5 text-zinc-500 hover:text-white hover:bg-white/5">Hindi</button>
                  </div>
                </div>

                {/* Quality Check */}
                <div className="flex items-center gap-2">
                  <button onClick={checkQuality} disabled={checkingQuality} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50">
                    {checkingQuality ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Quality Check
                  </button>
                  {qualityScore && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qualityScore.score >= 70 ? 'bg-emerald-500/10 text-emerald-400' : qualityScore.score >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{qualityScore.score}/100</span>
                      <span className="text-[10px] text-zinc-500">Hook: {qualityScore.hook_strength}/10 | CTA: {qualityScore.cta_strength}/10</span>
                    </div>
                  )}
                </div>
                {qualityScore?.suggestions && (
                  <div className="space-y-1">
                    {qualityScore.suggestions.map((s, i) => (
                      <p key={i} className="text-[10px] text-zinc-400 flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />{s}</p>
                    ))}
                  </div>
                )}

                {/* Send to Queue (NOT publish) */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-accent-violet/10 rounded-xl p-4">
                  <h4 className="text-xs font-heading font-semibold text-white mb-3 flex items-center gap-2"><Send className="w-3.5 h-3.5 text-accent-violet" /> Send to Queue</h4>
                  <div className="flex gap-2">
                    <button onClick={() => saveAsPost('draft')} disabled={savingPost} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all">
                      <Download className="w-3.5 h-3.5" /> Save as Draft
                    </button>
                    <button onClick={() => saveAsPost('scheduled')} disabled={savingPost} className="flex-1 bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_0_10px_rgba(124,58,237,0.2)] transition-all">
                      <Clock className="w-3.5 h-3.5" /> Add to Schedule
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-2 text-center">Go to Posts & Schedule to set timing and publish</p>
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

      {/* AI TOOLS TAB */}
      {tab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tool Selector */}
          <div className="space-y-2">
            {[
              { key: 'repurpose', label: 'Content Repurposer', desc: 'One post → all platforms', icon: Repeat, color: '#7c3aed' },
              { key: 'hashtags', label: 'Hashtag Generator', desc: 'Trending + niche hashtags', icon: Hash, color: '#ec4899' },
              { key: 'urlpost', label: 'URL to Post', desc: 'Paste URL → social posts', icon: Link, color: '#06b6d4' },
              { key: 'copywriting', label: 'Copy Frameworks', desc: 'AIDA, PAS, BAB, FAB, STAR', icon: FileText, color: '#f97316' },
              { key: 'recycle', label: 'Content Recycler', desc: 'Find top posts to repost', icon: RefreshCw, color: '#10b981' },
              { key: 'competitor', label: 'Competitor Analysis', desc: 'Analyze competitor strategy', icon: Users, color: '#3b82f6' },
            ].map(tool => (
              <button key={tool.key} onClick={() => setActiveTool(tool.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${activeTool === tool.key ? 'bg-white/5 border-white/15' : 'border-white/5 hover:bg-white/5'}`}
                data-testid={`tool-${tool.key}`}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tool.color}15` }}>
                  <tool.icon className="w-4 h-4" style={{ color: tool.color }} />
                </div>
                <div><p className="text-sm font-medium text-white">{tool.label}</p><p className="text-[10px] text-zinc-500">{tool.desc}</p></div>
              </button>
            ))}
          </div>

          {/* Tool Input & Output */}
          <div className="lg:col-span-2 space-y-4">
            {/* REPURPOSE */}
            {activeTool === 'repurpose' && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2"><Repeat className="w-4 h-4 text-accent-violet" /> Content Repurposer</h3>
                <textarea value={repurposeInput || generatedContent?.content || ''} onChange={(e) => setRepurposeInput(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-3 px-4 text-sm text-white placeholder-zinc-500 resize-none mb-3" rows={4} placeholder="Paste content to repurpose for all platforms..." />
                <button onClick={() => runTool('repurpose', { content: repurposeInput || generatedContent?.content || '', source_platform: platform })}
                  disabled={toolLoading === 'repurpose'} className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                  {toolLoading === 'repurpose' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />} Repurpose for All Platforms
                </button>
              </div>
            )}
            {/* HASHTAGS */}
            {activeTool === 'hashtags' && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2"><Hash className="w-4 h-4 text-pink-400" /> Hashtag Generator</h3>
                <div className="flex gap-3 mb-3">
                  <input type="text" value={hashtagTopic} onChange={(e) => setHashtagTopic(e.target.value)}
                    className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="Topic e.g., fashion styling, tech startup" />
                  <button onClick={() => runTool('hashtags', { topic: hashtagTopic, platform })}
                    disabled={toolLoading === 'hashtags' || !hashtagTopic.trim()} className="bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                    {toolLoading === 'hashtags' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />} Generate
                  </button>
                </div>
              </div>
            )}
            {/* URL TO POST */}
            {activeTool === 'urlpost' && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2"><Link className="w-4 h-4 text-cyan-400" /> URL to Social Posts</h3>
                <div className="flex gap-3 mb-3">
                  <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="https://example.com/article" />
                  <button onClick={() => runTool('urlpost', { url: urlInput, tone })}
                    disabled={toolLoading === 'urlpost' || !urlInput.trim()} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                    {toolLoading === 'urlpost' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />} Generate Posts
                  </button>
                </div>
              </div>
            )}
            {/* COPYWRITING */}
            {activeTool === 'copywriting' && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-orange-400" /> Copywriting Frameworks</h3>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {[{k:'aida',l:'AIDA'},{k:'pas',l:'PAS'},{k:'bab',l:'BAB'},{k:'fab',l:'FAB'},{k:'star',l:'STAR'}].map(f => (
                    <button key={f.k} onClick={() => setCopyFramework(f.k)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${copyFramework === f.k ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'border-white/10 text-zinc-400 hover:text-white'}`}>{f.l}</button>
                  ))}
                </div>
                <div className="flex gap-3 mb-3">
                  <input type="text" value={copyTopic} onChange={(e) => setCopyTopic(e.target.value)}
                    className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="Topic for the copy..." />
                  <button onClick={() => runTool('copywriting', { topic: copyTopic, framework: copyFramework, platform })}
                    disabled={toolLoading === 'copywriting' || !copyTopic.trim()} className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                    {toolLoading === 'copywriting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Write
                  </button>
                </div>
              </div>
            )}
            {/* RECYCLE */}
            {activeTool === 'recycle' && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-emerald-400" /> Content Recycler</h3>
                <p className="text-xs text-zinc-400 mb-3">Find your top-performing posts to repost for maximum engagement</p>
                <button onClick={() => runTool('recycle', {})}
                  disabled={toolLoading === 'recycle'} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                  {toolLoading === 'recycle' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Find Top Posts to Recycle
                </button>
              </div>
            )}
            {/* COMPETITOR */}
            {activeTool === 'competitor' && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Competitor Analysis</h3>
                <div className="flex gap-3 mb-3">
                  <input type="text" value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)}
                    className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="https://competitor-website.com" />
                  <button onClick={() => runTool('competitor', { competitor_url: competitorUrl })}
                    disabled={toolLoading === 'competitor' || !competitorUrl.trim()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                    {toolLoading === 'competitor' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Analyze
                  </button>
                </div>
              </div>
            )}

            {/* Tool Results */}
            {toolResult && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 animate-slide-up" data-testid="tool-result">
                {/* Repurpose Results */}
                {toolResult.tool === 'repurpose' && toolResult.data.repurposed && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-heading font-semibold text-white">Repurposed for {Object.keys(toolResult.data.repurposed).length} platforms</h4>
                    {Object.entries(toolResult.data.repurposed).map(([p, data]) => {
                      const meta = platformOptions.find(x => x.value === p);
                      return (
                        <div key={p} className="bg-zinc-800/80 rounded-lg p-4 border border-white/5">
                          <div className="flex items-center gap-2 mb-2">{meta?.icon && <meta.icon className="w-4 h-4" style={{ color: meta?.color }} />}<span className="text-xs font-medium text-white capitalize">{p}</span><span className="text-[10px] text-zinc-500">{data.character_count} chars</span></div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap mb-2">{data.content}</p>
                          {data.hashtags?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{data.hashtags.map((h,i) => <span key={i} className="text-[10px] bg-accent-violet/10 text-accent-violet px-1.5 py-0.5 rounded">#{h.replace('#','')}</span>)}</div>}
                          {data.tips && <p className="text-[10px] text-zinc-500 bg-zinc-900/50 p-2 rounded">{data.tips}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Hashtag Results */}
                {toolResult.tool === 'hashtags' && (
                  <div className="space-y-3">
                    {['trending', 'niche', 'branded', 'mixed'].map(cat => {
                      const tags = toolResult.data[cat];
                      if (!tags || !Array.isArray(tags) || tags.length === 0) return null;
                      return (
                        <div key={cat}>
                          <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">{cat}</h4>
                          <div className="flex flex-wrap gap-2">{tags.map((t, i) => (
                            <div key={i} className={`px-3 py-1.5 rounded-lg text-xs border ${t.competition === 'low' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : t.competition === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-zinc-800 border-white/10 text-zinc-300'}`}>
                              #{t.tag} <span className="text-[9px] text-zinc-500 ml-1">{t.estimated_posts}</span>
                            </div>
                          ))}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* URL to Post Results */}
                {toolResult.tool === 'urlpost' && toolResult.data.posts && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-heading font-semibold text-white">Posts from URL</h4>
                    {Object.entries(toolResult.data.posts).map(([p, data]) => {
                      const meta = platformOptions.find(x => x.value === p);
                      return (
                        <div key={p} className="bg-zinc-800/80 rounded-lg p-4 border border-white/5">
                          <div className="flex items-center gap-2 mb-2">{meta?.icon && <meta.icon className="w-4 h-4" style={{ color: meta?.color }} />}<span className="text-xs font-medium text-white capitalize">{p}</span></div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{data.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Copywriting Results */}
                {toolResult.tool === 'copywriting' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-heading font-semibold text-white">{(toolResult.data.framework || '').toUpperCase()} Framework</h4>
                    {toolResult.data.sections?.map((s, i) => (
                      <div key={i} className="bg-zinc-800/80 rounded-lg p-3 border border-white/5">
                        <p className="text-[10px] text-accent-violet font-bold uppercase mb-1">{s.label}</p>
                        <p className="text-sm text-zinc-300">{s.text}</p>
                      </div>
                    ))}
                    {toolResult.data.full_post && (
                      <div className="bg-zinc-950/50 rounded-lg p-4 border border-accent-violet/20">
                        <p className="text-xs text-zinc-500 mb-1">Ready to post:</p>
                        <p className="text-sm text-zinc-200 whitespace-pre-wrap">{toolResult.data.full_post}</p>
                      </div>
                    )}
                  </div>
                )}
                {/* Recycle Results */}
                {toolResult.tool === 'recycle' && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-heading font-semibold text-white">Top Posts to Recycle ({toolResult.data.total_analyzed} analyzed)</h4>
                    {toolResult.data.recyclable?.map((p, i) => {
                      const meta = platformOptions.find(x => x.value === p.platform);
                      return (
                        <div key={i} className="bg-zinc-800/80 rounded-lg p-3 border border-white/5 flex items-start gap-3">
                          <span className="text-sm font-bold text-zinc-600">#{i+1}</span>
                          {meta?.icon && <meta.icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: meta?.color }} />}
                          <div className="flex-1"><p className="text-xs text-zinc-300">{p.content}</p><p className="text-[10px] text-emerald-400 mt-1">Score: {p.recycle_score} - {p.suggestion}</p></div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Competitor Results */}
                {toolResult.tool === 'competitor' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-heading font-semibold text-white">{toolResult.data.company_name || 'Competitor'} Analysis</h4>
                    {toolResult.data.content_strategy && <p className="text-xs text-zinc-300 bg-zinc-800/80 p-3 rounded-lg">{toolResult.data.content_strategy}</p>}
                    {['strengths', 'weaknesses', 'opportunities', 'recommended_actions'].map(key => {
                      const items = toolResult.data[key];
                      if (!items?.length) return null;
                      const colors = { strengths: 'text-emerald-400', weaknesses: 'text-red-400', opportunities: 'text-amber-400', recommended_actions: 'text-accent-violet' };
                      return (
                        <div key={key}>
                          <h5 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${colors[key]}`}>{key.replace('_', ' ')}</h5>
                          <div className="space-y-1">{items.map((item, i) => <p key={i} className="text-xs text-zinc-400 flex items-start gap-2"><span className="text-zinc-600">-</span>{item}</p>)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
