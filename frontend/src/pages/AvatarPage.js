import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Bot, Send, Loader2, Sparkles, Trash2, Image, Settings, MessageSquare } from 'lucide-react';

export default function AvatarPage() {
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('chat'); // chat | setup
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatPlatform, setChatPlatform] = useState('');
  const [sending, setSending] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  // Setup form
  const [formName, setFormName] = useState('');
  const [formVoice, setFormVoice] = useState('');
  const [formTone, setFormTone] = useState('professional');
  const [formIndustry, setFormIndustry] = useState('');
  const [formAudience, setFormAudience] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchAvatar();
    fetchChatHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchAvatar = async () => {
    try {
      const res = await api.get('/api/avatar');
      if (res.data) {
        setAvatar(res.data);
        setFormName(res.data.name || '');
        setFormVoice(res.data.brand_voice || '');
        setFormTone(res.data.tone || 'professional');
        setFormIndustry(res.data.industry || '');
        setFormAudience(res.data.target_audience || '');
        setFormKeywords((res.data.style_keywords || []).join(', '));
      }
    } catch (err) {
      // No avatar yet
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await api.get('/api/avatar/chat/history');
      const msgs = [];
      for (const item of res.data) {
        msgs.push({ role: 'user', content: item.user_message, time: item.created_at });
        msgs.push({ role: 'assistant', content: item.assistant_message, time: item.created_at });
      }
      setChatMessages(msgs);
    } catch (err) {
      // No history
    }
  };

  const handleSaveAvatar = async () => {
    if (!formName.trim() || !formVoice.trim()) {
      setFormError('Name and brand voice are required');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      name: formName,
      brand_voice: formVoice,
      tone: formTone,
      industry: formIndustry,
      target_audience: formAudience,
      style_keywords: formKeywords.split(',').map(k => k.trim()).filter(Boolean),
    };
    try {
      if (avatar) {
        const res = await api.put('/api/avatar', payload);
        setAvatar(res.data);
      } else {
        const res = await api.post('/api/avatar', payload);
        setAvatar(res.data);
      }
      setTab('chat');
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    try {
      const res = await api.post('/api/avatar/generate-image');
      setAvatar(prev => ({ ...prev, avatar_image: res.data.avatar_image }));
    } catch (err) {
      alert('Failed to generate avatar image');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || sending) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg, time: new Date().toISOString() }]);
    setSending(true);
    try {
      const res = await api.post('/api/avatar/chat', { message: userMsg, platform: chatPlatform });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.response, time: new Date().toISOString() }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', time: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return;
    try {
      await api.delete('/api/avatar/chat/history');
      setChatMessages([]);
    } catch (err) {
      console.error('Failed to clear history');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="avatar-loading">
        <div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="avatar-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">AI Avatar</h1>
          <p className="text-zinc-400 mt-1">Your AI-powered brand content creator</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'chat' ? 'bg-accent-violet/10 text-accent-violet' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
            data-testid="avatar-tab-chat"
          >
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
          <button
            onClick={() => setTab('setup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'setup' ? 'bg-accent-violet/10 text-accent-violet' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
            data-testid="avatar-tab-setup"
          >
            <Settings className="w-4 h-4" /> Setup
          </button>
        </div>
      </div>

      {tab === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="avatar-setup">
          <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6">
            <h3 className="text-lg font-heading font-semibold text-white mb-4">Avatar Identity</h3>
            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" data-testid="avatar-form-error">{formError}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Avatar Name</label>
                <input
                  type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
                  placeholder="e.g., BrandBot, CreativeAI" data-testid="avatar-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Tone</label>
                <select value={formTone} onChange={(e) => setFormTone(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white transition-all"
                  data-testid="avatar-tone-select"
                >
                  {['professional', 'casual', 'humorous', 'inspirational', 'bold', 'friendly', 'authoritative'].map(t => (
                    <option key={t} value={t} className="bg-zinc-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Brand Voice Description</label>
              <textarea value={formVoice} onChange={(e) => setFormVoice(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all resize-none"
                rows={3} placeholder="Describe your brand's personality and voice... e.g., 'Witty, tech-savvy, and approachable. Uses casual language with industry jargon.'"
                data-testid="avatar-voice-input"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Industry</label>
                <input type="text" value={formIndustry} onChange={(e) => setFormIndustry(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
                  placeholder="e.g., Technology, Fashion, Food" data-testid="avatar-industry-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Target Audience</label>
                <input type="text" value={formAudience} onChange={(e) => setFormAudience(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
                  placeholder="e.g., Young professionals, Gen Z" data-testid="avatar-audience-input"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Style Keywords (comma separated)</label>
              <input type="text" value={formKeywords} onChange={(e) => setFormKeywords(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
                placeholder="e.g., minimalist, colorful, techy, elegant" data-testid="avatar-keywords-input"
              />
            </div>
            <button onClick={handleSaveAvatar} disabled={saving}
              className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
              data-testid="save-avatar-button"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {avatar ? 'Update Avatar' : 'Create Avatar'}
            </button>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6 flex flex-col items-center" data-testid="avatar-image-section">
            <h3 className="text-lg font-heading font-semibold text-white mb-4 self-start">Avatar Image</h3>
            <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center mb-4 overflow-hidden bg-zinc-950/50">
              {avatar?.avatar_image ? (
                <img src={avatar.avatar_image} alt="Avatar" className="w-full h-full object-cover rounded-2xl" data-testid="avatar-image-display" />
              ) : (
                <Bot className="w-16 h-16 text-zinc-700" />
              )}
            </div>
            <button onClick={handleGenerateImage} disabled={!avatar || generatingImage}
              className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-white/20 transition-all duration-200 rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
              data-testid="generate-avatar-image-button"
            >
              {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
              {generatingImage ? 'Generating...' : 'Generate Image'}
            </button>
            {!avatar && <p className="text-xs text-zinc-600 mt-2">Create avatar first to generate image</p>}
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden" data-testid="avatar-chat">
          {!avatar ? (
            <div className="p-12 text-center">
              <Bot className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-heading font-semibold text-zinc-400 mb-2">No Avatar Created Yet</h3>
              <p className="text-sm text-zinc-600 mb-4">Set up your AI avatar first to start chatting</p>
              <button onClick={() => setTab('setup')}
                className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-6 py-2.5 transition-all"
                data-testid="go-to-setup-button"
              >Create Avatar</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-accent-violet/20 flex items-center justify-center">
                    {avatar.avatar_image ? (
                      <img src={avatar.avatar_image} alt={avatar.name} className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="w-5 h-5 text-accent-violet" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{avatar.name}</p>
                    <p className="text-xs text-zinc-500">{avatar.tone} voice</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={chatPlatform} onChange={(e) => setChatPlatform(e.target.value)}
                    className="bg-zinc-950/50 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white"
                    data-testid="chat-platform-select"
                  >
                    <option value="" className="bg-zinc-900">General</option>
                    <option value="facebook" className="bg-zinc-900">Facebook</option>
                    <option value="instagram" className="bg-zinc-900">Instagram</option>
                    <option value="twitter" className="bg-zinc-900">Twitter/X</option>
                    <option value="linkedin" className="bg-zinc-900">LinkedIn</option>
                    <option value="youtube" className="bg-zinc-900">YouTube</option>
                  </select>
                  <button onClick={handleClearHistory}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Clear history" data-testid="clear-chat-button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="h-[400px] overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Start chatting with {avatar.name} to create content</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {['Create an Instagram post about our new product', 'Write a LinkedIn article intro', 'Suggest 3 Twitter thread ideas'].map((suggestion, i) => (
                        <button key={i}
                          onClick={() => { setChatInput(suggestion); }}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors border border-white/5"
                          data-testid={`chat-suggestion-${i}`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-accent-violet text-white rounded-br-sm'
                        : 'bg-zinc-800 text-zinc-200 rounded-bl-sm border border-white/5'
                    }`} data-testid={`chat-message-${i}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 rounded-xl px-4 py-3 border border-white/5">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-white/5">
                <div className="flex gap-3">
                  <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all resize-none"
                    rows={1} placeholder={`Ask ${avatar.name} to create content...`}
                    data-testid="chat-input"
                  />
                  <button onClick={handleSendMessage} disabled={!chatInput.trim() || sending}
                    className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg px-4 py-2.5 transition-all disabled:opacity-50 flex items-center justify-center"
                    data-testid="chat-send-button"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
