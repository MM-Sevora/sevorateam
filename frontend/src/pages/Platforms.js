import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Unlink, Plus, Loader2, Shield, ExternalLink, ChevronDown, ChevronUp,
  BarChart3, Key, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle,
  BookOpen, Copy, Check, RefreshCw, Globe, Zap, ArrowRight, Users, Heart, MessageSquare
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const platformMeta = {
  facebook: { icon: FaFacebook, color: '#1877F2', gradient: 'from-blue-600/20 to-blue-900/5' },
  instagram: { icon: FaInstagram, color: '#E4405F', gradient: 'from-pink-600/20 to-purple-900/5' },
  twitter: { icon: FaTwitter, color: '#1DA1F2', gradient: 'from-sky-600/20 to-sky-900/5' },
  linkedin: { icon: FaLinkedin, color: '#0A66C2', gradient: 'from-blue-700/20 to-blue-950/5' },
  youtube: { icon: FaYoutube, color: '#FF0000', gradient: 'from-red-600/20 to-red-900/5' },
};

function formatNum(n) {
  if (!n || n === 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function Platforms() {
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemas, setSchemas] = useState({});
  const [showConnect, setShowConnect] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [connectStep, setConnectStep] = useState('select');
  const [credentialInputs, setCredentialInputs] = useState({});
  const [pageName, setPageName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [error, setError] = useState('');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const [oauthRedirectUri, setOauthRedirectUri] = useState('');
  const [expandedPanel, setExpandedPanel] = useState({});
  const [insights, setInsights] = useState({});
  const [savedCreds, setSavedCreds] = useState({});
  const [loadingInsights, setLoadingInsights] = useState('');
  const [loadingCreds, setLoadingCreds] = useState('');
  const [testing, setTesting] = useState('');
  const [testResult, setTestResult] = useState({});
  const [editCreds, setEditCreds] = useState({});
  const [savingCreds, setSavingCreds] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => { fetchPlatforms(); fetchSchemas(); }, []);

  const fetchPlatforms = async () => {
    try { const res = await api.get('/api/platforms'); setConnected(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  const fetchSchemas = async () => {
    try { const res = await api.get('/api/platforms/credential-schemas'); setSchemas(res.data); }
    catch (err) { console.error(err); }
  };

  const connectedNames = connected.map(c => c.platform);
  const schema = schemas[selectedPlatform];
  const connectedCount = connected.length;

  const handleSelectPlatform = (pval) => { setSelectedPlatform(pval); setCredentialInputs({}); setPageName(''); setError(''); setConnectStep('credentials'); };
  const handleCredentialChange = (key, value) => { setCredentialInputs(prev => ({ ...prev, [key]: value })); };
  const toggleShowPassword = (key) => { setShowPasswords(prev => ({ ...prev, [key]: !prev[key] })); };

  const handleSaveCredentials = async () => {
    if (!selectedPlatform || !schema) return;
    const requiredKeys = schema.required_fields.filter(f => f.required !== false && !f.label.toLowerCase().includes('optional')).map(f => f.key);
    const missing = requiredKeys.filter(k => !credentialInputs[k]?.trim());
    if (missing.length > 0) { setError(`Please fill in: ${missing.join(', ')}`); return; }
    setSaving(true); setError('');
    try {
      await api.post('/api/platforms/credentials', { platform: selectedPlatform, credentials: credentialInputs, page_name: pageName || `My ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}` });
      await fetchPlatforms(); setShowConnect(false); setConnectStep('select'); setSelectedPlatform(''); setCredentialInputs({});
    } catch (err) { setError(err.response?.data?.detail || 'Failed to save credentials'); }
    finally { setSaving(false); }
  };

  const handleStartOAuth = async () => {
    if (!selectedPlatform || !oauthClientId.trim()) { setError('Client ID is required'); return; }
    setOauthLoading(true); setError('');
    try {
      const res = await api.post('/api/platforms/oauth/start', { platform: selectedPlatform, client_id: oauthClientId, client_secret: oauthClientSecret });
      setOauthUrl(res.data.oauth_url); setOauthRedirectUri(res.data.redirect_uri);
      const handler = async (event) => {
        if (event.data?.type === 'oauth_success') { window.removeEventListener('message', handler); await fetchPlatforms(); setShowConnect(false); setConnectStep('select'); }
        else if (event.data?.type === 'oauth_error') { window.removeEventListener('message', handler); setError(`OAuth error: ${event.data.error}`); }
      };
      window.addEventListener('message', handler);
      window.open(res.data.oauth_url, 'oauth_popup', 'width=600,height=700,left=300,top=100');
    } catch (err) { setError(err.response?.data?.detail || 'Failed to start OAuth'); }
    finally { setOauthLoading(false); }
  };

  const handleTogglePanel = async (platformId, panel) => {
    if (expandedPanel[platformId] === panel) { setExpandedPanel(prev => ({ ...prev, [platformId]: '' })); return; }
    setExpandedPanel(prev => ({ ...prev, [platformId]: panel }));
    if (panel === 'insights' && !insights[platformId]) {
      setLoadingInsights(platformId);
      try { const res = await api.get(`/api/platforms/${platformId}/insights`); setInsights(prev => ({ ...prev, [platformId]: res.data })); }
      catch (err) { console.error(err); } finally { setLoadingInsights(''); }
    }
    if (panel === 'credentials' && !savedCreds[platformId]) {
      setLoadingCreds(platformId);
      try {
        const res = await api.get(`/api/platforms/${platformId}/credentials`);
        setSavedCreds(prev => ({ ...prev, [platformId]: res.data }));
        if (res.data.has_credentials) { const ef = {}; Object.keys(res.data.credentials).forEach(k => { ef[k] = ''; }); setEditCreds(prev => ({ ...prev, [platformId]: ef })); }
      } catch (err) { console.error(err); } finally { setLoadingCreds(''); }
    }
  };

  const handleTestConnection = async (platformId) => {
    setTesting(platformId); setTestResult(prev => ({ ...prev, [platformId]: null }));
    try { const res = await api.post(`/api/platforms/${platformId}/test-connection`); setTestResult(prev => ({ ...prev, [platformId]: res.data })); }
    catch (err) { setTestResult(prev => ({ ...prev, [platformId]: { status: 'error', message: err.response?.data?.detail || 'Test failed' } })); }
    finally { setTesting(''); }
  };

  const handleUpdateCredentials = async (platformId) => {
    const creds = editCreds[platformId]; if (!creds) return;
    setSavingCreds(platformId);
    try { await api.put(`/api/platforms/${platformId}/credentials`, { credentials: creds }); const res = await api.get(`/api/platforms/${platformId}/credentials`); setSavedCreds(prev => ({ ...prev, [platformId]: res.data })); const ef = {}; Object.keys(res.data.credentials).forEach(k => { ef[k] = ''; }); setEditCreds(prev => ({ ...prev, [platformId]: ef })); }
    catch (err) { console.error(err); } finally { setSavingCreds(''); }
  };

  const handleDisconnect = async (platformId) => {
    if (!window.confirm('Disconnect this platform and remove all credentials?')) return;
    try { await api.delete(`/api/platforms/${platformId}`); setConnected(prev => prev.filter(p => p.platform_id !== platformId)); setInsights(prev => { const n = { ...prev }; delete n[platformId]; return n; }); setSavedCreds(prev => { const n = { ...prev }; delete n[platformId]; return n; }); }
    catch (err) { console.error(err); }
  };

  const handleCopy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-fade-in" data-testid="platforms-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Platform Integrations</h1>
          <p className="text-zinc-400 mt-1">Connect, authorize, and manage your social media accounts</p>
        </div>
        <button onClick={() => { setShowConnect(!showConnect); setConnectStep('select'); setError(''); setOauthUrl(''); }}
          className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 rounded-lg font-medium px-5 py-2.5 flex items-center gap-2"
          data-testid="connect-platform-button"
        ><Plus className="w-4 h-4" /> Connect Platform</button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Globe className="w-4 h-4 text-accent-violet" /><span className="text-xs text-zinc-500 uppercase tracking-wide">Connected</span></div>
          <p className="text-2xl font-heading font-bold text-white">{connectedCount}<span className="text-sm text-zinc-500 font-normal ml-1">/ 5</span></p>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Key className="w-4 h-4 text-emerald-400" /><span className="text-xs text-zinc-500 uppercase tracking-wide">API Keys</span></div>
          <p className="text-2xl font-heading font-bold text-emerald-400">{connected.filter(c => c.has_api_credentials).length}</p>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-amber-400" /><span className="text-xs text-zinc-500 uppercase tracking-wide">Live Data</span></div>
          <p className="text-2xl font-heading font-bold text-amber-400">{connected.filter(c => c.has_api_credentials && ['youtube', 'linkedin'].includes(c.platform)).length}</p>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-accent-cyan" /><span className="text-xs text-zinc-500 uppercase tracking-wide">OAuth</span></div>
          <p className="text-2xl font-heading font-bold text-accent-cyan">{connected.filter(c => c.scopes?.length > 0).length}</p>
        </div>
      </div>

      {/* Connect Panel */}
      {showConnect && (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden animate-slide-up" data-testid="connect-platform-form">
          {connectStep === 'select' && (
            <div className="p-6">
              <h3 className="text-lg font-heading font-semibold text-white mb-2">Choose a Platform</h3>
              <p className="text-sm text-zinc-400 mb-5">Select a platform to connect via API credentials or OAuth</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(schemas).filter(([key]) => !connectedNames.includes(key)).map(([key, s]) => {
                  const meta = platformMeta[key]; const Icon = meta?.icon;
                  return (
                    <button key={key} onClick={() => handleSelectPlatform(key)}
                      className={`relative flex flex-col items-center gap-3 p-5 rounded-xl text-center transition-all border border-white/5 hover:border-white/15 bg-gradient-to-b ${meta?.gradient} hover:-translate-y-1`}
                      data-testid={`select-platform-${key}`}
                    >
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${meta?.color}25` }}>
                        {Icon && <Icon className="w-7 h-7" style={{ color: meta?.color }} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{s.display_name}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">{s.required_fields.filter(f => f.required !== false).length} keys needed</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600 absolute top-3 right-3" />
                    </button>
                  );
                })}
              </div>
              {Object.entries(schemas).filter(([key]) => !connectedNames.includes(key)).length === 0 && (
                <div className="text-center py-8"><CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-zinc-400">All platforms connected!</p></div>
              )}
            </div>
          )}

          {(connectStep === 'credentials' || connectStep === 'oauth') && schema && (
            <div>
              {/* Tabs */}
              <div className="flex border-b border-white/5">
                <button onClick={() => setConnectStep('credentials')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-all ${connectStep === 'credentials' ? 'text-accent-violet border-b-2 border-accent-violet bg-accent-violet/5' : 'text-zinc-500 hover:text-zinc-300'}`}
                  data-testid="tab-manual-creds"
                ><Key className="w-4 h-4" /> Manual API Keys</button>
                <button onClick={() => setConnectStep('oauth')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-all ${connectStep === 'oauth' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5' : 'text-zinc-500 hover:text-zinc-300'}`}
                  data-testid="tab-oauth-connect"
                ><Shield className="w-4 h-4" /> Connect via OAuth</button>
              </div>

              {connectStep === 'credentials' && (
                <div className="flex flex-col lg:flex-row">
                  <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-white/5">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${platformMeta[selectedPlatform]?.color}20` }}>
                        {platformMeta[selectedPlatform]?.icon && React.createElement(platformMeta[selectedPlatform].icon, { className: "w-5 h-5", style: { color: platformMeta[selectedPlatform]?.color } })}
                      </div>
                      <div>
                        <h3 className="text-lg font-heading font-semibold text-white">{schema.display_name}</h3>
                        <p className="text-xs text-zinc-500">Enter your API credentials</p>
                      </div>
                    </div>
                    {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Page / Account Name</label>
                      <input type="text" value={pageName} onChange={(e) => setPageName(e.target.value)} className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all" placeholder="e.g., MyBrand Official" data-testid="cred-page-name-input" />
                    </div>
                    <div className="space-y-3">
                      {schema.required_fields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">{field.label} {field.required === false && <span className="text-zinc-600">(optional)</span>}</label>
                          <div className="relative">
                            <input type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'} value={credentialInputs[field.key] || ''} onChange={(e) => handleCredentialChange(field.key, e.target.value)} className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2 px-3 pr-10 text-sm text-white placeholder-zinc-600 transition-all font-mono" placeholder={field.placeholder} data-testid={`cred-input-${field.key}`} />
                            {field.type === 'password' && <button type="button" onClick={() => toggleShowPassword(field.key)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">{showPasswords[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => { setConnectStep('select'); setError(''); }} className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg font-medium px-5 py-2.5 text-sm transition-all">Back</button>
                      <button onClick={handleSaveCredentials} disabled={saving} className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] rounded-lg font-medium px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 transition-all" data-testid="save-credentials-button">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />} {saving ? 'Saving...' : 'Save & Connect'}
                      </button>
                    </div>
                  </div>
                  <div className="w-full lg:w-96 p-6 bg-zinc-950/30" data-testid="setup-guide-panel">
                    <div className="flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4 text-accent-cyan" /><h4 className="text-sm font-heading font-semibold text-white">Setup Guide</h4></div>
                    <ol className="space-y-2.5 mb-4">
                      {schema.guide.steps.map((step, i) => (
                        <li key={i} className="flex gap-2.5 text-xs text-zinc-400 leading-relaxed">
                          <span className="w-5 h-5 rounded-full bg-accent-violet/10 text-accent-violet text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <a href={schema.guide.docs_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-accent-violet hover:text-accent-violet-hover transition-colors"><ExternalLink className="w-3 h-3" /> Official Documentation</a>
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-xs text-zinc-500 mb-2 font-medium">Required Permissions:</p>
                      <div className="flex flex-wrap gap-1">{schema.guide.permissions.map((p, i) => <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md font-mono">{p}</span>)}</div>
                    </div>
                  </div>
                </div>
              )}

              {connectStep === 'oauth' && (
                <div className="p-6">
                  {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
                  <div className="bg-zinc-950/50 rounded-lg p-5 border border-white/5 mb-4">
                    <p className="text-sm text-zinc-300 mb-4">Enter your app credentials to authorize via OAuth:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Client ID / App ID</label><input type="text" value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-2.5 px-4 text-sm text-white font-mono placeholder-zinc-600 transition-all" placeholder="Enter Client ID" data-testid="oauth-client-id-input" /></div>
                      <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Client Secret</label><input type={showPasswords['oauth_secret'] ? 'text' : 'password'} value={oauthClientSecret} onChange={(e) => setOauthClientSecret(e.target.value)} className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-2.5 px-4 text-sm text-white font-mono placeholder-zinc-600 transition-all" placeholder="Enter Client Secret" data-testid="oauth-client-secret-input" /></div>
                    </div>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 mb-5">
                    <p className="text-xs text-amber-400 font-medium mb-1">Add this Redirect URI to your app settings first:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-[10px] text-zinc-300 bg-zinc-900 px-2 py-1 rounded font-mono flex-1 truncate">{oauthRedirectUri || `${window.location.origin}/api/platforms/oauth/redirect`}</code>
                      <button onClick={() => handleCopy(oauthRedirectUri || `${window.location.origin}/api/platforms/oauth/redirect`, 'redirect_uri')} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex-shrink-0">{copied === 'redirect_uri' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}</button>
                    </div>
                  </div>
                  {oauthUrl && (
                    <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                      <p className="font-medium">OAuth popup opened! Complete authorization in the popup window.</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => { setConnectStep('select'); setError(''); setOauthUrl(''); }} className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg font-medium px-5 py-2.5 text-sm transition-all">Back</button>
                    <button onClick={handleStartOAuth} disabled={oauthLoading || !oauthClientId.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 transition-all" data-testid="start-oauth-button">
                      {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Authorize with {schema?.display_name || selectedPlatform}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connected Platforms */}
      {connected.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-heading font-semibold text-zinc-400 uppercase tracking-wider">Connected Platforms</h2>
          {connected.map(conn => {
            const pkey = conn.platform;
            const meta = platformMeta[pkey];
            const Icon = meta?.icon;
            const panelState = expandedPanel[conn.platform_id];
            const pInsights = insights[conn.platform_id];
            const pCreds = savedCreds[conn.platform_id];
            const pTest = testResult[conn.platform_id];

            return (
              <div key={conn.platform_id} className={`bg-gradient-to-r ${meta?.gradient} backdrop-blur-md border border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:border-white/15`} data-testid={`platform-card-${pkey}`}>
                <div className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta?.color}20`, boxShadow: `0 0 20px ${meta?.color}15` }}>
                    {Icon && <Icon className="w-7 h-7" style={{ color: meta?.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-heading font-bold text-white">{schemas[pkey]?.display_name || pkey}</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                      </span>
                      {conn.has_api_credentials && <span className="text-[10px] bg-accent-violet/15 text-accent-violet px-2 py-0.5 rounded-full border border-accent-violet/20"><Key className="w-2.5 h-2.5 inline mr-0.5" />API</span>}
                    </div>
                    <p className="text-sm text-zinc-400 mt-0.5">{conn.page_name}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Connected {new Date(conn.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleTogglePanel(conn.platform_id, 'insights')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${panelState === 'insights' ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border-white/5'}`}
                      data-testid={`insights-toggle-${pkey}`}
                    ><BarChart3 className="w-3.5 h-3.5" /> Insights {panelState === 'insights' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button>
                    <button onClick={() => handleTogglePanel(conn.platform_id, 'credentials')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${panelState === 'credentials' ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border-white/5'}`}
                      data-testid={`credentials-toggle-${pkey}`}
                    ><Key className="w-3.5 h-3.5" /> Keys</button>
                    <button onClick={() => handleDisconnect(conn.platform_id)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors" data-testid={`disconnect-${pkey}`}><Unlink className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Insights Panel */}
                {panelState === 'insights' && (
                  <div className="border-t border-white/5 p-5 bg-zinc-950/30 animate-slide-up" data-testid={`insights-panel-${pkey}`}>
                    {loadingInsights === conn.platform_id ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-accent-violet animate-spin" /></div>
                    ) : pInsights ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {pInsights.thumbnail && <img src={pInsights.thumbnail} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />}
                            <div>
                              <p className="text-sm font-medium text-white">{pInsights.page_name}</p>
                              {pInsights.account?.organization_description && <p className="text-[10px] text-zinc-500 max-w-md truncate">{pInsights.account.organization_description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {pInsights.is_simulated ? (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Simulated</span>
                            ) : (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Live API</span>
                            )}
                            {(pInsights.channel_url || pInsights.profile_url) && (
                              <a href={pInsights.channel_url || pInsights.profile_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent-violet flex items-center gap-1 hover:text-accent-violet-hover"><ExternalLink className="w-3 h-3" /> View</a>
                            )}
                          </div>
                        </div>

                        <div className={`grid gap-3 ${pInsights.overview?.total_views !== undefined ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
                          {[
                            { label: pkey === 'youtube' ? 'Subscribers' : 'Followers', value: formatNum(pInsights.overview?.followers), icon: Users, color: meta?.color },
                            ...(pInsights.overview?.total_views !== undefined ? [{ label: 'Total Views', value: formatNum(pInsights.overview.total_views), icon: Eye, color: '#3b82f6' }] : []),
                            { label: 'Engagement', value: `${pInsights.overview?.avg_engagement_rate || 0}%`, icon: Zap, color: '#10b981' },
                            { label: 'Likes', value: formatNum(pInsights.engagement?.total_likes), icon: Heart, color: '#ec4899' },
                            { label: pkey === 'youtube' ? 'Comments' : 'Activity', value: formatNum(pkey === 'youtube' ? pInsights.engagement?.total_comments : pInsights.engagement?.total_shares), icon: MessageSquare, color: '#f97316' },
                          ].map(m => (
                            <div key={m.label} className="bg-zinc-900/60 rounded-xl p-4 border border-white/5">
                              <div className="flex items-center gap-1.5 mb-2"><m.icon className="w-3.5 h-3.5" style={{ color: m.color }} /><span className="text-[10px] text-zinc-500 uppercase tracking-wider">{m.label}</span></div>
                              <p className="text-xl font-heading font-bold" style={{ color: m.color }}>{m.value}</p>
                            </div>
                          ))}
                        </div>

                        {pInsights.capabilities && (
                          <div className="bg-zinc-900/60 rounded-xl p-4 border border-white/5">
                            <h4 className="text-xs font-semibold text-zinc-300 mb-3 uppercase tracking-wider">API Capabilities</h4>
                            <div className="flex flex-wrap gap-2">
                              {pInsights.capabilities.map((cap, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/10">
                                  <CheckCircle className="w-3 h-3" /> {cap}
                                </span>
                              ))}
                            </div>
                            {pInsights.overview?.note && <p className="text-[10px] text-zinc-500 mt-3">{pInsights.overview.note}</p>}
                          </div>
                        )}

                        {pInsights.top_posts?.length > 0 && (
                          <div className="bg-zinc-900/60 rounded-xl p-4 border border-white/5">
                            <h4 className="text-xs font-semibold text-zinc-300 mb-3 uppercase tracking-wider">{pkey === 'youtube' ? 'Top Videos' : 'Recent Posts'}</h4>
                            <div className="space-y-2">
                              {pInsights.top_posts.map((post, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 bg-zinc-950/50 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                  <div className="flex-1 min-w-0 mr-3">
                                    {post.url ? <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-300 hover:text-white truncate block">{post.content}</a> : <span className="text-xs text-zinc-300 truncate block">{post.content}</span>}
                                    {post.date && <span className="text-[10px] text-zinc-600">{post.date}</span>}
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 flex-shrink-0">
                                    {post.views !== undefined && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNum(post.views)}</span>}
                                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNum(post.likes)}</span>
                                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{formatNum(post.comments)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {pInsights.audience?.top_countries?.[0]?.percentage > 0 && (
                            <div className="bg-zinc-900/60 rounded-xl p-4 border border-white/5">
                              <h4 className="text-xs font-semibold text-zinc-300 mb-3 uppercase tracking-wider">Top Audiences</h4>
                              <div className="space-y-2.5">{pInsights.audience.top_countries.map((c, i) => (
                                <div key={i} className="flex items-center justify-between"><span className="text-xs text-zinc-400">{c.country}</span><div className="flex items-center gap-2"><div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.percentage}%`, backgroundColor: meta?.color }} /></div><span className="text-[10px] text-zinc-500 w-10 text-right">{c.percentage}%</span></div></div>
                              ))}</div>
                            </div>
                          )}
                          <div className="bg-zinc-900/60 rounded-xl p-4 border border-white/5">
                            <h4 className="text-xs font-semibold text-zinc-300 mb-3 uppercase tracking-wider">Best Posting Times</h4>
                            <div className="space-y-2">{pInsights.best_posting_times?.map((t, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-zinc-950/50 rounded-lg"><span className="text-xs text-zinc-300">{t.day} {t.time}</span><span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t.engagement_index}x</span></div>
                            ))}</div>
                          </div>
                        </div>
                      </div>
                    ) : <p className="text-sm text-zinc-500 text-center py-4">Unable to load insights</p>}
                  </div>
                )}

                {/* Credentials Panel */}
                {panelState === 'credentials' && (
                  <div className="border-t border-white/5 p-5 bg-zinc-950/30 animate-slide-up" data-testid={`credentials-panel-${pkey}`}>
                    {loadingCreds === conn.platform_id ? (
                      <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-accent-violet animate-spin" /></div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-heading font-semibold text-white flex items-center gap-2"><Key className="w-4 h-4 text-accent-violet" /> API Credentials</h4>
                          <button onClick={() => handleTestConnection(conn.platform_id)} disabled={testing === conn.platform_id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 transition-all disabled:opacity-50" data-testid={`test-connection-${pkey}`}>
                            {testing === conn.platform_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Test Connection
                          </button>
                        </div>
                        {pTest && (
                          <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${pTest.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                            {pTest.status === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />} {pTest.message}
                          </div>
                        )}
                        {pCreds?.has_credentials && schemas[pkey] && (
                          <div className="space-y-2.5">
                            {schemas[pkey].required_fields.map(field => {
                              const maskedVal = pCreds?.credentials?.[field.key] || '';
                              return (
                                <div key={field.key}>
                                  <div className="flex items-center justify-between mb-1"><label className="text-xs font-medium text-zinc-500">{field.label}</label>{maskedVal && <span className="text-[10px] text-zinc-600 font-mono">Current: {maskedVal}</span>}</div>
                                  <input type={field.type === 'password' && !showPasswords[`edit_${conn.platform_id}_${field.key}`] ? 'password' : 'text'} value={editCreds[conn.platform_id]?.[field.key] || ''} onChange={(e) => setEditCreds(prev => ({ ...prev, [conn.platform_id]: { ...prev[conn.platform_id], [field.key]: e.target.value } }))} placeholder={maskedVal ? 'Leave empty to keep current' : field.placeholder} className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-2 px-3 text-xs text-white font-mono placeholder-zinc-600 transition-all" data-testid={`edit-cred-${pkey}-${field.key}`} />
                                </div>
                              );
                            })}
                            <button onClick={() => handleUpdateCredentials(conn.platform_id)} disabled={savingCreds === conn.platform_id} className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-4 py-2 text-xs flex items-center gap-2 disabled:opacity-50 transition-all mt-2" data-testid={`update-creds-${pkey}`}>
                              {savingCreds === conn.platform_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Update Credentials
                            </button>
                          </div>
                        )}
                        {schemas[pkey]?.guide && (
                          <details><summary className="text-xs text-accent-violet cursor-pointer hover:text-accent-violet-hover flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> View Setup Guide</summary>
                            <div className="mt-3 bg-zinc-950/50 rounded-lg p-4 border border-white/5">
                              <ol className="space-y-1.5">{schemas[pkey].guide.steps.map((step, i) => <li key={i} className="flex gap-2 text-[11px] text-zinc-500"><span className="text-accent-violet font-bold w-4 text-right flex-shrink-0">{i + 1}.</span><span>{step}</span></li>)}</ol>
                              <a href={schemas[pkey].guide.docs_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-accent-violet mt-3"><ExternalLink className="w-3 h-3" /> Official Docs</a>
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unconnected Platforms */}
      {Object.keys(platformMeta).filter(k => !connectedNames.includes(k)).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-heading font-semibold text-zinc-400 uppercase tracking-wider">Available Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.keys(platformMeta).filter(k => !connectedNames.includes(k)).map(pkey => {
              const meta = platformMeta[pkey]; const Icon = meta?.icon;
              return (
                <div key={pkey} className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 opacity-60 hover:opacity-80 transition-all" data-testid={`platform-card-${pkey}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${meta?.color}15` }}>
                      {Icon && <Icon className="w-5 h-5" style={{ color: `${meta?.color}80` }} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-400">{schemas[pkey]?.display_name || pkey}</p>
                      <p className="text-[10px] text-zinc-600">{schemas[pkey]?.required_fields?.filter(f => f.required !== false).length || 0} credentials needed</p>
                    </div>
                    <button onClick={() => { setShowConnect(true); handleSelectPlatform(pkey); }} className="text-xs text-accent-violet hover:text-accent-violet-hover flex items-center gap-1 transition-colors"><Plus className="w-3 h-3" /> Connect</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
