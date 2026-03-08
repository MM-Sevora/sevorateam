import React, { useEffect, useState } from 'react';
import { socialAPI } from '../../lib/api';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { 
  PenTool, Clock, TrendingUp, TrendingDown, Image, ArrowUpRight, 
  BarChart3, Download, Heart, MessageSquare, Share2, Loader2, Search, 
  CheckCircle, Sparkles, Calendar
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

const platformMeta = {
  facebook: { icon: FaFacebook, color: '#1877F2' },
  instagram: { icon: FaInstagram, color: '#E4405F' },
  twitter: { icon: FaTwitter, color: '#1DA1F2' },
  linkedin: { icon: FaLinkedin, color: '#0A66C2' },
  youtube: { icon: FaYoutube, color: '#FF0000' },
};

function formatNum(n) { 
  if (!n) return '0'; 
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M'; 
  if (n >= 1000) return (n/1000).toFixed(1)+'K'; 
  return n.toString(); 
}

const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444' };

export const SocialDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Social Listening
  const [listenQuery, setListenQuery] = useState('');
  const [listenResult, setListenResult] = useState(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          socialAPI.getDashboard(),
          api.get('/api/analytics/overview')
        ]);
        setStats(statsRes.data);
        setAnalytics(analyticsRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/analytics/export?format=csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = 'socialflow_analytics.csv'; 
      a.click();
    } catch (err) { 
      alert('Export failed'); 
    }
  };

  const handleListen = async () => {
    if (!listenQuery.trim()) return;
    setListening(true); 
    setListenResult(null);
    try { 
      const res = await api.post('/api/listening/analyze', { query: listenQuery }); 
      setListenResult(res.data); 
    } catch (err) { 
      alert('Listening failed'); 
    } finally { 
      setListening(false); 
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const o = analytics?.overview || {};
  const platformData = Object.entries(analytics?.platform_breakdown || {}).map(([k, v]) => ({ 
    platform: k, ...v, color: platformMeta[k]?.color || '#666' 
  }));

  return (
    <div className="p-8 space-y-6" data-testid="social-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Social Media Hub</h1>
          <p className="text-[#5D4A3A] mt-1">Dashboard, Analytics & Social Listening</p>
        </div>
        {activeTab === 'analytics' && (
          <button 
            onClick={handleExportCSV} 
            className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2 transition-all"
            data-testid="export-csv"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-[#E8D5C4] p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-800">
            <PenTool className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-800">
            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="listening" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-800">
            <Search className="w-4 h-4 mr-2" /> Social Listening
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#5D4A3A] text-sm">Total Content</p>
                    <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.total_content || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                    <PenTool className="w-6 h-6 text-rose-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#5D4A3A] text-sm">Scheduled</p>
                    <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.scheduled || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#5D4A3A] text-sm">Published</p>
                    <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.published || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#5D4A3A] text-sm">Drafts</p>
                    <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.drafts || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Image className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/social/studio">
              <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-[#4A3728] font-semibold">Content Studio</h3>
                    <p className="text-[#5D4A3A] text-sm mt-1">Create new content</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-rose-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/social/posts">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-[#4A3728] font-semibold">Posts & Schedule</h3>
                    <p className="text-[#5D4A3A] text-sm mt-1">Manage scheduled posts</p>
                  </div>
                  <Calendar className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/social/library">
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-[#4A3728] font-semibold">Content Library</h3>
                    <p className="text-[#5D4A3A] text-sm mt-1">Browse saved content</p>
                  </div>
                  <Image className="w-5 h-5 text-amber-600 group-hover:rotate-12 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Platform Distribution */}
          {stats?.by_platform && Object.keys(stats.by_platform).length > 0 && (
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#4A3728]">Content by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.by_platform).map(([platform, count]) => {
                    const meta = platformMeta[platform];
                    const Icon = meta?.icon;
                    return (
                      <div key={platform} className="bg-[#F5EDE5] rounded-lg p-4 flex items-center gap-3">
                        {Icon && <Icon className="w-5 h-5" style={{ color: meta?.color }} />}
                        <div>
                          <p className="text-[#5D4A3A] text-sm capitalize">{platform}</p>
                          <p className="text-2xl font-bold text-[#4A3728]">{count}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Posts', value: o.total_posts, icon: BarChart3, color: '#7c3aed' },
              { label: 'Total Likes', value: formatNum(o.total_likes), icon: Heart, color: '#ec4899' },
              { label: 'Total Comments', value: formatNum(o.total_comments), icon: MessageSquare, color: '#06b6d4' },
              { label: 'Total Shares', value: formatNum(o.total_shares), icon: Share2, color: '#f97316' },
              { label: 'Avg Engagement', value: o.avg_engagement_per_post, icon: TrendingUp, color: '#10b981' },
            ].map(m => (
              <Card key={m.label} className="bg-white border-[#E8D5C4]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                    <span className="text-[10px] text-[#5D4A3A] uppercase tracking-wider">{m.label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: m.color }}>{m.value || 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Platform Breakdown Chart + Benchmarks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-sm text-[#4A3728]">Posts by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                {platformData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={platformData}>
                      <XAxis dataKey="platform" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8D5C4', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="likes" fill="#ec4899" radius={[4,4,0,0]} name="Likes" />
                      <Bar dataKey="comments" fill="#06b6d4" radius={[4,4,0,0]} name="Comments" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-[#5D4A3A] text-center py-8">No published posts to analyze</p>}
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Industry Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics?.benchmarks || {}).map(([platform, bench]) => {
                    const meta = platformMeta[platform];
                    const Icon = meta?.icon;
                    const myStats = analytics?.platform_breakdown?.[platform];
                    const myAvgLikes = myStats ? Math.round(myStats.likes / Math.max(myStats.posts, 1)) : 0;
                    const aboveBench = myAvgLikes > bench.avg_likes_per_post;
                    return (
                      <div key={platform} className="flex items-center gap-3 p-2.5 bg-[#F5EDE5] rounded-lg">
                        {Icon && <Icon className="w-4 h-4" style={{ color: meta?.color }} />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#4A3728] capitalize">{platform}</p>
                          <p className="text-[10px] text-[#5D4A3A]">Benchmark: {bench.avg_engagement_rate}% eng, {bench.avg_likes_per_post} likes/post</p>
                        </div>
                        {myStats && (
                          <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${aboveBench ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            {aboveBench ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            You: {myAvgLikes} likes/post
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Best & Worst Posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Top Performing', posts: analytics?.best_posts, icon: TrendingUp, color: 'text-green-500' },
              { title: 'Needs Improvement', posts: analytics?.worst_posts, icon: TrendingDown, color: 'text-amber-500' }
            ].map(section => (
              <Card key={section.title} className="bg-white border-[#E8D5C4]">
                <CardHeader>
                  <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                    <section.icon className={`w-4 h-4 ${section.color}`} /> {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.posts?.length > 0 ? section.posts.map((p, i) => {
                    const meta = platformMeta[p.platform]; 
                    const Icon = meta?.icon;
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 bg-[#F5EDE5] rounded-lg mb-2">
                        {Icon && <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: meta?.color }} />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#4A3728] line-clamp-1">{p.content}</p>
                          <div className="flex gap-3 mt-1 text-[10px] text-[#5D4A3A]">
                            <span>{formatNum(p.metrics?.likes)} likes</span>
                            <span>{formatNum(p.metrics?.comments)} comments</span>
                          </div>
                        </div>
                      </div>
                    );
                  }) : <p className="text-xs text-[#5D4A3A]">No data yet</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SOCIAL LISTENING TAB */}
        <TabsContent value="listening" className="space-y-6 mt-6">
          <Card className="bg-white border-[#E8D5C4]">
            <CardHeader>
              <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                <Search className="w-4 h-4 text-rose-500" /> Monitor Your Brand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={listenQuery} 
                  onChange={(e) => setListenQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleListen()}
                  className="flex-1 bg-[#F5EDE5] border border-[#D4BBA6] focus:border-rose-400 focus:outline-none rounded-lg py-2.5 px-4 text-sm text-[#4A3728] placeholder-[#5D4A3A]"
                  placeholder="Enter brand name, hashtag, or topic to monitor..." 
                  data-testid="listen-input"
                />
                <button 
                  onClick={handleListen} 
                  disabled={listening || !listenQuery.trim()}
                  className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white rounded-lg font-medium px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50" 
                  data-testid="listen-button"
                >
                  {listening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Analyze
                </button>
              </div>
            </CardContent>
          </Card>

          {listenResult && (
            <div className="space-y-4">
              {/* Sentiment Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-5 flex flex-col items-center">
                    <p className="text-[10px] text-[#5D4A3A] uppercase tracking-wider mb-3">Overall Sentiment</p>
                    <div className="relative w-24 h-24 mb-3">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#E8D5C4" strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" 
                          stroke={listenResult.sentiment_score >= 60 ? '#10b981' : listenResult.sentiment_score >= 40 ? '#f59e0b' : '#ef4444'} 
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 42} 
                          strokeDashoffset={2 * Math.PI * 42 * (1 - (listenResult.sentiment_score || 50) / 100)} 
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[#4A3728]">
                        {listenResult.sentiment_score || 50}
                      </span>
                    </div>
                    <span className={`text-sm font-medium capitalize ${
                      listenResult.overall_sentiment === 'positive' ? 'text-green-500' : 
                      listenResult.overall_sentiment === 'negative' ? 'text-red-500' : 'text-amber-500'
                    }`}>
                      {listenResult.overall_sentiment}
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-5">
                    <p className="text-[10px] text-[#5D4A3A] uppercase tracking-wider mb-3">Sentiment Breakdown</p>
                    {listenResult.sentiment_breakdown && (
                      <div className="space-y-3">
                        {Object.entries(listenResult.sentiment_breakdown).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-xs text-[#5D4A3A] w-16 capitalize">{key}</span>
                            <div className="flex-1 h-2 rounded-full bg-[#E8D5C4] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: SENTIMENT_COLORS[key] || '#666' }} />
                            </div>
                            <span className="text-xs text-[#5D4A3A] w-10 text-right">{val}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-5">
                    <p className="text-[10px] text-[#5D4A3A] uppercase tracking-wider mb-3">Brand Health</p>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-[#4A3728] mb-1">{listenResult.brand_health_score || 0}</p>
                      <p className="text-xs text-[#5D4A3A]">/100</p>
                    </div>
                    {listenResult.hashtag_analysis?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] text-[#5D4A3A] mb-2">Related Hashtags</p>
                        <div className="flex flex-wrap gap-1">
                          {listenResult.hashtag_analysis.slice(0, 5).map((h, i) => (
                            <span key={i} className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded">
                              #{h.tag || h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              {listenResult.recommendations?.length > 0 && (
                <Card className="bg-white border-[#E8D5C4]">
                  <CardHeader>
                    <CardTitle className="text-sm text-[#4A3728] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {listenResult.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 bg-[#F5EDE5] rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-[#4A3728]">{r}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!listenResult && !listening && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#5D4A3A]">Monitor Your Brand</h3>
              <p className="text-sm text-[#5D4A3A] mt-1">
                Enter your brand name, product, or any topic to analyze sentiment and trending conversations
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialDashboard;
