import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  Search, Plus, Trash2, Play, Pause, Bell, BellOff, Settings, X,
  Loader2, CheckCircle, AlertTriangle, TrendingUp, TrendingDown,
  MessageSquare, Eye, Filter, RefreshCw, FileText, Clock, Tag,
  ChevronRight, ExternalLink, BarChart3, Zap, Globe, Youtube, Radio
} from 'lucide-react';
import { FaLinkedin, FaFacebook, FaInstagram, FaTwitter, FaReddit } from 'react-icons/fa';

const PLATFORMS = {
  linkedin: { icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn' },
  twitter: { icon: FaTwitter, color: '#1DA1F2', label: 'Twitter/X' },
  instagram: { icon: FaInstagram, color: '#E4405F', label: 'Instagram' },
  facebook: { icon: FaFacebook, color: '#1877F2', label: 'Facebook' },
};

const DATA_SOURCES = {
  google_search: { icon: Globe, color: '#4285F4', label: 'Google Search' },
  youtube_api: { icon: Youtube, color: '#FF0000', label: 'YouTube' },
  reddit_api: { icon: FaReddit, color: '#FF4500', label: 'Reddit' },
  hacker_news: { icon: Zap, color: '#FF6600', label: 'Hacker News' },
  google_news: { icon: Radio, color: '#4285F4', label: 'Google News' },
  bing_news: { icon: Radio, color: '#008373', label: 'Bing News' },
  yahoo_news: { icon: Radio, color: '#6001D2', label: 'Yahoo News' },
  // Tech blogs
  techcrunch: { icon: Radio, color: '#0A0', label: 'TechCrunch' },
  the_verge: { icon: Radio, color: '#E5127D', label: 'The Verge' },
  wired: { icon: Radio, color: '#000', label: 'Wired' },
  ars_technica: { icon: Radio, color: '#FF4500', label: 'Ars Technica' },
  venturebeat: { icon: Radio, color: '#D91E18', label: 'VentureBeat' },
  engadget: { icon: Radio, color: '#02B875', label: 'Engadget' },
  techradar: { icon: Radio, color: '#0078D7', label: 'TechRadar' },
  // Business publications
  fast_company: { icon: Radio, color: '#0066B3', label: 'Fast Company' },
  business_insider: { icon: Radio, color: '#003366', label: 'Business Insider' },
  forbes: { icon: Radio, color: '#5F5F5F', label: 'Forbes' },
  bloomberg: { icon: Radio, color: '#1E1E1E', label: 'Bloomberg' },
};

const SOURCE_CATEGORIES = {
  tech: { label: 'Tech', color: 'bg-purple-100 text-purple-700' },
  business: { label: 'Business', color: 'bg-blue-100 text-blue-700' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-700' },
  finance: { label: 'Finance', color: 'bg-emerald-100 text-emerald-700' },
  healthcare: { label: 'Healthcare', color: 'bg-red-100 text-red-700' },
  ai: { label: 'AI/ML', color: 'bg-amber-100 text-amber-700' },
  cybersecurity: { label: 'Security', color: 'bg-slate-100 text-slate-700' },
  startups: { label: 'Startups', color: 'bg-pink-100 text-pink-700' },
  marketing: { label: 'Marketing', color: 'bg-teal-100 text-teal-700' },
  ecommerce: { label: 'E-commerce', color: 'bg-orange-100 text-orange-700' },
  crypto: { label: 'Crypto', color: 'bg-indigo-100 text-indigo-700' },
  enterprise: { label: 'Enterprise', color: 'bg-sky-100 text-sky-700' },
  legal: { label: 'Legal', color: 'bg-stone-100 text-stone-700' },
  energy: { label: 'Energy', color: 'bg-lime-100 text-lime-700' },
  hr: { label: 'HR', color: 'bg-violet-100 text-violet-700' },
};

const SENTIMENTS = {
  positive: { label: 'Positive', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' },
  neutral: { label: 'Neutral', color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400' },
  negative: { label: 'Negative', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' },
};

const PRIORITIES = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
};

export default function SocialListening() {
  const [activeTab, setActiveTab] = useState('keywords');
  const [keywords, setKeywords] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [crawlerStatus, setCrawlerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ keyword: '', platforms: [], alert_on_mention: true, alert_on_negative: true });
  const [saving, setSaving] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlingKeyword, setCrawlingKeyword] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [mentions, setMentions] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [keywordsRes, alertsRes, dashboardRes, statusRes] = await Promise.all([
        api.get('/social/listening/keywords'),
        api.get('/social/listening/alerts?limit=20'),
        api.get('/social/listening/dashboard'),
        api.get('/social/listening/crawl/status'),
      ]);
      setKeywords(keywordsRes.data);
      setAlerts(alertsRes.data.alerts || []);
      setDashboard(dashboardRes.data);
      setCrawlerStatus(statusRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const triggerCrawlAll = async () => {
    setCrawling(true);
    setError('');
    try {
      const res = await api.post('/social/listening/crawl/sync');
      setSuccess(`Crawled ${res.data.keywords_crawled} keywords, found ${res.data.total_mentions_found} new mentions`);
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Crawl failed');
    } finally {
      setCrawling(false);
    }
  };

  const triggerCrawlKeyword = async (keywordId) => {
    setCrawlingKeyword(keywordId);
    try {
      const res = await api.post(`/social/listening/crawl/${keywordId}`);
      setSuccess(`Found ${res.data.mentions_found} new mentions for "${res.data.keyword}"`);
      fetchData();
      if (selectedKeyword?.keyword_id === keywordId) {
        const mentionsRes = await api.get(`/social/listening/mentions?keyword_id=${keywordId}&limit=20`);
        setMentions(mentionsRes.data.mentions || []);
      }
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Crawl failed');
    } finally {
      setCrawlingKeyword(null);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.keyword.trim()) {
      setError('Keyword is required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/social/listening/keywords', newKeyword);
      setSuccess('Keyword added');
      setShowAddKeyword(false);
      setNewKeyword({ keyword: '', platforms: [], alert_on_mention: true, alert_on_negative: true });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add keyword');
    } finally {
      setSaving(false);
    }
  };

  const toggleKeyword = async (keywordId) => {
    try {
      await api.put(`/social/listening/keywords/${keywordId}/toggle`);
      fetchData();
    } catch (err) {
      setError('Failed to toggle keyword');
    }
  };

  const deleteKeyword = async (keywordId) => {
    if (!window.confirm('Delete this keyword and all its mentions?')) return;
    try {
      await api.delete(`/social/listening/keywords/${keywordId}`);
      fetchData();
      if (selectedKeyword?.keyword_id === keywordId) {
        setSelectedKeyword(null);
      }
    } catch (err) {
      setError('Failed to delete keyword');
    }
  };

  const selectKeyword = async (keyword) => {
    setSelectedKeyword(keyword);
    try {
      const res = await api.get(`/social/listening/mentions?keyword_id=${keyword.keyword_id}&limit=20`);
      setMentions(res.data.mentions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const markAlertRead = async (alertId) => {
    try {
      await api.put(`/social/listening/alerts/${alertId}/read`);
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? {...a, read: true} : a));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAlertsRead = async () => {
    try {
      await api.post('/social/listening/alerts/mark-all-read');
      setAlerts(prev => prev.map(a => ({...a, read: true})));
    } catch (err) {
      setError('Failed to mark alerts');
    }
  };

  const togglePlatform = (platform) => {
    setNewKeyword(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const tabs = [
    { id: 'keywords', label: 'Keywords', icon: Search },
    { id: 'sources', label: 'Data Sources', icon: Globe },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: dashboard?.alerts?.unread },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 animate-fade-in" data-testid="social-listening-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#5D4A3A] mb-1">SOCIAL MEDIA</p>
          <h1 className="text-2xl font-bold text-[#4A3728] tracking-tight">Social Listening</h1>
          <p className="text-sm text-[#5D4A3A] mt-1">Monitor keywords and track brand mentions across the web</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={triggerCrawlAll} 
            disabled={crawling}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-lg font-medium px-4 py-2.5 flex items-center gap-2 transition-colors"
          >
            {crawling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Crawling...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Crawl Now
              </>
            )}
          </button>
          <button onClick={fetchData} className="p-2 hover:bg-[#F5EDE5] rounded-lg text-[#5D4A3A]">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddKeyword(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2.5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Keyword
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Dashboard Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#E8D5C4] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{dashboard?.keywords?.active || 0}</p>
              <p className="text-xs text-[#5D4A3A]">Active Keywords</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E8D5C4] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{dashboard?.mentions?.total || 0}</p>
              <p className="text-xs text-[#5D4A3A]">Total Mentions</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E8D5C4] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{dashboard?.mentions?.last_24h || 0}</p>
              <p className="text-xs text-[#5D4A3A]">Last 24 Hours</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E8D5C4] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{dashboard?.alerts?.unread || 0}</p>
              <p className="text-xs text-[#5D4A3A]">Unread Alerts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F5EDE5] p-1 rounded-lg w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white text-[#4A3728] shadow-sm'
                  : 'text-[#5D4A3A] hover:text-[#4A3728]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Keywords List */}
          <div className="col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-[#4A3728]">Tracked Keywords</h3>
            {keywords.length === 0 ? (
              <div className="bg-white border border-[#E8D5C4] rounded-xl p-6 text-center">
                <Search className="w-10 h-10 text-[#D4BBA6] mx-auto mb-3" />
                <p className="text-sm text-[#5D4A3A]">No keywords tracked yet</p>
                <button
                  onClick={() => setShowAddKeyword(true)}
                  className="mt-3 text-xs text-rose-600 hover:text-rose-700"
                >
                  Add your first keyword
                </button>
              </div>
            ) : (
              keywords.map(kw => (
                <div
                  key={kw.keyword_id}
                  onClick={() => selectKeyword(kw)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-colors ${
                    selectedKeyword?.keyword_id === kw.keyword_id
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-[#E8D5C4] hover:border-[#D4BBA6]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${kw.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="font-medium text-[#4A3728]">{kw.display_name || kw.keyword}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); triggerCrawlKeyword(kw.keyword_id); }}
                        disabled={crawlingKeyword === kw.keyword_id}
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50 disabled:text-emerald-300"
                        title="Crawl now"
                      >
                        {crawlingKeyword === kw.keyword_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleKeyword(kw.keyword_id); }}
                        className={`p-1 rounded ${kw.status === 'active' ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                      >
                        {kw.status === 'active' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteKeyword(kw.keyword_id); }}
                        className="p-1 rounded text-[#5D4A3A] hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#5D4A3A]">
                    <span>{kw.stats?.total_mentions || 0} mentions</span>
                    {kw.alert_on_mention && <Bell className="w-3 h-3 text-amber-500" />}
                    {kw.last_crawled && (
                      <span className="text-[10px] text-[#8B7355]">Last crawl: {new Date(kw.last_crawled).toLocaleString()}</span>
                    )}
                  </div>
                  {kw.platforms?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {kw.platforms.map(p => {
                        const P = PLATFORMS[p];
                        const Icon = P?.icon;
                        return Icon ? (
                          <Icon key={p} className="w-3 h-3" style={{ color: P.color }} />
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Mentions Panel */}
          <div className="col-span-2 bg-white border border-[#E8D5C4] rounded-xl overflow-hidden">
            {selectedKeyword ? (
              <>
                <div className="p-4 border-b border-[#E8D5C4] bg-[#F5EDE5]/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#4A3728]">#{selectedKeyword.display_name || selectedKeyword.keyword}</h3>
                      <p className="text-xs text-[#5D4A3A]">{selectedKeyword.stats?.total_mentions || 0} total mentions</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[#5D4A3A]">{selectedKeyword.stats?.positive_mentions || 0} positive</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[#5D4A3A]">{selectedKeyword.stats?.negative_mentions || 0} negative</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 max-h-[400px] overflow-y-auto">
                  {mentions.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 text-[#D4BBA6] mx-auto mb-3" />
                      <p className="text-sm text-[#5D4A3A]">No mentions found yet</p>
                      <p className="text-xs text-[#9ca3af] mt-1">Click the lightning bolt to crawl for mentions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mentions.map(mention => {
                        const platform = PLATFORMS[mention.platform] || DATA_SOURCES[mention.source] || { icon: Globe, color: '#666', label: mention.platform };
                        const PlatformIcon = platform?.icon || Globe;
                        const sentiment = SENTIMENTS[mention.sentiment];
                        return (
                          <div key={mention.mention_id} className="p-3 bg-[#F5EDE5] rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${platform?.color || '#666'}15` }}>
                                <PlatformIcon className="w-4 h-4" style={{ color: platform?.color || '#666' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-medium text-[#4A3728]">{mention.author?.name || 'Unknown'}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sentiment?.color}`}>
                                    {sentiment?.label}
                                    {mention.sentiment_confidence > 0 && (
                                      <span className="ml-1 opacity-70">({Math.round(mention.sentiment_confidence * 100)}%)</span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-[#9ca3af]">{platform?.label || mention.source}</span>
                                  {mention.source_category && SOURCE_CATEGORIES[mention.source_category] && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${SOURCE_CATEGORIES[mention.source_category].color}`}>
                                      {SOURCE_CATEGORIES[mention.source_category].label}
                                    </span>
                                  )}
                                  {mention.subreddit && (
                                    <span className="text-[10px] text-orange-600">r/{mention.subreddit}</span>
                                  )}
                                  {mention.hn_points > 0 && (
                                    <span className="text-[10px] text-orange-600">{mention.hn_points} points</span>
                                  )}
                                </div>
                                {mention.title && (
                                  <p className="text-sm font-medium text-[#4A3728] mb-1">{mention.title}</p>
                                )}
                                <p className="text-sm text-[#5D4A3A]">{mention.content?.slice(0, 200)}{mention.content?.length > 200 ? '...' : ''}</p>
                                <div className="flex items-center gap-3 mt-2 text-[10px] text-[#9ca3af]">
                                  {mention.reach > 0 && <span><Eye className="w-3 h-3 inline mr-1" />{mention.reach} reach</span>}
                                  {mention.engagement > 0 && <span><TrendingUp className="w-3 h-3 inline mr-1" />{mention.engagement} engagement</span>}
                                  {mention.published_at && (
                                    <span><Clock className="w-3 h-3 inline mr-1" />{new Date(mention.published_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                              {mention.url && (
                                <a href={mention.url} target="_blank" rel="noopener noreferrer" className="text-[#5D4A3A] hover:text-rose-600">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <Search className="w-12 h-12 text-[#D4BBA6] mx-auto mb-3" />
                  <p className="text-sm text-[#5D4A3A]">Select a keyword to view mentions</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Sources Tab */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#4A3728]">Real-Time Web Crawler</h3>
                <p className="text-sm text-[#5D4A3A] mt-1">
                  Our crawler searches multiple public data sources to find mentions of your tracked keywords. 
                  Click "Crawl Now" to fetch the latest mentions.
                </p>
              </div>
            </div>
          </div>

          {/* Data Sources Grid */}
          <div className="grid grid-cols-2 gap-4">
            {crawlerStatus && Object.entries(crawlerStatus.data_sources || {}).map(([key, source]) => {
              const sourceConfig = DATA_SOURCES[key] || { icon: Globe, color: '#666', label: key };
              const Icon = sourceConfig.icon;
              const mentionCount = crawlerStatus.mentions_by_source?.[key] || 0;
              
              return (
                <div key={key} className="bg-white border border-[#E8D5C4] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${sourceConfig.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: sourceConfig.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-[#4A3728]">{sourceConfig.label}</h4>
                        <span className={`w-2 h-2 rounded-full ${source.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                      <p className="text-xs text-[#5D4A3A] mt-1">{source.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-[#8B7355]">
                          {mentionCount} mentions collected
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          source.configured 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {source.configured ? 'Configured' : 'Not Configured'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Crawler Stats */}
          {crawlerStatus?.last_crawl && (
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-4">
              <h4 className="font-medium text-[#4A3728] mb-3">Last Crawl Summary</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-[#F5EDE5] rounded-lg">
                  <p className="text-2xl font-bold text-[#4A3728]">{crawlerStatus.last_crawl.keywords_crawled}</p>
                  <p className="text-xs text-[#5D4A3A]">Keywords Crawled</p>
                </div>
                <div className="text-center p-3 bg-[#F5EDE5] rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{crawlerStatus.last_crawl.total_mentions_found}</p>
                  <p className="text-xs text-[#5D4A3A]">Mentions Found</p>
                </div>
                <div className="text-center p-3 bg-[#F5EDE5] rounded-lg">
                  <p className="text-2xl font-bold text-[#4A3728]">{crawlerStatus.active_keywords}</p>
                  <p className="text-xs text-[#5D4A3A]">Active Keywords</p>
                </div>
                <div className="text-center p-3 bg-[#F5EDE5] rounded-lg">
                  <p className="text-sm font-medium text-[#4A3728]">
                    {new Date(crawlerStatus.last_crawl.crawled_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#5D4A3A]">Crawled At</p>
                </div>
              </div>
            </div>
          )}

          {/* News Sources Breakdown */}
          {crawlerStatus?.news_sources && (
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-[#4A3728]">Industry-Specific News Sources</h4>
                <span className="text-sm text-emerald-600 font-medium">
                  {crawlerStatus.total_feed_count || 60}+ Sources
                </span>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(crawlerStatus.news_sources || {}).map(([category, sources]) => {
                  const catConfig = SOURCE_CATEGORIES[category] || { label: category, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <div key={category} className="min-w-0">
                      <p className={`text-[10px] font-medium mb-2 uppercase px-2 py-1 rounded ${catConfig.color}`}>
                        {catConfig.label}
                      </p>
                      <div className="space-y-0.5">
                        {sources?.slice(0, 3).map(source => (
                          <span key={source} className="block text-xs text-[#4A3728] truncate">{source}</span>
                        ))}
                        {sources?.length > 3 && (
                          <span className="text-[10px] text-[#8B7355]">+{sources.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sentiment Analysis Info */}
          {crawlerStatus?.sentiment_analysis && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#4A3728]">ML-Powered Sentiment Analysis</h3>
                  <p className="text-sm text-[#5D4A3A] mt-1">
                    <strong>Primary:</strong> {crawlerStatus.sentiment_analysis.primary_method}
                  </p>
                  <p className="text-sm text-[#5D4A3A]">
                    <strong>Features:</strong> {crawlerStatus.sentiment_analysis.features?.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-white border border-[#E8D5C4] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#E8D5C4] flex items-center justify-between">
            <h3 className="font-semibold text-[#4A3728]">Recent Alerts</h3>
            {alerts.some(a => !a.read) && (
              <button
                onClick={markAllAlertsRead}
                className="text-xs text-rose-600 hover:text-rose-700"
              >
                Mark all as read
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-[#D4BBA6] mx-auto mb-3" />
              <p className="text-sm text-[#5D4A3A]">No alerts yet</p>
              <p className="text-xs text-[#9ca3af] mt-1">Alerts will appear when keywords are mentioned</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E8D5C4]">
              {alerts.map(alert => {
                const priority = PRIORITIES[alert.priority];
                return (
                  <div
                    key={alert.alert_id}
                    className={`p-4 ${alert.read ? 'bg-white' : 'bg-amber-50/50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        alert.priority === 'urgent' ? 'bg-red-100' : 'bg-amber-100'
                      }`}>
                        <Bell className={`w-4 h-4 ${
                          alert.priority === 'urgent' ? 'text-red-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#4A3728]">{alert.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${priority?.color}`}>{priority?.label}</span>
                          {!alert.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <p className="text-sm text-[#5D4A3A]">{alert.message}</p>
                        <p className="text-[10px] text-[#9ca3af] mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                      </div>
                      {!alert.read && (
                        <button
                          onClick={() => markAlertRead(alert.alert_id)}
                          className="text-xs text-[#5D4A3A] hover:text-rose-600"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white border border-[#E8D5C4] rounded-xl p-6">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-[#D4BBA6] mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[#4A3728]">Listening Reports</h3>
            <p className="text-sm text-[#5D4A3A] mt-2 max-w-md mx-auto">
              Configure automated reports to receive summaries of keyword mentions and sentiment analysis.
            </p>
            <p className="text-xs text-[#9ca3af] mt-4">
              Reports feature coming soon - structure ready for configuration
            </p>
          </div>
        </div>
      )}

      {/* Add Keyword Modal */}
      {showAddKeyword && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowAddKeyword(false); }}>
          <div className="bg-white rounded-2xl w-[500px] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#4A3728]">Add Keyword</h2>
              <button onClick={() => setShowAddKeyword(false)} className="p-2 hover:bg-[#F5EDE5] rounded-lg">
                <X className="w-5 h-5 text-[#5D4A3A]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#5D4A3A] font-medium mb-1.5 block">Keyword or Phrase *</label>
                <input
                  type="text"
                  value={newKeyword.keyword}
                  onChange={(e) => setNewKeyword({...newKeyword, keyword: e.target.value})}
                  className="w-full bg-white border border-[#D4BBA6] rounded-lg px-3 py-2 text-sm text-[#4A3728]"
                  placeholder="e.g., @sevora, #socialmedia, product name"
                />
              </div>

              <div>
                <label className="text-xs text-[#5D4A3A] font-medium mb-2 block">Platforms (empty = all)</label>
                <div className="flex gap-2">
                  {Object.entries(PLATFORMS).map(([key, p]) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => togglePlatform(key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          newKeyword.platforms.includes(key)
                            ? 'bg-rose-500 text-white'
                            : 'bg-[#F5EDE5] text-[#5D4A3A] hover:bg-[#E8D5C4]'
                        }`}
                      >
                        <Icon className="w-4 h-4" style={{ color: newKeyword.platforms.includes(key) ? 'white' : p.color }} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-[#5D4A3A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newKeyword.alert_on_mention}
                    onChange={(e) => setNewKeyword({...newKeyword, alert_on_mention: e.target.checked})}
                    className="rounded bg-white border-[#D4BBA6] text-rose-500"
                  />
                  Alert on any mention
                </label>
                <label className="flex items-center gap-2 text-sm text-[#5D4A3A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newKeyword.alert_on_negative}
                    onChange={(e) => setNewKeyword({...newKeyword, alert_on_negative: e.target.checked})}
                    className="rounded bg-white border-[#D4BBA6] text-rose-500"
                  />
                  Alert on negative sentiment
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddKeyword(false)}
                className="px-4 py-2 border border-[#D4BBA6] rounded-lg text-sm text-[#5D4A3A] hover:bg-[#F5EDE5]"
              >
                Cancel
              </button>
              <button
                onClick={addKeyword}
                disabled={saving}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Keyword
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
