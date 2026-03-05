import React, { useState, useEffect } from 'react';
import api from '../api';
import { Unlink, Plus, Loader2, Shield, ExternalLink, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const allPlatforms = [
  { value: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2', desc: 'Pages, posts, engagement analytics' },
  { value: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E4405F', desc: 'Posts, stories, reels analytics' },
  { value: 'twitter', label: 'Twitter/X', icon: FaTwitter, color: '#1DA1F2', desc: 'Tweets, threads, audience insights' },
  { value: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2', desc: 'Articles, posts, company pages' },
  { value: 'youtube', label: 'YouTube', icon: FaYoutube, color: '#FF0000', desc: 'Videos, shorts, channel analytics' },
];

export default function Platforms() {
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState('');
  const [showConnect, setShowConnect] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [pageName, setPageName] = useState('');
  const [oauthStep, setOauthStep] = useState('select'); // select | auth | confirm
  const [oauthInfo, setOauthInfo] = useState(null);
  const [expandedInsights, setExpandedInsights] = useState('');
  const [insights, setInsights] = useState({});
  const [loadingInsights, setLoadingInsights] = useState('');

  useEffect(() => { fetchPlatforms(); }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await api.get('/api/platforms');
      setConnected(res.data);
    } catch (err) { console.error('Failed to fetch platforms'); }
    finally { setLoading(false); }
  };

  const handleInitOAuth = async () => {
    if (!selectedPlatform) return;
    setConnecting(selectedPlatform);
    try {
      const res = await api.post('/api/platforms/oauth/init', { platform: selectedPlatform });
      setOauthInfo(res.data);
      setOauthStep('auth');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to initiate connection');
    } finally { setConnecting(''); }
  };

  const handleCompleteOAuth = async () => {
    if (!selectedPlatform || !pageName.trim()) return;
    setConnecting(selectedPlatform);
    try {
      const res = await api.post('/api/platforms/oauth/callback', {
        platform: selectedPlatform,
        page_name: pageName,
      });
      setConnected(prev => [...prev, res.data]);
      setShowConnect(false);
      setPageName('');
      setSelectedPlatform('');
      setOauthStep('select');
      setOauthInfo(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to connect');
    } finally { setConnecting(''); }
  };

  const handleDisconnect = async (platformId) => {
    if (!window.confirm('Disconnect this platform? You will lose access to its analytics.')) return;
    try {
      await api.delete(`/api/platforms/${platformId}`);
      setConnected(prev => prev.filter(p => p.platform_id !== platformId));
      setInsights(prev => { const n = {...prev}; delete n[platformId]; return n; });
    } catch (err) { console.error('Failed to disconnect'); }
  };

  const handleToggleInsights = async (platformId) => {
    if (expandedInsights === platformId) {
      setExpandedInsights('');
      return;
    }
    setExpandedInsights(platformId);
    if (!insights[platformId]) {
      setLoadingInsights(platformId);
      try {
        const res = await api.get(`/api/platforms/${platformId}/insights`);
        setInsights(prev => ({ ...prev, [platformId]: res.data }));
      } catch (err) { console.error('Failed to fetch insights'); }
      finally { setLoadingInsights(''); }
    }
  };

  const connectedNames = connected.map(c => c.platform);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="platforms-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Platform Integrations</h1>
          <p className="text-zinc-400 mt-1">Connect and manage your social media accounts via OAuth</p>
        </div>
        <button onClick={() => { setShowConnect(!showConnect); setOauthStep('select'); setOauthInfo(null); }}
          className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 rounded-lg font-medium px-5 py-2.5 flex items-center gap-2"
          data-testid="connect-platform-button"
        >
          <Plus className="w-4 h-4" />
          Connect Platform
        </button>
      </div>

      {showConnect && (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6 animate-slide-up" data-testid="connect-platform-form">
          {oauthStep === 'select' && (
            <>
              <h3 className="text-lg font-heading font-semibold text-white mb-2">Select a Platform</h3>
              <p className="text-sm text-zinc-400 mb-4">Choose a platform to connect via secure OAuth authentication</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {allPlatforms.filter(p => !connectedNames.includes(p.value)).map(p => (
                  <button key={p.value} onClick={() => setSelectedPlatform(p.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all border ${
                      selectedPlatform === p.value ? 'bg-white/10 border-white/20' : 'border-white/5 hover:bg-white/5'
                    }`}
                    data-testid={`select-platform-${p.value}`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${p.color}20` }}>
                      <p.icon className="w-5 h-5" style={{ color: p.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{p.label}</p>
                      <p className="text-xs text-zinc-500">{p.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {connectedNames.length === allPlatforms.length && (
                <p className="text-sm text-zinc-500">All platforms are already connected!</p>
              )}
              <button onClick={handleInitOAuth} disabled={!selectedPlatform || !!connecting}
                className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 transition-all"
                data-testid="init-oauth-button"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Authorize with OAuth
              </button>
            </>
          )}

          {oauthStep === 'auth' && oauthInfo && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-heading font-semibold text-white">OAuth Authorization</h3>
              </div>
              <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5 mb-4">
                <p className="text-sm text-zinc-300 mb-3">
                  <span className="text-white font-medium capitalize">{oauthInfo.platform}</span> is requesting the following permissions:
                </p>
                <div className="space-y-2 mb-3">
                  {oauthInfo.scopes?.map((scope, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {scope.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 px-3 py-2 rounded-lg">
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate">{oauthInfo.oauth_url}</span>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Your Page/Account Name</label>
                <input type="text" value={pageName} onChange={(e) => setPageName(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
                  placeholder="Enter your page or account name" data-testid="oauth-page-name-input"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setOauthStep('select'); setOauthInfo(null); }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg font-medium px-5 py-2.5 transition-all"
                  data-testid="oauth-back-button"
                >Back</button>
                <button onClick={handleCompleteOAuth} disabled={!pageName.trim() || !!connecting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 transition-all"
                  data-testid="oauth-authorize-button"
                >
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {connecting ? 'Connecting...' : 'Authorize & Connect'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12" data-testid="platforms-loading">
          <div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4" data-testid="platforms-list">
          {allPlatforms.map(p => {
            const conn = connected.find(c => c.platform === p.value);
            const isConnected = !!conn;
            const isExpanded = expandedInsights === conn?.platform_id;
            const platformInsights = insights[conn?.platform_id];

            return (
              <div key={p.value}
                className={`bg-zinc-900/50 backdrop-blur-md border rounded-xl overflow-hidden transition-all duration-200 ${
                  isConnected ? 'border-white/10' : 'border-white/5 opacity-50'
                }`}
                data-testid={`platform-card-${p.value}`}
              >
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${p.color}20` }}>
                    <p.icon className="w-6 h-6" style={{ color: p.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-heading font-semibold text-white">{p.label}</h3>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">
                      {isConnected ? `${conn.page_name} - Connected ${new Date(conn.connected_at).toLocaleDateString()}` : p.desc}
                    </p>
                    {isConnected && conn.scopes && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {conn.scopes.slice(0, 3).map((s, i) => (
                          <span key={i} className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{s.replace(/_/g, ' ')}</span>
                        ))}
                        {conn.scopes.length > 3 && <span className="text-[10px] text-zinc-600">+{conn.scopes.length - 3} more</span>}
                      </div>
                    )}
                  </div>
                  {isConnected && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleToggleInsights(conn.platform_id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5"
                        data-testid={`insights-toggle-${p.value}`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" /> Insights
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <button onClick={() => handleDisconnect(conn.platform_id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Disconnect" data-testid={`disconnect-${p.value}`}
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && isConnected && (
                  <div className="border-t border-white/5 p-5 animate-slide-up" data-testid={`insights-panel-${p.value}`}>
                    {loadingInsights === conn.platform_id ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-accent-violet animate-spin" />
                      </div>
                    ) : platformInsights ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Followers', value: platformInsights.overview?.followers?.toLocaleString(), color: p.color },
                            { label: 'Avg Engagement', value: `${platformInsights.overview?.avg_engagement_rate}%`, color: '#10b981' },
                            { label: 'Total Likes', value: platformInsights.engagement?.total_likes?.toLocaleString(), color: '#ec4899' },
                            { label: 'Total Shares', value: platformInsights.engagement?.total_shares?.toLocaleString(), color: '#f97316' },
                          ].map(m => (
                            <div key={m.label} className="bg-zinc-950/50 rounded-lg p-3 border border-white/5">
                              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{m.label}</p>
                              <p className="text-lg font-heading font-bold" style={{ color: m.color }}>{m.value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5">
                            <h4 className="text-sm font-medium text-white mb-3">Top Audiences</h4>
                            <div className="space-y-2">
                              {platformInsights.audience?.top_countries?.map((c, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-zinc-400">{c.country}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                      <div className="h-full rounded-full bg-accent-violet" style={{ width: `${c.percentage}%` }} />
                                    </div>
                                    <span className="text-xs text-zinc-500 w-10 text-right">{c.percentage}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5">
                            <h4 className="text-sm font-medium text-white mb-3">Best Posting Times</h4>
                            <div className="space-y-2">
                              {platformInsights.best_posting_times?.map((t, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-lg">
                                  <span className="text-xs text-zinc-300">{t.day} {t.time}</span>
                                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    {t.engagement_index}x engagement
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 text-center py-4">Unable to load insights</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
