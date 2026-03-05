import React, { useState } from 'react';
import api from '../api';
import { Lightbulb, Sparkles, Clock, TrendingUp, Hash, Loader2 } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const platformOptions = [
  { value: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2' },
  { value: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E4405F' },
  { value: 'twitter', label: 'Twitter/X', icon: FaTwitter, color: '#1DA1F2' },
  { value: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2' },
  { value: 'youtube', label: 'YouTube', icon: FaYoutube, color: '#FF0000' },
];

const toneOptions = ['professional', 'casual', 'humorous', 'inspirational', 'educational'];

export default function ContentIdeas() {
  const [platform, setPlatform] = useState('instagram');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateIdeas = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/content/ideas', { platform, topic, tone });
      setIdeas(res.data.ideas || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate ideas');
    } finally {
      setLoading(false);
    }
  };

  const engagementColor = (level) => {
    const l = level?.toLowerCase();
    if (l === 'high') return 'text-emerald-400 bg-emerald-500/10';
    if (l === 'medium') return 'text-amber-400 bg-amber-500/10';
    return 'text-zinc-400 bg-zinc-500/10';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="content-ideas-page">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Content Ideas</h1>
        <p className="text-zinc-400 mt-1">AI-powered content suggestions for your social media</p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="ideas-generator">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Platform</label>
            <div className="flex gap-2 flex-wrap">
              {platformOptions.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border ${
                    platform === p.value
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                  data-testid={`idea-platform-${p.value}`}
                >
                  <p.icon className="w-4 h-4" style={{ color: platform === p.value ? p.color : undefined }} />
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Topic (optional)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
              placeholder="e.g., product launch, tips, behind the scenes"
              data-testid="idea-topic-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white transition-all"
              data-testid="idea-tone-select"
            >
              {toneOptions.map(t => (
                <option key={t} value={t} className="bg-zinc-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generateIdeas}
          disabled={loading}
          className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
          data-testid="generate-ideas-button"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Generating Ideas...' : 'Generate Ideas'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" data-testid="ideas-error">
          {error}
        </div>
      )}

      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="ideas-list">
          {ideas.map((idea, index) => (
            <div
              key={index}
              className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6 hover:border-white/10 transition-all duration-200 hover:-translate-y-1"
              data-testid={`idea-card-${index}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent-violet/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 text-accent-violet" />
                </div>
                <h3 className="text-base font-heading font-semibold text-white leading-snug">{idea.title}</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{idea.description}</p>
              
              {idea.hashtags && idea.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {idea.hashtags.slice(0, 5).map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md">
                      <Hash className="w-3 h-3" />{tag.replace('#', '')}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {idea.best_time || 'Anytime'}
                </div>
                <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${engagementColor(idea.estimated_engagement)}`}>
                  <TrendingUp className="w-3 h-3" />
                  {idea.estimated_engagement || 'Medium'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && ideas.length === 0 && (
        <div className="text-center py-16" data-testid="ideas-empty-state">
          <Lightbulb className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-heading font-semibold text-zinc-400">No ideas yet</h3>
          <p className="text-sm text-zinc-600 mt-1">Select a platform and click generate to get AI-powered content ideas</p>
        </div>
      )}
    </div>
  );
}
