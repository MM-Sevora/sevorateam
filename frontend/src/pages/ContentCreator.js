import React, { useState } from 'react';
import api from '../api';
import { Wand2, Image, Send, Copy, Loader2, Check, Download } from 'lucide-react';
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

export default function ContentCreator() {
  const [platform, setPlatform] = useState('instagram');
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

  const generateContent = async () => {
    if (!topic.trim()) return;
    setLoadingText(true);
    setError('');
    setGeneratedContent(null);
    try {
      const res = await api.post('/api/content/generate', { platform, topic, tone, content_type: contentType });
      setGeneratedContent(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate content');
    } finally {
      setLoadingText(false);
    }
  };

  const generateImage = async () => {
    const prompt = generatedContent?.image_prompt || topic;
    if (!prompt) return;
    setLoadingImage(true);
    try {
      const res = await api.post('/api/content/generate-image', { prompt, style: 'modern social media' });
      setGeneratedImage(res.data.image_data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate image');
    } finally {
      setLoadingImage(false);
    }
  };

  const copyContent = () => {
    if (generatedContent?.content) {
      navigator.clipboard.writeText(generatedContent.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const saveAsPost = async (status = 'draft') => {
    if (!generatedContent?.content) return;
    setSavingPost(true);
    try {
      await api.post('/api/posts', {
        platform,
        content: generatedContent.content,
        image_url: generatedImage || '',
        status,
      });
      alert(`Post saved as ${status}!`);
    } catch (err) {
      setError('Failed to save post');
    } finally {
      setSavingPost(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="content-creator-page">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Content Creator</h1>
        <p className="text-zinc-400 mt-1">Create AI-powered content with text and images</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-4">
          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="creator-config">
            <h3 className="text-lg font-heading font-semibold text-white mb-4">Configuration</h3>

            <div className="mb-4">
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
                    data-testid={`creator-platform-${p.value}`}
                  >
                    <p.icon className="w-4 h-4" style={{ color: platform === p.value ? p.color : undefined }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Topic</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all resize-none"
                rows={3}
                placeholder="Describe what you want to post about..."
                data-testid="creator-topic-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-2.5 px-4 text-sm text-white transition-all"
                  data-testid="creator-tone-select"
                >
                  {toneOptions.map(t => (
                    <option key={t} value={t} className="bg-zinc-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-2.5 px-4 text-sm text-white transition-all"
                  data-testid="creator-type-select"
                >
                  {contentTypes.map(t => (
                    <option key={t} value={t} className="bg-zinc-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={generateContent}
                disabled={loadingText || !topic.trim()}
                className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
                data-testid="generate-content-button"
              >
                {loadingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {loadingText ? 'Generating...' : 'Generate Text'}
              </button>
              <button
                onClick={generateImage}
                disabled={loadingImage || (!generatedContent?.image_prompt && !topic.trim())}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-white/20 transition-all duration-200 rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
                data-testid="generate-image-button"
              >
                {loadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                {loadingImage ? 'Generating...' : 'Generate Image'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" data-testid="creator-error">
              {error}
            </div>
          )}

          {generatedContent && (
            <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="generated-content-preview">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-semibold text-white">Generated Content</h3>
                <button
                  onClick={copyContent}
                  className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                  data-testid="copy-content-button"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5 mb-4">
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed" data-testid="generated-text">
                  {generatedContent.content}
                </p>
              </div>
              {generatedContent.hashtags && generatedContent.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {generatedContent.hashtags.map((tag, i) => (
                    <span key={i} className="text-xs bg-accent-violet/10 text-accent-violet px-2 py-1 rounded-md">
                      #{tag.replace('#', '')}
                    </span>
                  ))}
                </div>
              )}
              {generatedContent.call_to_action && (
                <p className="text-xs text-zinc-500 mb-4">
                  <span className="text-zinc-400 font-medium">CTA:</span> {generatedContent.call_to_action}
                </p>
              )}
            </div>
          )}

          {generatedImage && (
            <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6" data-testid="generated-image-preview">
              <h3 className="text-lg font-heading font-semibold text-white mb-4">Generated Image</h3>
              <img
                src={generatedImage}
                alt="AI Generated"
                className="w-full rounded-lg border border-white/5"
                data-testid="generated-image"
              />
            </div>
          )}

          {generatedContent && (
            <div className="flex gap-3">
              <button
                onClick={() => saveAsPost('draft')}
                disabled={savingPost}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-white/20 transition-all duration-200 rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
                data-testid="save-draft-button"
              >
                <Download className="w-4 h-4" />
                Save as Draft
              </button>
              <button
                onClick={() => saveAsPost('scheduled')}
                disabled={savingPost}
                className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all duration-300 rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
                data-testid="schedule-post-button"
              >
                <Send className="w-4 h-4" />
                Schedule Post
              </button>
            </div>
          )}

          {!generatedContent && !loadingText && (
            <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-12 text-center" data-testid="creator-empty-state">
              <Wand2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-heading font-semibold text-zinc-400">No content generated yet</h3>
              <p className="text-sm text-zinc-600 mt-1">Enter a topic and click Generate to create content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
