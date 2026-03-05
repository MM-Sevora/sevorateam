import React, { useState } from 'react';
import api from '../api';
import { BarChart3, TrendingUp, Clock, Loader2, Sparkles, Target, Zap, AlertTriangle } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const platformOptions = [
  { value: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2' },
  { value: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E4405F' },
  { value: 'twitter', label: 'Twitter/X', icon: FaTwitter, color: '#1DA1F2' },
  { value: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2' },
  { value: 'youtube', label: 'YouTube', icon: FaYoutube, color: '#FF0000' },
];

function ScoreGauge({ score, label, size = 'lg' }) {
  const getColor = (s) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    if (s >= 40) return '#f97316';
    return '#ef4444';
  };
  const color = getColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${size === 'lg' ? 'w-32 h-32' : 'w-20 h-20'}`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-heading font-bold text-white ${size === 'lg' ? 'text-3xl' : 'text-lg'}`}>{score}</span>
        </div>
      </div>
      <p className={`font-medium mt-2 ${size === 'lg' ? 'text-sm text-zinc-300' : 'text-xs text-zinc-400'}`}>{label}</p>
    </div>
  );
}

export default function PerformancePredictor() {
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [hashtags, setHashtags] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [bestTimes, setBestTimes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [error, setError] = useState('');

  const handlePredict = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    setPrediction(null);
    try {
      const res = await api.post('/api/predict/performance', {
        content,
        platform,
        scheduled_time: scheduledTime,
        hashtags: hashtags.split(',').map(h => h.trim()).filter(Boolean),
      });
      setPrediction(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to predict performance');
    } finally {
      setLoading(false);
    }
  };

  const handleGetBestTimes = async () => {
    setLoadingTimes(true);
    try {
      const res = await api.get(`/api/predict/best-times/${platform}`);
      setBestTimes(res.data);
    } catch (err) {
      setError('Failed to load best posting times');
    } finally {
      setLoadingTimes(false);
    }
  };

  const viralityColor = (v) => {
    const level = v?.toLowerCase();
    if (level === 'very high') return 'text-emerald-400 bg-emerald-500/10';
    if (level === 'high') return 'text-blue-400 bg-blue-500/10';
    if (level === 'medium') return 'text-amber-400 bg-amber-500/10';
    return 'text-zinc-400 bg-zinc-500/10';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="predictor-page">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Performance Predictor</h1>
        <p className="text-zinc-400 mt-1">AI-powered engagement prediction and posting time optimization</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="predictor-input">
            <h3 className="text-lg font-heading font-semibold text-white mb-4">Analyze Content</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Platform</label>
              <div className="flex gap-2 flex-wrap">
                {platformOptions.map(p => (
                  <button key={p.value} onClick={() => { setPlatform(p.value); setBestTimes(null); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border ${
                      platform === p.value ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                    data-testid={`predict-platform-${p.value}`}
                  >
                    <p.icon className="w-4 h-4" style={{ color: platform === p.value ? p.color : undefined }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Post Content</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all resize-none"
                rows={5} placeholder="Paste or type the content you want to predict..."
                data-testid="predict-content-input"
              />
              <p className="text-xs text-zinc-600 mt-1">{content.length} characters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Hashtags (comma separated)</label>
                <input type="text" value={hashtags} onChange={(e) => setHashtags(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
                  placeholder="#marketing, #social" data-testid="predict-hashtags-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Planned Posting Time</label>
                <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white transition-all"
                  data-testid="predict-time-input"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handlePredict} disabled={loading || !content.trim()}
                className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
                data-testid="predict-button"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                {loading ? 'Analyzing...' : 'Predict Performance'}
              </button>
              <button onClick={handleGetBestTimes} disabled={loadingTimes}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-white/20 transition-all duration-200 rounded-lg font-medium px-5 py-2.5 flex items-center gap-2 disabled:opacity-50"
                data-testid="best-times-button"
              >
                {loadingTimes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                Best Times
              </button>
            </div>
          </div>

          {bestTimes && (
            <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6 animate-slide-up" data-testid="best-times-result">
              <h3 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent-cyan" /> Best Posting Times
              </h3>
              <p className="text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg mb-4">{bestTimes.recommendation}</p>
              <div className="space-y-2">
                {bestTimes.top_5_times?.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-accent-violet bg-accent-violet/10 w-6 h-6 rounded-full flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm text-white">{t.day} at {t.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-accent-violet" style={{ width: `${t.engagement_score * 10}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400">{t.engagement_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" data-testid="predictor-error">{error}</div>
          )}

          {prediction ? (
            <>
              <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6 animate-slide-up" data-testid="prediction-scores">
                <h3 className="text-lg font-heading font-semibold text-white mb-6">Prediction Results</h3>
                <div className="flex justify-center gap-8 mb-6">
                  <ScoreGauge score={prediction.engagement_score || 0} label="Engagement" />
                  <ScoreGauge score={prediction.content_score || 0} label="Content Quality" />
                  <ScoreGauge score={prediction.hashtag_effectiveness || 0} label="Hashtags" size="sm" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-zinc-300">Virality Potential:</span>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${viralityColor(prediction.virality_potential)}`}>
                    {prediction.virality_potential}
                  </span>
                </div>
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6 animate-slide-up" data-testid="prediction-metrics"
                style={{ animationDelay: '100ms' }}>
                <h3 className="text-base font-heading font-semibold text-white mb-4">Predicted Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Likes', value: prediction.predicted_likes, color: '#ec4899' },
                    { label: 'Comments', value: prediction.predicted_comments, color: '#06b6d4' },
                    { label: 'Shares', value: prediction.predicted_shares, color: '#f97316' },
                    { label: 'Reach', value: prediction.predicted_reach, color: '#7c3aed' },
                  ].map(m => (
                    <div key={m.label} className="bg-zinc-950/50 rounded-lg p-3 border border-white/5">
                      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{m.label}</p>
                      <p className="text-lg font-heading font-bold" style={{ color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 p-3 bg-zinc-950/50 rounded-lg border border-white/5">
                  <Clock className="w-4 h-4 text-accent-violet flex-shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-500">Best time to post</p>
                    <p className="text-sm text-white font-medium">{prediction.best_time} ({prediction.best_day})</p>
                  </div>
                </div>
              </div>

              {prediction.suggestions && prediction.suggestions.length > 0 && (
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6 animate-slide-up" data-testid="prediction-suggestions"
                  style={{ animationDelay: '200ms' }}>
                  <h3 className="text-base font-heading font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-accent-cyan" /> Improvement Suggestions
                  </h3>
                  <div className="space-y-2">
                    {prediction.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-zinc-950/50 rounded-lg border border-white/5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-zinc-300">{s}</p>
                      </div>
                    ))}
                  </div>
                  {prediction.competitor_benchmark && (
                    <div className="mt-4 p-3 bg-accent-violet/5 rounded-lg border border-accent-violet/10">
                      <p className="text-xs text-zinc-500 mb-1">Competitor Benchmark</p>
                      <p className="text-sm text-zinc-300">{prediction.competitor_benchmark}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : !loading && (
            <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-12 text-center" data-testid="predictor-empty-state">
              <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-heading font-semibold text-zinc-400">No prediction yet</h3>
              <p className="text-sm text-zinc-600 mt-1">Enter your content and click Predict to see performance analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
