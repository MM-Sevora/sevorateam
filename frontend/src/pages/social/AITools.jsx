import React, { useState } from 'react';
import api from '../../lib/api';
import {
  Sparkles, Hash, Link, FileText, RefreshCw, Users, Repeat, Loader2, Copy, Check,
  ExternalLink, CheckCircle, XCircle, TrendingUp, AlertTriangle
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const platformOptions = [
  { value: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2' },
  { value: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2' },
  { value: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E4405F' },
  { value: 'twitter', label: 'Twitter/X', icon: FaTwitter, color: '#1DA1F2' },
];

const tools = [
  { key: 'repurpose', label: 'Content Repurposer', desc: 'One post adapted for all platforms', icon: Repeat, color: '#7c3aed' },
  { key: 'hashtags', label: 'Hashtag Generator', desc: 'Trending + niche hashtags with data', icon: Hash, color: '#ec4899' },
  { key: 'urlpost', label: 'URL to Post', desc: 'Paste any URL, get social posts', icon: Link, color: '#06b6d4' },
  { key: 'copywriting', label: 'Copy Frameworks', desc: 'AIDA, PAS, BAB, FAB, STAR', icon: FileText, color: '#f97316' },
  { key: 'recycle', label: 'Content Recycler', desc: 'Find top posts to repost', icon: RefreshCw, color: '#10b981' },
  { key: 'competitor', label: 'Competitor Analysis', desc: 'Analyze competitor strategy', icon: Users, color: '#3b82f6' },
];

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState('repurpose');
  const [platform, setPlatform] = useState('linkedin');
  const [toolResult, setToolResult] = useState(null);
  const [toolLoading, setToolLoading] = useState('');
  const [repurposeInput, setRepurposeInput] = useState('');
  const [hashtagTopic, setHashtagTopic] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [copyTopic, setCopyTopic] = useState('');
  const [copyFramework, setCopyFramework] = useState('aida');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [copied, setCopied] = useState('');

  const runTool = async (tool, payload) => {
    setToolLoading(tool); setToolResult(null);
    try {
      const endpoints = { repurpose: '/api/tools/repurpose', hashtags: '/api/tools/hashtags', urlpost: '/api/tools/url-to-post', copywriting: '/api/tools/copywriting', recycle: '/api/tools/recycle', competitor: '/api/tools/competitor/analyze' };
      const res = await api.post(endpoints[tool], payload);
      setToolResult({ tool, data: res.data });
    } catch (err) { setToolResult({ tool, data: { error: err.response?.data?.detail || 'Failed' } }); }
    finally { setToolLoading(''); }
  };

  const handleCopy = (text) => { navigator.clipboard.writeText(text); setCopied(text.slice(0, 20)); setTimeout(() => setCopied(''), 2000); };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="ai-tools-page">
      <div><h1 className="text-3xl font-heading font-bold text-white tracking-tight">AI Tools</h1><p className="text-zinc-400 mt-1">Powerful AI tools for content optimization and research</p></div>

      <div className="flex items-center gap-1.5 mb-2">
        {platformOptions.map(p => <button key={p.value} onClick={() => setPlatform(p.value)} className={`p-2 rounded-lg transition-all border ${platform === p.value ? 'bg-white/10 border-white/20' : 'border-transparent hover:bg-white/5'}`}><p.icon className="w-4 h-4" style={{ color: platform === p.value ? p.color : '#71717a' }} /></button>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="space-y-2">
          {tools.map(t => (
            <button key={t.key} onClick={() => setActiveTool(t.key)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${activeTool === t.key ? 'bg-white/5 border-white/15' : 'border-white/5 hover:bg-white/5'}`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${t.color}15` }}><t.icon className="w-4 h-4" style={{ color: t.color }} /></div>
              <div><p className="text-sm font-medium text-white">{t.label}</p><p className="text-[10px] text-zinc-500">{t.desc}</p></div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {activeTool === 'repurpose' && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-white mb-3">Content Repurposer</h3>
              <textarea value={repurposeInput} onChange={(e) => setRepurposeInput(e.target.value)} className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-3 px-4 text-sm text-white placeholder-zinc-500 resize-none mb-3" rows={4} placeholder="Paste content to repurpose..." />
              <button onClick={() => runTool('repurpose', { content: repurposeInput, source_platform: platform })} disabled={toolLoading === 'repurpose' || !repurposeInput.trim()} className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">{toolLoading === 'repurpose' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />} Repurpose</button>
            </div>
          )}
          {activeTool === 'hashtags' && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-white mb-3">Hashtag Generator</h3>
              <div className="flex gap-3"><input type="text" value={hashtagTopic} onChange={(e) => setHashtagTopic(e.target.value)} className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="Topic..." />
              <button onClick={() => runTool('hashtags', { topic: hashtagTopic, platform })} disabled={toolLoading === 'hashtags' || !hashtagTopic.trim()} className="bg-pink-600 hover:bg-pink-700 text-white rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">{toolLoading === 'hashtags' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />} Generate</button></div>
            </div>
          )}
          {activeTool === 'urlpost' && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-white mb-3">URL to Social Posts</h3>
              <div className="flex gap-3"><input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="https://..." />
              <button onClick={() => runTool('urlpost', { url: urlInput })} disabled={toolLoading === 'urlpost' || !urlInput.trim()} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">{toolLoading === 'urlpost' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />} Generate</button></div>
            </div>
          )}
          {activeTool === 'copywriting' && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-white mb-3">Copywriting Frameworks</h3>
              <div className="flex gap-2 mb-3">{[{k:'aida',l:'AIDA'},{k:'pas',l:'PAS'},{k:'bab',l:'BAB'},{k:'fab',l:'FAB'},{k:'star',l:'STAR'}].map(f => <button key={f.k} onClick={() => setCopyFramework(f.k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${copyFramework === f.k ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'border-white/10 text-zinc-400'}`}>{f.l}</button>)}</div>
              <div className="flex gap-3"><input type="text" value={copyTopic} onChange={(e) => setCopyTopic(e.target.value)} className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="Topic..." />
              <button onClick={() => runTool('copywriting', { topic: copyTopic, framework: copyFramework, platform })} disabled={toolLoading === 'copywriting' || !copyTopic.trim()} className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">{toolLoading === 'copywriting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Write</button></div>
            </div>
          )}
          {activeTool === 'recycle' && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-white mb-3">Content Recycler</h3>
              <p className="text-xs text-zinc-400 mb-3">Find top-performing posts to repost</p>
              <button onClick={() => runTool('recycle', {})} disabled={toolLoading === 'recycle'} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">{toolLoading === 'recycle' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Find Top Posts</button>
            </div>
          )}
          {activeTool === 'competitor' && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-white mb-3">Competitor Analysis</h3>
              <div className="flex gap-3"><input type="text" value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="https://competitor.com" />
              <button onClick={() => runTool('competitor', { competitor_url: competitorUrl })} disabled={toolLoading === 'competitor' || !competitorUrl.trim()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">{toolLoading === 'competitor' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Analyze</button></div>
            </div>
          )}

          {/* Results */}
          {toolResult && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 animate-slide-up">
              {toolResult.data.error ? <p className="text-sm text-red-400">{toolResult.data.error}</p> : (
                <>
                  {toolResult.tool === 'repurpose' && toolResult.data.repurposed && Object.entries(toolResult.data.repurposed).map(([p, data]) => {
                    const meta = platformOptions.find(x => x.value === p);
                    return <div key={p} className="bg-zinc-800/80 rounded-lg p-4 border border-white/5 mb-3">
                      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2">{meta?.icon && <meta.icon className="w-4 h-4" style={{ color: meta?.color }} />}<span className="text-xs font-medium text-white capitalize">{p}</span></div><button onClick={() => handleCopy(data.content)} className="text-zinc-500 hover:text-white p-1"><Copy className="w-3.5 h-3.5" /></button></div>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{data.content}</p>
                      {data.hashtags?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{data.hashtags.map((h,i) => <span key={i} className="text-[10px] bg-accent-violet/10 text-accent-violet px-1.5 py-0.5 rounded">#{h.replace('#','')}</span>)}</div>}
                    </div>;
                  })}
                  {toolResult.tool === 'hashtags' && ['trending','niche','branded','mixed'].map(cat => {
                    const tags = toolResult.data[cat]; if (!tags?.length) return null;
                    return <div key={cat} className="mb-3"><h4 className="text-xs font-semibold text-zinc-300 uppercase mb-2">{cat}</h4><div className="flex flex-wrap gap-2">{tags.map((t,i) => <span key={i} className={`px-3 py-1.5 rounded-lg text-xs border ${t.competition === 'low' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : t.competition === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-zinc-800 border-white/10 text-zinc-300'}`}>#{t.tag} <span className="text-[9px] text-zinc-500 ml-1">{t.estimated_posts}</span></span>)}</div></div>;
                  })}
                  {toolResult.tool === 'urlpost' && toolResult.data.posts && Object.entries(toolResult.data.posts).map(([p, data]) => {
                    const meta = platformOptions.find(x => x.value === p);
                    return <div key={p} className="bg-zinc-800/80 rounded-lg p-4 border border-white/5 mb-3"><div className="flex items-center gap-2 mb-2">{meta?.icon && <meta.icon className="w-4 h-4" style={{ color: meta?.color }} />}<span className="text-xs font-medium text-white capitalize">{p}</span></div><p className="text-sm text-zinc-300 whitespace-pre-wrap">{data.content}</p></div>;
                  })}
                  {toolResult.tool === 'copywriting' && (<div>{toolResult.data.sections?.map((s,i) => <div key={i} className="bg-zinc-800/80 rounded-lg p-3 border border-white/5 mb-2"><p className="text-[10px] text-accent-violet font-bold uppercase mb-1">{s.label}</p><p className="text-sm text-zinc-300">{s.text}</p></div>)}{toolResult.data.full_post && <div className="bg-zinc-950/50 rounded-lg p-4 border border-accent-violet/20 mt-2"><p className="text-sm text-zinc-200 whitespace-pre-wrap">{toolResult.data.full_post}</p></div>}</div>)}
                  {toolResult.tool === 'recycle' && <div>{toolResult.data.recyclable?.map((p,i) => { const meta = platformOptions.find(x => x.value === p.platform); return <div key={i} className="bg-zinc-800/80 rounded-lg p-3 border border-white/5 mb-2 flex items-start gap-3"><span className="text-sm font-bold text-zinc-600">#{i+1}</span>{meta?.icon && <meta.icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: meta?.color }} />}<div className="flex-1"><p className="text-xs text-zinc-300">{p.content}</p><p className="text-[10px] text-emerald-400 mt-1">Score: {p.recycle_score}</p></div></div>; })}</div>}
                  {toolResult.tool === 'competitor' && (<div><h4 className="text-sm font-semibold text-white mb-2">{toolResult.data.company_name}</h4>{toolResult.data.content_strategy && <p className="text-xs text-zinc-300 bg-zinc-800/80 p-3 rounded-lg mb-3">{toolResult.data.content_strategy}</p>}{['strengths','weaknesses','opportunities','recommended_actions'].map(key => { const items = toolResult.data[key]; if (!items?.length) return null; const colors = { strengths:'text-emerald-400',weaknesses:'text-red-400',opportunities:'text-amber-400',recommended_actions:'text-accent-violet' }; return <div key={key} className="mb-3"><h5 className={`text-xs font-semibold uppercase mb-1 ${colors[key]}`}>{key.replace('_',' ')}</h5>{items.map((item,i) => <p key={i} className="text-xs text-zinc-400 ml-2">- {item}</p>)}</div>; })}</div>)}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
