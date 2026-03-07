import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  BarChart3, Download, TrendingUp, TrendingDown, Heart, MessageSquare, Share2, Eye,
  Loader2, Search, Globe, AlertTriangle, CheckCircle, Zap, Hash, Users, Sparkles
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const platformMeta = {
  facebook: { icon: FaFacebook, color: '#1877F2' },
  instagram: { icon: FaInstagram, color: '#E4405F' },
  twitter: { icon: FaTwitter, color: '#1DA1F2' },
  linkedin: { icon: FaLinkedin, color: '#0A66C2' },
  youtube: { icon: FaYoutube, color: '#FF0000' },
};
function formatNum(n) { if (!n) return '0'; if (n >= 1000000) return (n/1000000).toFixed(1)+'M'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toString(); }
const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444' };

export default function AnalyticsAndListening() {
  const [tab, setTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  // Listening
  const [listenQuery, setListenQuery] = useState('');
  const [listenResult, setListenResult] = useState(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    api.get('/api/analytics/overview').then(r => { setAnalytics(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/analytics/export?format=csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'socialflow_analytics.csv'; a.click();
    } catch (err) { alert('Export failed'); }
  };

  const handleListen = async () => {
    if (!listenQuery.trim()) return;
    setListening(true); setListenResult(null);
    try { const res = await api.post('/api/listening/analyze', { query: listenQuery }); setListenResult(res.data); }
    catch (err) { alert('Listening failed'); }
    finally { setListening(false); }
  };

  const tabs = [
    { key: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { key: 'listening', label: 'Social Listening', icon: Search },
  ];

  const o = analytics?.overview || {};
  const platformData = Object.entries(analytics?.platform_breakdown || {}).map(([k, v]) => ({ platform: k, ...v, color: platformMeta[k]?.color || '#666' }));

  return (
    <div className="space-y-6 animate-fade-in" data-testid="analytics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 tracking-tight">Analytics & Listening</h1>
          <p className="text-gray-500 mt-1">Measure performance, track sentiment, and monitor your brand</p>
        </div>
        {tab === 'analytics' && (
          <button onClick={handleExportCSV} className="bg-gray-100 hover:bg-gray-200 text-white border border-gray-300 rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2 transition-all" data-testid="export-csv">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-white rounded-xl border border-gray-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-violet-600/15 text-violet-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          ><t.icon className="w-4 h-4" /> {t.label}</button>
        ))}
      </div>

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-violet-600 animate-spin" /></div> : (
        <div className="space-y-5">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Posts', value: o.total_posts, icon: BarChart3, color: '#7c3aed' },
              { label: 'Total Likes', value: formatNum(o.total_likes), icon: Heart, color: '#ec4899' },
              { label: 'Total Comments', value: formatNum(o.total_comments), icon: MessageSquare, color: '#06b6d4' },
              { label: 'Total Shares', value: formatNum(o.total_shares), icon: Share2, color: '#f97316' },
              { label: 'Avg Engagement', value: o.avg_engagement_per_post, icon: TrendingUp, color: '#10b981' },
            ].map(m => (
              <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2"><m.icon className="w-3.5 h-3.5" style={{ color: m.color }} /><span className="text-[10px] text-gray-500 uppercase tracking-wider">{m.label}</span></div>
                <p className="text-xl font-heading font-bold" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Platform Breakdown Chart + Benchmarks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-gray-900 mb-4">Posts by Platform</h3>
              {platformData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={platformData}>
                    <XAxis dataKey="platform" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Bar dataKey="likes" fill="#ec4899" radius={[4,4,0,0]} name="Likes" />
                    <Bar dataKey="comments" fill="#06b6d4" radius={[4,4,0,0]} name="Comments" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-gray-500 text-center py-8">No published posts to analyze</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Industry Benchmarks</h3>
              <div className="space-y-3">
                {Object.entries(analytics?.benchmarks || {}).map(([platform, bench]) => {
                  const meta = platformMeta[platform];
                  const Icon = meta?.icon;
                  const myStats = analytics?.platform_breakdown?.[platform];
                  const myAvgLikes = myStats ? Math.round(myStats.likes / Math.max(myStats.posts, 1)) : 0;
                  const aboveBench = myAvgLikes > bench.avg_likes_per_post;
                  return (
                    <div key={platform} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                      {Icon && <Icon className="w-4 h-4" style={{ color: meta?.color }} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white capitalize">{platform}</p>
                        <p className="text-[10px] text-gray-500">Benchmark: {bench.avg_engagement_rate}% eng, {bench.avg_likes_per_post} likes/post</p>
                      </div>
                      {myStats && (
                        <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${aboveBench ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {aboveBench ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          You: {myAvgLikes} likes/post
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Best & Worst Posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{ title: 'Top Performing', posts: analytics?.best_posts, icon: TrendingUp, color: 'text-emerald-400' },
              { title: 'Needs Improvement', posts: analytics?.worst_posts, icon: TrendingDown, color: 'text-amber-400' }].map(section => (
              <div key={section.title} className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className={`text-sm font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2`}>
                  <section.icon className={`w-4 h-4 ${section.color}`} /> {section.title}
                </h3>
                {section.posts?.length > 0 ? section.posts.map((p, i) => {
                  const meta = platformMeta[p.platform]; const Icon = meta?.icon;
                  return (
                    <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg mb-2">
                      {Icon && <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: meta?.color }} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 line-clamp-1">{p.content}</p>
                        <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                          <span>{formatNum(p.metrics?.likes)} likes</span>
                          <span>{formatNum(p.metrics?.comments)} comments</span>
                        </div>
                      </div>
                    </div>
                  );
                }) : <p className="text-xs text-gray-500">No data yet</p>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* SOCIAL LISTENING TAB */}
      {tab === 'listening' && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-accent-cyan" /> Monitor Your Brand
            </h3>
            <div className="flex gap-3">
              <input type="text" value={listenQuery} onChange={(e) => setListenQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleListen()}
                className="flex-1 bg-gray-50 border border-gray-300 focus:border-violet-600/50 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500"
                placeholder="Enter brand name, hashtag, or topic to monitor..." data-testid="listen-input"
              />
              <button onClick={handleListen} disabled={listening || !listenQuery.trim()}
                className="bg-violet-600 hover:bg-violet-600-hover text-white rounded-lg font-medium px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50" data-testid="listen-button"
              >{listening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Analyze</button>
            </div>
          </div>

          {listenResult && (
            <div className="space-y-4 animate-slide-up">
              {/* Sentiment Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Overall Sentiment</p>
                  <div className="relative w-24 h-24 mb-3">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={listenResult.sentiment_score >= 60 ? '#10b981' : listenResult.sentiment_score >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - (listenResult.sentiment_score || 50) / 100)} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-heading font-bold text-gray-900">{listenResult.sentiment_score || 50}</span>
                  </div>
                  <span className={`text-sm font-medium capitalize ${listenResult.overall_sentiment === 'positive' ? 'text-emerald-400' : listenResult.overall_sentiment === 'negative' ? 'text-red-400' : 'text-amber-400'}`}>{listenResult.overall_sentiment}</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Sentiment Breakdown</p>
                  {listenResult.sentiment_breakdown && (
                    <div className="space-y-3">
                      {Object.entries(listenResult.sentiment_breakdown).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16 capitalize">{key}</span>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: SENTIMENT_COLORS[key] || '#666' }} />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{val}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {listenResult.audience_mood && <p className="text-xs text-gray-500 mt-3 bg-gray-50 p-2 rounded-lg">{listenResult.audience_mood}</p>}
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Brand Health</p>
                  <div className="text-center">
                    <p className="text-4xl font-heading font-bold text-gray-900 mb-1">{listenResult.brand_health_score || 0}</p>
                    <p className="text-xs text-gray-500">/100</p>
                  </div>
                  {listenResult.hashtag_analysis?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] text-gray-500 mb-2">Related Hashtags</p>
                      <div className="flex flex-wrap gap-1">{listenResult.hashtag_analysis.slice(0, 5).map((h, i) => (
                        <span key={i} className="text-[10px] bg-violet-600/10 text-violet-600 px-2 py-0.5 rounded">#{h.tag || h}</span>
                      ))}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Trending Topics + Key Mentions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {listenResult.trending_topics?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="text-sm font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent-cyan" /> Trending Topics</h3>
                    <div className="space-y-2">{listenResult.trending_topics.map((t, i) => (
                      <div key={i} className="p-2.5 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-white">{typeof t === 'string' ? t : t.topic || t.name}</p>
                        {t.description && <p className="text-[10px] text-gray-500 mt-0.5">{t.description}</p>}
                      </div>
                    ))}</div>
                  </div>
                )}

                {listenResult.key_mentions?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="text-sm font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-pink-400" /> Key Mentions</h3>
                    <div className="space-y-2">{listenResult.key_mentions.map((m, i) => (
                      <div key={i} className="p-2.5 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-gray-500 capitalize">{m.platform}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' : m.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{m.sentiment}</span>
                        </div>
                        <p className="text-xs text-gray-700">"{m.text}"</p>
                      </div>
                    ))}</div>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {listenResult.recommendations?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> AI Recommendations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {listenResult.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-700">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!listenResult && !listening && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-heading font-semibold text-gray-500">Monitor Your Brand</h3>
              <p className="text-sm text-gray-400 mt-1">Enter your brand name, product, or any topic to analyze sentiment and trending conversations</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
