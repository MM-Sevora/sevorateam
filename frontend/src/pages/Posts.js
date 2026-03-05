import React, { useState, useEffect } from 'react';
import api from '../api';
import { FileText, Trash2, Send, Filter, Clock, CheckCircle, Edit3 } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const platformIcons = {
  facebook: { icon: FaFacebook, color: '#1877F2' },
  instagram: { icon: FaInstagram, color: '#E4405F' },
  twitter: { icon: FaTwitter, color: '#1DA1F2' },
  linkedin: { icon: FaLinkedin, color: '#0A66C2' },
  youtube: { icon: FaYoutube, color: '#FF0000' },
};

const statusStyles = {
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'Draft', icon: Edit3 },
  scheduled: { bg: 'bg-accent-violet/10', text: 'text-accent-violet', label: 'Scheduled', icon: Clock },
  published: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Published', icon: CheckCircle },
};

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPlatform) params.platform = filterPlatform;
      const res = await api.get('/api/posts', { params });
      setPosts(res.data);
    } catch (err) {
      console.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filterStatus, filterPlatform]);

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.post_id !== postId));
    } catch (err) {
      console.error('Failed to delete');
    }
  };

  const handlePublish = async (postId) => {
    try {
      const res = await api.post(`/api/posts/${postId}/publish`);
      setPosts(prev => prev.map(p => p.post_id === postId ? res.data : p));
    } catch (err) {
      console.error('Failed to publish');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="posts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Posts</h1>
          <p className="text-zinc-400 mt-1">Manage all your social media posts</p>
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Filter className="w-4 h-4" />
            Filters:
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-zinc-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white"
            data-testid="filter-status"
          >
            <option value="" className="bg-zinc-900">All Status</option>
            <option value="draft" className="bg-zinc-900">Drafts</option>
            <option value="scheduled" className="bg-zinc-900">Scheduled</option>
            <option value="published" className="bg-zinc-900">Published</option>
          </select>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="bg-zinc-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white"
            data-testid="filter-platform"
          >
            <option value="" className="bg-zinc-900">All Platforms</option>
            {Object.keys(platformIcons).map(p => (
              <option key={p} value={p} className="bg-zinc-900">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12" data-testid="posts-loading">
          <div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16" data-testid="posts-empty-state">
          <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-heading font-semibold text-zinc-400">No posts yet</h3>
          <p className="text-sm text-zinc-600 mt-1">Create content using the Content Creator to see posts here</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="posts-list">
          {posts.map((post) => {
            const pIcon = platformIcons[post.platform];
            const status = statusStyles[post.status] || statusStyles.draft;
            const StatusIcon = status.icon;
            const PlatformIcon = pIcon?.icon;
            return (
              <div
                key={post.post_id}
                className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors"
                data-testid={`post-card-${post.post_id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${pIcon?.color}20` }}>
                    {PlatformIcon && <PlatformIcon className="w-5 h-5" style={{ color: pIcon?.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-white capitalize">{post.platform}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3" data-testid="post-content">
                      {post.content}
                    </p>
                    {post.status === 'published' && post.metrics && (
                      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                        <span>{post.metrics.likes} likes</span>
                        <span>{post.metrics.comments} comments</span>
                        <span>{post.metrics.shares} shares</span>
                        <span>{post.metrics.reach} reach</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {post.status !== 'published' && (
                      <button
                        onClick={() => handlePublish(post.post_id)}
                        className="p-2 rounded-lg hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 transition-colors"
                        title="Publish"
                        data-testid={`publish-post-${post.post_id}`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(post.post_id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete"
                      data-testid={`delete-post-${post.post_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
