import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link2, Unlink, Plus, Loader2 } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const allPlatforms = [
  { value: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2', desc: 'Connect your Facebook Page' },
  { value: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E4405F', desc: 'Connect your Instagram Business' },
  { value: 'twitter', label: 'Twitter/X', icon: FaTwitter, color: '#1DA1F2', desc: 'Connect your Twitter account' },
  { value: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2', desc: 'Connect your LinkedIn Page' },
  { value: 'youtube', label: 'YouTube', icon: FaYoutube, color: '#FF0000', desc: 'Connect your YouTube Channel' },
];

export default function Platforms() {
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState('');
  const [showConnect, setShowConnect] = useState(false);
  const [pageName, setPageName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await api.get('/api/platforms');
      setConnected(res.data);
    } catch (err) {
      console.error('Failed to fetch platforms');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedPlatform || !pageName.trim()) return;
    setConnecting(selectedPlatform);
    try {
      const res = await api.post('/api/platforms/connect', {
        platform: selectedPlatform,
        page_name: pageName,
      });
      setConnected(prev => [...prev, res.data]);
      setShowConnect(false);
      setPageName('');
      setSelectedPlatform('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to connect');
    } finally {
      setConnecting('');
    }
  };

  const handleDisconnect = async (platformId) => {
    if (!window.confirm('Disconnect this platform?')) return;
    try {
      await api.delete(`/api/platforms/${platformId}`);
      setConnected(prev => prev.filter(p => p.platform_id !== platformId));
    } catch (err) {
      console.error('Failed to disconnect');
    }
  };

  const connectedNames = connected.map(c => c.platform);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="platforms-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Platforms</h1>
          <p className="text-zinc-400 mt-1">Manage your connected social media accounts</p>
        </div>
        <button
          onClick={() => setShowConnect(!showConnect)}
          className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 rounded-lg font-medium px-5 py-2.5 flex items-center gap-2"
          data-testid="connect-platform-button"
        >
          <Plus className="w-4 h-4" />
          Connect Platform
        </button>
      </div>

      {showConnect && (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-6 animate-slide-up" data-testid="connect-platform-form">
          <h3 className="text-lg font-heading font-semibold text-white mb-4">Connect a Platform</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Platform</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allPlatforms.filter(p => !connectedNames.includes(p.value)).map(p => (
                  <button
                    key={p.value}
                    onClick={() => setSelectedPlatform(p.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all border ${
                      selectedPlatform === p.value
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                    data-testid={`select-platform-${p.value}`}
                  >
                    <p.icon className="w-4 h-4" style={{ color: selectedPlatform === p.value ? p.color : undefined }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Page/Account Name</label>
              <input
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
                placeholder="e.g., MyBrand Official"
                data-testid="platform-name-input"
              />
            </div>
          </div>
          <button
            onClick={handleConnect}
            disabled={!selectedPlatform || !pageName.trim() || !!connecting}
            className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 transition-all"
            data-testid="confirm-connect-button"
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12" data-testid="platforms-loading">
          <div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="platforms-grid">
          {allPlatforms.map(p => {
            const conn = connected.find(c => c.platform === p.value);
            const isConnected = !!conn;
            return (
              <div
                key={p.value}
                className={`bg-zinc-900/50 backdrop-blur-md border rounded-xl p-6 transition-all duration-200 ${
                  isConnected ? 'border-white/10' : 'border-white/5 opacity-60'
                }`}
                data-testid={`platform-card-${p.value}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.color}20` }}>
                    <p.icon className="w-6 h-6" style={{ color: p.color }} />
                  </div>
                  {isConnected && (
                    <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Connected
                    </span>
                  )}
                </div>
                <h3 className="text-base font-heading font-semibold text-white mb-1">{p.label}</h3>
                <p className="text-sm text-zinc-500 mb-4">
                  {isConnected ? conn.page_name : p.desc}
                </p>
                {isConnected && (
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-xs text-zinc-500">
                      Connected {new Date(conn.connected_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDisconnect(conn.platform_id)}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                      data-testid={`disconnect-${p.value}`}
                    >
                      <Unlink className="w-3 h-3" /> Disconnect
                    </button>
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
