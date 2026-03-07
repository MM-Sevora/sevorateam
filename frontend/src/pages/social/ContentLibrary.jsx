import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import {
  Image, Upload, Trash2, Loader2, Plus, X, Search, FolderOpen, Tag, FileText,
  Copy, Check, Grid3X3, List, Download, Link, Sparkles, Rss, Inbox, RefreshCw, ExternalLink, MessageSquare, Eye
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';

function formatSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

export default function ContentLibrary() {
  const [tab, setTab] = useState('assets'); // assets | templates | bulk
  // Assets
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchFilter, setSearchFilter] = useState('');
  const fileRef = useRef(null);
  // Templates
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [tName, setTName] = useState('');
  const [tContent, setTContent] = useState('');
  const [tPlatform, setTPlatform] = useState('');
  const [tCategory, setTCategory] = useState('general');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [copied, setCopied] = useState('');
  // Bulk
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkRef = useRef(null);
  // Tags
  const [allTags, setAllTags] = useState([]);
  // RSS
  const [rssFeeds, setRssFeeds] = useState([]);
  const [rssUrl, setRssUrl] = useState('');
  const [rssPlatform, setRssPlatform] = useState('linkedin');
  const [rssPrefix, setRssPrefix] = useState('');
  const [addingRss, setAddingRss] = useState(false);
  const [rssItems, setRssItems] = useState({});
  const [checkingRss, setCheckingRss] = useState('');
  // Inbox
  const [inboxItems, setInboxItems] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxCount, setInboxCount] = useState({ unread: 0, total: 0 });

  useEffect(() => {
    fetchAssets(); fetchTemplates(); fetchTags(); fetchRssFeeds(); fetchInboxCount();
  }, []);

  const fetchAssets = async () => {
    try { const res = await api.get('/api/library'); setAssets(res.data); } catch (err) { console.error(err); }
    finally { setLoadingAssets(false); }
  };
  const fetchTemplates = async () => {
    try { const res = await api.get('/api/templates'); setTemplates(res.data); } catch (err) { console.error(err); }
    finally { setLoadingTemplates(false); }
  };
  const fetchTags = async () => {
    try { const res = await api.get('/api/posts/tags'); setAllTags(res.data); } catch (err) { console.error(err); }
  };
  const fetchRssFeeds = async () => {
    try { const res = await api.get('/api/rss/feeds'); setRssFeeds(res.data); } catch (err) { console.error(err); }
  };
  const fetchInboxCount = async () => {
    try { const res = await api.get('/api/inbox/count'); setInboxCount(res.data); } catch (err) { console.error(err); }
  };
  const fetchInbox = async () => {
    setInboxLoading(true);
    try { const res = await api.post('/api/inbox/fetch'); setInboxItems(res.data.items || []); fetchInboxCount(); }
    catch (err) { console.error(err); }
    finally { setInboxLoading(false); }
  };
  const handleAddRss = async () => {
    if (!rssUrl.trim()) return;
    setAddingRss(true);
    try { const res = await api.post('/api/rss/add', { feed_url: rssUrl, platform: rssPlatform, prefix: rssPrefix }); setRssFeeds(prev => [...prev, res.data]); setRssUrl(''); setRssPrefix(''); }
    catch (err) { console.error(err); }
    finally { setAddingRss(false); }
  };
  const handleCheckRss = async (feedId) => {
    setCheckingRss(feedId);
    try { const res = await api.post(`/api/rss/${feedId}/check`); setRssItems(prev => ({ ...prev, [feedId]: res.data.items })); }
    catch (err) { alert('Failed to fetch feed'); }
    finally { setCheckingRss(''); }
  };
  const handleRssToPost = async (feedId, title, link) => {
    try { await api.post(`/api/rss/${feedId}/create-post?title=${encodeURIComponent(title)}&link=${encodeURIComponent(link)}`); alert('Post created as draft!'); }
    catch (err) { console.error(err); }
  };
  const handleDeleteRss = async (feedId) => {
    try { await api.delete(`/api/rss/${feedId}`); setRssFeeds(prev => prev.filter(f => f.feed_id !== feedId)); } catch (err) { console.error(err); }
  };
  const handleMarkRead = async (inboxId) => {
    try { await api.put(`/api/inbox/${inboxId}/read`); setInboxItems(prev => prev.map(i => i.inbox_id === inboxId ? { ...i, read: true } : i)); fetchInboxCount(); }
    catch (err) { console.error(err); }
  };

  const handleAssetUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const token = localStorage.getItem('sf_token');
    for (const file of files) {
      try {
        const formData = new FormData(); formData.append('file', file);
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/library/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        const data = await res.json();
        if (data.asset_id) setAssets(prev => [data, ...prev]);
      } catch (err) { console.error(err); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDeleteAsset = async (assetId) => {
    try { await api.delete(`/api/library/${assetId}`); setAssets(prev => prev.filter(a => a.asset_id !== assetId)); } catch (err) { console.error(err); }
  };

  const handleSaveTemplate = async () => {
    if (!tName.trim() || !tContent.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await api.post('/api/templates', { name: tName, content: tContent, platform: tPlatform, category: tCategory });
      setTemplates(prev => [res.data, ...prev]);
      setShowTemplateForm(false); setTName(''); setTContent(''); setTPlatform(''); setTCategory('general');
    } catch (err) { console.error(err); }
    finally { setSavingTemplate(false); }
  };

  const handleDeleteTemplate = async (id) => {
    try { await api.delete(`/api/templates/${id}`); setTemplates(prev => prev.filter(t => t.template_id !== id)); } catch (err) { console.error(err); }
  };

  const handleCopyTemplate = (content, id) => {
    navigator.clipboard.writeText(content); setCopied(id); setTimeout(() => setCopied(''), 2000);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkUploading(true); setBulkResult(null);
    try {
      const token = localStorage.getItem('sf_token');
      const formData = new FormData(); formData.append('file', file);
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/posts/bulk-csv`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = await res.json();
      setBulkResult(data);
    } catch (err) { setBulkResult({ errors: ['Upload failed'] }); }
    finally { setBulkUploading(false); if (bulkRef.current) bulkRef.current.value = ''; }
  };

  const filteredAssets = assets.filter(a => !searchFilter || a.filename?.toLowerCase().includes(searchFilter.toLowerCase()));

  const tabs = [
    { key: 'assets', label: 'Media Library', icon: Image },
    { key: 'templates', label: 'Templates', icon: FileText },
    { key: 'rss', label: 'RSS Feeds', icon: Rss },
    { key: 'inbox', label: 'Inbox', icon: Inbox, badge: inboxCount.unread },
    { key: 'bulk', label: 'Bulk Import', icon: Upload },
    { key: 'tags', label: 'Tags', icon: Tag },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="library-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-heading font-bold text-[#4A3728] tracking-tight">Content Library</h1><p className="text-[#5D4A3A] mt-1">Manage assets, templates, bulk imports, and campaign tags</p></div>
      </div>

      <div className="flex gap-1 p-1 bg-white rounded-xl border border-[#E8D5C4]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'inbox') fetchInbox(); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-amber-800/15 text-amber-600' : 'text-[#5D4A3A] hover:text-[#4A3728] hover:bg-[#F5EDE5]'}`}>
            <t.icon className="w-4 h-4" /> {t.label} {t.badge > 0 && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ASSETS TAB */}
      {tab === 'assets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                <input type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="w-full bg-white border border-[#D4BBA6] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-[#5D4A3A]/500" placeholder="Search assets..." />
              </div>
              <div className="flex bg-white rounded-lg border border-[#E8D5C4] p-0.5">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-[#E8D5C4] text-white' : 'text-[#5D4A3A]'}`}><Grid3X3 className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-[#E8D5C4] text-white' : 'text-[#5D4A3A]'}`}><List className="w-4 h-4" /></button>
              </div>
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload Files
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleAssetUpload} />
          </div>

          {loadingAssets ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div> :
          filteredAssets.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredAssets.map(asset => (
                  <div key={asset.asset_id} className="bg-white border border-[#E8D5C4] rounded-xl overflow-hidden group hover:border-white/15 transition-all">
                    <div className="relative aspect-square bg-[#E8D5C4]">
                      {asset.content_type?.startsWith('image') ? <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#5D4A3A]"><FileText className="w-8 h-8" /></div>}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(asset.url); setCopied(asset.asset_id); setTimeout(() => setCopied(''), 2000); }} className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-[#4A3728]">
                          {copied === asset.asset_id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDeleteAsset(asset.asset_id)} className="p-2 rounded-full bg-red-500/30 hover:bg-red-500/50 text-[#4A3728]"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="p-2"><p className="text-[10px] text-[#5D4A3A] truncate">{asset.filename}</p><p className="text-[9px] text-[#5D4A3A]">{formatSize(asset.size)}</p></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAssets.map(asset => (
                  <div key={asset.asset_id} className="bg-white border border-[#E8D5C4] rounded-lg p-3 flex items-center gap-3 hover:border-[#D4BBA6]">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#E8D5C4] flex-shrink-0">
                      {asset.content_type?.startsWith('image') ? <img src={asset.url} alt="" className="w-full h-full object-cover" /> : <FileText className="w-6 h-6 text-[#5D4A3A] m-auto" />}
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-xs text-white truncate">{asset.filename}</p><p className="text-[10px] text-[#5D4A3A]">{formatSize(asset.size)} - {new Date(asset.created_at).toLocaleDateString()}</p></div>
                    <button onClick={() => { navigator.clipboard.writeText(asset.url); setCopied(asset.asset_id); setTimeout(() => setCopied(''), 2000); }} className="p-1.5 rounded-lg hover:bg-[#F5EDE5] text-[#5D4A3A] hover:text-[#4A3728]">{copied === asset.asset_id ? <Check className="w-4 h-4 text-stone-400" /> : <Copy className="w-4 h-4" />}</button>
                    <button onClick={() => handleDeleteAsset(asset.asset_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#5D4A3A] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-16"><Image className="w-12 h-12 text-[#D4BBA6] mx-auto mb-3" /><p className="text-sm text-[#5D4A3A]">No assets yet. Upload images and media files.</p></div>
          )}
        </div>
      )}

      {/* TEMPLATES TAB */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#5D4A3A]">{templates.length} templates saved</p>
            <button onClick={() => setShowTemplateForm(!showTemplateForm)} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> New Template</button>
          </div>

          {showTemplateForm && (
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5 animate-slide-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input type="text" value={tName} onChange={(e) => setTName(e.target.value)} className="bg-[#F5EDE5] border border-[#D4BBA6] rounded-lg py-2.5 px-4 text-sm text-white placeholder-[#5D4A3A]/500" placeholder="Template name" />
                <select value={tPlatform} onChange={(e) => setTPlatform(e.target.value)} className="bg-[#F5EDE5] border border-[#D4BBA6] rounded-lg py-2.5 px-4 text-sm text-[#4A3728]"><option value="" className="bg-white">Any platform</option>{['linkedin','instagram','facebook','twitter'].map(p => <option key={p} value={p} className="bg-white">{p}</option>)}</select>
                <select value={tCategory} onChange={(e) => setTCategory(e.target.value)} className="bg-[#F5EDE5] border border-[#D4BBA6] rounded-lg py-2.5 px-4 text-sm text-[#4A3728]">{['general','announcement','promotion','engagement','educational','reply'].map(c => <option key={c} value={c} className="bg-white">{c}</option>)}</select>
              </div>
              <textarea value={tContent} onChange={(e) => setTContent(e.target.value)} className="w-full bg-[#F5EDE5] border border-[#D4BBA6] rounded-lg py-3 px-4 text-sm text-white placeholder-[#5D4A3A]/500 resize-none mb-3" rows={4} placeholder="Template content... Use {brand}, {product}, {link} as placeholders" />
              <button onClick={handleSaveTemplate} disabled={savingTemplate || !tName.trim() || !tContent.trim()} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Template
              </button>
            </div>
          )}

          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map(t => (
                <div key={t.template_id} className="bg-white border border-[#E8D5C4] rounded-xl p-4 hover:border-[#D4BBA6] transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-[#4A3728]">{t.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.platform && <span className="text-[10px] bg-amber-800/10 text-amber-600 px-1.5 py-0.5 rounded">{t.platform}</span>}
                        <span className="text-[10px] bg-[#E8D5C4] text-[#5D4A3A] px-1.5 py-0.5 rounded">{t.category}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleCopyTemplate(t.content, t.template_id)} className="p-1.5 rounded-lg hover:bg-[#F5EDE5] text-[#5D4A3A] hover:text-[#4A3728]">{copied === t.template_id ? <Check className="w-3.5 h-3.5 text-stone-400" /> : <Copy className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => handleDeleteTemplate(t.template_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#5D4A3A] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-[#5D4A3A] line-clamp-3 bg-[#F5EDE5] p-2.5 rounded-lg">{t.content}</p>
                </div>
              ))}
            </div>
          ) : !showTemplateForm && (
            <div className="text-center py-12"><FileText className="w-10 h-10 text-[#D4BBA6] mx-auto mb-3" /><p className="text-sm text-[#5D4A3A]">No templates yet. Save reusable content templates.</p></div>
          )}
        </div>
      )}

      {/* BULK IMPORT TAB */}
      {tab === 'bulk' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D5C4] rounded-xl p-6">
            <h3 className="text-sm font-heading font-semibold text-[#4A3728] mb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-amber-600" /> Bulk Import from CSV</h3>
            <p className="text-xs text-[#5D4A3A] mb-4">Upload a CSV file with columns: <code className="bg-[#E8D5C4] px-1.5 py-0.5 rounded text-amber-600">platform, content, scheduled_at, status, image_url, tags</code></p>
            <div className="bg-[#F5EDE5] rounded-lg p-4 border border-[#E8D5C4] mb-4">
              <p className="text-[10px] text-[#5D4A3A] mb-2">Example CSV:</p>
              <pre className="text-[10px] text-[#4A3728] font-mono">platform,content,scheduled_at,status,tags{'\n'}linkedin,"Check out our new feature!",2026-03-10T09:00,scheduled,"launch,product"{'\n'}instagram,"New arrivals are here!",2026-03-10T12:00,scheduled,"fashion,new"{'\n'}facebook,"Join our community event",2026-03-11T14:00,draft,"event,community"</pre>
            </div>
            <button onClick={() => bulkRef.current?.click()} disabled={bulkUploading} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
              {bulkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload CSV
            </button>
            <input ref={bulkRef} type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
          </div>

          {bulkResult && (
            <div className="bg-white border border-[#E8D5C4] rounded-xl p-5 animate-slide-up">
              <h3 className="text-sm font-heading font-semibold text-[#4A3728] mb-3">Import Results</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-stone-600/10 rounded-lg p-3"><p className="text-[10px] text-stone-400 uppercase">Imported</p><p className="text-xl font-heading font-bold text-stone-400">{bulkResult.imported}</p></div>
                <div className="bg-red-500/10 rounded-lg p-3"><p className="text-[10px] text-red-400 uppercase">Errors</p><p className="text-xl font-heading font-bold text-red-400">{bulkResult.errors?.length || 0}</p></div>
              </div>
              {bulkResult.errors?.length > 0 && (
                <div className="space-y-1">{bulkResult.errors.map((e, i) => <p key={i} className="text-xs text-red-400">{e}</p>)}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAGS TAB */}
      {tab === 'tags' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
            <h3 className="text-sm font-heading font-semibold text-[#4A3728] mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-amber-600" /> Campaign Tags</h3>
            <p className="text-xs text-[#5D4A3A] mb-4">Tags are automatically collected from your posts. Use them to organize content by campaigns.</p>
            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allTags.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#E8D5C4]/80 rounded-lg px-3 py-2 border border-[#E8D5C4]">
                    <Tag className="w-3 h-3 text-amber-600" />
                    <span className="text-xs text-[#4A3728]">{t.tag}</span>
                    <span className="text-[10px] text-[#5D4A3A] bg-gray-200 px-1.5 py-0.5 rounded-full">{t.count} posts</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#5D4A3A]">No tags yet. Add tags to posts or use them in bulk CSV imports.</p>
            )}
          </div>
        </div>
      )}

      {/* RSS TAB */}
      {tab === 'rss' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D5C4] rounded-xl p-5">
            <h3 className="text-sm font-heading font-semibold text-[#4A3728] mb-3 flex items-center gap-2"><Rss className="w-4 h-4 text-orange-400" /> Add RSS Feed</h3>
            <div className="flex gap-3 flex-wrap">
              <input type="text" value={rssUrl} onChange={(e) => setRssUrl(e.target.value)} className="flex-1 bg-[#F5EDE5] border border-[#D4BBA6] rounded-lg py-2.5 px-4 text-sm text-white placeholder-[#5D4A3A]/500 min-w-[250px]" placeholder="https://blog.example.com/feed" />
              <select value={rssPlatform} onChange={(e) => setRssPlatform(e.target.value)} className="bg-[#F5EDE5] border border-[#D4BBA6] rounded-lg py-2.5 px-3 text-xs text-[#4A3728]">{['linkedin','facebook','instagram','twitter'].map(p => <option key={p} value={p} className="bg-white">{p}</option>)}</select>
              <input type="text" value={rssPrefix} onChange={(e) => setRssPrefix(e.target.value)} className="bg-[#F5EDE5] border border-[#D4BBA6] rounded-lg py-2.5 px-4 text-sm text-white placeholder-[#5D4A3A]/500 w-40" placeholder="Post prefix (optional)" />
              <button onClick={handleAddRss} disabled={addingRss || !rssUrl.trim()} className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                {addingRss ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Feed
              </button>
            </div>
          </div>
          {rssFeeds.length > 0 ? (
            <div className="space-y-3">
              {rssFeeds.map(feed => (
                <div key={feed.feed_id} className="bg-white border border-[#E8D5C4] rounded-xl overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <Rss className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{feed.feed_url}</p>
                      <p className="text-[10px] text-[#5D4A3A]">Platform: {feed.platform} {feed.prefix && `| Prefix: "${feed.prefix}"`}</p>
                    </div>
                    <button onClick={() => handleCheckRss(feed.feed_id)} disabled={checkingRss === feed.feed_id} className="text-xs bg-[#E8D5C4] hover:bg-gray-200 text-white border border-[#D4BBA6] rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50">
                      {checkingRss === feed.feed_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Fetch
                    </button>
                    <button onClick={() => handleDeleteRss(feed.feed_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#5D4A3A] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {rssItems[feed.feed_id] && (
                    <div className="border-t border-[#E8D5C4] p-3 space-y-2 max-h-64 overflow-y-auto">
                      {rssItems[feed.feed_id].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-2.5 bg-[#F5EDE5] rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#4A3728]">{item.title}</p>
                            <p className="text-[10px] text-[#5D4A3A] line-clamp-1">{item.description}</p>
                            {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5"><ExternalLink className="w-2.5 h-2.5" /> {item.link.slice(0, 40)}...</a>}
                          </div>
                          <button onClick={() => handleRssToPost(feed.feed_id, item.title, item.link)} className="text-[10px] bg-amber-800/10 text-amber-600 hover:bg-amber-800/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0"><Plus className="w-3 h-3" /> Draft</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12"><Rss className="w-10 h-10 text-[#D4BBA6] mx-auto mb-3" /><p className="text-sm text-[#5D4A3A]">No RSS feeds added. Add a blog feed to auto-create posts.</p></div>
          )}
        </div>
      )}

      {/* INBOX TAB */}
      {tab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-heading font-semibold text-[#4A3728] flex items-center gap-2"><Inbox className="w-4 h-4 text-accent-cyan" /> Unified Inbox</h3>
              <span className="text-[10px] bg-[#E8D5C4] text-[#5D4A3A] px-2 py-0.5 rounded-full">{inboxCount.unread} unread / {inboxCount.total} total</span>
            </div>
            <button onClick={fetchInbox} disabled={inboxLoading} className="bg-[#E8D5C4] hover:bg-gray-200 text-white border border-[#D4BBA6] rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              {inboxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
            </button>
          </div>
          {inboxItems.length > 0 ? (
            <div className="space-y-2">
              {inboxItems.map(item => {
                const platformColors = { instagram: '#E4405F', linkedin: '#0A66C2', facebook: '#1877F2' };
                const PlatformIcons = { instagram: FaInstagram, linkedin: FaLinkedin, facebook: FaFacebook };
                const PIcon = PlatformIcons[item.platform];
                return (
                  <div key={item.inbox_id} className={`bg-white border rounded-xl p-4 transition-all ${item.read ? 'border-[#E8D5C4]' : 'border-amber-600/20 bg-amber-800/5'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${platformColors[item.platform] || '#555'}15` }}>
                        {PIcon ? <PIcon className="w-4 h-4" style={{ color: platformColors[item.platform] }} /> : <MessageSquare className="w-4 h-4 text-[#5D4A3A]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[#4A3728]">@{item.author}</span>
                          <span className="text-[10px] text-[#5D4A3A] capitalize">{item.platform} {item.type}</span>
                          {!item.read && <span className="w-2 h-2 rounded-full bg-amber-800" />}
                          <span className="text-[10px] text-[#5D4A3A] ml-auto">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</span>
                        </div>
                        <p className="text-sm text-[#4A3728]">{item.text}</p>
                        {item.post_preview && <p className="text-[10px] text-[#5D4A3A] mt-1 bg-[#F5EDE5] p-1.5 rounded">On: "{item.post_preview}..."</p>}
                      </div>
                      {!item.read && (
                        <button onClick={() => handleMarkRead(item.inbox_id)} className="p-1.5 rounded-lg hover:bg-[#F5EDE5] text-[#5D4A3A] hover:text-[#4A3728]" title="Mark as read"><Eye className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Inbox className="w-10 h-10 text-[#D4BBA6] mx-auto mb-3" />
              <p className="text-sm text-[#5D4A3A]">{inboxLoading ? 'Fetching mentions...' : 'No messages yet. Click Refresh to fetch latest comments and mentions.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
