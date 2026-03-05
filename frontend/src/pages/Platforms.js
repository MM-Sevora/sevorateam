import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Unlink, Plus, Loader2, Shield, ExternalLink, ChevronDown, ChevronUp,
  BarChart3, Key, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle,
  BookOpen, Copy, Check, RefreshCw, Settings, Trash2
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';

const platformMeta = {
  facebook: { icon: FaFacebook, color: '#1877F2' },
  instagram: { icon: FaInstagram, color: '#E4405F' },
  twitter: { icon: FaTwitter, color: '#1DA1F2' },
  linkedin: { icon: FaLinkedin, color: '#0A66C2' },
  youtube: { icon: FaYoutube, color: '#FF0000' },
};

export default function Platforms() {
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemas, setSchemas] = useState({});
  const [showConnect, setShowConnect] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [connectStep, setConnectStep] = useState('select'); // select | credentials | guide
  const [credentialInputs, setCredentialInputs] = useState({});
  const [pageName, setPageName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [error, setError] = useState('');

  // Insights & credential management for connected
  const [expandedPanel, setExpandedPanel] = useState({}); // {platformId: 'insights'|'credentials'|''}
  const [insights, setInsights] = useState({});
  const [savedCreds, setSavedCreds] = useState({});
  const [loadingInsights, setLoadingInsights] = useState('');
  const [loadingCreds, setLoadingCreds] = useState('');
  const [testing, setTesting] = useState('');
  const [testResult, setTestResult] = useState({});
  const [editCreds, setEditCreds] = useState({});
  const [savingCreds, setSavingCreds] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetchPlatforms();
    fetchSchemas();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await api.get('/api/platforms');
      setConnected(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSchemas = async () => {
    try {
      const res = await api.get('/api/platforms/credential-schemas');
      setSchemas(res.data);
    } catch (err) { console.error(err); }
  };

  const connectedNames = connected.map(c => c.platform);
  const schema = schemas[selectedPlatform];

  const handleSelectPlatform = (pval) => {
    setSelectedPlatform(pval);
    setCredentialInputs({});
    setPageName('');
    setError('');
    setConnectStep('credentials');
  };

  const handleCredentialChange = (key, value) => {
    setCredentialInputs(prev => ({ ...prev, [key]: value }));
  };

  const toggleShowPassword = (key) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveCredentials = async () => {
    if (!selectedPlatform || !schema) return;
    const requiredKeys = schema.required_fields.filter(f => !f.label.toLowerCase().includes('optional')).map(f => f.key);
    const missing = requiredKeys.filter(k => !credentialInputs[k]?.trim());
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/api/platforms/credentials', {
        platform: selectedPlatform,
        credentials: credentialInputs,
        page_name: pageName || `My ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}`,
      });
      await fetchPlatforms();
      setShowConnect(false);
      setConnectStep('select');
      setSelectedPlatform('');
      setCredentialInputs({});
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePanel = async (platformId, panel) => {
    const current = expandedPanel[platformId];
    if (current === panel) {
      setExpandedPanel(prev => ({ ...prev, [platformId]: '' }));
      return;
    }
    setExpandedPanel(prev => ({ ...prev, [platformId]: panel }));

    if (panel === 'insights' && !insights[platformId]) {
      setLoadingInsights(platformId);
      try {
        const res = await api.get(`/api/platforms/${platformId}/insights`);
        setInsights(prev => ({ ...prev, [platformId]: res.data }));
      } catch (err) { console.error(err); }
      finally { setLoadingInsights(''); }
    }
    if (panel === 'credentials' && !savedCreds[platformId]) {
      setLoadingCreds(platformId);
      try {
        const res = await api.get(`/api/platforms/${platformId}/credentials`);
        setSavedCreds(prev => ({ ...prev, [platformId]: res.data }));
        if (res.data.has_credentials) {
          setEditCreds(prev => ({ ...prev, [platformId]: { ...res.data.credentials } }));
        }
      } catch (err) { console.error(err); }
      finally { setLoadingCreds(''); }
    }
  };

  const handleTestConnection = async (platformId) => {
    setTesting(platformId);
    setTestResult(prev => ({ ...prev, [platformId]: null }));
    try {
      const res = await api.post(`/api/platforms/${platformId}/test-connection`);
      setTestResult(prev => ({ ...prev, [platformId]: res.data }));
    } catch (err) {
      setTestResult(prev => ({ ...prev, [platformId]: { status: 'error', message: err.response?.data?.detail || 'Test failed' } }));
    } finally {
      setTesting(''); 
    }
  };

  const handleUpdateCredentials = async (platformId, platform) => {
    const creds = editCreds[platformId];
    if (!creds) return;
    setSavingCreds(platformId);
    try {
      await api.put(`/api/platforms/${platformId}/credentials`, { credentials: creds });
      const res = await api.get(`/api/platforms/${platformId}/credentials`);
      setSavedCreds(prev => ({ ...prev, [platformId]: res.data }));
      setEditCreds(prev => ({ ...prev, [platformId]: { ...res.data.credentials } }));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCreds('');
    }
  };

  const handleDisconnect = async (platformId) => {
    if (!window.confirm('Disconnect this platform? API credentials will be removed.')) return;
    try {
      await api.delete(`/api/platforms/${platformId}`);
      setConnected(prev => prev.filter(p => p.platform_id !== platformId));
      setInsights(prev => { const n = { ...prev }; delete n[platformId]; return n; });
      setSavedCreds(prev => { const n = { ...prev }; delete n[platformId]; return n; });
    } catch (err) { console.error(err); }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="platforms-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Platform Integrations</h1>
          <p className="text-zinc-400 mt-1">Connect social media platforms with your API credentials</p>
        </div>
        <button onClick={() => { setShowConnect(!showConnect); setConnectStep('select'); setError(''); }}
          className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 rounded-lg font-medium px-5 py-2.5 flex items-center gap-2"
          data-testid="connect-platform-button"
        >
          <Plus className="w-4 h-4" /> Connect Platform
        </button>
      </div>

      {/* Connect New Platform Panel */}
      {showConnect && (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden animate-slide-up" data-testid="connect-platform-form">
          {connectStep === 'select' && (
            <div className="p-6">
              <h3 className="text-lg font-heading font-semibold text-white mb-2">Choose a Platform</h3>
              <p className="text-sm text-zinc-400 mb-4">Select a platform and provide your API credentials to connect</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(schemas).filter(([key]) => !connectedNames.includes(key)).map(([key, s]) => {
                  const meta = platformMeta[key];
                  const Icon = meta?.icon;
                  return (
                    <button key={key} onClick={() => handleSelectPlatform(key)}
                      className="flex items-center gap-3 p-4 rounded-xl text-left transition-all border border-white/5 hover:bg-white/5 hover:border-white/10"
                      data-testid={`select-platform-${key}`}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta?.color}20` }}>
                        {Icon && <Icon className="w-5 h-5" style={{ color: meta?.color }} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{s.display_name}</p>
                        <p className="text-xs text-zinc-500">{s.required_fields.length} credentials needed</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {Object.entries(schemas).filter(([key]) => !connectedNames.includes(key)).length === 0 && (
                <p className="text-sm text-zinc-500 mt-2">All platforms are already connected!</p>
              )}
            </div>
          )}

          {connectStep === 'credentials' && schema && (
            <div className="flex flex-col lg:flex-row">
              {/* Left: Credential Form */}
              <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${platformMeta[selectedPlatform]?.color}20` }}>
                    {platformMeta[selectedPlatform]?.icon && React.createElement(platformMeta[selectedPlatform].icon, { className: "w-5 h-5", style: { color: platformMeta[selectedPlatform]?.color } })}
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-semibold text-white">{schema.display_name}</h3>
                    <p className="text-xs text-zinc-500">Enter your API credentials</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2" data-testid="credentials-error">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Page / Account Name</label>
                  <input type="text" value={pageName} onChange={(e) => setPageName(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 transition-all"
                    placeholder="e.g., MyBrand Official" data-testid="cred-page-name-input"
                  />
                </div>

                <div className="space-y-3">
                  {schema.required_fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{field.label}</label>
                      <div className="relative">
                        <input
                          type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                          value={credentialInputs[field.key] || ''}
                          onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                          className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 focus:ring-2 focus:ring-accent-violet/20 rounded-lg py-2 px-3 pr-10 text-sm text-white placeholder-zinc-600 transition-all font-mono"
                          placeholder={field.placeholder}
                          data-testid={`cred-input-${field.key}`}
                        />
                        {field.type === 'password' && (
                          <button type="button" onClick={() => toggleShowPassword(field.key)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                          >
                            {showPasswords[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setConnectStep('select'); setError(''); }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-lg font-medium px-5 py-2.5 text-sm transition-all"
                    data-testid="cred-back-button"
                  >Back</button>
                  <button onClick={handleSaveCredentials} disabled={saving}
                    className="bg-accent-violet hover:bg-accent-violet-hover text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] rounded-lg font-medium px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                    data-testid="save-credentials-button"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save & Connect'}
                  </button>
                </div>
              </div>

              {/* Right: Setup Guide */}
              <div className="w-full lg:w-96 p-6 bg-zinc-950/30" data-testid="setup-guide-panel">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-accent-cyan" />
                  <h4 className="text-sm font-heading font-semibold text-white">Setup Guide</h4>
                </div>
                <h5 className="text-sm font-medium text-zinc-300 mb-3">{schema.guide.title}</h5>
                <ol className="space-y-2.5 mb-4">
                  {schema.guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-xs text-zinc-400 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-accent-violet/10 text-accent-violet text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <a href={schema.guide.docs_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent-violet hover:text-accent-violet-hover transition-colors"
                  data-testid="docs-link"
                >
                  <ExternalLink className="w-3 h-3" /> Official Documentation
                </a>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-zinc-500 mb-2 font-medium">Required Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {schema.guide.permissions.map((p, i) => (
                      <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connected Platforms List */}
      {loading ? (
        <div className="flex items-center justify-center py-12" data-testid="platforms-loading">
          <div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4" data-testid="platforms-list">
          {Object.keys(platformMeta).map(pkey => {
            const conn = connected.find(c => c.platform === pkey);
            const isConnected = !!conn;
            const meta = platformMeta[pkey];
            const Icon = meta?.icon;
            const panelState = conn ? expandedPanel[conn.platform_id] : '';
            const pInsights = conn ? insights[conn.platform_id] : null;
            const pCreds = conn ? savedCreds[conn.platform_id] : null;
            const pTest = conn ? testResult[conn.platform_id] : null;

            return (
              <div key={pkey}
                className={`bg-zinc-900/50 backdrop-blur-md border rounded-xl overflow-hidden transition-all duration-200 ${
                  isConnected ? 'border-white/10' : 'border-white/5 opacity-40'
                }`}
                data-testid={`platform-card-${pkey}`}
              >
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta?.color}20` }}>
                    {Icon && <Icon className="w-6 h-6" style={{ color: meta?.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-heading font-semibold text-white">{schemas[pkey]?.display_name || pkey}</h3>
                      {isConnected && (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
                          </span>
                          {conn.has_api_credentials && (
                            <span className="inline-flex items-center gap-1 text-xs bg-accent-violet/10 text-accent-violet px-2 py-0.5 rounded-full">
                              <Key className="w-3 h-3" /> API Keys
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {isConnected ? `${conn.page_name} - Connected ${new Date(conn.connected_at).toLocaleDateString()}` : (schemas[pkey]?.required_fields?.length || 0) + ' credentials required'}
                    </p>
                  </div>
                  {isConnected && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleTogglePanel(conn.platform_id, 'credentials')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
                          panelState === 'credentials' ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border-white/5'
                        }`}
                        data-testid={`credentials-toggle-${pkey}`}
                      >
                        <Key className="w-3 h-3" /> Keys
                      </button>
                      <button onClick={() => handleTogglePanel(conn.platform_id, 'insights')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
                          panelState === 'insights' ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border-white/5'
                        }`}
                        data-testid={`insights-toggle-${pkey}`}
                      >
                        <BarChart3 className="w-3 h-3" /> Insights
                      </button>
                      <button onClick={() => handleDisconnect(conn.platform_id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Disconnect" data-testid={`disconnect-${pkey}`}
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Credentials Panel */}
                {panelState === 'credentials' && isConnected && (
                  <div className="border-t border-white/5 p-5 animate-slide-up" data-testid={`credentials-panel-${pkey}`}>
                    {loadingCreds === conn.platform_id ? (
                      <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-accent-violet animate-spin" /></div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-heading font-semibold text-white flex items-center gap-2">
                            <Key className="w-4 h-4 text-accent-violet" /> API Credentials
                          </h4>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleTestConnection(conn.platform_id)}
                              disabled={testing === conn.platform_id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 transition-all disabled:opacity-50"
                              data-testid={`test-connection-${pkey}`}
                            >
                              {testing === conn.platform_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              Test Connection
                            </button>
                          </div>
                        </div>

                        {pTest && (
                          <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                            pTest.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                          }`} data-testid={`test-result-${pkey}`}>
                            {pTest.status === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                            <span>{pTest.message}</span>
                          </div>
                        )}

                        {pCreds?.has_credentials && schemas[pkey] && (
                          <div className="space-y-2.5">
                            {schemas[pkey].required_fields.map(field => (
                              <div key={field.key}>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">{field.label}</label>
                                <div className="relative">
                                  <input
                                    type={field.type === 'password' && !showPasswords[`edit_${conn.platform_id}_${field.key}`] ? 'password' : 'text'}
                                    value={editCreds[conn.platform_id]?.[field.key] || ''}
                                    onChange={(e) => setEditCreds(prev => ({
                                      ...prev,
                                      [conn.platform_id]: { ...prev[conn.platform_id], [field.key]: e.target.value }
                                    }))}
                                    className="w-full bg-zinc-950/50 border border-white/10 focus:border-accent-violet/50 rounded-lg py-2 px-3 pr-16 text-xs text-white font-mono transition-all"
                                    data-testid={`edit-cred-${pkey}-${field.key}`}
                                  />
                                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {field.type === 'password' && (
                                      <button onClick={() => toggleShowPassword(`edit_${conn.platform_id}_${field.key}`)}
                                        className="p-1 text-zinc-600 hover:text-zinc-400">
                                        {showPasswords[`edit_${conn.platform_id}_${field.key}`] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center gap-3 pt-2">
                              <button onClick={() => handleUpdateCredentials(conn.platform_id, pkey)}
                                disabled={savingCreds === conn.platform_id}
                                className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-4 py-2 text-xs flex items-center gap-2 disabled:opacity-50 transition-all"
                                data-testid={`update-creds-${pkey}`}
                              >
                                {savingCreds === conn.platform_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Update Credentials
                              </button>
                              {pCreds?.updated_at && (
                                <span className="text-[10px] text-zinc-600">Last updated: {new Date(pCreds.updated_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {!pCreds?.has_credentials && (
                          <div className="text-center py-6">
                            <Key className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                            <p className="text-sm text-zinc-500">No API credentials configured</p>
                            <p className="text-xs text-zinc-600 mt-1">This platform was connected via quick connect. Add API keys for real integration.</p>
                          </div>
                        )}

                        {/* Inline mini guide */}
                        {schemas[pkey]?.guide && (
                          <details className="mt-3">
                            <summary className="text-xs text-accent-violet cursor-pointer hover:text-accent-violet-hover flex items-center gap-1.5" data-testid={`guide-toggle-${pkey}`}>
                              <BookOpen className="w-3 h-3" /> View Setup Guide
                            </summary>
                            <div className="mt-3 bg-zinc-950/50 rounded-lg p-4 border border-white/5">
                              <h5 className="text-xs font-medium text-zinc-300 mb-2">{schemas[pkey].guide.title}</h5>
                              <ol className="space-y-1.5">
                                {schemas[pkey].guide.steps.map((step, i) => (
                                  <li key={i} className="flex gap-2 text-[11px] text-zinc-500 leading-relaxed">
                                    <span className="text-accent-violet font-bold w-4 text-right flex-shrink-0">{i + 1}.</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                              <a href={schemas[pkey].guide.docs_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-accent-violet mt-3">
                                <ExternalLink className="w-3 h-3" /> Official Docs
                              </a>
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Insights Panel */}
                {panelState === 'insights' && isConnected && (
                  <div className="border-t border-white/5 p-5 animate-slide-up" data-testid={`insights-panel-${pkey}`}>
                    {loadingInsights === conn.platform_id ? (
                      <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-accent-violet animate-spin" /></div>
                    ) : pInsights ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Followers', value: pInsights.overview?.followers?.toLocaleString(), color: meta?.color },
                            { label: 'Avg Engagement', value: `${pInsights.overview?.avg_engagement_rate}%`, color: '#10b981' },
                            { label: 'Total Likes', value: pInsights.engagement?.total_likes?.toLocaleString(), color: '#ec4899' },
                            { label: 'Total Shares', value: pInsights.engagement?.total_shares?.toLocaleString(), color: '#f97316' },
                          ].map(m => (
                            <div key={m.label} className="bg-zinc-950/50 rounded-lg p-3 border border-white/5">
                              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{m.label}</p>
                              <p className="text-lg font-heading font-bold" style={{ color: m.color }}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5">
                            <h4 className="text-sm font-medium text-white mb-3">Top Audiences</h4>
                            <div className="space-y-2">
                              {pInsights.audience?.top_countries?.map((c, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-zinc-400">{c.country}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                      <div className="h-full rounded-full bg-accent-violet" style={{ width: `${c.percentage}%` }} />
                                    </div>
                                    <span className="text-xs text-zinc-500 w-10 text-right">{c.percentage}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-zinc-950/50 rounded-lg p-4 border border-white/5">
                            <h4 className="text-sm font-medium text-white mb-3">Best Posting Times</h4>
                            <div className="space-y-2">
                              {pInsights.best_posting_times?.map((t, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-lg">
                                  <span className="text-xs text-zinc-300">{t.day} {t.time}</span>
                                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t.engagement_index}x</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 text-center py-4">Unable to load insights</p>
                    )}
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
