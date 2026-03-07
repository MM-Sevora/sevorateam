import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Search, Loader2, Eye, ThumbsUp, MessageSquare, TrendingUp, ExternalLink, Play, Users, Video, BarChart3 } from 'lucide-react';
import { FaYoutube } from 'react-icons/fa';

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n?.toLocaleString() || '0';
}

function parseDuration(iso) {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = m[1] ? `${m[1]}:` : '';
  const min = m[2] ? m[2].padStart(2, '0') : '00';
  const sec = m[3] ? m[3].padStart(2, '0') : '00';
  return `${h}${min}:${sec}`;
}

export default function YouTubeExplorer() {
  const [tab, setTab] = useState('search'); // search | channel | trending
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelVideos, setChannelVideos] = useState([]);
  const [videoAnalytics, setVideoAnalytics] = useState(null);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setSearchResults([]);
    try {
      const res = await api.get('/api/youtube/search-channel', { params: { q: searchQuery } });
      setSearchResults(res.data.channels || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed. Make sure YouTube API key is configured.');
    } finally { setLoading(false); }
  };

  const handleSelectChannel = async (channelId) => {
    setLoading(true);
    setError('');
    setTab('channel');
    try {
      const [channelRes, videosRes] = await Promise.all([
        api.get(`/api/youtube/channel/${channelId}`),
        api.get(`/api/youtube/channel/${channelId}/videos`),
      ]);
      setSelectedChannel(channelRes.data);
      setChannelVideos(videosRes.data.videos || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load channel');
    } finally { setLoading(false); }
  };

  const handleVideoAnalytics = async (videoId) => {
    setVideoAnalytics(null);
    try {
      const res = await api.get(`/api/youtube/video/${videoId}/analytics`);
      setVideoAnalytics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadTrending = async () => {
    setLoading(true);
    setError('');
    setTab('trending');
    try {
      const res = await api.get('/api/youtube/trending');
      setTrending(res.data.trending || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load trending');
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="youtube-explorer-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <FaYoutube className="w-8 h-8 text-red-500" /> YouTube Explorer
          </h1>
          <p className="text-gray-500 mt-1">Search channels, analyze videos, and discover trending content</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('search')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'search' ? 'bg-red-500/10 text-red-400' : 'text-gray-500 hover:text-white hover:bg-gray-50'}`}
            data-testid="yt-tab-search"
          ><Search className="w-4 h-4 inline mr-1" /> Search</button>
          <button onClick={handleLoadTrending}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'trending' ? 'bg-red-500/10 text-red-400' : 'text-gray-500 hover:text-white hover:bg-gray-50'}`}
            data-testid="yt-tab-trending"
          ><TrendingUp className="w-4 h-4 inline mr-1" /> Trending</button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" data-testid="yt-error">{error}</div>
      )}

      {/* Search Tab */}
      {tab === 'search' && (
        <div className="space-y-4">
          <div className="bg-white backdrop-blur-md border border-gray-200 rounded-xl p-6">
            <div className="flex gap-3">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-gray-50 border border-gray-300 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
                placeholder="Search YouTube channels..." data-testid="yt-search-input"
              />
              <button onClick={handleSearch} disabled={loading || !searchQuery.trim()}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 transition-all"
                data-testid="yt-search-button"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="yt-search-results">
              {searchResults.map((ch) => (
                <button key={ch.channel_id} onClick={() => handleSelectChannel(ch.channel_id)}
                  className="bg-white backdrop-blur-md border border-gray-200 rounded-xl p-4 text-left hover:border-gray-300 hover:-translate-y-1 transition-all duration-200"
                  data-testid={`yt-channel-${ch.channel_id}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {ch.thumbnail && <img src={ch.thumbnail} alt={ch.title} className="w-12 h-12 rounded-full object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{ch.title}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{ch.description}</p>
                </button>
              ))}
            </div>
          )}

          {!loading && searchResults.length === 0 && !searchQuery && (
            <div className="text-center py-16">
              <FaYoutube className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-heading font-semibold text-gray-500">Search YouTube Channels</h3>
              <p className="text-sm text-gray-400 mt-1">Enter a channel name to explore analytics and videos</p>
            </div>
          )}
        </div>
      )}

      {/* Channel Detail Tab */}
      {tab === 'channel' && selectedChannel && (
        <div className="space-y-4">
          <div className="bg-white backdrop-blur-md border border-gray-200 rounded-xl overflow-hidden" data-testid="yt-channel-detail">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                {selectedChannel.thumbnail && (
                  <img src={selectedChannel.thumbnail} alt={selectedChannel.title} className="w-20 h-20 rounded-xl object-cover" />
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-heading font-bold text-gray-900">{selectedChannel.title}</h2>
                  {selectedChannel.custom_url && <p className="text-sm text-red-400">{selectedChannel.custom_url}</p>}
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{selectedChannel.description}</p>
                </div>
                <a href={`https://www.youtube.com/channel/${selectedChannel.channel_id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-500/20"
                  data-testid="yt-channel-link"
                ><ExternalLink className="w-3 h-3" /> Open</a>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <Users className="w-5 h-5 text-red-400 mx-auto mb-2" />
                  <p className="text-2xl font-heading font-bold text-gray-900">{formatCount(selectedChannel.statistics?.subscribers)}</p>
                  <p className="text-xs text-gray-500 mt-1">Subscribers</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <Eye className="w-5 h-5 text-accent-cyan mx-auto mb-2" />
                  <p className="text-2xl font-heading font-bold text-gray-900">{formatCount(selectedChannel.statistics?.total_views)}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Views</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <Video className="w-5 h-5 text-accent-pink mx-auto mb-2" />
                  <p className="text-2xl font-heading font-bold text-gray-900">{formatCount(selectedChannel.statistics?.video_count)}</p>
                  <p className="text-xs text-gray-500 mt-1">Videos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white backdrop-blur-md border border-gray-200 rounded-xl p-6" data-testid="yt-channel-videos">
            <h3 className="text-lg font-heading font-semibold text-gray-900 mb-4">Recent Videos</h3>
            {channelVideos.length > 0 ? (
              <div className="space-y-3">
                {channelVideos.map((vid) => (
                  <div key={vid.video_id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`yt-video-${vid.video_id}`}>
                    <div className="relative flex-shrink-0">
                      {vid.thumbnail && <img src={vid.thumbnail} alt={vid.title} className="w-40 h-24 rounded-lg object-cover" />}
                      {vid.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">{parseDuration(vid.duration)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={vid.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:text-red-400 transition-colors line-clamp-2">
                        {vid.title}
                      </a>
                      <p className="text-xs text-gray-500 mt-1">{new Date(vid.published_at).toLocaleDateString()}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatCount(vid.statistics?.views)}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {formatCount(vid.statistics?.likes)}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {formatCount(vid.statistics?.comments)}</span>
                      </div>
                    </div>
                    <button onClick={() => handleVideoAnalytics(vid.video_id)}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                      title="View Analytics" data-testid={`yt-analytics-${vid.video_id}`}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No videos found</p>
            )}
          </div>

          {videoAnalytics && (
            <div className="bg-white backdrop-blur-md border border-gray-200 rounded-xl p-6 animate-slide-up" data-testid="yt-video-analytics">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-semibold text-gray-900">Video Analytics</h3>
                <button onClick={() => setVideoAnalytics(null)} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
              </div>
              <div className="flex items-start gap-4 mb-4">
                {videoAnalytics.thumbnail && <img src={videoAnalytics.thumbnail} alt="" className="w-32 h-20 rounded-lg object-cover" />}
                <div>
                  <p className="text-sm font-medium text-white">{videoAnalytics.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{videoAnalytics.channel_title} - {new Date(videoAnalytics.published_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Views', value: formatCount(videoAnalytics.statistics?.views), color: '#ef4444' },
                  { label: 'Likes', value: formatCount(videoAnalytics.statistics?.likes), color: '#3b82f6' },
                  { label: 'Comments', value: formatCount(videoAnalytics.statistics?.comments), color: '#10b981' },
                  { label: 'Engagement', value: `${videoAnalytics.statistics?.engagement_rate}%`, color: '#f59e0b' },
                ].map(m => (
                  <div key={m.label} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                    <p className="text-lg font-heading font-bold" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
              {videoAnalytics.tags && videoAnalytics.tags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {videoAnalytics.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trending Tab */}
      {tab === 'trending' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-red-400 animate-spin" /></div>
          ) : trending.length > 0 ? (
            <div className="space-y-3" data-testid="yt-trending-list">
              {trending.map((vid, index) => (
                <div key={vid.video_id} className="bg-white backdrop-blur-md border border-gray-200 rounded-xl p-4 flex items-start gap-4 hover:border-gray-300 transition-colors" data-testid={`yt-trending-${index}`}>
                  <span className="text-lg font-heading font-bold text-gray-400 w-8 flex-shrink-0 pt-1">#{index + 1}</span>
                  <div className="relative flex-shrink-0">
                    {vid.thumbnail && <img src={vid.thumbnail} alt={vid.title} className="w-40 h-24 rounded-lg object-cover" />}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={vid.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:text-red-400 transition-colors line-clamp-2">
                      {vid.title}
                    </a>
                    <p className="text-xs text-gray-500 mt-1">{vid.channel}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatCount(vid.views)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {formatCount(vid.likes)}</span>
                      <span>{new Date(vid.published_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-heading font-semibold text-gray-500">Click Trending to load</h3>
            </div>
          )}
        </div>
      )}

      {loading && tab !== 'trending' && (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-red-400 animate-spin" /></div>
      )}
    </div>
  );
}
